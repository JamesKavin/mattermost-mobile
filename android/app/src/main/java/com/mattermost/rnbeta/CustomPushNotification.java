package com.mattermost.rnbeta;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import com.mattermost.helpers.CustomPushNotificationHelper;
import com.mattermost.helpers.DatabaseHelper;
import com.mattermost.helpers.Network;
import com.mattermost.helpers.PushNotificationDataHelper;
import com.mattermost.helpers.ResolvePromise;
import com.wix.reactnativenotifications.core.NotificationIntentAdapter;
import com.wix.reactnativenotifications.core.notification.PushNotification;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;
import static com.wix.reactnativenotifications.Defs.NOTIFICATION_RECEIVED_EVENT_NAME;

import org.json.JSONArray;
import org.json.JSONObject;

public class CustomPushNotification extends PushNotification {
    private static final String PUSH_NOTIFICATIONS = "PUSH_NOTIFICATIONS";
    private static final String VERSION_PREFERENCE = "VERSION_PREFERENCE";
    private static final String PUSH_TYPE_MESSAGE = "message";
    private static final String PUSH_TYPE_CLEAR = "clear";
    private static final String PUSH_TYPE_SESSION = "session";
    private static final String NOTIFICATIONS_IN_CHANNEL = "notificationsInChannel";
    private final PushNotificationDataHelper dataHelper;

