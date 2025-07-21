// Updated AppNavigator.tsx - Fixed circular import issue

import React, { useState, useEffect, createContext, useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, ActivityIndicator, View, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import ServiceListScreen from '../screens/ServiceListScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';
import BookingSummaryScreen from '../screens/BookingSummaryScreen';
import BookingDateTimeScreen from '../screens/BookingDateTimeScreen';
import BookingsScreen from '../screens/BookingsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Provider-specific screens
import ProviderHomeScreen from '../screens/provider/ProviderHomeScreen';
import ServiceQueueScreen from '../screens/provider/ServiceQueueScreen';
import ServiceManagementScreen from '../screens/provider/ServiceManagementScreen';
import EarningsScreen from '../screens/provider/EarningsScreen';
import ShopDetailsScreen from '../screens/provider/ShopDetailsScreen';
import InvoiceGeneratorScreen from '../screens/provider/InvoiceGeneratorScreen';

// Profile related screens
import NotificationsScreen from '../screens/NotificationsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import TermsConditionsScreen from '../screens/TermsConditionsScreen';

// Auth screens - Import directly instead of AuthNavigator to avoid circular dependency
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Import Service type
import type { Service } from '../services/types/service';

// Notification Context
interface NotificationContextType {
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notificationCount: 0,
  setNotificationCount: () => {},
  refreshNotifications: async () => {},
});

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// Account Type Context
interface AccountContextType {
  accountType: 'provider' | 'consumer';
  setAccountType: (type: 'provider' | 'consumer') => void;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType>({
  accountType: 'consumer',
  setAccountType: () => {},
  isLoading: false,
});

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return context;
};

// Notification Provider Component
const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const { accountType } = useAccount();

  const refreshNotifications = async () => {
    try {
      // Mock notification count based on account type
      setNotificationCount(accountType === 'provider' ? 2 : 3);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    refreshNotifications();
  }, [accountType]);

  return (
    <NotificationContext.Provider 
      value={{ 
        notificationCount, 
        setNotificationCount, 
        refreshNotifications 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Account Provider Component
const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accountType, setAccountTypeState] = useState<'provider' | 'consumer'>('consumer');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccountType();
  }, []);

  const loadAccountType = async () => {
    try {
      const savedAccountType = await AsyncStorage.getItem('accountType');
      if (savedAccountType && (savedAccountType === 'provider' || savedAccountType === 'consumer')) {
        setAccountTypeState(savedAccountType);
      }
    } catch (error) {
      console.error('Error loading account type:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setAccountType = async (type: 'provider' | 'consumer') => {
    try {
      setIsLoading(true);
      await AsyncStorage.setItem('accountType', type);
      setAccountTypeState(type);
      
      setTimeout(() => {
        setIsLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error saving account type:', error);
      setIsLoading(false);
    }
  };

  return (
    <AccountContext.Provider value={{ accountType, setAccountType, isLoading }}>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </AccountContext.Provider>
  );
};

// Shop interface for ShopDetails
export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  isActive: boolean;
  openingHours: string;
  services: string[];
  imageUrl?: string;
  weeklyTemplate?: any;
  dailySchedules?: any[];
  advanceBookingDays?: number;
  slotDuration?: number;
  bufferTime?: number;
  autoApproval?: boolean;
  timeZone?: string;
}

// Updated Types
export type RootStackParamList = {
  // Auth Screens
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Main App Screens
  ConsumerTabs: {
    screen?: 'HomeTab' | 'BookingsTab' | 'FavoritesTab' | 'ProfileTab';
  } | undefined;
  ProviderTabs: {
    screen?: 'ProviderHomeTab' | 'QueueTab' | 'ServicesTab' | 'EarningsTab' | 'ProfileTab';
  } | undefined;
  
  // Consumer Screens
  Home: undefined;
  ServiceList: { category: string; categoryId: string };
  ServiceDetail: { 
    service: Service;
    serviceId?: string;
  } | {
    serviceId: string;
    service?: Service;
  };
  BookingSummary: { 
    selectedServices: Array<{
      id: string;
      name: string;
      price: string;
      duration: string;
    }>;
    totalPrice: number;
  };
  BookingDateTime: { serviceId: string };
  Bookings: undefined;
  Favorites: undefined;
  Profile: undefined;
  
  // Provider Screens
  ProviderHome: undefined;
  ServiceQueue: undefined;
  ServiceManagement: undefined;
  Earnings: undefined;
  ShopDetails: {
    shop?: Shop;
    onSave?: (shop: Shop) => void;
  } | undefined;
  InvoiceGenerator: undefined;
  
  // Profile Related Screens
  Notifications: undefined;
  Privacy: undefined;
  PaymentMethods: undefined;
  HelpCenter: undefined;
  TermsConditions: undefined;
  
  // Payment related
  Payment: {
    selectedServices: Array<{
      id: string;
      name: string;
      price: string;
      duration: string;
    }>;
    totalPrice: number;
    selectedDate: string;
    selectedTime: string;
  };
};

type ConsumerTabParamList = {
  HomeTab: undefined;
  BookingsTab: undefined;
  FavoritesTab: undefined;
  ProfileTab: undefined;
};

type ProviderTabParamList = {
  ProviderHomeTab: undefined;
  QueueTab: undefined;
  ServicesTab: undefined;
  EarningsTab: undefined;
  ProfileTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const ConsumerTab = createBottomTabNavigator<ConsumerTabParamList>();
const ProviderTab = createBottomTabNavigator<ProviderTabParamList>();

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// Notification Badge Component
const NotificationBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  
  return (
    <View style={{
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    }}>
      <Text style={{
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
      }}>
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </View>
  );
};

// Consumer Tab Navigator
const ConsumerTabs = () => {
  const { notificationCount } = useNotifications();
  
  return (
    <ConsumerTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'BookingsTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'FavoritesTab') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else {
            iconName = focused ? 'person' : 'person-outline';
          }

          return (
            <View style={{ position: 'relative' }}>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'ProfileTab' && notificationCount > 0 && (
                <NotificationBadge count={notificationCount} />
              )}
            </View>
          );
        },
        tabBarActiveTintColor: '#1A2533',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <ConsumerTab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <ConsumerTab.Screen 
        name="BookingsTab" 
        component={BookingsScreen}
        options={{ title: 'Bookings' }}
      />
      <ConsumerTab.Screen 
        name="FavoritesTab" 
        component={FavoritesScreen}
        options={{ title: 'Favorites' }}
      />
      <ConsumerTab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </ConsumerTab.Navigator>
  );
};

