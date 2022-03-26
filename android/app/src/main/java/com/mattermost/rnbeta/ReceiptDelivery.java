package com.mattermost.rnbeta;

import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import java.lang.System;
import java.util.Objects;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.HttpUrl;

import org.json.JSONObject;
import org.json.JSONException;

import com.facebook.react.bridge.ReactApplicationContext;

import com.mattermost.helpers.*;

public class ReceiptDelivery {
    private static final int[] FIBONACCI_BACKOFF = new int[] { 0, 1, 2, 3, 5, 8 };

    public static void send(Context context, final String ackId, final String serverUrl, final String postId, final String type, final boolean isIdLoaded, ResolvePromise promise) {
        final ReactApplicationContext reactApplicationContext = new ReactApplicationContext(context);
        final String token = Credentials.getCredentialsForServerSync(reactApplicationContext, serverUrl);
        Log.i("ReactNative", String.format("Send receipt delivery ACK=%s TYPE=%s to URL=%s with ID-LOADED=%s", ackId, type, serverUrl, isIdLoaded));
        execute(serverUrl, postId, token, ackId, type, isIdLoaded, promise);
    }

    protected static void execute(String serverUrl, String postId, String token, String ackId, String type, boolean isIdLoaded, ResolvePromise promise) {
        if (token == null) {
            promise.reject("Receipt delivery failure", "Invalid token");
            return;
        }

        if (serverUrl == null) {
            promise.reject("Receipt delivery failure", "Invalid server URL");
        }

        JSONObject json;
        long receivedAt = System.currentTimeMillis();

        try {
            json = new JSONObject();
            json.put("id", ackId);
            json.put("received_at", receivedAt);
            json.put("platform", "android");
            json.put("type", type);
            json.put("post_id", postId);
            json.put("is_id_loaded", isIdLoaded);
        } catch (JSONException e) {
            Log.e("ReactNative", "Receipt delivery failed to build json payload");
            promise.reject("Receipt delivery failure", e.toString());
            return;
        }

        final HttpUrl url;
        if (serverUrl != null) {
            url = HttpUrl.parse(
                String.format("%s/api/v4/notifications/ack", serverUrl.replaceAll("/$", "")));
            if (url != null) {
                final OkHttpClient client = new OkHttpClient();
                final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
                RequestBody body = RequestBody.create(json.toString(), JSON);
                Request request = new Request.Builder()
                        .header("Authorization", String.format("Bearer %s", token))
                        .header("Content-Type", "application/json")
                        .url(url)
                        .post(body)
                        .build();

                makeServerRequest(client, request, isIdLoaded, 0, promise);
            }
        }
    }

    private static void makeServerRequest(OkHttpClient client, Request request, Boolean isIdLoaded, int reRequestCount, ResolvePromise promise) {
        try {
            Response response = client.newCall(request).execute();
            String responseBody = Objects.requireNonNull(response.body()).string();
            if (response.code() != 200) {
                switch (response.code()) {
                    case 302:
                    promise.reject("Receipt delivery failure", "StatusFound");
                    return;
                    case 400:
                    promise.reject("Receipt delivery failure", "StatusBadRequest");
                    return;
                    case 401:
                    promise.reject("Receipt delivery failure", "Unauthorized");
                    case 403:
                    promise.reject("Receipt delivery failure", "Forbidden");
                    return;
                    case 500:
                    promise.reject("Receipt delivery failure", "StatusInternalServerError");
                    return;
                    case 501:
                    promise.reject("Receipt delivery failure", "StatusNotImplemented");
                    return;
                }

                throw new Exception(responseBody);
            }

            JSONObject jsonResponse = new JSONObject(responseBody);
            Bundle bundle = new Bundle();
            String[] keys = new String[]{"post_id", "root_id", "category", "message", "team_id", "channel_id", "channel_name", "type", "sender_id", "sender_name", "version"};
            for (String key : keys) {
                if (jsonResponse.has(key)) {
                    bundle.putString(key, jsonResponse.getString(key));
                }
            }
            promise.resolve(bundle);
        } catch (Exception e) {
            Log.e("ReactNative", "Receipt delivery failed to send");
            if (isIdLoaded) {
                try {
                    reRequestCount++;
                    if (reRequestCount < FIBONACCI_BACKOFF.length) {
                        Log.i("ReactNative", "Retry attempt " + reRequestCount + " with backoff delay: " + FIBONACCI_BACKOFF[reRequestCount] + " seconds");
                        Thread.sleep(FIBONACCI_BACKOFF[reRequestCount] * 1000);
                        makeServerRequest(client, request, true, reRequestCount, promise);
                    }
                } catch(InterruptedException ie) {
                    ie.printStackTrace();
                }
            }

            promise.reject("Receipt delivery failure", e.toString());
        }
    }
}