    public CustomPushNotification(Context context, Bundle bundle, AppLifecycleFacade appLifecycleFacade, AppLaunchHelper appLaunchHelper, JsIOHelper jsIoHelper) {
        super(context, bundle, appLifecycleFacade, appLaunchHelper, jsIoHelper);
        CustomPushNotificationHelper.createNotificationChannels(context);
        dataHelper = new PushNotificationDataHelper(context);

        try {
            Objects.requireNonNull(DatabaseHelper.Companion.getInstance()).init(context);
            Network.init(context);
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            String version = String.valueOf(pInfo.versionCode);
            String storedVersion = null;
            SharedPreferences pSharedPref = context.getSharedPreferences(VERSION_PREFERENCE, Context.MODE_PRIVATE);
            if (pSharedPref != null) {
                storedVersion = pSharedPref.getString("Version", "");
            }

            if (!version.equals(storedVersion)) {
                if (pSharedPref != null) {
                    SharedPreferences.Editor editor = pSharedPref.edit();
                    editor.putString("Version", version);
                    editor.apply();
                }

                Map<String, List<Integer>> inputMap = new HashMap<>();
                saveNotificationsMap(context, inputMap);
            }
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
    }

    public static void cancelNotification(Context context, String channelId, Integer notificationId) {
        if (!android.text.TextUtils.isEmpty(channelId)) {
            Map<String, List<Integer>> notificationsInChannel = loadNotificationsMap(context);
            List<Integer> notifications = notificationsInChannel.get(channelId);
            if (notifications == null) {
                return;
            }

            final NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.cancel(notificationId);
            notifications.remove(notificationId);
            final StatusBarNotification[] statusNotifications = notificationManager.getActiveNotifications();
            boolean hasMore = false;
            for (final StatusBarNotification status : statusNotifications) {
                if (status.getNotification().extras.getString("channel_id").equals(channelId)) {
                    hasMore = true;
                    break;
                }
            }

            if (!hasMore) {
                notificationsInChannel.remove(channelId);
            }

            saveNotificationsMap(context, notificationsInChannel);
        }
    }

    public static void clearChannelNotifications(Context context, String channelId) {
        if (!android.text.TextUtils.isEmpty(channelId)) {
            Map<String, List<Integer>> notificationsInChannel = loadNotificationsMap(context);
            List<Integer> notifications = notificationsInChannel.get(channelId);
            if (notifications == null) {
                return;
            }

            notificationsInChannel.remove(channelId);
            saveNotificationsMap(context, notificationsInChannel);

            for (final Integer notificationId : notifications) {
                final NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
                notificationManager.cancel(notificationId);
            }
        }
    }

    public static void clearAllNotifications(Context context) {
        if (context != null) {
            Map<String, List<Integer>> notificationsInChannel = loadNotificationsMap(context);
            notificationsInChannel.clear();
            saveNotificationsMap(context, notificationsInChannel);
            final NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            notificationManager.cancelAll();
        }
    }

    @Override
    public void onReceived() {
        final Bundle initialData = mNotificationProps.asBundle();
        final String type = initialData.getString("type");
        final String ackId = initialData.getString("ack_id");
        final String postId = initialData.getString("post_id");
        final String channelId = initialData.getString("channel_id");
        final boolean isIdLoaded = initialData.getString("id_loaded") != null && initialData.getString("id_loaded").equals("true");
        int notificationId = CustomPushNotificationHelper.MESSAGE_NOTIFICATION_ID;
        if (postId != null) {
            notificationId = postId.hashCode();
        } else if (channelId != null) {
            notificationId = channelId.hashCode();
        }

        String serverUrl = addServerUrlToBundle(initialData);
        boolean isReactInit = mAppLifecycleFacade.isReactInitialized();

        if (ackId != null && serverUrl != null) {
            notificationReceiptDelivery(ackId, serverUrl, postId, type, isIdLoaded, new ResolvePromise() {
                @Override
                public void resolve(@Nullable Object value) {
                    if (isIdLoaded) {
                        Bundle response = (Bundle) value;
                        if (value != null) {
                            response.putString("server_url", serverUrl);
                            mNotificationProps = createProps(response);
                        }
                    }
                }

                @Override
                public void reject(String code, String message) {
                    Log.e("ReactNative", code + ": " + message);
                }
            });
        }

        switch (type) {
            case PUSH_TYPE_MESSAGE:
            case PUSH_TYPE_SESSION:
                boolean createSummary = type.equals(PUSH_TYPE_MESSAGE);
                if (!mAppLifecycleFacade.isAppVisible()) {
                    if (type.equals(PUSH_TYPE_MESSAGE)) {
                        if (channelId != null) {
                            if (serverUrl != null && !isReactInit) {
                                // We will only fetch the data related to the notification on the native side
                                // as updating the data directly to the db removes the wal & shm files needed
                                // by watermelonDB, if the DB is updated while WDB is running it causes WDB to
                                // detect the database as malformed, thus the app stop working and a restart is required.
                                // Data will be fetch from within the JS context instead.
                                dataHelper.fetchAndStoreDataForPushNotification(mNotificationProps.asBundle());
                            }

                            Map<String, List<Integer>> notificationsInChannel = loadNotificationsMap(mContext);
                            List<Integer> list = notificationsInChannel.get(channelId);
                            if (list == null) {
                                list = Collections.synchronizedList(new ArrayList<>(0));
                            }

                            list.add(0, notificationId);
                            if (list.size() > 1) {
                                createSummary = false;
                            }

                            if (createSummary) {
                                // Add the summary notification id as well
                                list.add(0, notificationId + 1);
                            }

                            notificationsInChannel.put(channelId, list);
                            saveNotificationsMap(mContext, notificationsInChannel);
                        }
                    }

                    buildNotification(notificationId, createSummary);
                }
                break;
            case PUSH_TYPE_CLEAR:
                clearChannelNotifications(mContext, channelId);
                break;
        }

        if (isReactInit) {
            notifyReceivedToJS();
        }
    }

    @Override
    public void onOpened() {
        digestNotification();

        Bundle data = mNotificationProps.asBundle();
        final String channelId = data.getString("channel_id");
        final String postId = data.getString("post_id");
        Integer notificationId = CustomPushNotificationHelper.MESSAGE_NOTIFICATION_ID;

        if (postId != null) {
            notificationId = postId.hashCode();
        }

        if (channelId != null) {
            Map<String, List<Integer>> notificationsInChannel = loadNotificationsMap(mContext);
            List<Integer> notifications = notificationsInChannel.get(channelId);
            if (notifications != null) {
                notifications.remove(notificationId);
            }
            saveNotificationsMap(mContext, notificationsInChannel);
            clearChannelNotifications(mContext, channelId);
        }
    }

    private void buildNotification(Integer notificationId, boolean createSummary) {
        final PendingIntent pendingIntent = NotificationIntentAdapter.createPendingNotificationIntent(mContext, mNotificationProps);
        final Notification notification = buildNotification(pendingIntent);
        if (createSummary) {
            final Notification summary = getNotificationSummaryBuilder(pendingIntent).build();
            super.postNotification(summary, notificationId + 1);
        }
        super.postNotification(notification, notificationId);
    }

    @Override
    protected NotificationCompat.Builder getNotificationBuilder(PendingIntent intent) {
        Bundle bundle = mNotificationProps.asBundle();
        return CustomPushNotificationHelper.createNotificationBuilder(mContext, intent, bundle, false);
    }

    protected NotificationCompat.Builder getNotificationSummaryBuilder(PendingIntent intent) {
        Bundle bundle = mNotificationProps.asBundle();
        return CustomPushNotificationHelper.createNotificationBuilder(mContext, intent, bundle, true);
    }

    private void notificationReceiptDelivery(String ackId, String serverUrl, String postId, String type, boolean isIdLoaded, ResolvePromise promise) {
        ReceiptDelivery.send(mContext, ackId, serverUrl, postId, type, isIdLoaded, promise);
    }

    private void notifyReceivedToJS() {
        mJsIOHelper.sendEventToJS(NOTIFICATION_RECEIVED_EVENT_NAME, mNotificationProps.asBundle(), mAppLifecycleFacade.getRunningReactContext());
    }

    private String addServerUrlToBundle(Bundle bundle) {
        String serverId = bundle.getString("server_id");
        String serverUrl;
        if (serverId == null) {
            serverUrl = Objects.requireNonNull(DatabaseHelper.Companion.getInstance()).getOnlyServerUrl();
        } else {
            serverUrl = Objects.requireNonNull(DatabaseHelper.Companion.getInstance()).getServerUrlForIdentifier(serverId);
        }

        if (!TextUtils.isEmpty(serverUrl)) {
            bundle.putString("server_url", serverUrl);
            mNotificationProps = createProps(bundle);
        }

        return serverUrl;
    }

    private static void saveNotificationsMap(Context context, Map<String, List<Integer>> inputMap) {
        SharedPreferences pSharedPref = context.getSharedPreferences(PUSH_NOTIFICATIONS, Context.MODE_PRIVATE);
        if (pSharedPref != null) {
            JSONObject json = new JSONObject(inputMap);
            String jsonString = json.toString();
            SharedPreferences.Editor editor = pSharedPref.edit();
            editor.remove(NOTIFICATIONS_IN_CHANNEL).apply();
            editor.putString(NOTIFICATIONS_IN_CHANNEL, jsonString);
            editor.apply();
        }
    }

    private static Map<String, List<Integer>> loadNotificationsMap(Context context) {
        Map<String, List<Integer>> outputMap = new HashMap<>();
        if (context != null) {
            SharedPreferences pSharedPref = context.getSharedPreferences(PUSH_NOTIFICATIONS, Context.MODE_PRIVATE);
            try {
                if (pSharedPref != null) {
                    String jsonString = pSharedPref.getString(NOTIFICATIONS_IN_CHANNEL, (new JSONObject()).toString());
                    JSONObject json = new JSONObject(jsonString);
                    Iterator<String> keysItr = json.keys();
                    while (keysItr.hasNext()) {
                        String key = keysItr.next();
                        JSONArray array = json.getJSONArray(key);
                        List<Integer> values = new ArrayList<>();
                        for (int i = 0; i < array.length(); ++i) {
                            values.add(array.getInt(i));
                        }
                        outputMap.put(key, values);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        return outputMap;
    }
}
