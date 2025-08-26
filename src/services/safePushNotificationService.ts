import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface NotificationPayload {
  title: string;
  message: string;
  data?: any;
  userId?: string;
}

export interface DeviceToken {
  id?: string;
  user_id: string;
  device_token: string;
  device_type: 'ios' | 'android';
  app_version?: string;
  device_info?: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

class SafePushNotificationService {
  private isInitialized = false;
  private deviceToken: string | null = null;
  private PushNotification: any = null;
  private PushNotificationIOS: any = null;
  private hasNativeModule = false;

  constructor() {
    // Don't initialize anything in constructor
  }

  // Safely check if native modules are available
  private async checkNativeModules(): Promise<boolean> {
    try {
      // Check if the native module actually exists first
      const { NativeModules } = require('react-native');
      
      if (Platform.OS === 'ios') {
        this.hasNativeModule = !!NativeModules.RNCPushNotificationIOS;
      } else {
        this.hasNativeModule = !!NativeModules.RNPushNotification;
      }
      
      if (!this.hasNativeModule) {
        console.warn('⚠️ Push notification native module not found. Please rebuild the app.');
        return false;
      }

      // Only require modules if native modules exist
      if (Platform.OS === 'ios') {
        const pushNotificationIOSModule = require('@react-native-community/push-notification-ios');
        this.PushNotificationIOS = pushNotificationIOSModule.default || pushNotificationIOSModule;
      }
      
      const pushNotificationModule = require('react-native-push-notification');
      this.PushNotification = pushNotificationModule.default || pushNotificationModule;
      
      return true;
    } catch (error) {
      console.warn('⚠️ Push notification modules not available:', error);
      return false;
    }
  }

  configure = async () => {
    if (this.isInitialized) return true;

    try {
      console.log('🔔 Checking push notification availability...');
      
      // Check if native modules are available
      const modulesAvailable = await this.checkNativeModules();
      if (!modulesAvailable) {
        console.warn('⚠️ Push notifications not available on this device');
        return false;
      }

      console.log('🔔 Configuring push notifications...');
      
      // Don't register here - will be done after permission request
      
      // Import Importance only when needed for Android
      let Importance: any;
      if (Platform.OS === 'android') {
        const pushModule = require('react-native-push-notification');
        Importance = pushModule.Importance;
      }

      // Configure push notifications
      this.PushNotification.configure({
        onRegister: async (token: any) => {
          console.log('📱 Device token received:', token.token);
          this.deviceToken = token.token;
          await this.saveDeviceToken(token.token);
        },

        onNotification: (notification: any) => {
          console.log('🔔 Notification received:', notification);
          
          // Handle notification tap
          if (notification.userInteraction) {
            this.handleNotificationTap(notification);
          }

          // Required on iOS only
          if (Platform.OS === 'ios' && this.PushNotificationIOS) {
            notification.finish(this.PushNotificationIOS.FetchResult.NoData);
          }
        },

        onAction: (notification: any) => {
          console.log('🔔 Notification action:', notification.action);
        },

        onRegistrationError: (err: Error) => {
          console.error('❌ Push notification registration error:', err);
        },

        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        popInitialNotification: true,
        requestPermissions: false, // We'll handle this manually
      });

      // Create notification channel for Android
      if (Platform.OS === 'android' && Importance) {
        this.PushNotification.createChannel(
          {
            channelId: 'qwiken-default',
            channelName: 'Qwiken Notifications',
            channelDescription: 'Default notification channel for Qwiken app',
            playSound: true,
            soundName: 'default',
            importance: Importance.HIGH,
            vibrate: true,
          },
          (created: boolean) => console.log(`🔔 Created channel returned '${created}'`)
        );
      }

      this.isInitialized = true;
      console.log('✅ Push notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize push notification service:', error);
      this.isInitialized = false;
      return false;
    }
  };

