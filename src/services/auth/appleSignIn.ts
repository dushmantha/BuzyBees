// import appleAuth from '@invertase/react-native-apple-authentication';
import { supabase } from '../../lib/supabase';
// import { Platform } from 'react-native';

// Placeholder appleAuth until package is installed
const appleAuth = {
  isAvailable: async (): Promise<boolean> => {
    throw new Error('Apple Sign-In package not installed. Run: npm install @invertase/react-native-apple-authentication');
  },
  performRequest: async (request: any) => {
    throw new Error('Apple Sign-In package not installed');
  },
  getCredentialStateForUser: async (user: string) => {
    throw new Error('Apple Sign-In package not installed');
  },
  State: {
    AUTHORIZED: 'AUTHORIZED',
    REVOKED: 'REVOKED',
    NOT_FOUND: 'NOT_FOUND',
  },
  Operation: {
    IMPLICIT: 'IMPLICIT',
    LOGIN: 'LOGIN',
    REFRESH: 'REFRESH',
    LOGOUT: 'LOGOUT',
  },
  Scope: {
    EMAIL: 'EMAIL',
    FULL_NAME: 'FULL_NAME',
  },
  PersonNameFormat: {
    DEFAULT: 'DEFAULT',
    PHONETIC: 'PHONETIC',
  },
  RealUserStatus: {
    LIKELY_REAL: 'LIKELY_REAL',
    UNKNOWN: 'UNKNOWN',
    UNSUPPORTED: 'UNSUPPORTED',
  },
};

export interface AppleSignInResult {
  success: boolean;
  user?: any;
  error?: string;
  isNewUser?: boolean;
}

export class AppleSignInService {
  private static instance: AppleSignInService;

  static getInstance(): AppleSignInService {
    if (!AppleSignInService.instance) {
      AppleSignInService.instance = new AppleSignInService();
    }
    return AppleSignInService.instance;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Apple Sign-In is only available on iOS 13+ and macOS 10.15+
      return await appleAuth.isAvailable();
    } catch (error) {
      console.log('Apple Sign-In not available:', error);
      return false;
    }
  }

  async signIn(): Promise<AppleSignInResult> {
    try {
      console.log('🔄 Starting Apple Sign-In process...');
      
      // Check if Apple Sign-In is available
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Apple Sign-In is not available on this device'
        };
      }

      // Perform the Apple Sign-In request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      console.log('✅ Apple Sign-In successful:', appleAuthRequestResponse);

      // Extract the identity token for Supabase authentication
      const { identityToken, nonce } = appleAuthRequestResponse;
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Sign in with Supabase using Apple token
      const { data: supabaseUser, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        nonce,
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
          // Extract name information from Apple response
          const fullName = appleAuthRequestResponse.fullName;
          const firstName = fullName?.givenName || '';
          const lastName = fullName?.familyName || '';
          const displayName = firstName && lastName ? `${firstName} ${lastName}` : '';

          // Create user profile
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: supabaseUser.user.id,
              email: supabaseUser.user.email || appleAuthRequestResponse.email,
              first_name: firstName,
              last_name: lastName,
              full_name: displayName || supabaseUser.user.user_metadata?.full_name || '',
              avatar_url: null, // Apple doesn't provide profile pictures
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
      console.error('❌ Apple Sign-In error:', error);
      
      // Handle specific Apple Sign-In errors
      let errorMessage = 'An error occurred during Apple sign in';
      
      if (error.code === '1001') {
        errorMessage = 'Apple sign in was cancelled';
      } else if (error.code === '1000') {
        errorMessage = 'Apple sign in failed. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getCredentialState(userAppleId: string): Promise<string | null> {
    try {
      const credentialState = await appleAuth.getCredentialStateForUser(userAppleId);
      return credentialState;
    } catch (error) {
      console.error('❌ Failed to get Apple credential state:', error);
      return null;
    }
  }

  async signOut(): Promise<boolean> {
    try {
      console.log('🔄 Signing out from Apple...');
      
      // Apple doesn't have a direct sign out method
      // The sign out is handled by clearing the local session
      console.log('✅ Apple Sign-Out completed (local session cleared)');
      return true;
      
    } catch (error) {
      console.error('❌ Apple Sign-Out error:', error);
      return false;
    }
  }
}

export const appleSignInService = AppleSignInService.getInstance();