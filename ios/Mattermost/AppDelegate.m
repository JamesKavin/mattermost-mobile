#import "AppDelegate.h"
#import <AVFoundation/AVFoundation.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>

#import <UMCore/UMModuleRegistry.h>
#import <UMReactNativeAdapter/UMNativeModulesProxy.h>
#import <UMReactNativeAdapter/UMModuleRegistryAdapter.h>
#import <ReactNativeNavigation/ReactNativeNavigation.h>
#import <UploadAttachments/UploadAttachments-Swift.h>
#import <DatabaseHelper/DatabaseHelper-Swift.h>
#import <UserNotifications/UserNotifications.h>
#import <RNHWKeyboardEvent.h>

#import "Mattermost-Swift.h"
#import <os/log.h>

@interface AppDelegate () <RCTBridgeDelegate>
 
@property (nonatomic, strong) UMModuleRegistryAdapter *moduleRegistryAdapter;
 
@end

@implementation AppDelegate

NSString* const NOTIFICATION_MESSAGE_ACTION = @"message";
NSString* const NOTIFICATION_CLEAR_ACTION = @"clear";
NSString* const NOTIFICATION_UPDATE_BADGE_ACTION = @"update_badge";

-(void)application:(UIApplication *)application handleEventsForBackgroundURLSession:(NSString *)identifier completionHandler:(void (^)(void))completionHandler {
  os_log(OS_LOG_DEFAULT, "Mattermost will attach session from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier);
  [[UploadSession shared] attachSessionWithIdentifier:identifier completionHandler:completionHandler];
  os_log(OS_LOG_DEFAULT, "Mattermost session ATTACHED from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier);
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  #if DEBUG
    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
  #else
    return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
  #endif
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleRegistryAdapter = [[UMModuleRegistryAdapter alloc] initWithModuleRegistryProvider:[[UMModuleRegistryProvider alloc] init]];

  // Clear keychain on first run in case of reinstallation
  if (![[NSUserDefaults standardUserDefaults] objectForKey:@"FirstRun"]) {

    NSString *service = [[NSBundle mainBundle] bundleIdentifier];
    NSDictionary *query = @{
                            (__bridge NSString *)kSecClass: (__bridge id)(kSecClassGenericPassword),
                            (__bridge NSString *)kSecAttrService: service,
                            (__bridge NSString *)kSecReturnAttributes: (__bridge id)kCFBooleanTrue,
                            (__bridge NSString *)kSecReturnData: (__bridge id)kCFBooleanFalse
                            };

    SecItemDelete((__bridge CFDictionaryRef) query);

    [[NSUserDefaults standardUserDefaults] setValue:@YES forKey:@"FirstRun"];
    [[NSUserDefaults standardUserDefaults] synchronize];
  }

  [ReactNativeNavigation bootstrapWithDelegate:self launchOptions:launchOptions];

  [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback error: nil];

  [RNNotifications startMonitorNotifications];

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
  NSString* channelId = [userInfo objectForKey:@"channel_id"];
  NSString* ackId = [userInfo objectForKey:@"ack_id"];
  
  NSString* serverUrl = [userInfo objectForKey:@"server_url"];
  if (serverUrl == nil) {
    NSString* onlyServerUrl = [[DatabaseHelper default] getOnlyServerUrlObjc];
    if ([onlyServerUrl length] > 0) {
      serverUrl = onlyServerUrl;
    }
  }

  RuntimeUtils *utils = [[RuntimeUtils alloc] init];

  if ((action && [action isEqualToString: NOTIFICATION_CLEAR_ACTION]) || (state == UIApplicationStateInactive)) {
    // If received a notification that a channel was read, remove all notifications from that channel (only with app in foreground/background)
    [self cleanNotificationsFromChannel:channelId];
  }
  
  // TODO: Fetch channel data if action is of type message

  [[UploadSession shared] notificationReceiptWithNotificationId:ackId serverUrl:serverUrl receivedAt:round([[NSDate date] timeIntervalSince1970] * 1000.0) type:action];
  [utils delayWithSeconds:0.2 closure:^(void) {
    // This is to notify the NotificationCenter that something has changed.
    completionHandler(UIBackgroundFetchResultNewData);
  }];
}

-(void)cleanNotificationsFromChannel:(NSString *)channelId {
  if ([UNUserNotificationCenter class]) {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    [center getDeliveredNotificationsWithCompletionHandler:^(NSArray<UNNotification *> * _Nonnull notifications) {
      NSMutableArray<NSString *> *notificationIds = [NSMutableArray new];

      for (UNNotification *prevNotification in notifications) {
        UNNotificationRequest *notificationRequest = [prevNotification request];
        UNNotificationContent *notificationContent = [notificationRequest content];
        NSString *identifier = [notificationRequest identifier];
        NSString* cId = [[notificationContent userInfo] objectForKey:@"channel_id"];

        if ([cId isEqualToString: channelId]) {
          [notificationIds addObject:identifier];
        }
      }

      [center removeDeliveredNotificationsWithIdentifiers:notificationIds];
    }];
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

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge
{
  NSMutableArray<id<RCTBridgeModule>> *extraModules = [NSMutableArray new];
  [extraModules addObjectsFromArray:[ReactNativeNavigation extraModulesForBridge:bridge]];
  [extraModules addObjectsFromArray:[_moduleRegistryAdapter extraModulesForBridge:bridge]];
  
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
  NSMutableArray *keys = [NSMutableArray new];
  if (hwKeyEvent == nil) {
    hwKeyEvent = [[RNHWKeyboardEvent alloc] init];
  }
  if ([hwKeyEvent isListening]) {
    [keys addObject: [UIKeyCommand keyCommandWithInput:@"\r" modifierFlags:0 action:@selector(sendEnter:)]];
    [keys addObject: [UIKeyCommand keyCommandWithInput:@"\r" modifierFlags:UIKeyModifierShift action:@selector(sendShiftEnter:)]];
  }
  return keys;
}

- (void)sendEnter:(UIKeyCommand *)sender {
  NSString *selected = sender.input;
  [hwKeyEvent sendHWKeyEvent:@"enter"];
}
- (void)sendShiftEnter:(UIKeyCommand *)sender {
  NSString *selected = sender.input;
  [hwKeyEvent sendHWKeyEvent:@"shift-enter"];
}
@end
