// import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../../lib/supabase';
// import Config from 'react-native-config';

// Placeholder constants until package is installed
const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

// Placeholder GoogleSignin until package is installed
const GoogleSignin = {
  configure: async (config: any) => {
    console.log('GoogleSignin.configure called with:', config);
    throw new Error('Google Sign-In package not installed. Run: npm install @react-native-google-signin/google-signin');
  },
  hasPlayServices: async (options?: any) => {
    throw new Error('Google Sign-In package not installed');
  },
  signIn: async () => {
    throw new Error('Google Sign-In package not installed');
  },
  signOut: async () => {
    throw new Error('Google Sign-In package not installed');
  },
  getCurrentUser: async () => {
    throw new Error('Google Sign-In package not installed');
  },
  revokeAccess: async () => {
    throw new Error('Google Sign-In package not installed');
  },
};

export interface GoogleSignInResult {
  success: boolean;
  user?: any;
  error?: string;
  isNewUser?: boolean;
}

export class GoogleSignInService {
  private static instance: GoogleSignInService;
  private isConfigured: boolean = false;

  static getInstance(): GoogleSignInService {
    if (!GoogleSignInService.instance) {
      GoogleSignInService.instance = new GoogleSignInService();
    }
    return GoogleSignInService.instance;
  }

  async configure(): Promise<void> {
    if (this.isConfigured) return;

    try {
      await GoogleSignin.configure({
        webClientId: Config.GOOGLE_WEB_CLIENT_ID || 'YOUR_WEB_CLIENT_ID_HERE',
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
      });
      
      this.isConfigured = true;
      console.log('✅ Google Sign-In configured successfully');
    } catch (error) {
      console.error('❌ Google Sign-In configuration failed:', error);
      throw new Error('Failed to configure Google Sign-In');
    }
  }

  async signIn(): Promise<GoogleSignInResult> {
    try {
      console.log('🔄 Starting Google Sign-In process...');
      
      // Ensure Google Sign-In is configured
      await this.configure();
      
      // Check if device has Google Play Services (Android)
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log('✅ Google Sign-In successful:', userInfo.user.email);

      // Get the ID token for Supabase authentication
      const { idToken } = userInfo;
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Sign in with Supabase using Google token
      const { data: supabaseUser, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        console.error('❌ Supabase authentication failed:', error);
        throw error;
      }

      console.log('✅ Supabase authentication successful');

      // Check if this is a new user and create profile if needed
      let isNewUser = false;
      if (supabaseUser.user) {
        const { data: existingProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', supabaseUser.user.id)
          .single();

        if (!existingProfile && !profileError) {
          // Create user profile
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: supabaseUser.user.id,
              email: supabaseUser.user.email,
              first_name: userInfo.user.givenName || '',
              last_name: userInfo.user.familyName || '',
              full_name: userInfo.user.name || '',
              avatar_url: userInfo.user.photo || null,
              email_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              account_type: 'consumer', // Default to consumer
            });

          if (createError) {
            console.error('❌ Failed to create user profile:', createError);
          } else {
            console.log('✅ User profile created successfully');
            isNewUser = true;
          }
        }
      }

      return {
        success: true,
        user: supabaseUser.user,
        isNewUser,
      };

    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      
      // Handle specific Google Sign-In errors
      let errorMessage = 'An error occurred during sign in';
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign in was cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign in is already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services is not available';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async signOut(): Promise<boolean> {
    try {
      console.log('🔄 Signing out from Google...');
      await GoogleSignin.signOut();
      console.log('✅ Google Sign-Out successful');
      return true;
    } catch (error) {
      console.error('❌ Google Sign-Out error:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo;
    } catch (error) {
      console.log('No current Google user found');
      return null;
    }
  }

  async revokeAccess(): Promise<boolean> {
    try {
      await GoogleSignin.revokeAccess();
      console.log('✅ Google access revoked');
      return true;
    } catch (error) {
      console.error('❌ Failed to revoke Google access:', error);
      return false;
    }
  }
}

export const googleSignInService = GoogleSignInService.getInstance();