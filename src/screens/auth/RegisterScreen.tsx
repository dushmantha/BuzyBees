import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../../navigation/AppNavigator';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  address?: string;
  general?: string;
}

interface RegisterResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    address: string;
    gender: string;
    birth_date: string;
    email_verified: boolean;
    phone_verified: boolean;
  };
  message?: string;
  verification_required?: boolean;
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

// Configuration flags
const USE_MOCK_API = true; // Set to false when real API is ready

// Mock API service for testing
const mockRegistrationService = {
  async register(userData: any): Promise<RegisterResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate random success/failure for testing
    const shouldSucceed = Math.random() > 0.1; // 90% success rate
    
    if (!shouldSucceed) {
      throw new Error('Registration failed. Please try again.');
    }

    return {
      success: true,
      user: {
        id: `mock_${Date.now()}`,
        email: userData.email.toLowerCase(),
        full_name: `${userData.firstName} ${userData.lastName}`,
        phone: userData.phone,
        address: userData.address,
        gender: userData.gender,
        birth_date: userData.birthDate,
        email_verified: false,
        phone_verified: false,
      },
      message: 'Account created successfully',
      verification_required: true
    };
  },

  async checkEmailAvailability(email: string): Promise<{ available: boolean; message?: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock some emails as taken for testing
    const takenEmails = ['test@example.com', 'admin@example.com', 'user@example.com'];
    const isAvailable = !takenEmails.includes(email.toLowerCase());
    
    return {
      available: isAvailable,
      message: isAvailable ? undefined : 'This email is already registered'
    };
  },

  async checkPhoneAvailability(phone: string): Promise<{ available: boolean; message?: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock some phones as taken for testing
    const takenPhones = ['+1234567890', '1234567890', '+1111111111'];
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const isAvailable = !takenPhones.includes(cleanPhone);
    
    return {
      available: isAvailable,
      message: isAvailable ? undefined : 'This phone number is already registered'
    };
  },

  async sendEmailVerification(email: string): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      success: true,
      message: 'Verification email sent successfully'
    };
  }
};

// Real API Service
const realRegistrationService = {
  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    address: string;
    gender: string;
    birthDate: string;
  }): Promise<RegisterResponse> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email.toLowerCase(),
          phone: userData.phone,
          password: userData.password,
          address: userData.address,
          gender: userData.gender,
          birth_date: userData.birthDate,
          device_info: {
            platform: Platform.OS,
            device_type: 'mobile',
            app_version: '1.0.0'
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return data;
    } catch (error) {
      console.error('Registration API error:', error);
      throw error;
    }
  },

  async checkEmailAvailability(email: string): Promise<{ available: boolean; message?: string }> {
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Email check error:', error);
      return { available: true }; // Assume available if check fails
    }
  },

  async checkPhoneAvailability(phone: string): Promise<{ available: boolean; message?: string }> {
    try {
      const response = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Phone check error:', error);
      return { available: true }; // Assume available if check fails
    }
  },

  async sendEmailVerification(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/auth/send-email-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }
};

// Use appropriate service based on flag
const registrationService = USE_MOCK_API ? mockRegistrationService : realRegistrationService;

