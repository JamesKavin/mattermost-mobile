package com.mattermost.rnbeta;

import com.mattermost.rnbeta.generated.BasePackageList;

import androidx.annotation.Nullable;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import java.lang.reflect.InvocationTargetException;
import java.io.File;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.mattermost.helpers.RealPathUtil;
import com.mattermost.share.ShareModule;
import com.wix.reactnativenotifications.RNNotificationsPackage;

import com.reactnativenavigation.NavigationApplication;
import com.wix.reactnativenotifications.core.notification.INotificationsApplication;
import com.wix.reactnativenotifications.core.notification.IPushNotification;
import com.wix.reactnativenotifications.core.notificationdrawer.IPushNotificationsDrawer;
import com.wix.reactnativenotifications.core.notificationdrawer.INotificationsDrawerApplication;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;

import com.facebook.react.PackageList;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.bridge.ReactMarkerConstants;
import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.soloader.SoLoader;

import org.unimodules.adapters.react.ModuleRegistryAdapter;
import org.unimodules.adapters.react.ReactModuleRegistryProvider;

import com.swmansion.reanimated.ReanimatedJSIModulePackage;

public class MainApplication extends NavigationApplication implements INotificationsApplication, INotificationsDrawerApplication {
  public static MainApplication instance;

  public Boolean sharedExtensionIsOpened = false;

  public long APP_START_TIME;

  public long RELOAD;
  public long CONTENT_APPEARED;

  public long PROCESS_PACKAGES_START;
  public long PROCESS_PACKAGES_END;

  private Bundle mManagedConfig = null;

  private final ReactModuleRegistryProvider mModuleRegistryProvider = new ReactModuleRegistryProvider(new BasePackageList().getPackageList(), null);

  private final ReactNativeHost mReactNativeHost =
    new ReactNativeHost(this) {
      @Override
      public boolean getUseDeveloperSupport() {
        return BuildConfig.DEBUG;
      }

      @Override
      protected List<ReactPackage> getPackages() {
        @SuppressWarnings("UnnecessaryLocalVariable")
        List<ReactPackage> packages = new PackageList(this).getPackages();
        // Packages that cannot be autolinked yet can be added manually here, for example:
        // packages.add(new MyReactNativePackage());
        packages.add(new RNNotificationsPackage(MainApplication.this));

        // Add unimodules
        List<ReactPackage> unimodules = Arrays.<ReactPackage>asList(
          new ModuleRegistryAdapter(mModuleRegistryProvider)
        );
        packages.addAll(unimodules);

        packages.add(
          new TurboReactPackage() {
                @Override
                public NativeModule getModule(String name, ReactApplicationContext reactContext) {
                  switch (name) {
                    case "MattermostShare":
                      return new ShareModule(instance, reactContext);
                    case "NotificationPreferences":
                      return NotificationPreferencesModule.getInstance(instance, reactContext);
                    case "RNTextInputReset":
                      return new RNTextInputResetModule(reactContext);
                    default:
                      throw new IllegalArgumentException("Could not find module " + name);
                  }
                }

                @Override
                public ReactModuleInfoProvider getReactModuleInfoProvider() {
                  return new ReactModuleInfoProvider() {
                    @Override
                    public Map<String, ReactModuleInfo> getReactModuleInfos() {
                      Map<String, ReactModuleInfo> map = new HashMap<>();
                      map.put("MattermostShare", new ReactModuleInfo("MattermostShare", "com.mattermost.share.ShareModule", false, false, true, false, false));
                      map.put("NotificationPreferences", new ReactModuleInfo("NotificationPreferences", "com.mattermost.rnbeta.NotificationPreferencesModule", false, false, false, false, false));
                      map.put("RNTextInputReset", new ReactModuleInfo("RNTextInputReset", "com.mattermost.rnbeta.RNTextInputResetModule", false, false, false, false, false));
                      return map;
                    }
                  };
                }
              }
        );

        return packages;
      }

      @Override
      protected JSIModulePackage getJSIModulePackage() {
        return new ReanimatedJSIModulePackage();
      }

      @Override
      protected String getJSMainModuleName() {
        return "index";
      }
    };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    instance = this;

