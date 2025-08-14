import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api/auth';
import { supabase } from '../lib/supabase';
import { authService } from '../lib/supabase/index';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  created_at: string;
  updated_at?: string;
  role?: string;
  account_type?: 'consumer' | 'provider';
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
  role: user.role || 'Consumer',
  account_type: user.account_type || (user.role?.toLowerCase() === 'provider' ? 'provider' : 'consumer'),
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
  userData?: any;
  tokens?: any;
}

interface SignUpCredentials {
  email: string;
  password: string;
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
  // Forgot password methods
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resetPassword: (newPassword: string, accessToken?: string) => Promise<void>;
  // Testing methods
  clearAllData: () => Promise<void>;
  getCurrentUser: () => User | null;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  reloadUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
}

// Keys for AsyncStorage
const AUTH_TOKEN_KEY = '@auth_token';
const USER_DATA_KEY = '@user';

// Demo users for testing - using proper UUIDs
const DEMO_USERS = {
  'admin@example.com': {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@example.com',
    full_name: 'Demo Admin',
    phone: '+1234567890',
    avatar_url: '',
    role: 'Admin',
    account_type: 'provider' as const,
    created_at: new Date().toISOString(),
  },
  'consumer@example.com': {
    id: '797445af-97d4-4c03-8088-747628282993',
    email: 'consumer@example.com',
    full_name: 'Demo Consumer',
    phone: '+1234567891',
    avatar_url: '',
    role: 'Consumer',
    account_type: 'consumer' as const,
    created_at: new Date().toISOString(),
  },
  'provider@example.com': {
    id: '664d9c32-ec81-4a00-afd1-f9903db141a',
    email: 'provider@example.com',
    full_name: 'Demo Provider',
    phone: '+1234567892',
    avatar_url: '',
    role: 'Provider',
    account_type: 'provider' as const,
    created_at: new Date().toISOString(),
  },
  'test@example.com': {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'test@example.com',
    full_name: 'Demo Tester',
    phone: '+1234567893',
    avatar_url: '',
    role: 'Tester',
    account_type: 'consumer' as const,
    created_at: new Date().toISOString(),
  },
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [data, setData] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: true,
  });

  // Clear auth data from AsyncStorage
  const clearAuthData = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_DATA_KEY),
      ]);
      if (api.clearAuthToken) {
        api.clearAuthToken();
      }
    } catch (error) {
      console.error('Failed to clear auth data', error);
      throw error;
    }
  }, []);

  // Clear all data for testing
  const clearAllData = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
      if (api.clearAuthToken) {
        api.clearAuthToken();
      }
      setData({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isInitializing: false,
      });
      console.log('✅ All data cleared for testing');
    } catch (error) {
      console.error('❌ Failed to clear all data:', error);
    }
  }, []);

  // Update user profile using the same method as ProfileScreen
  const updateUserProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    if (!data.user) return;

    try {
      console.log('🔄 Updating user profile using authService...');
      
      // Update in Supabase Auth metadata if needed
      if (updates.full_name || updates.avatar_url) {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: updates.full_name || data.user.full_name,
            avatar_url: updates.avatar_url || data.user.avatar_url,
          }
        });
        
        if (authError) {
          console.error('❌ Failed to update auth profile:', authError);
        } else {
          console.log('✅ Auth metadata updated successfully');
        }
      }

      // Update local state immediately for better UX
      const updatedUser = { ...data.user, ...updates };
      await saveAuthData(data.token!, updatedUser);
      
      setData(prev => ({
        ...prev,
        user: updatedUser,
      }));
      
      console.log('✅ User profile updated successfully:', updatedUser.full_name);
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
      throw error;
    }
  }, [data.user, data.token]);

  // Get current user
  const getCurrentUser = useCallback((): User | null => {
    return data.user;
  }, [data.user]);

  // Reload user data from Supabase
  const reloadUserData = useCallback(async () => {
    try {
      console.log('🔄 Force reloading user data from Supabase...');
      
      // Clear old cached demo data
      await AsyncStorage.removeItem(USER_DATA_KEY);
      
      // Get current authenticated user from Supabase
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser) {
        console.log('✅ Found authenticated user:', currentUser.email);
        
        // Get fresh profile data
        const profileResponse = await authService.getUserProfile();
        
        if (profileResponse.success && profileResponse.data) {
          const profileData = profileResponse.data;
          console.log('✅ Loaded fresh profile:', profileData);
          
          // Create user data from profile
          const userData = {
            id: profileData.id,
            email: profileData.email,
            full_name: profileData.full_name || 
                      (profileData.first_name && profileData.last_name ? `${profileData.first_name} ${profileData.last_name}` : '') ||
                      profileData.first_name ||
                      profileData.last_name ||
                      currentUser.email?.split('@')[0] || 
                      'User',
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            phone: profileData.phone || currentUser.phone || '',
            avatar_url: profileData.avatar_url || currentUser.user_metadata?.avatar_url || '',
            role: profileData.role || 'Consumer',
            account_type: (profileData.account_type || 'consumer') as 'consumer' | 'provider',
            created_at: profileData.created_at || currentUser.created_at,
          };
          
          const transformedUser = transformUser(userData);
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          
          if (token) {
            await saveAuthData(token, transformedUser);
            setData({
              user: transformedUser,
              token: token,
              isAuthenticated: true,
              isLoading: false,
              isInitializing: false,
            });
            
            console.log('✅ User data reloaded successfully:', transformedUser.email, transformedUser.full_name);
          }
        }
      } else {
        console.log('⚠️ No authenticated user found during reload');
      }
    } catch (error) {
      console.error('❌ Failed to reload user data:', error);
    }
  }, []);

  // Load token and user data from storage on app start
  const loadAuthData = useCallback(async () => {
    try {
      console.log('🔄 Loading auth data from storage...');
      
      const [token, user] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
      ]);

      console.log('🔍 Storage token exists:', !!token);
      console.log('🔍 Storage user exists:', !!user);
      console.log('🔍 Raw storage user data:', user);

      // Small delay to ensure smooth transition
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (token && user) {
        try {
          if (api.setAuthToken) {
            api.setAuthToken(token);
          }
          const parsedUser = JSON.parse(user);
          const transformedUser = transformUser(parsedUser);
          
          setData({
            user: transformedUser,
            token,
            isLoading: false,
            isAuthenticated: true,
            isInitializing: false,
          });
          
          console.log('✅ Auth data loaded from storage:', {
            userId: transformedUser.id,
            email: transformedUser.email,
            role: transformedUser.role,
            accountType: transformedUser.account_type,
          });
          return;
        } catch (error) {
          console.log('❌ Error parsing user data:', error);
          // Don't throw, just continue to clear auth data
        }
      }

      await clearAuthData();
      
      // Try to get current authenticated user using the same method as ProfileScreen
      console.log('🔄 Checking for authenticated user using authService...');
      try {
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          console.log('✅ Found authenticated Supabase user:', currentUser.email);
          
          // Get comprehensive user profile using the same method as ProfileScreen
          const profileResponse = await authService.getUserProfile();
          
          if (profileResponse.success && profileResponse.data) {
            const profileData = profileResponse.data;
            console.log('✅ Found user profile:', profileData);
            
            // Create user data from profile
            const userData = {
              id: profileData.id,
              email: profileData.email,
              full_name: profileData.full_name || 
                        (profileData.first_name && profileData.last_name ? `${profileData.first_name} ${profileData.last_name}` : '') ||
                        profileData.first_name ||
                        profileData.last_name ||
                        currentUser.email?.split('@')[0] || 
                        'User',
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || '',
              phone: profileData.phone || currentUser.phone || '',
              avatar_url: profileData.avatar_url || currentUser.user_metadata?.avatar_url || '',
              role: profileData.role || 'Consumer',
              account_type: (profileData.account_type || 'consumer') as 'consumer' | 'provider',
              created_at: profileData.created_at || currentUser.created_at,
            };
            
            const transformedUser = transformUser(userData);
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            
            if (token) {
              await saveAuthData(token, transformedUser);
              setData({
                user: transformedUser,
                token: token,
                isAuthenticated: true,
                isLoading: false,
                isInitializing: false,
              });
              
              console.log('✅ Loaded real user profile:', transformedUser.email, transformedUser.full_name);
              return;
            }
          } else {
            console.log('⚠️ Profile not found, using basic user data');
            
            // Fallback to basic Supabase user data
            const userData = {
              id: currentUser.id,
              email: currentUser.email || '',
              full_name: currentUser.user_metadata?.full_name || 
                        currentUser.email?.split('@')[0] || 'User',
              first_name: currentUser.user_metadata?.first_name || '',
              last_name: currentUser.user_metadata?.last_name || '',
              phone: currentUser.phone || '',
              avatar_url: currentUser.user_metadata?.avatar_url || '',
              role: 'Consumer',
              account_type: 'consumer' as const,
              created_at: currentUser.created_at,
            };
            
            const transformedUser = transformUser(userData);
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            
            if (token) {
              await saveAuthData(token, transformedUser);
              setData({
                user: transformedUser,
                token: token,
                isAuthenticated: true,
                isLoading: false,
                isInitializing: false,
              });
              
              console.log('✅ Loaded basic user data:', transformedUser.email, transformedUser.full_name);
              return;
            }
          }
        }
      } catch (error) {
        console.log('⚠️ No authenticated user found:', error);
      }
      
      // No auto-login with demo user - user must sign in
      setData({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isInitializing: false,
      });
      console.log('🔄 No valid auth data found, cleared storage');
    } catch (error) {
      console.error('❌ Failed to load auth data:', error);
      try {
        await clearAuthData();
      } catch (clearError) {
        console.error('❌ Failed to clear auth data:', clearError);
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
      if (api.setAuthToken) {
        api.setAuthToken(token);
      }
      console.log('✅ Auth data saved to storage');
      return true;
    } catch (error) {
      console.error('❌ Failed to save auth data:', error);
      return false;
    }
  };

  // Refresh the auth token
  const refreshToken = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return false;

      // Use the API's refreshToken method if available
      if (api.refreshToken) {
        return await api.refreshToken();
      }
      
      // Fallback: just check if we have a token
      return !!token;
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
      return false;
    }
  };

  const signIn = async ({ email, password, userData, tokens }: SignInCredentials): Promise<{ user: User }> => {
    try {
      setData(prev => ({ ...prev, isLoading: true }));
      console.log('🔄 Attempting sign in for:', email);

      let user: User;
      let token: string;

      // Check if it's a demo user first
      const demoUser = DEMO_USERS[email.toLowerCase() as keyof typeof DEMO_USERS];
      
      if (demoUser) {
        // Demo login
        console.log('🎭 Using demo user for:', email);
        user = transformUser(demoUser);
        token = `demo-token-${Date.now()}-${user.id}`;
        
        // Simulate demo password validation
        const validDemoPasswords = ['admin123', 'consumer123', 'provider123', 'test123'];
        if (!validDemoPasswords.includes(password)) {
          throw new Error('Invalid demo password');
        }
      } else {
        // Real API login
        console.log('🌐 Using real API for:', email);
        const { data: response, error } = await api.login(email, password);

        if (error) {
          throw new Error(error.message || 'Failed to sign in');
        }

        if (!response?.user) {
          throw new Error('No user data received');
        }

        user = transformUser(response.user);
        token = response.session?.access_token;

        if (!token) {
          throw new Error('No access token received');
        }
      }

      // Save token and user data to AsyncStorage
      await saveAuthData(token, user);

      // Update the auth state
      setData({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
        isInitializing: false,
      });

      console.log('✅ Sign in successful:', {
        userId: user.id,
        email: user.email,
        role: user.role,
        accountType: user.account_type,
      });

      // Return the user data to the caller
      return { user };
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
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
      console.log('🔄 Attempting sign up for:', email);
      
      const { data: response, error } = await api.register(email, password, {
        full_name,
        phone,
      });
      
      if (error) {
        const errorMessage = error.message || 'Failed to create account. Please try again.';
        throw new Error(errorMessage);
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

        console.log('✅ Sign up successful:', {
          userId: user.id,
          email: user.email,
        });
      }
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
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
      console.log('🔄 Signing out user');
      
      // Call API signOut method if available
      if (api.signOut) {
        await api.signOut();
      }
      
      // Clear local auth data
      await clearAuthData();
      
      // Reset the auth state
      setData({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isInitializing: false,
      });

      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Even if signOut fails, clear local data
      try {
        await clearAuthData();
      } catch (clearError) {
        console.error('❌ Failed to clear auth data:', clearError);
      }
      
      setData(prev => ({
        ...prev,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      }));
      // Don't throw the error - signOut should always succeed locally
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (data.user) {
      const updatedUser = { ...data.user, ...userData };
      
      // Update user data in AsyncStorage
      try {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser));
        console.log('✅ User data updated in storage');
      } catch (error) {
        console.error('❌ Failed to update user data in storage:', error);
      }
      
      setData(prev => ({
        ...prev,
        user: updatedUser,
      }));

      console.log('✅ User data updated:', {
        userId: updatedUser.id,
        changes: Object.keys(userData),
      });
    }
  };

  // Send password reset email
  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    try {
      if (!email || !email.trim()) {
        throw new Error('Email address is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new Error('Please enter a valid email address');
      }

      console.log('🔄 Sending password reset email to:', email);

      const { error } = await api.sendPasswordResetEmail(email.trim().toLowerCase());
      
      if (error) {
        const errorMessage = error.message || 'Failed to send password reset email. Please try again.';
        throw new Error(errorMessage);
      }

      console.log('✅ Password reset email sent successfully');
    } catch (error: any) {
      console.error('❌ Send password reset email error:', error);
      throw error;
    }
  };

  // Reset password with token
  const resetPassword = async (newPassword: string, accessToken?: string): Promise<void> => {
    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      console.log('🔄 Resetting password');

      const { error } = await api.updatePassword(newPassword, accessToken);
      
      if (error) {
        const errorMessage = error.message || 'Failed to reset password. Please try again.';
        throw new Error(errorMessage);
      }

      console.log('✅ Password reset successful');
    } catch (error: any) {
      console.error('❌ Reset password error:', error);
      throw error;
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
        sendPasswordResetEmail,
        resetPassword,
        clearAllData,
        getCurrentUser,
        updateUserProfile,
        reloadUserData,
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