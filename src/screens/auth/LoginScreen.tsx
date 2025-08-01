import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../navigation/AppNavigator';
import { authService } from '../../lib/supabase/index';
import { RootStackParamList } from '../../navigation/AppNavigator';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface ValidationErrors {
  identifier?: string;
  password?: string;
  general?: string;
}

// Brand Theme Colors
const colors = {
  primary: '#F59E0B',
  secondary: '#FCD34D', 
  darkAccent: '#1F2937',
  lightAccent: '#FEF3C7',
  success: '#10B981',
  warning: '#F97316',
  error: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};

// Configuration for testing
const TESTING_CONFIG = {
  SHOW_DEMO_SECTION: true, // Show demo login section
};

const LoginScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const navigation = useNavigation<LoginScreenNavigationProp>();

  // Demo credentials for testing - these should be actual accounts in your Supabase
  const demoCredentials = [
    { email: 'demo.admin@buzybees.com', password: 'Demo123!@#', role: 'Admin User' },
    { email: 'demo.consumer@buzybees.com', password: 'Demo123!@#', role: 'Consumer' },
    { email: 'demo.provider@buzybees.com', password: 'Demo123!@#', role: 'Provider' },
    { email: 'test.user@buzybees.com', password: 'Test123!@#', role: 'Test User' }
  ];

  // Validation functions
  const validateIdentifier = (value: string): string | null => {
    if (!value.trim()) return 'Email or phone number is required';
    
    // Check if it's an email
    if (value.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Please enter a valid email address';
    } else {
      // Check if it's a phone number
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
      if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
        return 'Please enter a valid phone number or email';
      }
    }
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'identifier') {
      setIdentifier(value);
    } else if (field === 'password') {
      setPassword(value);
    }

    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
        general: undefined
      }));
    }

    // Real-time validation for touched fields
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    const value = field === 'identifier' ? identifier : password;
    validateField(field, value);
  };

  const validateField = (field: string, value: string) => {
    let error: string | null = null;

    if (field === 'identifier') {
      error = validateIdentifier(value);
    } else if (field === 'password') {
      error = validatePassword(value);
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const validateAllFields = (): boolean => {
    const newErrors: ValidationErrors = {};

    newErrors.identifier = validateIdentifier(identifier);
    newErrors.password = validatePassword(password);

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== null);
  };

  const handleDemoLogin = async (email: string, password: string, role: string) => {
    setLoading(true);
    
    try {
      const response = await authService.signIn(email, password);
      
      if (response.success) {
        console.log(`✅ Demo login successful for ${role}: ${email}`);
        // Navigation will be handled by auth state change
      } else {
        setErrors({
          general: response.error || 'Failed to sign in with demo account. Please try again.'
        });
      }
      
    } catch (error: any) {
      console.error('❌ Demo login failed:', error);
      setErrors({
        general: error.message || 'Failed to sign in with demo account. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setErrors({});

    if (!validateAllFields()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authService.signIn(identifier, password);
      
      if (response.success) {
        console.log('✅ Manual login successful');
        // Navigation is handled by AuthContext state change in AppNavigator
      } else {
        setErrors({ 
          general: response.error || 'Invalid credentials. Please try again.' 
        });
      }
      
    } catch (error: any) {
      console.error('❌ Manual login failed:', error);
      setErrors({ 
        general: error.message || 'Network error. Please check your connection and try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      
      Alert.alert(
        'Coming Soon',
        `${provider === 'google' ? 'Google' : 'Apple'} sign-in will be available in the next update!`,
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      setErrors({
        general: `${provider} sign-in failed. Please try again.`
      });
    } finally {
      setLoading(false);
    }
  };

  const showDemoCredentials = () => {
    const buttons = [
      ...demoCredentials.map(cred => ({
        text: `${cred.role}: ${cred.email}`,
        onPress: () => handleDemoLogin(cred.email, cred.password, cred.role),
        style: 'default' as const
      })),
      {
        text: 'Cancel',
        style: 'cancel' as const,
        onPress: () => {}
      }
    ];

    Alert.alert(
      'Demo Accounts',
      'Choose a demo account to sign in with:',
      buttons
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="calendar" size={32} color={colors.primary} />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue booking services</Text>
            </View>
          </View>

          {/* Demo Login Section */}
          {TESTING_CONFIG.SHOW_DEMO_SECTION && (
            <View style={styles.demoContainer}>
              <View style={styles.demoBadge}>
                <Ionicons name="flask-outline" size={16} color={colors.info} />
                <Text style={styles.demoText}>Demo Mode</Text>
              </View>
              
              <Text style={styles.demoDescription}>
                Quick access to demo accounts for testing{'\n'}
                <Text style={styles.demoNote}>
                  Note: Demo accounts must be created in Supabase first
                </Text>
              </Text>
              
              <View style={styles.demoButtonContainer}>
                <TouchableOpacity 
                  style={styles.demoButton}
                  onPress={showDemoCredentials}
                  disabled={loading}
                >
                  <Ionicons name="people-outline" size={16} color={colors.white} />
                  <Text style={styles.demoButtonText}>Try Demo Accounts</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.actionButtonsContainer}>
                
                <TouchableOpacity 
                  style={styles.createUsersButton}
                  onPress={async () => {
                    setLoading(true);
                    try {
                      await authService.createTestUsers();
                      Alert.alert('Success', 'Test users created! Check console for details.');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to create test users. Check console.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                  <Text style={styles.createUsersButtonText}>Create Test Users</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.createSampleDataButton}
                  onPress={async () => {
                    setLoading(true);
                    try {
                      // Insert sample data for demo provider
                      const demoProviderId = await authService.checkUserExists('demo.provider@buzybees.com');
                      if (demoProviderId) {
                        const response = await authService.insertSampleProviderData();
                        if (response.success) {
                          Alert.alert('Success', 'Sample provider data created! You can now test the provider dashboard.');
                        } else {
                          Alert.alert('Error', response.error || 'Failed to create sample data.');
                        }
                      } else {
                        Alert.alert('Info', 'Please create test users first, then try again.');
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to create sample data. Check console.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <Ionicons name="business-outline" size={16} color={colors.info} />
                  <Text style={styles.createSampleDataButtonText}>Create Sample Data</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR LOGIN MANUALLY</Text>
                <View style={styles.divider} />
              </View>
            </View>
          )}

          {errors.general && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email or Phone Number *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithIcon,
                    errors.identifier && styles.inputError,
                    !errors.identifier && touched.identifier && identifier && styles.inputSuccess
                  ]}
                  placeholder="Enter your email or phone"
                  value={identifier}
                  onChangeText={(text) => handleInputChange('identifier', text)}
                  onBlur={() => handleBlur('identifier')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!loading}
                />
                <View style={styles.inputIcon}>
                  <Ionicons 
                    name={identifier.includes('@') ? 'mail-outline' : 'call-outline'} 
                    size={20} 
                    color={colors.gray500} 
                  />
                </View>
              </View>
              {errors.identifier && <Text style={styles.fieldError}>{errors.identifier}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>Password *</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password && styles.inputError,
                    !errors.password && touched.password && password && styles.inputSuccess
                  ]}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  onBlur={() => handleBlur('password')}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={24} 
                    color={colors.gray500} 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Signing In...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity 
              style={[styles.socialButton, loading && styles.socialButtonDisabled]}
              onPress={() => handleSocialLogin('google')}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.socialButtonSecondary, loading && styles.socialButtonDisabled]}
              onPress={() => handleSocialLogin('apple')}
              disabled={loading}
            >
              <Ionicons name="logo-apple" size={20} color={colors.gray900} />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.helpContainer}>
              <TouchableOpacity style={styles.helpButton}>
                <Ionicons name="help-circle-outline" size={16} color={colors.gray500} />
                <Text style={styles.helpText}>Need Help?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightAccent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.darkAccent,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 24,
  },
  demoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: colors.gray50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#93C5FD',
    marginBottom: 12,
  },
  demoText: {
    color: colors.info,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  demoDescription: {
    color: colors.gray600,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  demoNote: {
    color: colors.gray400,
    fontSize: 12,
    fontStyle: 'italic',
  },
  demoButtonContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  demoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.info,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: colors.info,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  demoButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  createUsersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createUsersButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  createSampleDataButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.info,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createSampleDataButtonText: {
    color: colors.info,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: colors.gray700,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.gray900,
  },
  inputWithIcon: {
    paddingRight: 50,
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  inputSuccess: {
    borderColor: colors.success,
    backgroundColor: '#F0FDF4',
  },
  fieldError: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPassword: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  passwordInputContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.gray400,
    fontSize: 12,
    fontWeight: '500',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.gray700,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  footerText: {
    color: colors.gray500,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  helpText: {
    color: colors.gray500,
    fontSize: 14,
    marginLeft: 4,
  },
});

export default LoginScreen;