// Provider Tab Navigator
const ProviderTabs = () => {
  const { notificationCount } = useNotifications();
  
  return (
    <ProviderTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'ProviderHomeTab') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'QueueTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'ServicesTab') {
            iconName = focused ? 'construct' : 'construct-outline';
          } else if (route.name === 'EarningsTab') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else {
            iconName = focused ? 'person' : 'person-outline';
          }

          return (
            <View style={{ position: 'relative' }}>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'ProfileTab' && notificationCount > 0 && (
                <NotificationBadge count={notificationCount} />
              )}
            </View>
          );
        },
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <ProviderTab.Screen 
        name="ProviderHomeTab" 
        component={ProviderHomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <ProviderTab.Screen 
        name="QueueTab" 
        component={ServiceQueueScreen}
        options={{ title: 'Queue' }}
      />
      <ProviderTab.Screen 
        name="ServicesTab" 
        component={ServiceManagementScreen}
        options={{ title: 'Services' }}
      />
      <ProviderTab.Screen 
        name="EarningsTab" 
        component={EarningsScreen}
        options={{ title: 'Earnings' }}
      />
      <ProviderTab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </ProviderTab.Navigator>
  );
};

// Auth Navigator - Inline to avoid circular dependency
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

// Loading Component for Account Switch
const AccountSwitchLoader = () => {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F8F9F8',
    }}>
      <ActivityIndicator size="large" color="#1A2533" />
      <Text style={{
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
      }}>
        Switching account mode...
      </Text>
    </View>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { accountType, isLoading } = useAccount();

  if (isLoading) {
    return <AccountSwitchLoader />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      {accountType === 'consumer' ? (
        <>
          {/* Consumer Navigation Stack */}
          <Stack.Screen 
            name="ConsumerTabs" 
            component={ConsumerTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="ServiceList" 
            component={ServiceListScreen} 
            options={({ route }) => ({
              title: route.params?.category || 'Services',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            })}
          />
          <Stack.Screen 
            name="ServiceDetail" 
            component={ServiceDetailScreen} 
            options={{
              title: 'Service',
              headerShown: false,
              presentation: 'card',
            }}
          />
          <Stack.Screen 
            name="BookingSummary" 
            component={BookingSummaryScreen} 
            options={{ 
              title: 'Booking Summary',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="BookingDateTime" 
            component={BookingDateTimeScreen}
            options={{ 
              title: 'Select Date & Time',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          {/* Profile Related Screens */}
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{
              title: 'Notifications',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="Privacy" 
            component={PrivacyScreen}
            options={{
              title: 'Privacy Settings',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="PaymentMethods" 
            component={PaymentMethodsScreen}
            options={{
              title: 'Payment Methods',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="HelpCenter" 
            component={HelpCenterScreen}
            options={{
              title: 'Help Center',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="TermsConditions" 
            component={TermsConditionsScreen}
            options={{
              title: 'Terms & Conditions',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
        </>
      ) : (
        <>
          {/* Provider Navigation Stack */}
          <Stack.Screen 
            name="ProviderTabs" 
            component={ProviderTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="ServiceManagement" 
            component={ServiceManagementScreen} 
            options={{
              title: 'Manage Services',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="Earnings" 
            component={EarningsScreen} 
            options={{
              title: 'Earnings Report',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="ShopDetails" 
            component={ShopDetailsScreen}
            options={({ route }) => ({
              title: route.params?.shop ? 'Edit Shop' : 'Add New Shop',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            })}
          />
          <Stack.Screen 
            name="InvoiceGenerator" 
            component={InvoiceGeneratorScreen}
            options={{
              title: 'Generate Invoice',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
              presentation: 'modal',
            }}
          />
          {/* Profile Related Screens - Provider versions */}
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{
              title: 'Notifications',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="Privacy" 
            component={PrivacyScreen}
            options={{
              title: 'Privacy Settings',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="PaymentMethods" 
            component={PaymentMethodsScreen}
            options={{
              title: 'Payment Methods',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="HelpCenter" 
            component={HelpCenterScreen}
            options={{
              title: 'Help Center',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
          <Stack.Screen 
            name="TermsConditions" 
            component={TermsConditionsScreen}
            options={{
              title: 'Terms & Conditions',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#000000',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

// Root Navigator - FIXED VERSION (removed circular dependency)
const RootNavigator = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <SplashScreen />;
  }

  return (
    <AccountProvider>
      <StatusBar barStyle="dark-content" />
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </AccountProvider>
  );
};

export default RootNavigator;
export { useAccount, useNotifications };