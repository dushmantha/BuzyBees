import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ServiceListScreen from '../screens/ServiceListScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';
import BookingSummaryScreen from '../screens/BookingSummaryScreen';
import BookingDateTimeScreen from '../screens/BookingDateTimeScreen';
import BookingsScreen from '../screens/BookingsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthNavigator from './AuthNavigator';

// Import Service type
import type { Service } from '../services/types/service';

// Updated Types with proper ServiceDetail params
export type RootStackParamList = {
  // Auth Screens
  Auth: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Main App Screens
  MainTabs: {
    screen?: 'HomeTab' | 'BookingsTab' | 'FavoritesTab' | 'ProfileTab';
  } | undefined;
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
  FavoritesTab: undefined;
  Profile: undefined;
  
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

type TabParamList = {
  HomeTab: undefined;
  BookingsTab: undefined;
  FavoritesTab: undefined;
  ProfileTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Extend the RootStackParamList to include the auth screens
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
  },
};

const MainTabs = () => {
  return (
    <Tab.Navigator
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

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1A2533',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="BookingsTab" 
        component={BookingsScreen} 
        options={{ title: 'Bookings' }}
      />
      <Tab.Screen 
        name="FavoritesTab" 
        component={FavoritesScreen} 
        options={{ title: 'Favorites' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Main app navigator (protected routes)
const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{
          headerShown: false,
        }}
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
        }}
      />
      <Stack.Screen 
        name="BookingDateTime" 
        component={BookingDateTimeScreen}
        options={{ 
          title: 'Select Date & Time',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

// Root navigator that handles authentication state
const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !isReady) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={MyTheme}>
      <StatusBar barStyle="dark-content" />
      {isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen 
            name="ServiceList" 
            component={ServiceListScreen} 
            options={({ route }) => ({
              headerShown: true,
              title: route.params?.category || 'Services',
              headerBackTitle: 'Back',
            })}
          />
          <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
          <Stack.Screen name="BookingDateTime" component={BookingDateTimeScreen} />
          <Stack.Screen name="BookingSummary" component={BookingSummaryScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthNavigator} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;