const RegisterScreen = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
  });
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [birthDate, setBirthDate] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [emailChecked, setEmailChecked] = useState(false);
  const [phoneChecked, setPhoneChecked] = useState(false);
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  // Real-time validation functions
  const validateEmail = async (email: string): Promise<string | null> => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    
    // Check email availability if validation passes
    try {
      const availability = await registrationService.checkEmailAvailability(email);
      if (!availability.available) {
        return availability.message || 'This email is already registered';
      }
      setEmailChecked(true);
    } catch (error) {
      // Continue without blocking if check fails
    }
    
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    if (!/(?=.*[@$!%*?&])/.test(password)) return 'Password must contain at least one special character';
    return null;
  };

  const validatePhone = async (phone: string): Promise<string | null> => {
    if (!phone) return 'Phone number is required';
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return 'Please enter a valid phone number';
    }

    // Check phone availability
    try {
      const availability = await registrationService.checkPhoneAvailability(cleanPhone);
      if (!availability.available) {
        return availability.message || 'This phone number is already registered';
      }
      setPhoneChecked(true);
    } catch (error) {
      // Continue without blocking if check fails
    }

    return null;
  };

  const validateName = (name: string, field: string): string | null => {
    if (!name) return `${field} is required`;
    if (name.length < 2) return `${field} must be at least 2 characters`;
    if (name.length > 50) return `${field} must be less than 50 characters`;
    if (!/^[a-zA-Z\s\-']+$/.test(name)) return `${field} can only contain letters, spaces, hyphens, and apostrophes`;
    return null;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string | null => {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== password) return 'Passwords do not match';
    return null;
  };

  const validateAddress = (address: string): string | null => {
    if (!address) return 'Address is required';
    if (address.length < 10) return 'Please enter a complete address (minimum 10 characters)';
    if (address.length > 200) return 'Address is too long (maximum 200 characters)';
    return null;
  };

  const validateAge = (birthDate: Date): string | null => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      actualAge = age - 1;
    }
    
    if (actualAge < 13) return 'You must be at least 13 years old to register';
    if (actualAge > 120) return 'Please enter a valid birth date';
    return null;
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Reset availability checks when email/phone changes
    if (field === 'email') setEmailChecked(false);
    if (field === 'phone') setPhoneChecked(false);

    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Real-time validation for some fields
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    validateField(field, formData[field as keyof typeof formData] || '');
  };

  const validateField = async (field: string, value: string) => {
    let error: string | null = null;

    switch (field) {
      case 'firstName':
        error = validateName(value, 'First name');
        break;
      case 'lastName':
        error = validateName(value, 'Last name');
        break;
      case 'email':
        error = await validateEmail(value);
        break;
      case 'phone':
        error = await validatePhone(value);
        break;
      case 'password':
        error = validatePassword(value);
        // Also revalidate confirm password if it exists
        if (formData.confirmPassword && touched.confirmPassword) {
          const confirmError = validateConfirmPassword(formData.confirmPassword, value);
          setErrors(prev => ({
            ...prev,
            confirmPassword: confirmError
          }));
        }
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(value, formData.password);
        break;
      case 'address':
        error = validateAddress(value);
        break;
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const validateAllFields = async (): Promise<boolean> => {
    const newErrors: ValidationErrors = {};

    newErrors.firstName = validateName(formData.firstName, 'First name');
    newErrors.lastName = validateName(formData.lastName, 'Last name');
    newErrors.email = await validateEmail(formData.email);
    newErrors.phone = await validatePhone(formData.phone);
    newErrors.password = validatePassword(formData.password);
    newErrors.confirmPassword = validateConfirmPassword(formData.confirmPassword, formData.password);
    newErrors.address = validateAddress(formData.address);

    // Validate age
    const ageError = validateAge(birthDate);
    if (ageError) {
      newErrors.general = ageError;
    }

    setErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== null && error !== undefined);
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: colors.gray200 };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[@$!%*?&])/.test(password)) score++;

    if (score <= 2) return { strength: score * 20, text: 'Weak', color: colors.error };
    if (score <= 3) return { strength: score * 20, text: 'Fair', color: colors.warning };
    if (score <= 4) return { strength: score * 20, text: 'Good', color: colors.success };
    return { strength: 100, text: 'Strong', color: colors.success };
  };

  const handleRegister = async () => {
    const isValid = await validateAllFields();
    if (!isValid) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        address: formData.address.trim(),
        gender,
        birthDate: birthDate.toISOString().split('T')[0],
      };

      const response = await registrationService.register(userData);
      
      if (response.success) {
        if (response.verification_required) {
          // Send email verification
          try {
            await registrationService.sendEmailVerification(userData.email);
            Alert.alert(
              'Account Created! 🎉', 
              'Your account has been created successfully. Please check your email to verify your account before signing in.',
              [
                {
                  text: 'Go to Login',
                  onPress: () => navigation.navigate('Login')
                }
              ]
            );
          } catch (verificationError) {
            Alert.alert(
              'Account Created! 🎉', 
              'Your account has been created successfully. You can now sign in to continue.',
              [
                {
                  text: 'Sign In Now',
                  onPress: () => navigation.navigate('Login')
                }
              ]
            );
          }
        } else {
          Alert.alert(
            'Success! 🎉', 
            'Your account has been created successfully. You can now sign in to continue.',
            [
              {
                text: 'Sign In Now',
                onPress: () => navigation.navigate('Login')
              }
            ]
          );
        }
      } else {
        setErrors({ general: response.message || 'Registration failed. Please try again.' });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error. Please check your connection and try again.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const passwordStrength = getPasswordStrength(formData.password);

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
                <Ionicons name="calendar" size={40} color={colors.primary} />
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Fill in your details to get started</Text>
              
              {USE_MOCK_API && (
                <View style={styles.testModeContainer}>
                  <View style={styles.testModeBadge}>
                    <Ionicons name="flask-outline" size={16} color={colors.warning} />
                    <Text style={styles.testModeText}>Test Mode</Text>
                  </View>
                  <Text style={styles.testModeSubtext}>
                    Using mock API for development
                  </Text>
                </View>
              )}
            </View>
          </View>

          {errors.general && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.nameContainer}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.firstName && styles.inputError,
                    !errors.firstName && touched.firstName && formData.firstName && styles.inputSuccess
                  ]}
                  placeholder="John"
                  value={formData.firstName}
                  onChangeText={(text) => handleChange('firstName', text)}
                  onBlur={() => handleBlur('firstName')}
                  editable={!loading}
                />
                {errors.firstName && <Text style={styles.fieldError}>{errors.firstName}</Text>}
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.lastName && styles.inputError,
                    !errors.lastName && touched.lastName && formData.lastName && styles.inputSuccess
                  ]}
                  placeholder="Doe"
                  value={formData.lastName}
                  onChangeText={(text) => handleChange('lastName', text)}
                  onBlur={() => handleBlur('lastName')}
                  editable={!loading}
                />
                {errors.lastName && <Text style={styles.fieldError}>{errors.lastName}</Text>}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithIcon,
                    errors.email && styles.inputError,
                    !errors.email && touched.email && formData.email && styles.inputSuccess
                  ]}
                  placeholder="john@example.com"
                  value={formData.email}
                  onChangeText={(text) => handleChange('email', text)}
                  onBlur={() => handleBlur('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <View style={styles.inputIcon}>
                  {emailChecked && !errors.email ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  ) : (
                    <Ionicons name="mail-outline" size={20} color={colors.gray500} />
                  )}
                </View>
              </View>
              {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithIcon,
                    errors.phone && styles.inputError,
                    !errors.phone && touched.phone && formData.phone && styles.inputSuccess
                  ]}
                  placeholder="+1 234 567 8900"
                  value={formData.phone}
                  onChangeText={(text) => handleChange('phone', text)}
                  onBlur={() => handleBlur('phone')}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                <View style={styles.inputIcon}>
                  {phoneChecked && !errors.phone ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  ) : (
                    <Ionicons name="call-outline" size={20} color={colors.gray500} />
                  )}
                </View>
              </View>
              {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  errors.address && styles.inputError,
                  !errors.address && touched.address && formData.address && styles.inputSuccess
                ]}
                placeholder="Enter your complete address"
                value={formData.address}
                onChangeText={(text) => handleChange('address', text)}
                onBlur={() => handleBlur('address')}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
              {errors.address && <Text style={styles.fieldError}>{errors.address}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth *</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={showDatepicker}
                disabled={loading}
              >
                <Text style={styles.dateText}>
                  {birthDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={colors.gray500} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={birthDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setBirthDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                />
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                {[
                  { key: 'male', label: 'Male', icon: 'male' },
                  { key: 'female', label: 'Female', icon: 'female' },
                  { key: 'other', label: 'Other', icon: 'transgender' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.genderButton,
                      gender === item.key && styles.genderButtonActive
                    ]}
                    onPress={() => setGender(item.key as any)}
                    disabled={loading}
                  >
                    <Ionicons 
                      name={item.icon as any} 
                      size={16} 
                      color={gender === item.key ? colors.white : colors.gray500} 
                    />
                    <Text style={[
                      styles.genderText,
                      gender === item.key && styles.genderTextActive
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password && styles.inputError,
                    !errors.password && touched.password && formData.password && styles.inputSuccess
                  ]}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChangeText={(text) => handleChange('password', text)}
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
              {formData.password.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBar}>
                    <View 
                      style={[
                        styles.passwordStrengthFill, 
                        { width: `${passwordStrength.strength}%`, backgroundColor: passwordStrength.color }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.text}
                  </Text>
                </View>
              )}
              {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
              <Text style={styles.hintText}>
                Must contain uppercase, lowercase, number, special character and be 8+ characters
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.confirmPassword && styles.inputError,
                    !errors.confirmPassword && touched.confirmPassword && formData.confirmPassword && styles.inputSuccess
                  ]}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleChange('confirmPassword', text)}
                  onBlur={() => handleBlur('confirmPassword')}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={24} 
                    color={colors.gray500} 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Creating Account...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Sign In</Text>
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
  testModeContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  testModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  testModeText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  testModeSubtext: {
    color: colors.gray500,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    lineHeight: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
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
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
  },
  dateText: {
    fontSize: 16,
    color: colors.gray900,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
  },
  genderButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    color: colors.gray500,
    fontWeight: '500',
    marginLeft: 6,
  },
  genderTextActive: {
    color: colors.white,
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
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.gray200,
    borderRadius: 2,
    marginRight: 12,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
    lineHeight: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
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
  termsContainer: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
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
});

export default RegisterScreen;