// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {debounce, DebouncedFunc} from 'lodash';
import {AppState, AppStateStatus} from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';

import {setCurrentUserStatusOffline} from '@actions/local/user';
import {fetchStatusByIds} from '@actions/remote/user';
import {handleClose, handleEvent, handleFirstConnect, handleReconnect} from '@actions/websocket';
import WebSocketClient from '@client/websocket';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {getCurrentUserId} from '@queries/servers/system';
import {queryAllUsers} from '@queries/servers/user';
import {toMilliseconds} from '@utils/datetime';
import {isMainActivity} from '@utils/helpers';
import {logError} from '@utils/log';

const WAIT_TO_CLOSE = toMilliseconds({seconds: 15});
const WAIT_UNTIL_NEXT = toMilliseconds({seconds: 5});

class WebsocketManager {
    private connectedSubjects: {[serverUrl: string]: BehaviorSubject<WebsocketConnectedState>} = {};

    private clients: Record<string, WebSocketClient> = {};
    private connectionTimerIDs: Record<string, DebouncedFunc<() => void>> = {};
    private isBackgroundTimerRunning = false;
    private netConnected = false;
    private previousActiveState: boolean;
    private statusUpdatesIntervalIDs: Record<string, NodeJS.Timer> = {};
    private backgroundIntervalId: number | undefined;

    constructor() {
        this.previousActiveState = AppState.currentState === 'active';
    }

    public init = async (serverCredentials: ServerCredential[]) => {
        this.netConnected = Boolean((await NetInfo.fetch()).isConnected);
        await Promise.all(
            serverCredentials.map(
                async ({serverUrl, token}) => {
                    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
                    if (!operator) {
                        return;
                    }

                    try {
                        this.createClient(serverUrl, token, 0);
                    } catch (error) {
                        logError('WebsocketManager init error', error);
                    }
                },
            ),
        );

        AppState.addEventListener('change', this.onAppStateChange);
        NetInfo.addEventListener(this.onNetStateChange);
    };

    public invalidateClient = (serverUrl: string) => {
        this.clients[serverUrl]?.close();
        this.clients[serverUrl]?.invalidate();
        if (this.connectionTimerIDs[serverUrl]) {
            this.connectionTimerIDs[serverUrl].cancel();
        }
        delete this.clients[serverUrl];

        this.getConnectedSubject(serverUrl).next('not_connected');
        delete this.connectedSubjects[serverUrl];
    };

    public createClient = (serverUrl: string, bearerToken: string, storedLastDisconnect = 0) => {
        const client = new WebSocketClient(serverUrl, bearerToken, storedLastDisconnect);

        client.setFirstConnectCallback(() => this.onFirstConnect(serverUrl));
        client.setEventCallback((evt: any) => handleEvent(serverUrl, evt));

        //client.setMissedEventsCallback(() => {}) Nothing to do on missedEvents callback
        client.setReconnectCallback(() => this.onReconnect(serverUrl));
        client.setReliableReconnectCallback(() => this.onReliableReconnect(serverUrl));
        client.setCloseCallback((connectFailCount: number, lastDisconnect: number) => this.onWebsocketClose(serverUrl, connectFailCount, lastDisconnect));

        if (this.netConnected && ['unknown', 'active'].includes(AppState.currentState)) {
            client.initialize();
        }
        this.clients[serverUrl] = client;

        return this.clients[serverUrl];
    };

    public closeAll = () => {
        for (const url of Object.keys(this.clients)) {
            const client = this.clients[url];
            if (client.isConnected()) {
                client.close(true);
                this.getConnectedSubject(url).next('not_connected');
            }
        }
    };

    public openAll = async () => {
        for await (const clientUrl of Object.keys(this.clients)) {
            const activeServerUrl = await DatabaseManager.getActiveServerUrl();
            if (clientUrl === activeServerUrl) {
                this.initializeClient(clientUrl);
            } else {
                this.getConnectedSubject(clientUrl).next('connecting');
                const bounce = debounce(this.initializeClient.bind(this, clientUrl), WAIT_UNTIL_NEXT);
                this.connectionTimerIDs[clientUrl] = bounce;
                bounce();
            }
        }
    };

    public isConnected = (serverUrl: string): boolean => {
        return this.clients[serverUrl]?.isConnected();
    };

    public observeWebsocketState = (serverUrl: string) => {
        return this.getConnectedSubject(serverUrl).asObservable().pipe(
            distinctUntilChanged(),
        );
    };