  // Check current notification permission status
  checkPermissions = async (): Promise<{ granted: boolean; alert?: boolean; badge?: boolean; sound?: boolean }> => {
    try {
      if (!this.isInitialized || !this.hasNativeModule) {
        console.warn('⚠️ Push notification service not properly initialized for permission check');
        return { granted: false };
      }

      if (Platform.OS === 'ios' && this.PushNotificationIOS) {
        const permissions = await this.PushNotificationIOS.checkPermissions();
        console.log('📱 iOS Permissions:', permissions);
        return {
          granted: !!(permissions.alert || permissions.badge || permissions.sound),
          alert: permissions.alert,
          badge: permissions.badge,
          sound: permissions.sound
        };
      } else if (Platform.OS === 'android') {
        // Android permissions are handled automatically
        return { granted: true };
      }
      
      return { granted: false };
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return { granted: false };
    }
  };

  // Request notification permissions
  requestPermissions = async (): Promise<boolean> => {
    try {
      if (!this.isInitialized) {
        const configured = await this.configure();
        if (!configured) return false;
      }

      if (Platform.OS === 'ios' && this.PushNotificationIOS) {
        return new Promise((resolve) => {
          console.log('📱 Requesting iOS push permissions...');
          
          // Set up listeners first
          this.PushNotificationIOS.addEventListener('register', (token: string) => {
            console.log('📱 iOS Device Token received:', token);
            this.deviceToken = token;
            this.saveDeviceToken(token);
          });
          
          this.PushNotificationIOS.addEventListener('registrationError', (error: any) => {
            console.error('📱 iOS Registration Error:', error);
          });
          
          // Request permissions with proper callback structure
          const permissionOptions = {
            alert: true,
            badge: true,
            sound: true,
          };
          
          // Use the callback-based approach for iOS
          try {
            this.PushNotificationIOS.requestPermissions(permissionOptions, (permissions: any) => {
              console.log('📱 iOS Permissions response:', permissions);
              
              const granted = !!(permissions.alert || permissions.badge || permissions.sound);
              
              if (granted) {
                console.log('✅ iOS Permissions granted, registering for remote notifications...');
                // Register for remote notifications after permissions are granted
                this.PushNotificationIOS.registerForRemoteNotifications();
                resolve(true);
              } else {
                console.log('❌ iOS Permissions denied');
                console.warn('⚠️ Push notification permissions denied');
                resolve(false);
              }
            });
          } catch (callbackError) {
            console.log('📱 Trying Promise-based approach...');
            // Fallback to Promise-based approach
            this.PushNotificationIOS.requestPermissions(permissionOptions)
              .then((permissions: any) => {
                console.log('📱 iOS Permissions response:', permissions);
                
                const granted = !!(permissions.alert || permissions.badge || permissions.sound);
                
                if (granted) {
                  console.log('✅ iOS Permissions granted, registering for remote notifications...');
                  this.PushNotificationIOS.registerForRemoteNotifications();
                  resolve(true);
                } else {
                  console.log('❌ iOS Permissions denied');
                  console.warn('⚠️ Push notification permissions denied');
                  resolve(false);
                }
              })
              .catch((error: any) => {
                console.error('❌ Error requesting iOS permissions:', error);
                resolve(false);
              });
          }
        });
      } else if (Platform.OS === 'android') {
        // Android permissions are handled automatically
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  };

  // Save device token to Supabase
  saveDeviceToken = async (token: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        console.warn('⚠️ No authenticated user, storing token locally');
        await AsyncStorage.setItem('pending_device_token', token);
        return;
      }

      const deviceTokenData: Omit<DeviceToken, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.data.user.id,
        device_token: token,
        device_type: Platform.OS as 'ios' | 'android',
        app_version: '1.0.0',
        device_info: {
          platform: Platform.OS,
          version: Platform.Version,
        },
        is_active: true,
      };

      // Check if token already exists
      const { data: existingToken } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('user_id', user.data.user.id)
        .eq('device_token', token)
        .single();

      if (existingToken) {
        // Update existing token
        const { error } = await supabase
          .from('device_tokens')
          .update({ 
            is_active: true, 
            updated_at: new Date().toISOString(),
            app_version: deviceTokenData.app_version,
          })
          .eq('id', existingToken.id);

        if (error) {
          console.error('❌ Error updating device token:', error);
        } else {
          console.log('✅ Device token updated in Supabase');
        }
      } else {
        // Insert new token
        const { error } = await supabase
          .from('device_tokens')
          .insert([deviceTokenData]);

        if (error) {
          console.error('❌ Error saving device token:', error);
        } else {
          console.log('✅ Device token saved to Supabase');
        }
      }

      // Store token locally as well
      await AsyncStorage.setItem('device_token', token);

    } catch (error) {
      console.error('❌ Error in saveDeviceToken:', error);
    }
  };