    // Delete any previous temp files created by the app
    File tempFolder = new File(getApplicationContext().getCacheDir(), RealPathUtil.CACHE_DIR_NAME);
    RealPathUtil.deleteTempFiles(tempFolder);
    Log.i("ReactNative", "Cleaning temp cache " + tempFolder.getAbsolutePath());

    SoLoader.init(this, /* native exopackage */ false);
    initializeFlipper(this, getReactNativeHost().getReactInstanceManager());

    // Uncomment to listen to react markers for build that has telemetry enabled
    // addReactMarkerListener();
  }

  @Override
  public IPushNotification getPushNotification(Context context, Bundle bundle, AppLifecycleFacade defaultFacade, AppLaunchHelper defaultAppLaunchHelper) {
    return new CustomPushNotification(
            context,
            bundle,
            defaultFacade,
            defaultAppLaunchHelper,
            new JsIOHelper()
    );
  }

  @Override
  public IPushNotificationsDrawer getPushNotificationsDrawer(Context context, AppLaunchHelper defaultAppLaunchHelper) {
    return new CustomPushNotificationDrawer(context, defaultAppLaunchHelper);
  }

  public ReactContext getRunningReactContext() {
    if (mReactNativeHost == null) {
        return null;
    }

    return mReactNativeHost
        .getReactInstanceManager()
        .getCurrentReactContext();
  }

  private void addReactMarkerListener() {
    ReactMarker.addListener(new ReactMarker.MarkerListener() {
      @Override
      public void logMarker(ReactMarkerConstants name, @Nullable String tag, int instanceKey) {
        if (name.toString() == ReactMarkerConstants.RELOAD.toString()) {
          APP_START_TIME = System.currentTimeMillis();
          RELOAD = System.currentTimeMillis();
        } else if (name.toString() == ReactMarkerConstants.PROCESS_PACKAGES_START.toString()) {
          PROCESS_PACKAGES_START = System.currentTimeMillis();
        } else if (name.toString() == ReactMarkerConstants.PROCESS_PACKAGES_END.toString()) {
          PROCESS_PACKAGES_END = System.currentTimeMillis();
        } else if (name.toString() == ReactMarkerConstants.CONTENT_APPEARED.toString()) {
          CONTENT_APPEARED = System.currentTimeMillis();
          ReactContext ctx = getRunningReactContext();

          if (ctx != null) {
            WritableMap map = Arguments.createMap();

            map.putDouble("appReload", RELOAD);
            map.putDouble("appContentAppeared", CONTENT_APPEARED);

            map.putDouble("processPackagesStart", PROCESS_PACKAGES_START);
            map.putDouble("processPackagesEnd", PROCESS_PACKAGES_END);

            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).
                    emit("nativeMetrics", map);
          }
        }
      }
    });
  }

  /**
   * Loads Flipper in React Native templates. Call this in the onCreate method with something like
   * initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
   *
   * @param context
   * @param reactInstanceManager
   */
  private static void initializeFlipper(
      Context context, ReactInstanceManager reactInstanceManager) {
    if (BuildConfig.DEBUG) {
      try {
        /*
         We use reflection here to pick up the class that initializes Flipper,
        since Flipper library is not available in release mode
        */
        Class<?> aClass = Class.forName("com.rn.ReactNativeFlipper");
        aClass
            .getMethod("initializeFlipper", Context.class, ReactInstanceManager.class)
            .invoke(null, context, reactInstanceManager);
      } catch (ClassNotFoundException e) {
        e.printStackTrace();
      } catch (NoSuchMethodException e) {
        e.printStackTrace();
      } catch (IllegalAccessException e) {
        e.printStackTrace();
      } catch (InvocationTargetException e) {
        e.printStackTrace();
      }
    }
  }
}
