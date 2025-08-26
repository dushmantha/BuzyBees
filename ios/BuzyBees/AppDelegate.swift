import UIKit
import React_RCTAppDelegate
import React
import UserNotifications

@main
class AppDelegate: RCTAppDelegate {
  
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    self.moduleName = "Qwiken"
    
    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]
    
    // Configure UserNotifications
    let center = UNUserNotificationCenter.current()
    center.delegate = self
    
    // Check current notification settings
    center.getNotificationSettings { settings in
      print("Current notification status: \(settings.authorizationStatus.rawValue)")
      
      switch settings.authorizationStatus {
      case .notDetermined:
        // First time - request permissions
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
          if granted {
            print("Push notification permissions granted")
            DispatchQueue.main.async {
              application.registerForRemoteNotifications()
            }
          } else {
            print("Push notification permissions denied")
          }
          
          if let error = error {
            print("Error requesting permissions: \(error)")
          }
        }
        
      case .authorized, .provisional, .ephemeral:
        // Already authorized - register for remote notifications
        print("Push notifications already authorized")
        DispatchQueue.main.async {
          application.registerForRemoteNotifications()
        }
        
      case .denied:
        // User denied - we can't request again programmatically
        print("Push notifications denied by user")
        
      @unknown default:
        print("Unknown authorization status")
      }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
  
  // MARK: - Push Notification Registration
  
  override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
    let token = tokenParts.joined()
    print("Device Token: \(token)")
  }
  
  override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("Failed to register for remote notifications: \(error)")
  }
  
  override func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    print("Received remote notification: \(userInfo)")
    completionHandler(.newData)
  }
}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {
  // Called when a notification is delivered to a foreground app.
  func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.alert, .badge, .sound])
  }
  
  // Called when user interacts with notification
  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    print("User interacted with notification: \(response)")
    completionHandler()
  }
}