  // Handle pending token when user logs in
  handlePendingToken = async () => {
    try {
      const pendingToken = await AsyncStorage.getItem('pending_device_token');
      if (pendingToken) {
        await this.saveDeviceToken(pendingToken);
        await AsyncStorage.removeItem('pending_device_token');
        console.log('✅ Pending device token processed');
      }
    } catch (error) {
      console.error('❌ Error handling pending token:', error);
    }
  };

  // Handle notification tap
  handleNotificationTap = (notification: any) => {
    console.log('👆 User tapped notification:', notification);
    
    // You can navigate to specific screens based on notification data
    if (notification.data) {
      const { type, id, screen } = notification.data;
      
      switch (type) {
        case 'booking_confirmed':
          // Navigate to booking details
          break;
        case 'booking_reminder':
          // Navigate to upcoming bookings
          break;
        case 'new_message':
          // Navigate to messages
          break;
        default:
          // Navigate to home or default screen
          break;
      }
    }
  };

  // Show local notification
  showLocalNotification = (payload: NotificationPayload) => {
    if (!this.isInitialized || !this.PushNotification) {
      console.warn('⚠️ Push notifications not initialized');
      return;
    }

    this.PushNotification.localNotification({
      title: payload.title,
      message: payload.message,
      playSound: true,
      soundName: 'default',
      userInfo: payload.data || {},
      channelId: Platform.OS === 'android' ? 'qwiken-default' : undefined,
    });
  };

  // Send notification via Supabase Edge Function
  sendNotification = async (payload: NotificationPayload & { targetUserId: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: payload.targetUserId,
          title: payload.title,
          message: payload.message,
          data: payload.data || {},
        },
      });

      if (error) {
        console.error('❌ Error sending notification:', error);
        return { success: false, error };
      }

      console.log('✅ Notification sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error in sendNotification:', error);
      return { success: false, error };
    }
  };

  // Get device token
  getDeviceToken = (): string | null => {
    return this.deviceToken;
  };

  // Clear all notifications
  clearAllNotifications = () => {
    if (!this.PushNotification) return;
    
    this.PushNotification.cancelAllLocalNotifications();
    if (Platform.OS === 'ios' && this.PushNotificationIOS) {
      this.PushNotificationIOS.removeAllDeliveredNotifications();
    }
  };

  // Set badge count (iOS only)
  setBadgeCount = (count: number) => {
    if (Platform.OS === 'ios' && this.PushNotificationIOS) {
      this.PushNotificationIOS.setApplicationIconBadgeNumber(count);
    }
  };

  // Check if push notifications are available
  isAvailable = (): boolean => {
    return this.hasNativeModule && this.isInitialized;
  };

  // Check notification settings
  checkNotificationSettings = async () => {
    if (!this.isInitialized) {
      await this.configure();
    }

    if (Platform.OS === 'ios' && this.PushNotificationIOS) {
      const settings = await this.PushNotificationIOS.checkPermissions();
      return {
        alert: settings.alert === 1,
        badge: settings.badge === 1,
        sound: settings.sound === 1,
      };
    } else {
      // For Android, we'll assume permissions are granted
      return {
        alert: true,
        badge: true,
        sound: true,
      };
    }
  };

  // Open notification settings
  openNotificationSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };
}

export default new SafePushNotificationService();