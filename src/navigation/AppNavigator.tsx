// navigation/AppNavigator.tsx - FINAL FIXED VERSION

import React, { useState, useEffect, createContext, useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, ActivityIndicator, View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIXED IMPORTS - Use named imports from the corrected service
import { supabase, authService } from '../lib/supabase/index';
import type { User, Session } from '@supabase/supabase-js';
import { usePremium } from '../contexts/PremiumContext';
import { QueueBadgeProvider, useQueueBadge } from '../contexts/QueueBadgeContext';
import SplashScreen from '../screens/SplashScreen';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import ServiceListScreen from '../screens/ServiceListScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';
import BookingSummaryScreen from '../screens/BookingSummaryScreen';
import BookingDateTimeScreen from '../screens/BookingDateTimeScreen';
import BookingDateTimeEnhancedScreen from '../screens/BookingDateTimeScreenEnhanced';
import BookingsScreen from '../screens/BookingsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReviewScreen from '../screens/ReviewScreen';
import SearchScreen from '../screens/SearchScreen';

// Provider-specific screens
import ProviderHomeScreen from '../screens/provider/ProviderHomeScreen';
import ServiceQueueScreen from '../screens/provider/ServiceQueueScreen';
import ServiceManagementScreen from '../screens/provider/ServiceManagementScreen';
import EarningsScreen from '../screens/provider/EarningsScreen';
import ShopDetailsScreen from '../screens/provider/ShopDetailsScreen';
import ServiceOptionsScreen from '../screens/provider/ServiceOptionsScreen';
import InvoiceGeneratorScreen from '../screens/provider/InvoiceGeneratorScreen';
import CustomersScreen from '../screens/provider/CustomersScreen';
import AnalyticsScreen from '../screens/provider/AnalyticsScreen';

// Profile related screens
import NotificationsScreen from '../screens/NotificationsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import TermsConditionsScreen from '../screens/TermsConditionsScreen';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Import Service type with fallback
let Service;
try {
  Service = require('../services/types/service').Service;
} catch (error) {
  // Fallback if service types don't exist
  console.warn('Service types not found, using fallback');
}

// ==============================================
// AUTH CONTEXT (Supabase Integration)
// ==============================================

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Auth Provider Component with Supabase
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔄 Getting initial session...');
        
        // Check if supabase is properly imported
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }
        
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log('📱 Initial session:', initialSession?.user?.email || 'No session');
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      } catch (error) {
        console.error('❌ Error getting initial session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email || 'No user');
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('👋 Signing out...');
      setIsLoading(true);
      
      // Check if authService is properly imported
      if (!authService) {
        throw new Error('AuthService not initialized');
      }
      
      const result = await authService.signOut();
      
      if (!result.success) {
        console.error('❌ Sign out failed:', result.error);
      } else {
        console.log('✅ Sign out successful');
      }
    } catch (error) {
      console.error('❌ Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user...');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!session,
        isLoading,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ==============================================
// ACCOUNT CONTEXT (Profile Management)
// ==============================================

interface AccountContextType {
  accountType: 'provider' | 'consumer';
  setAccountType: (type: 'provider' | 'consumer') => void;
  isLoading: boolean;
  userProfile: any;
  refreshProfile: () => Promise<void>;
  isPro: boolean;
}

const AccountContext = createContext<AccountContextType>({
  accountType: 'consumer',
  setAccountType: () => {},
  isLoading: false,
  userProfile: null,
  refreshProfile: async () => {},
  isPro: false,
});

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return context;
};

// Account Provider Component with Supabase integration
const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { isPremium } = usePremium();
  const [accountType, setAccountTypeState] = useState<'provider' | 'consumer'>('consumer');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserProfile();
    } else {
      // Reset profile when user logs out
      setUserProfile(null);
      setAccountTypeState('consumer');
    }
  }, [isAuthenticated, user]);

  // Initialize account type from AsyncStorage only when not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      const loadSavedAccountType = async () => {
        try {
          const savedType = await AsyncStorage.getItem('accountType');
          if (savedType && (savedType === 'provider' || savedType === 'consumer')) {
            setAccountTypeState(savedType as 'provider' | 'consumer');
            console.log('📱 Loaded saved account type for guest:', savedType);
          } else {
            // Default to consumer if no valid saved type
            setAccountTypeState('consumer');
            await AsyncStorage.setItem('accountType', 'consumer');
          }
        } catch (error) {
          console.error('❌ Error loading saved account type:', error);
          setAccountTypeState('consumer');
        }
      };
      
      loadSavedAccountType();
    }
  }, [isAuthenticated]);

  const loadUserProfile = async () => {
    if (!user || !authService) return;
    
    try {
      console.log('📝 Loading user profile for:', user.id);
      setIsLoading(true);
      
      const response = await authService.getUserProfile(user.id);
      console.log('📝 Profile response:', response.success ? 'Success' : response.error);
      
      if (response.success && response.data) {
        setUserProfile(response.data);
        
        // Priority: Database account_type > AsyncStorage > default 'consumer'
        const dbAccountType = response.data.account_type;
        if (dbAccountType && (dbAccountType === 'provider' || dbAccountType === 'consumer')) {
          setAccountTypeState(dbAccountType);
          await AsyncStorage.setItem('accountType', dbAccountType);
          console.log('✅ Profile loaded, account type from DB:', dbAccountType);
        } else {
          // Fallback to AsyncStorage if DB doesn't have account_type
          const savedType = await AsyncStorage.getItem('accountType');
          const finalType = (savedType === 'provider' || savedType === 'consumer') ? savedType : 'consumer';
          setAccountTypeState(finalType);
          
          // Update the profile with the selected account type
          setUserProfile(prev => prev ? { ...prev, account_type: finalType } : {
            id: user.id,
            email: user.email || '',
            first_name: user.user_metadata?.first_name || 'User',
            last_name: user.user_metadata?.last_name || 'Name',
            account_type: finalType,
            is_premium: false
          });
          
          console.log('✅ Profile loaded, using saved account type:', finalType);
        }
      } else {
        console.warn('⚠️ Failed to load profile, creating fallback profile:', response.error);
        
        // Create a fallback profile from auth user data
        const savedType = await AsyncStorage.getItem('accountType');
        const finalType = (savedType === 'provider' || savedType === 'consumer') ? savedType : 'consumer';
        
        const fallbackProfile = {
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || 'User',
          last_name: user.user_metadata?.last_name || 'Name',
          full_name: user.user_metadata?.full_name || `${user.user_metadata?.first_name || 'User'} ${user.user_metadata?.last_name || 'Name'}`,
          phone: user.phone || '',
          account_type: finalType,
          avatar_url: user.user_metadata?.avatar_url || null,
          is_premium: false,
          email_verified: user.email_confirmed_at ? true : false,
          phone_verified: false,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setUserProfile(fallbackProfile);
        setAccountTypeState(finalType);
        await AsyncStorage.setItem('accountType', finalType);
        console.log('✅ Fallback profile created with account type:', finalType);
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      
      // Create emergency fallback profile
      const savedType = await AsyncStorage.getItem('accountType');
      const finalType = (savedType === 'provider' || savedType === 'consumer') ? savedType : 'consumer';
      
      const emergencyProfile = {
        id: user.id,
        email: user.email || 'user@example.com',
        first_name: 'User',
        last_name: 'Name',
        full_name: 'User Name',
        phone: '',
        account_type: finalType,
        avatar_url: null,
        is_premium: false,
        email_verified: false,
        phone_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setUserProfile(emergencyProfile);
      setAccountTypeState(finalType);
      console.log('❌ Emergency profile created with account type:', finalType);
    } finally {
      setIsLoading(false);
    }
  };

  const setAccountType = async (type: 'provider' | 'consumer') => {
    try {
      // Validate the type parameter
      if (!type || (type !== 'provider' && type !== 'consumer')) {
        console.error('❌ Invalid account type:', type);
        return;
      }

      console.log('🔄 Updating account type to:', type);
      setIsLoading(true);
      
      // For authenticated users, update database
      if (user && authService) {
        try {
          // Update the users table directly with account_type
          const { error } = await supabase
            .from('users')
            .update({ account_type: type, updated_at: new Date().toISOString() })
            .eq('id', user.id);
          
          if (error) {
            console.error('❌ Database update failed:', error);
            // Still continue with local update for better UX
          } else {
            console.log('✅ Account type updated successfully in database');
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          // Continue with local update
        }
      }
      
      // Always update local state and AsyncStorage (works for both auth and guest)
      setAccountTypeState(type);
      await AsyncStorage.setItem('accountType', type);
      console.log('✅ Account type updated locally to:', type);
      
      // Update the profile state immediately if available
      if (userProfile) {
        setUserProfile({ ...userProfile, account_type: type });
      }
      
    } catch (error) {
      console.error('❌ Error updating account type:', error);
      // Try to revert the state
      try {
        const savedType = await AsyncStorage.getItem('accountType');
        if (savedType && (savedType === 'provider' || savedType === 'consumer') && savedType !== type) {
          setAccountTypeState(savedType as 'provider' | 'consumer');
        } else {
          // If no valid saved type, default to consumer
          setAccountTypeState('consumer');
          await AsyncStorage.setItem('accountType', 'consumer');
        }
      } catch (revertError) {
        console.error('❌ Error reverting account type:', revertError);
        // Final fallback
        setAccountTypeState('consumer');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    await loadUserProfile();
  };

  return (
    <AccountContext.Provider 
      value={{ 
        accountType, 
        setAccountType, 
        isLoading, 
        userProfile, 
        refreshProfile,
        isPro: isPremium 
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

// ==============================================
// NOTIFICATION CONTEXT
// ==============================================

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

// Notification Provider Component
const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const { accountType } = useAccount();
  const { user } = useAuth();

  const refreshNotifications = async () => {
    if (!user) return;
    
    try {
      // In a real app, this would fetch from Supabase
      // For now, using mock data based on account type
      setNotificationCount(accountType === 'provider' ? 2 : 3);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      refreshNotifications();
    } else {
      setNotificationCount(0);
    }
  }, [accountType, user]);

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

// ==============================================
// TYPES & INTERFACES
// ==============================================

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

// Navigation Types
export type RootStackParamList = {
  // Auth Screens
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Main App Screens
  ConsumerTabs: {
    screen?: 'HomeTab' | 'BookingsTab' | 'FavoritesTab' | 'ProfileTab';
    params?: {
      reviewCompleted?: {
        bookingId: string;
        rating: number;
        comment: string;
      };
    };
  } | undefined;
  ProviderTabs: {
    screen?: 'ProviderHomeTab' | 'QueueTab' | 'ServicesTab' | 'EarningsTab' | 'ProfileTab';
  } | undefined;
  
  // Consumer Screens
  Home: undefined;
  ServiceList: { 
    category: string; 
    categoryId: string;
    showPopular?: boolean;
  };
  ServiceDetail: { 
    service: any; // Using any since Service type might not exist
    serviceId?: string;
  } | {
    serviceId: string;
    service?: any;
  };
  BookingSummary: { 
    selectedServices: Array<{
      id: string;
      name: string;
      price: string;
      duration: string;
    }>;
    totalPrice: number;
    selectedStaff?: any;
  };
  BookingDateTime: { serviceId: string };
  BookingDateTimeEnhanced: {
    selectedServices: Array<{
      id: string;
      name: string;
      price: string;
      duration: string;
    }>;
    totalPrice: number;
    selectedStaff: any;
  };
  Favorites: undefined;
  Profile: undefined;
  Review: {
    booking: {
      id: string;
      shop_id: string;
      staff_id: string;
      service: string;
      professional: string;
      salon: string;
      date: string;
      status: string;
    };
  };
  
  // Provider Screens
  ProviderHome: undefined;
  ServiceQueue: undefined;
  ServiceManagement: undefined;
  Earnings: undefined;
  ShopDetails: {
    shop?: Shop;
    onSave?: (shop: Shop) => void;
  } | undefined;
  ServiceOptions: {
    serviceId?: string;
    serviceName: string;
    shopId: string;
    onGoBack?: () => void;
  };
  InvoiceGenerator: undefined;
  Customers: undefined;
  Analytics: undefined;
  
  // Profile Related Screens
  Notifications: undefined;
  Privacy: undefined;
  PaymentMethods: undefined;
  HelpCenter: undefined;
  TermsConditions: undefined;
  
  // Search Screen (optional)
  Search?: { 
    query?: string;
    initialResults?: any;
    filter?: string;
  };
};

export type ConsumerTabParamList = {
  HomeTab: undefined;
  BookingsTab: {
    reviewCompleted?: {
      bookingId: string;
      rating: number;
      comment: string;
    };
  } | undefined;
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

const RootStack = createNativeStackNavigator<RootStackParamList>();
const ConsumerTab = createBottomTabNavigator<ConsumerTabParamList>();
const ProviderTab = createBottomTabNavigator<ProviderTabParamList>();

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// ==============================================
// COMPONENTS
// ==============================================

// Notification Badge Component
const NotificationBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  
  return (
    <View style={{
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: '#845EC2',
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
  const insets = useSafeAreaInsets();
  
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
        tabBarActiveTintColor: '#00C9A7',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 12,
          height: Math.max(insets.bottom + 65, 85),
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
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
  const { hasNewBooking } = useQueueBadge();
  const insets = useSafeAreaInsets();
  
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
              {route.name === 'QueueTab' && hasNewBooking && (
                <View style={{
                  position: 'absolute',
                  right: -6,
                  top: -3,
                  backgroundColor: '#845EC2',
                  borderRadius: 6,
                  width: 12,
                  height: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }} />
              )}
            </View>
          );
        },
        tabBarActiveTintColor: '#00C9A7',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 12,
          height: Math.max(insets.bottom + 65, 85),
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
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

// Loading Component for Account Switch
const AccountSwitchLoader = () => {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F0FFFE',
    }}>
      <ActivityIndicator size="large" color="#00C9A7" />
      <Text style={{
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
      }}>
        Loading your profile...
      </Text>
    </View>
  );
};

// Common header style configuration
const getHeaderStyle = () => ({
  headerStyle: {
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTitleStyle: {
    fontWeight: '600' as const,
    fontSize: 18,
    color: '#1F2937',
  },
  headerTintColor: '#1F2937',
  headerBackTitle: 'Back',
  headerShadowVisible: false,
});

// Auth Navigator
const AuthNavigator = () => {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F0FFFE' },
      }}
    >
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen name="Register" component={RegisterScreen} />
      <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </RootStack.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { accountType, isLoading } = useAccount();

  if (isLoading) {
    return <AccountSwitchLoader />;
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F0FFFE' },
        ...getHeaderStyle(),
      }}
    >
      {accountType === 'consumer' ? (
        <>
          {/* Consumer Navigation Stack */}
          <RootStack.Screen 
            name="ConsumerTabs" 
            component={ConsumerTabs}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="ServiceList" 
            component={ServiceListScreen} 
            options={({ route }) => ({
              title: route.params?.category || 'Services',
              headerShown: false,
              ...getHeaderStyle(),
            })}
          />
          <RootStack.Screen 
            name="ServiceDetail" 
            component={ServiceDetailScreen} 
            options={{
              title: 'Service',
              headerShown: false,
              presentation: 'card',
            }}
          />
          <RootStack.Screen 
            name="BookingSummary" 
            component={BookingSummaryScreen} 
            options={{ 
              title: 'Booking Summary',
              headerShown: false,
              ...getHeaderStyle(),
            }}
          />
          <RootStack.Screen 
            name="BookingDateTime" 
            component={BookingDateTimeScreen}
            options={{ 
              title: 'Select Date & Time',
              headerShown: false,
              ...getHeaderStyle(),
            }}
          />
          <RootStack.Screen 
            name="BookingDateTimeEnhanced" 
            component={BookingDateTimeEnhancedScreen}
            options={{ 
              title: 'Select Date & Time',
              headerShown: false,
              ...getHeaderStyle(),
            }}
          />
          <RootStack.Screen 
            name="Review" 
            component={ReviewScreen}
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />
          <RootStack.Screen 
            name="Search" 
            component={SearchScreen}
            options={{
              title: 'Search',
              headerShown: false,
              ...getHeaderStyle(),
            }}
          />
        </>
      ) : (
        <>
          {/* Provider Navigation Stack */}
          <RootStack.Screen 
            name="ProviderTabs" 
            component={ProviderTabs}
            options={{ headerShown: false }}
          />
          <RootStack.Screen 
            name="ServiceList" 
            component={ServiceListScreen} 
            options={({ route }) => ({
              title: route.params?.category || 'Services',
              headerShown: false,
              ...getHeaderStyle(),
            })}
          />
          <RootStack.Screen 
            name="ServiceDetail" 
            component={ServiceDetailScreen} 
            options={{
              title: 'Service',
              headerShown: false,
              presentation: 'card',
            }}
          />
          <RootStack.Screen 
            name="ShopDetails" 
            component={ShopDetailsScreen}
            options={({ route }) => ({
              title: route.params?.shop ? 'Edit Shop' : 'Add New Shop',
              headerShown: true,
              ...getHeaderStyle(),
            })}
          />
          <RootStack.Screen 
            name="ServiceOptions" 
            component={ServiceOptionsScreen}
            options={{
              title: 'Service Options',
              headerShown: false,
              presentation: 'card',
            }}
          />
          <RootStack.Screen 
            name="InvoiceGenerator" 
            component={InvoiceGeneratorScreen}
            options={{
              title: 'Generate Invoice',
              headerShown: true,
              presentation: 'modal',
              ...getHeaderStyle(),
            }}
          />
          <RootStack.Screen 
            name="Customers" 
            component={CustomersScreen}
            options={{
              title: 'Customers',
              headerShown: false,
              ...getHeaderStyle(),
            }}
          />
          <RootStack.Screen 
            name="Analytics" 
            component={AnalyticsScreen}
            options={{
              title: 'Business Analytics',
              headerShown: false,
              ...getHeaderStyle(),
            }}
          />
        </>
      )}
      
      {/* Shared Profile Screens */}
      <RootStack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          headerShown: true,
          ...getHeaderStyle(),
        }}
      />
      <RootStack.Screen 
        name="Privacy" 
        component={PrivacyScreen}
        options={{
          title: 'Privacy Settings',
          headerShown: true,
          ...getHeaderStyle(),
        }}
      />
      <RootStack.Screen 
        name="PaymentMethods" 
        component={PaymentMethodsScreen}
        options={{
          title: 'Payment Methods',
          headerShown: true,
          ...getHeaderStyle(),
        }}
      />
      <RootStack.Screen 
        name="HelpCenter" 
        component={HelpCenterScreen}
        options={{
          title: 'Help Center',
          headerShown: true,
          ...getHeaderStyle(),
        }}
      />
      <RootStack.Screen 
        name="TermsConditions" 
        component={TermsConditionsScreen}
        options={{
          title: 'Terms & Conditions',
          headerShown: false,
          ...getHeaderStyle(),
        }}
      />
    </RootStack.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <SplashScreen />;
  }

  return (
    <AccountProvider>
      <NotificationProvider>
        <QueueBadgeProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" translucent={false} />
          {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
        </QueueBadgeProvider>
      </NotificationProvider>
    </AccountProvider>
  );
};

// Main App Component with Auth Provider
const App = () => {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
};

export default App;
export { useAccount, useNotifications, useAuth };