    private getConnectedSubject = (serverUrl: string) => {
        if (!this.connectedSubjects[serverUrl]) {
            this.connectedSubjects[serverUrl] = new BehaviorSubject(this.isConnected(serverUrl) ? 'connected' : 'not_connected');
        }

        return this.connectedSubjects[serverUrl];
    };

    private cancelAllConnections = () => {
        for (const url in this.connectionTimerIDs) {
            if (this.connectionTimerIDs[url]) {
                this.connectionTimerIDs[url].cancel();
                delete this.connectionTimerIDs[url];
            }
        }
    };

    private initializeClient = (serverUrl: string) => {
        const client: WebSocketClient = this.clients[serverUrl];
        if (!client?.isConnected()) {
            client.initialize();
        }
        this.connectionTimerIDs[serverUrl]?.cancel();
        delete this.connectionTimerIDs[serverUrl];
    };

    private onFirstConnect = (serverUrl: string) => {
        this.startPeriodicStatusUpdates(serverUrl);
        this.getConnectedSubject(serverUrl).next('connected');
        handleFirstConnect(serverUrl);
    };

    private onReconnect = async (serverUrl: string) => {
        this.startPeriodicStatusUpdates(serverUrl);
        this.getConnectedSubject(serverUrl).next('connected');
        await handleReconnect(serverUrl);
    };

    private onReliableReconnect = async (serverUrl: string) => {
        this.getConnectedSubject(serverUrl).next('connected');
    };

    private onWebsocketClose = async (serverUrl: string, connectFailCount: number, lastDisconnect: number) => {
        this.getConnectedSubject(serverUrl).next('not_connected');
        if (connectFailCount <= 1) { // First fail
            await setCurrentUserStatusOffline(serverUrl);
            await handleClose(serverUrl, lastDisconnect);

            this.stopPeriodicStatusUpdates(serverUrl);
        }
    };

    private startPeriodicStatusUpdates(serverUrl: string) {
        let currentId = this.statusUpdatesIntervalIDs[serverUrl];
        if (currentId != null) {
            clearInterval(currentId);
        }

        const getStatusForUsers = async () => {
            const database = DatabaseManager.serverDatabases[serverUrl];
            if (!database) {
                return;
            }

            const currentUserId = await getCurrentUserId(database.database);
            const userIds = (await queryAllUsers(database.database).fetchIds()).filter((id) => id !== currentUserId);

            fetchStatusByIds(serverUrl, userIds);
        };

        currentId = setInterval(getStatusForUsers, General.STATUS_INTERVAL);
        this.statusUpdatesIntervalIDs[serverUrl] = currentId;
    }

    private stopPeriodicStatusUpdates(serverUrl: string) {
        const currentId = this.statusUpdatesIntervalIDs[serverUrl];
        if (currentId != null) {
            clearInterval(currentId);
        }

        delete this.statusUpdatesIntervalIDs[serverUrl];
    }

    private onAppStateChange = async (appState: AppStateStatus) => {
        const isActive = appState === 'active';
        if (isActive === this.previousActiveState) {
            return;
        }

        const isMain = isMainActivity();

        this.cancelAllConnections();
        if (!isActive && !this.isBackgroundTimerRunning) {
            this.isBackgroundTimerRunning = true;
            this.cancelAllConnections();
            this.backgroundIntervalId = BackgroundTimer.setInterval(() => {
                this.closeAll();
                BackgroundTimer.clearInterval(this.backgroundIntervalId!);
                this.isBackgroundTimerRunning = false;
            }, WAIT_TO_CLOSE);

            this.previousActiveState = isActive;
            return;
        }

        if (isActive && this.netConnected && isMain) { // Reopen the websockets only if there is connection
            if (this.backgroundIntervalId) {
                BackgroundTimer.clearInterval(this.backgroundIntervalId);
            }
            this.isBackgroundTimerRunning = false;
            this.openAll();
            this.previousActiveState = isActive;
            return;
        }

        if (isMain) {
            this.previousActiveState = isActive;
        }
    };

    private onNetStateChange = async (netState: NetInfoState) => {
        const newState = Boolean(netState.isConnected);
        if (this.netConnected === newState) {
            return;
        }

        this.netConnected = newState;

        if (this.netConnected && this.previousActiveState) { // Reopen the websockets only if the app is active
            this.openAll();
            return;
        }

        this.closeAll();
    };

    public getClient = (serverUrl: string): WebSocketClient | undefined => {
        return this.clients[serverUrl];
    };
}

export default new WebsocketManager();
