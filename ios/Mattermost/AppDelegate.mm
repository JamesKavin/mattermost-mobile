#import "AppDelegate.h"

#import <AVFoundation/AVFoundation.h>

#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>
#import <React/RCTAppSetupUtils.h>

#import <RNKeychain/RNKeychainManager.h>
#import <ReactNativeNavigation/ReactNativeNavigation.h>
#import <UserNotifications/UserNotifications.h>
#import <RNHWKeyboardEvent.h>

#import "Mattermost-Swift.h"
#import <os/log.h>

#if RCT_NEW_ARCH_ENABLED
#import <React/CoreModulesPlugins.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTFabricSurfaceHostingProxyRootView.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <react/config/ReactNativeConfig.h>

static NSString *const kRNConcurrentRoot = @"concurrentRoot";

@interface AppDelegate () <RCTCxxBridgeDelegate, RCTTurboModuleManagerDelegate> {
  RCTTurboModuleManager *_turboModuleManager;
  RCTSurfacePresenterBridgeAdapter *_bridgeAdapter;
  std::shared_ptr<const facebook::react::ReactNativeConfig> _reactNativeConfig;
  facebook::react::ContextContainer::Shared _contextContainer;
}
@end
#endif

@implementation AppDelegate

NSString* const NOTIFICATION_MESSAGE_ACTION = @"message";
NSString* const NOTIFICATION_CLEAR_ACTION = @"clear";
NSString* const NOTIFICATION_UPDATE_BADGE_ACTION = @"update_badge";
NSString* const NOTIFICATION_TEST_ACTION = @"test";

