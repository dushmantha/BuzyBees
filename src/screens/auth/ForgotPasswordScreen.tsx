import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

// Theme colors
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
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { sendPasswordResetEmail } = useAuth();

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetEmail = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      await sendPasswordResetEmail(trimmedEmail);
      
      // Set email sent state
      setEmailSent(true);
      
      Alert.alert(
        'Reset Email Sent',
        `We've sent a password reset link to ${trimmedEmail}. Please check your email (including spam folder) and follow the instructions to reset your password.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Optional: Navigate back to login after a delay
              setTimeout(() => {
                navigation.navigate('Login');
              }, 1000);
            }
          }
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to send password reset email. Please check your internet connection and try again.';
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address first');
      return;
    }
    
    await handleSendResetEmail();
  };

  const resetForm = () => {
    setEmail('');
    setEmailSent(false);
  };

  const handleBackToLogin = () => {
    if (emailSent) {
      resetForm();
    }
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password</Text>
          
          {!emailSent ? (
            <>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[
                    styles.input,
                    loading && styles.inputDisabled
                  ]}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="send"
                  onSubmitEditing={handleSendResetEmail}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button, 
                  (loading || !email.trim() || !isValidEmail(email.trim())) && styles.buttonDisabled
                ]}
                onPress={handleSendResetEmail}
                disabled={loading || !email.trim() || !isValidEmail(email.trim())}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color={colors.white} size="small" />
                    <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                      Sending...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>
                    Send Reset Link
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.helpContainer}>
                <Text style={styles.helpText}>
                  Having trouble? Check your spam folder or{' '}
                </Text>
                <TouchableOpacity onPress={handleResendEmail} disabled={loading}>
                  <Text style={[styles.resendLink, loading && styles.linkDisabled]}>
                    resend the email
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Text style={styles.successCheckmark}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successMessage}>
                We've sent a password reset link to {email}. Please check your email and follow the instructions.
              </Text>
              <Text style={styles.helpText}>
                Didn't receive the email? Check your spam folder.
              </Text>
              
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleResendEmail}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={[styles.secondaryButtonText, { marginLeft: 8 }]}>
                      Resending...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.secondaryButtonText}>
                    Resend Email
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleBackToLogin}>
            <Text style={styles.backButton}>
              ← Back to Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    flex: 1,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.darkAccent,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray500,
    marginBottom: 40,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: colors.gray700,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.gray900,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: colors.gray100,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  helpText: {
    color: colors.gray500,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  resendLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  linkDisabled: {
    opacity: 0.5,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successCheckmark: {
    fontSize: 36,
    color: colors.white,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.darkAccent,
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    alignItems: 'center',
  },
  backButton: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;