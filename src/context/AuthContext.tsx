import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import api from '../services/api';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  created_at: string;
  updated_at?: string;
}

// Helper function to transform API user to our User type
const transformUser = (user: any): User => ({
  id: user.id || '',
  email: user.email || '',
  full_name: user.full_name || '',
  phone: user.phone || '',
  avatar_url: user.avatar_url || '',
  created_at: user.created_at || new Date().toISOString(),
  updated_at: user.updated_at,
});

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
}

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials extends SignInCredentials {
  full_name: string;
  phone?: string;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
  signIn: (credentials: SignInCredentials) => Promise<{ user: User }>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
}

// Key for AsyncStorage
const AUTH_TOKEN_KEY = '@auth_token';
const USER_DATA_KEY = '@user';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [data, setData] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: true,
  });

  // Load token and user data from storage on app start
  const loadAuthData = useCallback(async () => {
    try {
      const [token, user] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
      ]);

      // Small delay to ensure smooth transition
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (token && user) {
        try {
          api.setAuthToken(token);
          setData({
            user: JSON.parse(user),
            token,
            isLoading: false,
            isAuthenticated: true,
            isInitializing: false,
          });
          return;
        } catch (error) {
          console.log('Error parsing user data:', error);
          // Don't throw, just continue to clear auth data
        }
      }

      await clearAuthData();
      setData({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isInitializing: false,
      });
    } catch (error) {
      console.error('Failed to load auth data', error);
      try {
        await clearAuthData();
      } catch (clearError) {
        console.error('Failed to clear auth data:', clearError);
      }
      setData({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isInitializing: false,
      });
    }
  }, [clearAuthData]);

  // Check if user is logged in on initial load
  useEffect(() => {
    loadAuthData();
  }, [loadAuthData]);

  // Save auth data to AsyncStorage
  const saveAuthData = async (token: string, user: User) => {
    try {
      await AsyncStorage.multiSet([
        [AUTH_TOKEN_KEY, token],
        [USER_DATA_KEY, JSON.stringify(user)],
      ]);
      api.setAuthToken(token);
      return true;
    } catch (error) {
      console.error('Failed to save auth data:', error);
      return false;
    }
  };

  // Clear auth data from AsyncStorage
  const clearAuthData = async (): Promise<void> => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_DATA_KEY),
      ]);
    } catch (error) {
      console.error('Failed to clear auth data', error);
      // Even if clearing fails, we want to continue with the sign out flow
      throw error;
    }
  };

  // Refresh the auth token
  const refreshToken = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return false;

      // Here you would typically call your API to refresh the token
      // For now, we'll just return true if we have a token
      return !!token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  };

  const signIn = async ({ email, password }: SignInCredentials): Promise<{ user: User }> => {
    try {
      setData(prev => ({ ...prev, isLoading: true }));
      const { data: response, error } = await api.login(email, password);

      if (error) throw new Error(error.message || 'Failed to sign in');

      if (response?.user) {
        const user = transformUser(response.user);
        const token = response.session?.access_token;

        if (!token) {
          throw new Error('No access token received');
        }

        // Save token and user data to AsyncStorage
        await saveAuthData(token, user);

        // Set the auth token in the API client
        api.setAuthToken(token);

        // Update the auth state
        setData({
          user,
          token,
          isLoading: false,
          isAuthenticated: true,
          isInitializing: false,
        });

        // Return the user data to the caller
        return { user };
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        isInitializing: false,
        isAuthenticated: false,
        token: null,
      }));
      throw error;
    }
  };

  const signUp = async ({ email, password, full_name, phone = '' }: SignUpCredentials): Promise<void> => {
    try {
      setData(prev => ({ ...prev, isLoading: true }));
      
      const { data: response, error } = await api.register(email, password, {
        full_name,
        phone,
      });
      
      if (error) {
        throw new Error(typeof error === 'string' ? error : 'Failed to create account');
      }
      
      if (response?.user) {
        const user = transformUser({
          ...response.user,
          full_name,
          phone,
        });
        
        const token = response.session?.access_token;
        if (!token) {
          throw new Error('No access token received');
        }
        
        // Save token and user data to AsyncStorage
        await saveAuthData(token, user);
        
        setData({
          user,
          token,
          isLoading: false,
          isAuthenticated: true,
          isInitializing: false,
        });
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      setData(prev => ({
        ...prev,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isInitializing: false,
      }));
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setData(prev => ({ ...prev, isLoading: true }));
      await clearAuthData();
      
      // Reset the auth state
      setData({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isInitializing: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setData(prev => ({
        ...prev,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      }));
      throw error;
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (data.user) {
      const updatedUser = { ...data.user, ...userData };
      
      // Update user data in AsyncStorage
      try {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser));
      } catch (error) {
        console.error('Failed to update user data in storage:', error);
      }
      
      setData(prev => ({
        ...prev,
        user: updatedUser,
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: data.user,
        token: data.token,
        isLoading: data.isLoading,
        isAuthenticated: data.isAuthenticated,
        isInitializing: data.isInitializing,
        signIn,
        signUp,
        signOut,
        updateUser,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;
