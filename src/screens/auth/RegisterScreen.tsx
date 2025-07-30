import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar,
  Modal,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../../navigation/AppNavigator';

// FIXED IMPORT - Use individual imports instead of destructuring
import { authService, locationService } from '../../lib/supabase/index';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  address?: string;
  location?: string;
  general?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  accuracy?: number;
  fromCache?: boolean;
}

interface LocationSuggestion {
  id: string;
  description: string;
  latitude?: number;
  longitude?: number;
  city: string;
  state: string;
  country: string;
}

// Dummy location data for testing
const DUMMY_LOCATIONS: LocationSuggestion[] = [
  {
    id: 'auckland-nz',
    description: 'Auckland, Auckland, New Zealand',
    latitude: -36.8485,
    longitude: 174.7633,
    city: 'Auckland',
    state: 'Auckland',
    country: 'New Zealand'
  },
  {
    id: 'wellington-nz',
    description: 'Wellington, Wellington, New Zealand',
    latitude: -41.2865,
    longitude: 174.7762,
    city: 'Wellington',
    state: 'Wellington',
    country: 'New Zealand'
  },
  {
    id: 'christchurch-nz',
    description: 'Christchurch, Canterbury, New Zealand',
    latitude: -43.5321,
    longitude: 172.6362,
    city: 'Christchurch',
    state: 'Canterbury',
    country: 'New Zealand'
  },
  {
    id: 'hamilton-nz',
    description: 'Hamilton, Waikato, New Zealand',
    latitude: -37.7870,
    longitude: 175.2793,
    city: 'Hamilton',
    state: 'Waikato',
    country: 'New Zealand'
  },
  {
    id: 'sydney-au',
    description: 'Sydney, New South Wales, Australia',
    latitude: -33.8688,
    longitude: 151.2093,
    city: 'Sydney',
    state: 'New South Wales',
    country: 'Australia'
  },
  {
    id: 'melbourne-au',
    description: 'Melbourne, Victoria, Australia',
    latitude: -37.8136,
    longitude: 144.9631,
    city: 'Melbourne',
    state: 'Victoria',
    country: 'Australia'
  },
  {
    id: 'london-uk',
    description: 'London, England, United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    city: 'London',
    state: 'England',
    country: 'United Kingdom'
  },
  {
    id: 'new-york-us',
    description: 'New York, New York, United States',
    latitude: 40.7128,
    longitude: -74.0060,
    city: 'New York',
    state: 'New York',
    country: 'United States'
  }
];

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
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  
  // Enhanced location states
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [useDummyData, setUseDummyData] = useState(true); // Use dummy data by default

  const navigation = useNavigation<RegisterScreenNavigationProp>();
  
  // Use refs for debouncing to prevent memory leaks
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Success Modal Animation
  useEffect(() => {
    if (showSuccessModal) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.5);
      
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showSuccessModal]);

  // Enhanced location permission check with error handling
  const checkLocationPermission = async () => {
    try {
      // For dummy data mode, always return true
      if (useDummyData) {
        setLocationPermissionStatus('granted');
        return true;
      }

      const hasPermission = await locationService.requestLocationPermission();
      setLocationPermissionStatus(hasPermission ? 'granted' : 'denied');
      return hasPermission;
    } catch (error) {
      console.warn('Permission check failed:', error);
      setLocationPermissionStatus('denied');
      return false;
    }
  };

  // Enhanced getCurrentLocation with better error handling and dummy data fallback
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    setErrors(prev => ({ ...prev, location: undefined }));

    try {
      if (useDummyData) {
        // Use dummy location (Auckland as default)
        console.log('🔄 Using dummy location data...');
        const dummyLocation = DUMMY_LOCATIONS[0]; // Auckland
        const locationData: LocationData = {
          latitude: dummyLocation.latitude!,
          longitude: dummyLocation.longitude!,
          address: dummyLocation.description,
          city: dummyLocation.city,
          state: dummyLocation.state,
          country: dummyLocation.country,
          postalCode: '1010',
          fromCache: true
        };
        
        setSelectedLocation(locationData);
        setLocationQuery(dummyLocation.description);
        setShowLocationSuggestions(false);
        console.log('✅ Dummy location set successfully:', dummyLocation.city);
        return;
      }

      // Check permission first
      const hasPermission = await checkLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission is required to use this feature');
      }

      console.log('🔄 Getting current location...');
      const location = await locationService.getCurrentLocation();

      if (location) {
        setSelectedLocation(location);
        setLocationQuery(`${location.city}, ${location.state}, ${location.country}`);
        setShowLocationSuggestions(false);
        
        console.log('✅ Location set successfully:', location.city);
      } else {
        throw new Error('Unable to determine location');
      }
    } catch (error: any) {
      console.error('❌ Location error:', error);
      
      let errorMessage = 'Unable to get your current location. Please try again or search manually.';
      
      if (error.message.includes('permission')) {
        errorMessage = 'Location permission is required. Please enable it in your device settings and try again.';
      } else if (error.message.includes('Location services')) {
        errorMessage = 'Location services are disabled. Please enable them in your device settings.';
      } else if (error.message.includes('timeout') || error.message.includes('GPS')) {
        errorMessage = 'GPS signal is weak. Please ensure you have a clear view of the sky and try again.';
      } else if (error.message.includes('denied')) {
        errorMessage = 'Location access was denied. You can still search for your location manually.';
      }
      
      setErrors(prev => ({ ...prev, location: errorMessage }));
      
      // Show alert for better user experience
      Alert.alert(
        'Location Error',
        errorMessage,
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Search Manually', 
            style: 'default',
            onPress: () => {
              setErrors(prev => ({ ...prev, location: undefined }));
            }
          }
        ]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Enhanced search locations with dummy data support
  const searchLocations = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    const cleanQuery = query.trim().toLowerCase();
    setLocationSearchLoading(true);
    
    try {
      if (useDummyData) {
        // Filter dummy locations based on query
        console.log('🔍 Searching dummy locations for:', cleanQuery);
        const filteredLocations = DUMMY_LOCATIONS.filter(location => 
          location.description.toLowerCase().includes(cleanQuery) ||
          location.city.toLowerCase().includes(cleanQuery) ||
          location.state.toLowerCase().includes(cleanQuery) ||
          location.country.toLowerCase().includes(cleanQuery)
        );
        
        setLocationSuggestions(filteredLocations);
        setShowLocationSuggestions(filteredLocations.length > 0);
        console.log('✅ Found', filteredLocations.length, 'dummy location suggestions');
        return;
      }

      console.log('🔍 Searching for locations:', cleanQuery);
      const suggestions = await locationService.searchLocations(cleanQuery);
      
      if (suggestions && Array.isArray(suggestions)) {
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(suggestions.length > 0);
        console.log('✅ Found', suggestions.length, 'location suggestions');
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
        console.log('⚠️ No location suggestions found');
      }
    } catch (error: any) {
      console.error('❌ Location search error:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      
      // Show user-friendly error message
      if (cleanQuery.length > 2) {
        setErrors(prev => ({ 
          ...prev, 
          location: 'Unable to search locations. Please check your internet connection.' 
        }));
      }
    } finally {
      setLocationSearchLoading(false);
    }
  };

  // Handle location query change with improved debouncing
  const handleLocationQueryChange = (text: string) => {
    setLocationQuery(text);
    setSelectedLocation(null);
    
    // Clear location error when user starts typing
    if (errors.location) {
      setErrors(prev => ({ ...prev, location: undefined }));
    }

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Hide suggestions if query is too short
    if (text.trim().length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    // Debounce search with longer delay for better performance
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(text);
    }, 300); // Reduced delay for dummy data responsiveness
  };

  // Enhanced select location with better error handling
  const selectLocation = async (suggestion: LocationSuggestion) => {
    try {
      setLocationQuery(suggestion.description);
      setShowLocationSuggestions(false);
      setLocationSearchLoading(true);
      setErrors(prev => ({ ...prev, location: undefined }));

      console.log('📍 Selecting location:', suggestion.description);

      let locationData: LocationData;
      
      if (useDummyData || (suggestion.latitude && suggestion.longitude)) {
        // Use suggestion data directly for dummy data or when coordinates are available
        locationData = {
          latitude: suggestion.latitude || 0,
          longitude: suggestion.longitude || 0,
          address: suggestion.description,
          city: suggestion.city,
          state: suggestion.state,
          country: suggestion.country,
          postalCode: useDummyData ? '1010' : '' // Default postal code for dummy data
        };
        console.log('✅ Using suggestion data directly');
      } else {
        // Get detailed location data using reverse geocoding for real data
        try {
          locationData = await locationService.reverseGeocode(suggestion.latitude!, suggestion.longitude!);
          console.log('✅ Got location details from coordinates');
        } catch (reverseError) {
          console.warn('⚠️ Reverse geocoding failed, using suggestion data');
          // Fallback to suggestion data
          locationData = {
            latitude: suggestion.latitude || 0,
            longitude: suggestion.longitude || 0,
            address: suggestion.description,
            city: suggestion.city,
            state: suggestion.state,
            country: suggestion.country,
            postalCode: ''
          };
        }
      }
      
      setSelectedLocation(locationData);
      console.log('✅ Location selected successfully');
    } catch (error: any) {
      console.error('❌ Error selecting location:', error);
      setErrors(prev => ({ 
        ...prev, 
        location: 'Unable to get location details. Please try another location.' 
      }));
    } finally {
      setLocationSearchLoading(false);
    }
  };

  // Show popular locations when input is focused and empty
  const showPopularLocations = () => {
    if (useDummyData && locationQuery.trim().length === 0) {
      setLocationSuggestions(DUMMY_LOCATIONS.slice(0, 5)); // Show first 5 popular locations
      setShowLocationSuggestions(true);
    }
  };

  // Dismiss location suggestions when tapping outside
  const dismissLocationSuggestions = () => {
    setShowLocationSuggestions(false);
  };

  // COMPLETELY SAFE validation functions - NO ASYNC CALLS
  const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
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

  const validatePhone = (phone: string): string | null => {
    if (!phone) return 'Phone number is required';
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return 'Please enter a valid phone number';
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

  const validateLocation = (location: LocationData | null): string | null => {
    if (!location) return 'Please select your location';
    if (!location.city || location.city === 'Unknown') return 'Please select a valid location';
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

  // SUPER SAFE handleChange function - NO ASYNC CALLS ON KEYSTROKE
  const handleChange = (field: string, value: string) => {
    console.log(`Typing in ${field}:`, value.length, 'characters'); // Debug log
    
    // Update form data immediately
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Reset availability indicators when user types
    if (field === 'email') {
      setEmailChecked(false);
    }
    
    if (field === 'phone') {
      setPhoneChecked(false);
    }

    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // ONLY do immediate synchronous validation - NO ASYNC CALLS
    let error: string | null = null;
    
    try {
      switch (field) {
        case 'firstName':
          error = validateName(value, 'First name');
          break;
        case 'lastName':
          error = validateName(value, 'Last name');
          break;
        case 'email':
          error = validateEmail(value);
          break;
        case 'phone':
          error = validatePhone(value);
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

      // Set error immediately for syntax validation ONLY
      if (error) {
        setErrors(prev => ({
          ...prev,
          [field]: error
        }));
      }
    } catch (e) {
      console.error('Validation error:', e);
      // Even if validation fails, don't crash
    }
  };

  // SAFE handleBlur function - Only check availability on blur
  const handleBlur = async (field: string) => {
    console.log(`Blur event for ${field}`);
    
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    const value = formData[field as keyof typeof formData] || '';
    
    // Re-run basic validation on blur
    let error: string | null = null;

    switch (field) {
      case 'firstName':
        error = validateName(value, 'First name');
        break;
      case 'lastName':
        error = validateName(value, 'Last name');
        break;
      case 'email':
        error = validateEmail(value);
        // ONLY check availability on blur and if basic validation passes
        if (!error && value.length > 5 && !useDummyData) {
          try {
            console.log('Checking email availability for:', value);
            const availability = await authService.checkEmailAvailability(value);
            if (availability && !availability.available) {
              setErrors(prev => ({
                ...prev,
                email: availability.message || 'This email is already registered'
              }));
            } else if (availability && availability.available) {
              setEmailChecked(true);
            }
          } catch (e) {
            console.log('Email availability check failed silently:', e);
            // Fail silently - don't crash the app
          }
        }
        break;
      case 'phone':
        error = validatePhone(value);
        // ONLY check availability on blur and if basic validation passes
        if (!error && value.replace(/[\s\-\(\)]/g, '').length >= 8 && !useDummyData) {
          try {
            console.log('Checking phone availability for:', value);
            const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
            const availability = await authService.checkPhoneAvailability(cleanPhone);
            if (availability && !availability.available) {
              setErrors(prev => ({
                ...prev,
                phone: availability.message || 'This phone number is already registered'
              }));
            } else if (availability && availability.available) {
              setPhoneChecked(true);
            }
          } catch (e) {
            console.log('Phone availability check failed silently:', e);
            // Fail silently - don't crash the app
          }
        }
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(value, formData.password);
        break;
      case 'address':
        error = validateAddress(value);
        break;
    }

    if (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  // SAFE validateAllFields for final submission
  const validateAllFields = async (): Promise<boolean> => {
    const newErrors: ValidationErrors = {};

    newErrors.firstName = validateName(formData.firstName, 'First name');
    newErrors.lastName = validateName(formData.lastName, 'Last name');
    newErrors.email = validateEmail(formData.email);
    newErrors.phone = validatePhone(formData.phone);
    newErrors.password = validatePassword(formData.password);
    newErrors.confirmPassword = validateConfirmPassword(formData.confirmPassword, formData.password);
    newErrors.address = validateAddress(formData.address);
    newErrors.location = validateLocation(selectedLocation);

    // Validate age
    const ageError = validateAge(birthDate);
    if (ageError) {
      newErrors.general = ageError;
    }

    // Check availability one final time for email and phone (skip for dummy data)
    if (!useDummyData) {
      try {
        if (!newErrors.email) {
          const emailAvailability = await authService.checkEmailAvailability(formData.email);
          if (emailAvailability && !emailAvailability.available) {
            newErrors.email = emailAvailability.message || 'This email is already registered';
          }
        }

        if (!newErrors.phone) {
          const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
          const phoneAvailability = await authService.checkPhoneAvailability(cleanPhone);
          if (phoneAvailability && !phoneAvailability.available) {
            newErrors.phone = phoneAvailability.message || 'This phone number is already registered';
          }
        }
      } catch (error) {
        console.log('Final availability check failed:', error);
        // Continue with registration if availability check fails
      }
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
      // Log the attempt with error handling
      console.log('🚀 Starting registration process...');
      
      // Check if AuthService exists
      if (!authService) {
        throw new Error('AuthService is not available. Please check your imports.');
      }

      const userData = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        location: selectedLocation!,
        gender,
        birthDate: birthDate.toISOString().split('T')[0],
        accountType: 'consumer' as const,
      };

      const response = await authService.signUp(userData);
      
      if (response && response.success) {
        console.log('✅ Registration successful');
        
        // Clear form data after successful registration
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          address: '',
        });
        setSelectedLocation(null);
        setLocationQuery('');
        setErrors({});
        setTouched({});
        
        // Set success message based on verification requirement
        const message = response.verification_required 
          ? 'Account created successfully! Please check your email to verify your account.'
          : `Welcome ${formData.firstName}! Your account has been created successfully.`;
        
        setSuccessMessage(message);
        setShowSuccessModal(true);
        
        // Remove automatic navigation - let user manually proceed
      } else {
        console.error('❌ Registration failed:', response?.error);
        setErrors({ general: response?.error || 'Registration failed. Please try again.' });
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      // Handle specific error types
      if (error.message.includes('authService')) {
        errorMessage = 'Service initialization error. Please restart the app and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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
          onScrollBeginDrag={dismissLocationSuggestions}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="calendar" size={40} color={colors.primary} />
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Fill in your details to get started</Text>
            </View>
          </View>

          {/* Dummy Data Toggle (for development) */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <TouchableOpacity
                style={[styles.debugButton, useDummyData && styles.debugButtonActive]}
                onPress={() => setUseDummyData(!useDummyData)}
              >
                <Ionicons 
                  name={useDummyData ? "checkbox" : "checkbox-outline"} 
                  size={16} 
                  color={useDummyData ? colors.white : colors.gray500} 
                />
                <Text style={[styles.debugText, useDummyData && styles.debugTextActive]}>
                  Use Dummy Location Data
                </Text>
              </TouchableOpacity>
            </View>
          )}

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
                  placeholder="+64 21 123 4567"
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
              <Text style={styles.label}>Location *</Text>
              <View style={styles.locationContainer}>
                <View style={styles.locationInputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.locationInput,
                      errors.location && styles.inputError,
                      !errors.location && selectedLocation && styles.inputSuccess
                    ]}
                    placeholder={useDummyData ? "Search from popular locations or type your own" : "Search for your city or location"}
                    value={locationQuery}
                    onChangeText={handleLocationQueryChange}
                    onFocus={() => {
                      if (useDummyData) {
                        showPopularLocations();
                      } else if (locationSuggestions.length > 0) {
                        setShowLocationSuggestions(true);
                      }
                    }}
                    editable={!loading && !isGettingLocation}
                  />
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={getCurrentLocation}
                    disabled={loading || isGettingLocation || locationSearchLoading}
                  >
                    {isGettingLocation ? (
                      <Ionicons name="hourglass-outline" size={20} color={colors.primary} />
                    ) : (
                      <Ionicons name="location" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
                
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <View style={styles.suggestionsList}>
                    {useDummyData && locationQuery.trim().length === 0 && (
                      <View style={styles.popularHeader}>
                        <Ionicons name="star" size={14} color={colors.primary} />
                        <Text style={styles.popularHeaderText}>Popular Locations</Text>
                      </View>
                    )}
                    {locationSuggestions.slice(0, 6).map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion.id}
                        style={styles.suggestionItem}
                        onPress={() => selectLocation(suggestion)}
                        disabled={locationSearchLoading}
                      >
                        <Ionicons name="location-outline" size={16} color={colors.gray500} />
                        <Text style={styles.suggestionText} numberOfLines={1}>
                          {suggestion.description}
                        </Text>
                        {useDummyData && (
                          <View style={styles.dummyBadge}>
                            <Text style={styles.dummyBadgeText}>Demo</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.dismissButton}
                      onPress={dismissLocationSuggestions}
                    >
                      <Text style={styles.dismissText}>Close suggestions</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {locationSearchLoading && (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="hourglass-outline" size={16} color={colors.gray500} />
                    <Text style={styles.loadingText}>
                      {isGettingLocation ? 'Getting your location...' : 'Searching locations...'}
                    </Text>
                  </View>
                )}

                {selectedLocation && (
                  <View style={styles.selectedLocationContainer}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.selectedLocationText} numberOfLines={1}>
                      {selectedLocation.city}, {selectedLocation.state}, {selectedLocation.country}
                      {selectedLocation.fromCache && ' (cached)'}
                    </Text>
                    {selectedLocation.accuracy && (
                      <Text style={styles.accuracyText}>
                        ±{Math.round(selectedLocation.accuracy)}m accuracy
                      </Text>
                    )}
                    {useDummyData && (
                      <View style={styles.dummyIndicator}>
                        <Text style={styles.dummyIndicatorText}>Demo Data</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Location permission status indicator */}
                {!useDummyData && locationPermissionStatus === 'denied' && (
                  <View style={styles.permissionWarning}>
                    <Ionicons name="warning-outline" size={16} color={colors.warning} />
                    <Text style={styles.permissionWarningText}>
                      Location permission denied. You can still search manually.
                    </Text>
                  </View>
                )}
              </View>
              {errors.location && <Text style={styles.fieldError}>{errors.location}</Text>}
              <Text style={styles.hintText}>
                {useDummyData 
                  ? "Using sample locations for demo purposes" 
                  : "This helps us provide location-based services"
                }
              </Text>
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
                onFocus={dismissLocationSuggestions}
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
                  {birthDate.toLocaleDateString('en-NZ', { 
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
                  onFocus={dismissLocationSuggestions}
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
                  onFocus={dismissLocationSuggestions}
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
                  <Ionicons name="hourglass-outline" size={20} color={colors.white} />
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

      {/* Success Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => {}}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <View style={styles.successIconContainer}>
              <Ionicons 
                name="checkmark-circle" 
                size={64} 
                color={colors.success} 
                style={styles.successIcon} 
              />
            </View>
            <Text style={styles.successTitle}>Registration Successful! 🎉</Text>
            <Text style={styles.successSubtitle}>
              {successMessage}
            </Text>
            
            {/* User Details Summary */}
            <View style={styles.userDetailsContainer}>
              <View style={styles.userDetailRow}>
                <Ionicons name="person-outline" size={16} color={colors.primary} />
                <Text style={styles.userDetailText}>
                  {formData.firstName} {formData.lastName}
                </Text>
              </View>
              <View style={styles.userDetailRow}>
                <Ionicons name="mail-outline" size={16} color={colors.primary} />
                <Text style={styles.userDetailText}>{formData.email}</Text>
              </View>
              <View style={styles.userDetailRow}>
                <Ionicons name="call-outline" size={16} color={colors.primary} />
                <Text style={styles.userDetailText}>{formData.phone}</Text>
              </View>
              {selectedLocation && (
                <View style={styles.userDetailRow}>
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <Text style={styles.userDetailText}>
                    {selectedLocation.city}, {selectedLocation.country}
                  </Text>
                </View>
              )}
              <View style={styles.userDetailRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.userDetailText}>
                  Born: {birthDate.toLocaleDateString('en-NZ', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
              <View style={styles.userDetailRow}>
                <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.userDetailText}>
                  Gender: {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  // Navigate based on account type - using replace to prevent back navigation
                  navigation.replace('ConsumerTabs', { screen: 'HomeTab' });
                }}
              >
                <Text style={styles.continueButtonText}>Continue to Home</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
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
    lineHeight: 24,
  },
  // Debug styles for development
  debugContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  debugButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  debugText: {
    fontSize: 12,
    color: colors.gray500,
    marginLeft: 6,
    fontWeight: '500',
  },
  debugTextActive: {
    color: colors.white,
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
  // Enhanced Location-specific styles
  locationContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
    paddingRight: 50,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
    zIndex: 1,
  },
  suggestionsList: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 260,
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  popularHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.lightAccent,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  popularHeaderText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 6,
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.gray700,
    marginLeft: 8,
    flex: 1,
  },
  dummyBadge: {
    backgroundColor: colors.info,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  dummyBadgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  dismissText: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginTop: 4,
    backgroundColor: colors.gray50,
    borderRadius: 6,
  },
  loadingText: {
    fontSize: 12,
    color: colors.gray500,
    marginLeft: 6,
  },
  selectedLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.gray50,
    borderRadius: 6,
  },
  selectedLocationText: {
    fontSize: 12,
    color: colors.success,
    marginLeft: 6,
    fontWeight: '500',
    flex: 1,
  },
  accuracyText: {
    fontSize: 10,
    color: colors.gray400,
    marginLeft: 6,
  },
  dummyIndicator: {
    backgroundColor: colors.info,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  dummyIndicatorText: {
    fontSize: 9,
    color: colors.white,
    fontWeight: '600',
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  permissionWarningText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 6,
    flex: 1,
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
    marginHorizontal: 8,
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
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    maxWidth: 320,
    width: '100%',
  },
  successIconContainer: {
    marginBottom: 24,
    backgroundColor: '#F0FDF4',
    borderRadius: 50,
    padding: 16,
    borderWidth: 3,
    borderColor: '#BBF7D0',
  },
  successIcon: {
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.darkAccent,
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  successFooter: {
    alignItems: 'center',
  },
  successFooterText: {
    fontSize: 14,
    color: colors.gray500,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginHorizontal: 3,
    opacity: 0.3,
  },
  // New styles for enhanced success modal
  userDetailsContainer: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userDetailText: {
    fontSize: 14,
    color: colors.gray700,
    marginLeft: 8,
    flex: 1,
  },
  successActions: {
    width: '100%',
    marginTop: 8,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
});

export default RegisterScreen;