-(void)application:(UIApplication *)application handleEventsForBackgroundURLSession:(NSString *)identifier completionHandler:(void (^)(void))completionHandler {
  os_log(OS_LOG_DEFAULT, "Mattermost will attach session from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier);
  [[GekidouWrapper default] attachSession:identifier completionHandler:completionHandler];
  os_log(OS_LOG_DEFAULT, "Mattermost session ATTACHED from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier);
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  RCTAppSetupPrepareApp(application);

  if ( UI_USER_INTERFACE_IDIOM() == UIUserInterfaceIdiomPad )
  {
    _allowRotation = YES;
  }
  
  // Clear keychain on first run in case of reinstallation
  if (![[NSUserDefaults standardUserDefaults] objectForKey:@"FirstRun"]) {

    RNKeychainManager *keychain = [[RNKeychainManager alloc] init];
    NSArray<NSString*> *servers = [keychain getAllServersForInternetPasswords];
    NSLog(@"Servers %@", servers);
    for (NSString *server in servers) {
      [keychain deleteCredentialsForServer:server];
    }

    [[NSUserDefaults standardUserDefaults] setValue:@YES forKey:@"FirstRun"];
    [[NSUserDefaults standardUserDefaults] synchronize];
  }

  [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback error: nil];

  [RNNotifications startMonitorNotifications];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  if (@available(iOS 13.0, *)) {
     self.window.backgroundColor = [UIColor systemBackgroundColor];
  } else {
     self.window.backgroundColor = [UIColor whiteColor];
  }
  [self.window makeKeyWindow];

  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];

  #if RCT_NEW_ARCH_ENABLED
   _contextContainer = std::make_shared<facebook::react::ContextContainer const>();
   _reactNativeConfig = std::make_shared<facebook::react::EmptyReactNativeConfig const>();
   _contextContainer->insert("ReactNativeConfig", _reactNativeConfig);
   _bridgeAdapter = [[RCTSurfacePresenterBridgeAdapter alloc] initWithBridge:bridge contextContainer:_contextContainer];
   bridge.surfacePresenter = _bridgeAdapter.surfacePresenter;
  #endif

  [ReactNativeNavigation bootstrapWithBridge:bridge];

  os_log(OS_LOG_DEFAULT, "Mattermost started!!");

  return YES;
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [RNNotifications didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [RNNotifications didFailToRegisterForRemoteNotificationsWithError:error];
}

// Required for the notification event.

-(void)application:(UIApplication *)application didReceiveRemoteNotification:(nonnull NSDictionary *)userInfo fetchCompletionHandler:(nonnull void (^)(UIBackgroundFetchResult))completionHandler {
  UIApplicationState state = [UIApplication sharedApplication].applicationState;
  NSString* action = [userInfo objectForKey:@"type"];
  BOOL isClearAction = (action && [action isEqualToString: NOTIFICATION_CLEAR_ACTION]);
  BOOL isTestAction = (action && [action isEqualToString: NOTIFICATION_TEST_ACTION]);
  
  if (isTestAction) {
    completionHandler(UIBackgroundFetchResultNoData);
    return;
  }

  if (isClearAction) {
    // When CRT is OFF:
    // If received a notification that a channel was read, remove all notifications from that channel (only with app in foreground/background)
    // When CRT is ON:
    // When rootId is nil, clear channel's root post notifications or else clear all thread notifications
    [[NotificationHelper default] clearChannelOrThreadNotificationsWithUserInfo:userInfo];
    [[GekidouWrapper default] postNotificationReceipt:userInfo];
  }
  
  if (state != UIApplicationStateActive || isClearAction) {
    [RNNotifications didReceiveBackgroundNotification:userInfo withCompletionHandler:completionHandler];
  } else {
    completionHandler(UIBackgroundFetchResultNewData);
  }
}

// Required for deeplinking
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
  return [RCTLinkingManager application:application openURL:url sourceApplication:sourceApplication annotation:annotation];
}

// Only if your app is using [Universal Links](https://developer.apple.com/library/prerelease/ios/documentation/General/Conceptual/AppSearch/UniversalLinks.html).
- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity
 restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> *restorableObjects))restorationHandler
{
  return [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
}

-(void)applicationDidBecomeActive:(UIApplication *)application {
  [[GekidouWrapper default] setPreference:@"true" forKey:@"ApplicationIsForeground"];
}

-(void)applicationWillResignActive:(UIApplication *)application {
  [[GekidouWrapper default] setPreference:@"false" forKey:@"ApplicationIsForeground"];
}

-(void)applicationDidEnterBackground:(UIApplication *)application {
  [[GekidouWrapper default] setPreference:@"false" forKey:@"ApplicationIsForeground"];
}

-(void)applicationWillTerminate:(UIApplication *)application {
  [[GekidouWrapper default] setPreference:@"false" forKey:@"ApplicationIsForeground"];
}

- (UIInterfaceOrientationMask)application:(UIApplication *)application supportedInterfaceOrientationsForWindow:(UIWindow *)window {
  if (_allowRotation == YES) {
        return UIInterfaceOrientationMaskAllButUpsideDown;
    }else{
        return (UIInterfaceOrientationMaskPortrait);
    }
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge
{
  NSMutableArray<id<RCTBridgeModule>> *extraModules = [NSMutableArray new];
  [extraModules addObjectsFromArray:[ReactNativeNavigation extraModulesForBridge:bridge]];
  
  // You can inject any extra modules that you would like here, more information at:
  // https://facebook.github.io/react-native/docs/native-modules-ios.html#dependency-injection
  return extraModules;
}

/*
  https://mattermost.atlassian.net/browse/MM-10601
  Required by react-native-hw-keyboard-event
  (https://github.com/emilioicai/react-native-hw-keyboard-event)
*/
RNHWKeyboardEvent *hwKeyEvent = nil;
- (NSMutableArray<UIKeyCommand *> *)keyCommands {
  if (hwKeyEvent == nil) {
    hwKeyEvent = [[RNHWKeyboardEvent alloc] init];
  }
  
  NSMutableArray *commands = [NSMutableArray new];
  
  if ([hwKeyEvent isListening]) {
    UIKeyCommand *enter = [UIKeyCommand keyCommandWithInput:@"\r" modifierFlags:0 action:@selector(sendEnter:)];
    UIKeyCommand *shiftEnter = [UIKeyCommand keyCommandWithInput:@"\r" modifierFlags:UIKeyModifierShift action:@selector(sendShiftEnter:)];
    UIKeyCommand *findChannels = [UIKeyCommand keyCommandWithInput:@"k" modifierFlags:UIKeyModifierCommand action:@selector(sendFindChannels:)];
    if (@available(iOS 13.0, *)) {
      [enter setTitle:@"Send message"];
      [enter setDiscoverabilityTitle:@"Send message"];
      [shiftEnter setTitle:@"Add new line"];
      [shiftEnter setDiscoverabilityTitle:@"Add new line"];
      [findChannels setTitle:@"Find channels"];
      [findChannels setDiscoverabilityTitle:@"Find channels"];
    }
    if (@available(iOS 15.0, *)) {
      [enter setWantsPriorityOverSystemBehavior:YES];
      [shiftEnter setWantsPriorityOverSystemBehavior:YES];
      [findChannels setWantsPriorityOverSystemBehavior:YES];
    }
    
    [commands addObject: enter];
    [commands addObject: shiftEnter];
    [commands addObject: findChannels];
  }
  
  return commands;
}

- (void)sendEnter:(UIKeyCommand *)sender {
  NSString *selected = sender.input;
  [hwKeyEvent sendHWKeyEvent:@"enter"];
}
- (void)sendShiftEnter:(UIKeyCommand *)sender {
  NSString *selected = sender.input;
  [hwKeyEvent sendHWKeyEvent:@"shift-enter"];
}
- (void)sendFindChannels:(UIKeyCommand *)sender {
  NSString *selected = sender.input;
  [hwKeyEvent sendHWKeyEvent:@"find-channels"];
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feture is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
  // Switch this bool to turn on and off the concurrent root
  return false;
}
- (NSDictionary *)prepareInitialProps
{
  NSMutableDictionary *initProps = [NSMutableDictionary new];
#ifdef RCT_NEW_ARCH_ENABLED
  initProps[kRNConcurrentRoot] = @([self concurrentRootEnabled]);
#endif
  return initProps;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  #if DEBUG
    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
  #else
    return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
  #endif
}

#if RCT_NEW_ARCH_ENABLED
#pragma mark - RCTCxxBridgeDelegate
- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge
                                                             delegate:self
                                                            jsInvoker:bridge.jsCallInvoker];
  return RCTAppSetupDefaultJsExecutorFactory(bridge, _turboModuleManager);
}
#pragma mark RCTTurboModuleManagerDelegate
- (Class)getModuleClassFromName:(const char *)name
{
  return RCTCoreModulesClassProvider(name);
}
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                      jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
  return nullptr;
}
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                     initParams:
                                                         (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return nullptr;
}
- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
  return RCTAppSetupDefaultModuleFromClass(moduleClass);
}
#endif

@end
