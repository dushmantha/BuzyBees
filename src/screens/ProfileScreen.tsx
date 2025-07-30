import React, { useState, useCallback, useEffect } from 'react';
import { useAuth, useAccount, useNotifications } from '../navigation/AppNavigator';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  Modal,
  Linking,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useImagePicker from '../hooks/useImagePicker';
import mockService from '../services/api/mock/index';
import UpgradeModal from '../components/UpgradeModal';
import { authService } from '../lib/supabase/index';

interface ProfileData {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender?: string;
  birth_date?: string;
  address?: string;
  bio?: string;
  avatar_url?: string;
  account_type: 'provider' | 'consumer';
  is_premium: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  
  // Location data from user_locations table
  location?: {
    id: string;
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    is_primary: boolean;
  };
  
  // Provider-specific data from provider_details table
  provider_details?: {
    id: string;
    business_name: string;
    service_category: string;
    experience_years: number;
    hourly_rate: number;
    availability: string;
    bio?: string;
    rating: number;
    completed_jobs: number;
    total_earnings: number;
    is_verified: boolean;
    verification_date?: string;
    created_at: string;
    updated_at: string;
    provider_skills?: Array<{
      skill_name: string;
      experience_level: string;
    }>;
    provider_certifications?: Array<{
      certification_name: string;
      issued_by: string;
      issue_date: string;
      expiry_date?: string;
    }>;
  };
  
  // Consumer-specific data from consumer_details table
  consumer_details?: {
    id: string;
    budget_range: string;
    location_preference: string;
    service_history: number;
    total_spent: number;
    average_rating_given: number;
    created_at: string;
    updated_at: string;
    consumer_preferred_services?: Array<{
      service_category: string;
    }>;
  };
  
  // User preferences from user_preferences table
  preferences?: {
    id: string;
    email_notifications: boolean;
    push_notifications: boolean;
    sms_notifications: boolean;
    profile_visibility: string;
    location_sharing: boolean;
    theme: string;
    language: string;
    timezone: string;
    marketing_emails: boolean;
    created_at: string;
    updated_at: string;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  date: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
  pdf_url: string;
  is_new: boolean;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  total_count?: number;
  has_more?: boolean;
}

const ProfileScreen = ({ navigation }: { navigation: any }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'invoices'>('profile');
  
  // Use the global account context and notifications
  const { accountType, setAccountType, isLoading: accountSwitchLoading } = useAccount();
  const { notificationCount } = useNotifications();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tempProfile, setTempProfile] = useState<ProfileData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAccountSwitchModal, setShowAccountSwitchModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalInvoiceCount, setTotalInvoiceCount] = useState(0);
  const [hasMoreInvoices, setHasMoreInvoices] = useState(false);
  
  const { signOut } = useAuth();
  const { showImagePickerOptions, isLoading: isImageLoading } = useImagePicker();

  const userId = '1';
  const FREE_PAYMENT_LIMIT = 3;

  // Default mock profile data for fallback scenarios
  const mockProfileData = {
    id: 'mock-user-id',
    email: 'mock@example.com',
    phone: '1234567890',
    first_name: 'Demo',
    last_name: 'User',
    full_name: 'Demo User',
    account_type: accountType as 'provider' | 'consumer',
    is_premium: false,
    email_verified: false,
    phone_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Single API service function for comprehensive data fetching
  const apiService = {
    async getProfileManagementData(userId: string): Promise<ApiResponse<{
      profile: ProfileData;
      invoices: Invoice[];
      total_count: number;
      has_more: boolean;
    }>> {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const consumerInvoices: Invoice[] = [
          {
            id: '1',
            invoice_number: 'INV-2024-001',
            amount: 125.00,
            currency: 'NZD',
            date: '2024-01-15',
            due_date: '2024-02-15',
            status: 'pending',
            description: 'House cleaning service - 3 hours',
            pdf_url: 'https://example.com/invoice-001.pdf',
            is_new: true,
          },
          {
            id: '2',
            invoice_number: 'INV-2024-002',
            amount: 280.00,
            currency: 'NZD',
            date: '2024-01-08',
            due_date: '2024-01-31',
            status: 'paid',
            description: 'Garden maintenance and landscaping',
            pdf_url: 'https://example.com/invoice-002.pdf',
            is_new: false,
          },
          {
            id: '3',
            invoice_number: 'INV-2023-045',
            amount: 450.00,
            currency: 'NZD',
            date: '2023-12-15',
            due_date: '2023-12-31',
            status: 'overdue',
            description: 'Plumbing repair - kitchen sink',
            pdf_url: 'https://example.com/invoice-045.pdf',
            is_new: false,
          },
        ];

        const providerPayments: Invoice[] = [
          {
            id: '1',
            invoice_number: 'PAY-2024-001',
            amount: 1250.00,
            currency: 'NZD',
            date: '2024-01-15',
            due_date: '2024-01-30',
            status: 'pending',
            description: 'Payment for electrical installation - John Doe',
            pdf_url: 'https://example.com/payment-001.pdf',
            is_new: true,
          },
          {
            id: '2',
            invoice_number: 'PAY-2024-002',
            amount: 875.00,
            currency: 'NZD',
            date: '2024-01-10',
            due_date: '2024-01-25',
            status: 'paid',
            description: 'Carpentry work - Kitchen cabinets - Sarah Wilson',
            pdf_url: 'https://example.com/payment-002.pdf',
            is_new: false,
          },
          {
            id: '3',
            invoice_number: 'PAY-2024-003',
            amount: 320.00,
            currency: 'NZD',
            date: '2024-01-05',
            due_date: '2024-01-20',
            status: 'paid',
            description: 'Painting service - Living room - Mike Chen',
            pdf_url: 'https://example.com/payment-003.pdf',
            is_new: true,
          },
          {
            id: '4',
            invoice_number: 'PAY-2024-004',
            amount: 560.00,
            currency: 'NZD',
            date: '2024-01-03',
            due_date: '2024-01-18',
            status: 'pending',
            description: 'Plumbing installation - New bathroom - Lisa Johnson',
            pdf_url: 'https://example.com/payment-004.pdf',
            is_new: false,
          },
          {
            id: '5',
            invoice_number: 'PAY-2024-005',
            amount: 420.00,
            currency: 'NZD',
            date: '2024-01-01',
            due_date: '2024-01-16',
            status: 'paid',
            description: 'Electrical repair - Office building - Tech Corp',
            pdf_url: 'https://example.com/payment-005.pdf',
            is_new: false,
          },
          {
            id: '6',
            invoice_number: 'PAY-2023-099',
            amount: 780.00,
            currency: 'NZD',
            date: '2023-12-28',
            due_date: '2024-01-12',
            status: 'paid',
            description: 'Home renovation - Deck construction - Wilson Family',
            pdf_url: 'https://example.com/payment-099.pdf',
            is_new: false,
          },
        ];
        
        const allInvoices = accountType === 'provider' ? providerPayments : consumerInvoices;
        // Use actual profile data if available, otherwise fall back to mock data
        const profileToUse = profile || mockProfileData;
        const limit = accountType === 'provider' && !profileToUse.is_premium ? FREE_PAYMENT_LIMIT : undefined;
        const limitedInvoices = limit ? allInvoices.slice(0, limit) : allInvoices;
        
        return {
          data: {
            profile: { ...profileToUse, account_type: accountType },
            invoices: limitedInvoices,
            total_count: allInvoices.length,
            has_more: limit ? allInvoices.length > limit : false
          },
          success: true
        };
      } catch (error) {
        console.error('API Error:', error);
        throw new Error('Failed to fetch profile management data');
      }
    },

    async updateProfile(userId: string, profileData: Partial<ProfileData>): Promise<ApiResponse<ProfileData>> {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const profileToUse = profile || mockProfileData;
      return {
        data: { ...profileToUse, ...profileData },
        success: true
      };
    },

    async markAsPaid(invoiceId: string): Promise<ApiResponse<null>> {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { data: null, success: true };
    },

    async markAsRead(invoiceId: string): Promise<ApiResponse<null>> {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { data: null, success: true };
    },

    async upgradeToPremium(userId: string): Promise<ApiResponse<ProfileData>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('🎯 Upgrading to premium for user:', userId);
        
        const profileToUse = profile || mockProfileData;
        if (!profileToUse) {
          console.warn('⚠️ Falling back to default profile data');
          const fallbackProfile = {
            id: userId,
            email: 'user@example.com',
            first_name: 'User',
            last_name: 'Name',
            full_name: 'User Name',
            phone: '',
            avatar_url: null,
            account_type: 'consumer' as const,
            is_premium: true, // This will be set to true after upgrade
            email_verified: false,
            phone_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          return {
            data: fallbackProfile,
            success: true
          };
        }
        
        return {
          data: { ...profileToUse, is_premium: true },
          success: true
        };
      } catch (error) {
        console.error('❌ Upgrade to premium error:', error);
        return {
          data: null,
          success: false,
          error: 'Failed to upgrade to premium'
        };
      }
    }
  };

  // Fetch real user profile from Supabase
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Fetching user profile...');
        
        // Check if we have an authenticated user first
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          console.warn('⚠️ No authenticated user found, using default profile data');
          // Set default profile data for unauthenticated users
          const defaultProfile = {
            id: 'temp-user-id',
            email: 'user@example.com',
            phone: '1234567890',
            first_name: 'Demo',
            last_name: 'User', 
            full_name: 'Demo User',
            account_type: accountType,
            is_premium: false,
            email_verified: false,
            phone_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setProfile(defaultProfile);
          
          // Still load mock invoices
          const mockInvoiceResponse = await apiService.getProfileManagementData('current');
          if (mockInvoiceResponse.success) {
            setInvoices(mockInvoiceResponse.data.invoices);
            setTotalInvoiceCount(mockInvoiceResponse.data.total_count);
            setHasMoreInvoices(mockInvoiceResponse.data.has_more);
            
            const newInvoicesCount = mockInvoiceResponse.data.invoices.filter(invoice => invoice.is_new).length;
            setUnreadCount(newInvoicesCount);
          }
          
          setIsLoading(false);
          return;
        }
        
        // Get real user profile from authService
        const profileResponse = await authService.getUserProfile();
        
        if (profileResponse.success && profileResponse.data) {
          console.log('✅ Real profile loaded:', profileResponse.data.account_type);
          setProfile(profileResponse.data);
          
          // Update account type in context if different
          const profileAccountType = profileResponse.data.account_type;
          if (profileAccountType && 
              (profileAccountType === 'provider' || profileAccountType === 'consumer') && 
              profileAccountType !== accountType) {
            setAccountType(profileAccountType);
          }
        } else {
          console.error('❌ Failed to load profile:', profileResponse.error);
          // Fall back to default profile instead of throwing error
          console.warn('⚠️ Falling back to default profile data');
          const defaultProfile = {
            id: currentUser.id,
            email: currentUser.email || 'user@example.com',
            phone: '1234567890',
            first_name: 'User',
            last_name: 'Profile', 
            full_name: 'User Profile',
            account_type: accountType,
            is_premium: false,
            email_verified: false,
            phone_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setProfile(defaultProfile);
        }
        
        // Still use mock data for invoices (for now)
        const mockInvoiceResponse = await apiService.getProfileManagementData('current');
        if (mockInvoiceResponse.success) {
          setInvoices(mockInvoiceResponse.data.invoices);
          setTotalInvoiceCount(mockInvoiceResponse.data.total_count);
          setHasMoreInvoices(mockInvoiceResponse.data.has_more);
          
          const newInvoicesCount = mockInvoiceResponse.data.invoices.filter(invoice => invoice.is_new).length;
          setUnreadCount(newInvoicesCount);
        }
        
      } catch (error) {
        console.error('Error fetching profile data:', error);
        // Instead of showing alert, fall back to default data
        console.warn('⚠️ Error occurred, using fallback profile data');
        const defaultProfile = {
          id: 'fallback-user-id',
          email: 'fallback@example.com',
          phone: '1234567890',
          first_name: 'Demo',
          last_name: 'User', 
          full_name: 'Demo User',
          account_type: accountType,
          is_premium: false,
          email_verified: false,
          phone_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setProfile(defaultProfile);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [accountType]);

  // Refresh invoices only when tab changes or account switches
  const refreshInvoicesData = useCallback(async () => {
    if (activeTab === 'invoices') {
      try {
        setIsLoadingInvoices(true);
        const response = await apiService.getProfileManagementData(userId);
        
        if (response.success) {
          setInvoices(response.data.invoices);
          setTotalInvoiceCount(response.data.total_count);
          setHasMoreInvoices(response.data.has_more);
          
          const newInvoicesCount = response.data.invoices.filter(invoice => invoice.is_new).length;
          setUnreadCount(newInvoicesCount);
        }
      } catch (error) {
        console.error('Error refreshing invoices:', error);
        Alert.alert('Error', `Failed to refresh ${accountType === 'provider' ? 'payments' : 'invoices'}`);
      } finally {
        setIsLoadingInvoices(false);
      }
    }
  }, [userId, accountType, activeTab]);

  // Handle upgrade to premium
  const handleUpgrade = async () => {
    try {
      setShowUpgradeModal(false);
      
      Alert.alert('Processing', 'Upgrading your account...', [], { cancelable: false });
      
      const response = await apiService.upgradeToPremium(userId);
      
      if (response.success) {
        setProfile(response.data);
        Alert.alert('Success!', 'Your account has been upgraded to Pro. You now have unlimited access to all payments and premium features.');
        
        // Refresh data to show all payments
        refreshInvoicesData();
      } else {
        throw new Error('Upgrade failed');
      }
    } catch (error) {
      console.error('Error upgrading account:', error);
      Alert.alert('Error', 'Failed to upgrade account. Please try again.');
    }
  };

  // Updated account switch handler
  const handleAccountSwitch = async (newAccountType: 'provider' | 'consumer') => {
    try {
      setShowAccountSwitchModal(false);
      
      // Validate the account type before setting
      if (!newAccountType || (newAccountType !== 'provider' && newAccountType !== 'consumer')) {
        console.error('❌ Invalid account type for switch:', newAccountType);
        Alert.alert('Error', 'Invalid account type selection');
        return;
      }
      
      await setAccountType(newAccountType);
      
      Alert.alert(
        'Account Switched', 
        `You are now viewing your ${newAccountType === 'provider' ? 'Service Provider' : 'Service Consumer'} profile.`,
        [{ text: 'OK' }]
      );

      if (profile) {
        const updatedProfile = { ...profile, account_type: newAccountType };
        setProfile(updatedProfile);
      }

      setInvoices([]);
      setUnreadCount(0);
      
      if (activeTab === 'invoices') {
        setTimeout(() => {
          refreshInvoicesData();
        }, 500);
      }

    } catch (error) {
      console.error('Error switching account:', error);
      Alert.alert('Error', 'Failed to switch account mode. Please try again.');
    }
  };

  const handleEdit = useCallback(() => {
    if (profile) {
      setTempProfile({ ...profile });
      setIsEditing(true);
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    if (!tempProfile) return;

    const validateForm = (): boolean => {
      if (!tempProfile.full_name.trim()) {
        Alert.alert('Validation Error', 'Please enter your name');
        return false;
      }
      if (!/^\S+@\S+\.\S+$/.test(tempProfile.email)) {
        Alert.alert('Validation Error', 'Please enter a valid email address');
        return false;
      }
      if (!tempProfile.phone.trim()) {
        Alert.alert('Validation Error', 'Please enter your phone number');
        return false;
      }
      return true;
    };

    if (!validateForm()) return;
    
    try {
      setIsSaving(true);
      
      const response = await apiService.updateProfile(userId, tempProfile);
      
      if (response.success) {
        setProfile(response.data);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [tempProfile, userId]);

  const handleCancel = () => {
    setIsEditing(false);
    setTempProfile(null);
  };

  const updateField = (field: keyof ProfileData, value: any) => {
    if (tempProfile) {
      setTempProfile(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const updateProviderField = (field: string, value: any) => {
    if (tempProfile && tempProfile.provider_details) {
      setTempProfile(prev => prev ? {
        ...prev,
        provider_details: {
          ...prev.provider_details!,
          [field]: value
        }
      } : null);
    }
  };

  const updateConsumerField = (field: string, value: any) => {
    if (tempProfile && tempProfile.consumer_details) {
      setTempProfile(prev => prev ? {
        ...prev,
        consumer_details: {
          ...prev.consumer_details!,
          [field]: value
        }
      } : null);
    }
  };

  const handleChoosePhoto = useCallback(async () => {
    try {
      const imageUri = await showImagePickerOptions();
      if (imageUri && tempProfile) {
        setTempProfile(prev => prev ? { ...prev, avatar_url: imageUri } : null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error in image picker:', error);
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
      return false;
    }
  }, [showImagePickerOptions, tempProfile]);

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const response = await apiService.markAsPaid(invoiceId);
      if (response.success) {
        setInvoices(prev => prev.map(invoice => 
          invoice.id === invoiceId 
            ? { ...invoice, status: 'paid' as const }
            : invoice
        ));
        Alert.alert('Success', 'Invoice marked as paid');
      } else {
        Alert.alert('Error', 'Failed to update invoice status');
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      Alert.alert('Error', 'Failed to update invoice status');
    }
  };

  const handleMarkAsRead = async (invoiceId: string) => {
    try {
      const response = await apiService.markAsRead(invoiceId);
      if (response.success) {
        setInvoices(prev => prev.map(invoice => 
          invoice.id === invoiceId 
            ? { ...invoice, is_new: false }
            : invoice
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking invoice as read:', error);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      if (invoice.pdf_url) {
        await Linking.openURL(invoice.pdf_url);
      } else {
        Alert.alert('Error', 'PDF not available');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF');
    }
  };

  // Fixed navigation handlers
  const handleNotificationsPress = () => {
    if (navigation?.navigate) {
      navigation.navigate('Notifications');
    } else {
      Alert.alert('Navigation', 'Navigate to Notifications screen');
    }
  };

  const handlePaymentMethodsPress = () => {
    if (navigation?.navigate) {
      navigation.navigate('PaymentMethods');
    } else {
      Alert.alert('Navigation', 'Navigate to Payment Methods screen');
    }
  };

  const handlePrivacyPress = () => {
    if (navigation?.navigate) {
      navigation.navigate('Privacy');
    } else {
      Alert.alert('Navigation', 'Navigate to Privacy screen');
    }
  };

  const handleHelpCenterPress = () => {
    if (navigation?.navigate) {
      navigation.navigate('HelpCenter');
    } else {
      Alert.alert('Navigation', 'Navigate to Help Center screen');
    }
  };

  const handleTermsConditionsPress = () => {
    if (navigation?.navigate) {
      navigation.navigate('TermsConditions');
    } else {
      Alert.alert('Navigation', 'Navigate to Terms & Conditions screen');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // No manual navigation needed - auth state change will handle redirect
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderField = (label: string, field: keyof ProfileData, isTextArea = false) => {
    const currentProfile = isEditing ? tempProfile : profile;
    if (!currentProfile) return null;

    // Handle nested fields properly
    let value = currentProfile[field];
    if (field === 'full_name' && !value) {
      value = `${currentProfile.first_name || ''} ${currentProfile.last_name || ''}`.trim();
    }

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={[styles.input, isTextArea && styles.textArea]}
            value={String(value || '')}
            onChangeText={(text) => updateField(field, text)}
            multiline={isTextArea}
            numberOfLines={isTextArea ? 3 : 1}
          />
        ) : (
          <Text style={styles.value}>{value || 'Not provided'}</Text>
        )}
      </View>
    );
  };

  const renderProviderField = (label: string, field: string, isTextArea = false) => {
    const currentProfile = isEditing ? tempProfile : profile;
    if (!currentProfile || !currentProfile.provider_details) return null;

    const value = currentProfile.provider_details[field as keyof typeof currentProfile.provider_details];

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={[styles.input, isTextArea && styles.textArea]}
            value={String(value || '')}
            onChangeText={(text) => updateProviderField(field, text)}
            multiline={isTextArea}
            numberOfLines={isTextArea ? 3 : 1}
            keyboardType={field === 'hourly_rate' || field === 'experience_years' ? 'numeric' : 'default'}
          />
        ) : (
          <Text style={styles.value}>{String(value || 'Not provided')}</Text>
        )}
      </View>
    );
  };

  const renderConsumerField = (label: string, field: string, isTextArea = false) => {
    const currentProfile = isEditing ? tempProfile : profile;
    if (!currentProfile || !currentProfile.consumer_details) return null;

    const value = currentProfile.consumer_details[field as keyof typeof currentProfile.consumer_details];

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={[styles.input, isTextArea && styles.textArea]}
            value={Array.isArray(value) ? value.join(', ') : String(value)}
            onChangeText={(text) => updateConsumerField(field, field === 'preferred_services' ? text.split(', ') : text)}
            multiline={isTextArea}
            numberOfLines={isTextArea ? 3 : 1}
          />
        ) : (
          <Text style={styles.value}>
            {Array.isArray(value) ? value.join(', ') : value || 'Not provided'}
          </Text>
        )}
      </View>
    );
  };

  const renderAccountSwitchModal = () => (
    <Modal
      visible={showAccountSwitchModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.accountSwitchModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Switch Account Mode</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAccountSwitchModal(false)}
            >
              <Ionicons name="close" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.accountOptions}>
            <TouchableOpacity
              style={[
                styles.accountOption,
                accountType === 'consumer' && styles.selectedAccountOption
              ]}
              onPress={() => handleAccountSwitch('consumer')}
              disabled={accountSwitchLoading}
            >
              <View style={styles.accountOptionIcon}>
                <Ionicons 
                  name="person-outline" 
                  size={24} 
                  color={accountType === 'consumer' ? '#F59E0B' : '#4B5563'} 
                />
              </View>
              <View style={styles.accountOptionContent}>
                <Text style={[
                  styles.accountOptionTitle,
                  accountType === 'consumer' && styles.selectedAccountOptionTitle
                ]}>
                  Service Consumer
                </Text>
                <Text style={styles.accountOptionDescription}>
                  Find and book services from trusted providers
                </Text>
              </View>
              {accountType === 'consumer' && (
                <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.accountOption,
                accountType === 'provider' && styles.selectedAccountOption
              ]}
              onPress={() => handleAccountSwitch('provider')}
              disabled={accountSwitchLoading}
            >
              <View style={styles.accountOptionIcon}>
                <Ionicons 
                  name="briefcase-outline" 
                  size={24} 
                  color={accountType === 'provider' ? '#F59E0B' : '#4B5563'} 
                />
              </View>
              <View style={styles.accountOptionContent}>
                <Text style={[
                  styles.accountOptionTitle,
                  accountType === 'provider' && styles.selectedProviderOptionTitle
                ]}>
                  Service Provider
                </Text>
                <Text style={styles.accountOptionDescription}>
                  Offer your services and grow your business
                </Text>
              </View>
              {accountType === 'provider' && (
                <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
              )}
            </TouchableOpacity>

            {accountSwitchLoading && (
              <View style={styles.switchingIndicator}>
                <ActivityIndicator size="small" color="#1F2937" />
                <Text style={styles.switchingText}>Switching account mode...</Text>
              </View>
            )}

            <View style={styles.switchNote}>
              <Ionicons name="information-circle-outline" size={16} color="#4B5563" />
              <Text style={styles.switchNoteText}>
                Switching account mode will update your entire app experience and navigation.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyInvoices = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={accountType === 'provider' ? 'card-outline' : 'receipt-outline'} 
        size={64} 
        color="#D1D5DB" 
      />
      <Text style={styles.emptyTitle}>
        {accountType === 'provider' ? 'No payments yet' : 'No invoices yet'}
      </Text>
      <Text style={styles.emptyDescription}>
        {accountType === 'provider' 
          ? 'Your payment history will appear here once you complete jobs.'
          : 'Your service invoices will appear here when you book services.'
        }
      </Text>
    </View>
  );

  const renderUpgradePrompt = () => {
    if (accountType !== 'provider' || profile?.is_premium || !hasMoreInvoices) return null;

    const hiddenPaymentsCount = totalInvoiceCount - FREE_PAYMENT_LIMIT;

    return (
      <TouchableOpacity 
        style={styles.upgradePrompt}
        onPress={() => setShowUpgradeModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.upgradePromptContent}>
          <View style={styles.upgradePromptIcon}>
            <Ionicons name="star" size={20} color="#F59E0B" />
          </View>
          <View style={styles.upgradePromptText}>
            <Text style={styles.upgradePromptTitle}>
              Upgrade to see all payments
            </Text>
            <Text style={styles.upgradePromptSubtitle}>
              {hiddenPaymentsCount} more payment{hiddenPaymentsCount > 1 ? 's' : ''} available with Pro
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderInvoiceItem = ({ item }: { item: Invoice }) => (
    <TouchableOpacity 
      style={[styles.invoiceItem, item.is_new && styles.newInvoiceItem]}
      onPress={() => {
        setSelectedInvoice(item);
        setShowInvoiceModal(true);
        if (item.is_new) {
          handleMarkAsRead(item.id);
        }
      }}
    >
      <View style={styles.invoiceHeader}>
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
          <Text style={styles.invoiceDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.invoiceActions}>
          {item.is_new && <View style={styles.newBadge} />}
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => {
              setSelectedInvoice(item);
              setShowInvoiceModal(true);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.invoiceDescription}>{item.description}</Text>
      
      <View style={styles.invoiceFooter}>
        <Text style={styles.invoiceAmount}>
          ${item.amount.toFixed(2)} {item.currency}
        </Text>
        <View style={[
          styles.statusBadge,
          item.status === 'paid' && styles.statusPaid,
          item.status === 'pending' && styles.statusPending,
          item.status === 'overdue' && styles.statusOverdue,
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'paid' && styles.statusTextPaid,
            item.status === 'pending' && styles.statusTextPending,
            item.status === 'overdue' && styles.statusTextOverdue,
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderInvoiceModal = () => (
    <Modal
      visible={showInvoiceModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {accountType === 'provider' ? 'Payment Details' : 'Invoice Details'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowInvoiceModal(false)}
          >
            <Ionicons name="close" size={24} color="#4B5563" />
          </TouchableOpacity>
        </View>
        
        {selectedInvoice && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>
                {accountType === 'provider' ? 'Payment Number' : 'Invoice Number'}
              </Text>
              <Text style={styles.detailValue}>{selectedInvoice.invoice_number}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>
                ${selectedInvoice.amount.toFixed(2)} {selectedInvoice.currency}
              </Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedInvoice.date).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>
                {accountType === 'provider' ? 'Expected Payment Date' : 'Due Date'}
              </Text>
              <Text style={styles.detailValue}>
                {new Date(selectedInvoice.due_date).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[
                styles.statusBadge,
                selectedInvoice.status === 'paid' && styles.statusPaid,
                selectedInvoice.status === 'pending' && styles.statusPending,
                selectedInvoice.status === 'overdue' && styles.statusOverdue,
              ]}>
                <Text style={[
                  styles.statusText,
                  selectedInvoice.status === 'paid' && styles.statusTextPaid,
                  selectedInvoice.status === 'pending' && styles.statusTextPending,
                  selectedInvoice.status === 'overdue' && styles.statusTextOverdue,
                ]}>
                  {selectedInvoice.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{selectedInvoice.description}</Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDownloadPDF(selectedInvoice)}
              >
                <Ionicons name="download-outline" size={20} color="#1F2937" />
                <Text style={styles.actionButtonText}>Download PDF</Text>
              </TouchableOpacity>
              
              {accountType === 'consumer' && selectedInvoice.status !== 'paid' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.paidButton]}
                  onPress={() => {
                    handleMarkAsPaid(selectedInvoice.id);
                    setShowInvoiceModal(false);
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={[styles.actionButtonText, styles.paidButtonText]}>
                    Mark as Paid
                  </Text>
                </TouchableOpacity>
              )}
              
              {accountType === 'provider' && selectedInvoice.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.contactButton]}
                  onPress={() => {
                    setShowInvoiceModal(false);
                    Alert.alert('Contact Client', 'This would open the messaging feature to contact the client about payment.');
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#3B82F6" />
                  <Text style={[styles.actionButtonText, styles.contactButtonText]}>
                    Contact Client
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // Show account switching loader if switching
  if (accountSwitchLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Switching account mode...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentProfile = isEditing ? tempProfile : profile;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={[
            styles.switchAccountButton,
            accountType === 'provider' && styles.providerSwitchButton
          ]}
          onPress={() => setShowAccountSwitchModal(true)}
          disabled={accountSwitchLoading}
        >
          <Ionicons 
            name="swap-horizontal-outline" 
            size={20} 
            color="#F59E0B"
          />
          <Text style={[
            styles.switchAccountText,
            accountType === 'provider' && styles.providerSwitchText
          ]}>
            Switch Mode
          </Text>
        </TouchableOpacity>
      </View>

      {/* Account Type Indicator */}
      <View style={styles.accountTypeIndicator}>
        <View style={[
          styles.accountTypeBadge,
          accountType === 'provider' && styles.providerBadge
        ]}>
          <Ionicons 
            name={accountType === 'provider' ? 'briefcase' : 'person'} 
            size={16} 
            color="#F59E0B"
          />
          <Text style={[
            styles.accountTypeText,
            accountType === 'provider' && styles.providerBadgeText
          ]}>
            {accountType === 'provider' ? 'Service Provider' : 'Service Consumer'}
          </Text>
          {profile.is_premium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.premiumText}>PRO</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons 
            name={activeTab === 'profile' ? 'person' : 'person-outline'} 
            size={20} 
            color={activeTab === 'profile' ? '#F59E0B' : '#4B5563'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'profile' && styles.activeTabText
          ]}>
            Profile
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoices' && styles.activeTab]}
          onPress={() => setActiveTab('invoices')}>
          <View style={styles.tabIconContainer}>
            <Ionicons 
              name={activeTab === 'invoices' ? 'receipt' : 'receipt-outline'} 
              size={20} 
              color={activeTab === 'invoices' ? '#F59E0B' : '#4B5563'} 
            />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.tabText, 
            activeTab === 'invoices' && styles.activeTabText
          ]}>
            {accountType === 'provider' ? 'Payments' : 'Invoices'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'profile' ? (
        <ScrollView style={styles.content}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }]}>
              {currentProfile?.avatar_url ? (
                <Image 
                  source={{ uri: currentProfile.avatar_url }} 
                  style={[styles.avatar, { position: 'absolute' }]}
                  onError={() => {
                    console.log('Error loading profile image');
                    if (isEditing && tempProfile) {
                      setTempProfile(prev => prev ? { ...prev, avatar_url: '' } : null);
                    }
                  }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: 'white', fontSize: 40, fontWeight: 'bold' }}>
                  {currentProfile?.full_name ? currentProfile.full_name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>
            {isEditing && (
              <TouchableOpacity 
                style={styles.editPhotoButton}
                onPress={handleChoosePhoto}
                disabled={isSaving || isImageLoading}
              >
                {isSaving || isImageLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            {renderField('First Name', 'first_name')}
            {renderField('Last Name', 'last_name')}
            {renderField('Email', 'email')}
            {renderField('Phone', 'phone')}
            {renderField('Address', 'address')}
            {renderField('Bio', 'bio', true)}
            
            {/* Gender and Birth Date */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.value}>{currentProfile?.gender || 'Not specified'}</Text>
            </View>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <Text style={styles.value}>
                {currentProfile?.birth_date 
                  ? new Date(currentProfile.birth_date).toLocaleDateString('en-NZ', {
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric'
                    })
                  : 'Not provided'
                }
              </Text>
            </View>
            
            {/* Location Information */}
            {currentProfile?.location && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Location</Text>
                <Text style={styles.value}>
                  {currentProfile.location.city}, {currentProfile.location.state}, {currentProfile.location.country}
                </Text>
              </View>
            )}
          </View>

          {/* Account-specific fields */}
          {accountType === 'provider' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Provider Information</Text>
              {renderProviderField('Business Name', 'business_name')}
              {renderProviderField('Service Category', 'service_category')}
              {renderProviderField('Experience (Years)', 'experience_years')}
              {renderProviderField('Hourly Rate ($)', 'hourly_rate')}
              {renderProviderField('Availability', 'availability')}
              
              {/* Skills from provider_skills table */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Skills</Text>
                <Text style={styles.value}>
                  {currentProfile?.provider_details?.provider_skills?.length > 0
                    ? currentProfile.provider_details.provider_skills
                        .map(skill => `${skill.skill_name} (${skill.experience_level})`)
                        .join(', ')
                    : 'No skills added yet'
                  }
                </Text>
              </View>
              
              {/* Certifications from provider_certifications table */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Certifications</Text>
                <Text style={styles.value}>
                  {currentProfile?.provider_details?.provider_certifications?.length > 0
                    ? currentProfile.provider_details.provider_certifications
                        .map(cert => `${cert.certification_name} (${cert.issued_by})`)
                        .join(', ')
                    : 'No certifications added yet'
                  }
                </Text>
              </View>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Rating & Performance</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {currentProfile?.provider_details?.rating || 0}/5
                  </Text>
                  <Text style={styles.ratingSubText}>
                    ({currentProfile?.provider_details?.completed_jobs || 0} jobs completed)
                  </Text>
                </View>
                <Text style={styles.value}>
                  Total Earnings: ${currentProfile?.provider_details?.total_earnings || 0}
                </Text>
                <Text style={styles.value}>
                  Verified: {currentProfile?.provider_details?.is_verified ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>
          )}

          {accountType === 'consumer' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consumer Preferences</Text>
              {renderConsumerField('Budget Range', 'budget_range')}
              {renderConsumerField('Location Preference', 'location_preference')}
              
              {/* Preferred Services from consumer_preferred_services table */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Preferred Services</Text>
                <Text style={styles.value}>
                  {currentProfile?.consumer_details?.consumer_preferred_services?.length > 0
                    ? currentProfile.consumer_details.consumer_preferred_services
                        .map(service => service.service_category)
                        .join(', ')
                    : 'No preferred services set'
                  }
                </Text>
              </View>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Service History & Stats</Text>
                <Text style={styles.value}>
                  Services Booked: {currentProfile?.consumer_details?.service_history || 0}
                </Text>
                <Text style={styles.value}>
                  Total Spent: ${currentProfile?.consumer_details?.total_spent || 0}
                </Text>
                <Text style={styles.value}>
                  Average Rating Given: {currentProfile?.consumer_details?.average_rating_given || 0}/5
                </Text>
              </View>
            </View>
          )}

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <TouchableOpacity style={styles.preferenceItem} onPress={handleNotificationsPress}>
              <Ionicons name="notifications-outline" size={20} color="#4B5563" />
              <Text style={styles.preferenceText}>Notifications</Text>
              {notificationCount > 0 && (
                <View style={styles.preferenceNotificationBadge}>
                  <Text style={styles.preferenceNotificationText}>{notificationCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.preferenceItem} onPress={handlePaymentMethodsPress}>
              <Ionicons name="card-outline" size={20} color="#4B5563" />
              <Text style={styles.preferenceText}>Payment Methods</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.preferenceItem} onPress={handlePrivacyPress}>
              <Ionicons name="lock-closed-outline" size={20} color="#4B5563" />
              <Text style={styles.preferenceText}>Privacy</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <TouchableOpacity style={styles.preferenceItem} onPress={handleHelpCenterPress}>
              <Ionicons name="help-circle-outline" size={20} color="#4B5563" />
              <Text style={styles.preferenceText}>Help Center</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.preferenceItem} onPress={handleTermsConditionsPress}>
              <Ionicons name="document-text-outline" size={20} color="#4B5563" />
              <Text style={styles.preferenceText}>Terms & Conditions</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.invoicesContainer}>
          {isLoadingInvoices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loadingText}>
                Loading {accountType === 'provider' ? 'payments' : 'invoices'}...
              </Text>
            </View>
          ) : invoices.length > 0 ? (
            <View style={styles.invoicesContent}>
              <FlatList
                data={invoices}
                renderItem={renderInvoiceItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.invoicesList}
                showsVerticalScrollIndicator={false}
                refreshing={isLoadingInvoices}
                onRefresh={refreshInvoicesData}
              />
              {renderUpgradePrompt()}
            </View>
          ) : (
            renderEmptyInvoices()
          )}
        </View>
      )}

      {/* Bottom Action Buttons */}
      {activeTab === 'profile' && (
        <>
          {isEditing ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.saveButton, 
                  isSaving && styles.disabledButton,
                  accountType === 'provider' && styles.providerSaveButton
                ]} 
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.editButton,
                accountType === 'provider' && styles.providerEditButton
              ]}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {renderInvoiceModal()}
      {renderAccountSwitchModal()}
      
      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        title="Upgrade to Pro"
        subtitle="Unlock unlimited payments and premium business features"
        hiddenCount={hasMoreInvoices ? totalInvoiceCount - FREE_PAYMENT_LIMIT : 0}
        features={[
          {
            icon: 'card-outline',
            iconColor: '#F59E0B',
            title: 'Unlimited Payment History',
            description: 'View all your payments and earnings without any restrictions'
          },
          {
            icon: 'trending-up-outline',
            iconColor: '#10B981',
            title: 'Advanced Analytics',
            description: 'Detailed income reports, earning trends, and business insights'
          },
          {
            icon: 'document-text-outline',
            iconColor: '#3B82F6',
            title: 'Professional Invoices',
            description: 'Custom branded invoices with digital signatures and templates'
          },
          {
            icon: 'notifications-outline',
            iconColor: '#F97316',
            title: 'Priority Support',
            description: 'Fast-track customer support and business consultation'
          }
        ]}
      />
    </SafeAreaView>
  );
};

// Fixed styles with consistent color palette
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCE8', // Changed to match app background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEFCE8', // Changed from white to app background
    // Removed borderBottomWidth to eliminate separator line
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
  },
  switchAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  providerSwitchButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  switchAccountText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    marginLeft: 6,
  },
  providerSwitchText: {
    color: '#F59E0B',
  },
  accountTypeIndicator: {
    backgroundColor: '#FEFCE8', // Changed from white to app background
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Removed borderBottomWidth
  },
  accountTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  providerBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  accountTypeText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    marginLeft: 8,
  },
  providerBadgeText: {
    color: '#F59E0B',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  premiumText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEFCE8', // Changed from white to app background
    // Removed borderBottomWidth
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#F59E0B',
  },
  tabIconContainer: {
    position: 'relative',
    marginRight: 8,
  },
  tabText: {
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#F97316',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FCD34D',
    backgroundColor: '#F3F4F6',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#F59E0B',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  input: {
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    ...Platform.select({
      ios: {
        paddingVertical: 12,
      },
      android: {
        paddingVertical: 8,
      },
    }),
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  ratingText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginLeft: 6,
  },
  ratingSubText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  preferenceText: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    marginLeft: 12,
  },
  preferenceNotificationBadge: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  preferenceNotificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 'auto',
  },
  logoutButton: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
    marginBottom: 100,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  // Account Switch Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountSwitchModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  accountOptions: {
    padding: 20,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FCD34D',
    marginBottom: 12,
  },
  selectedAccountOption: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  accountOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  accountOptionContent: {
    flex: 1,
  },
  accountOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  selectedAccountOptionTitle: {
    color: '#F59E0B',
  },
  selectedProviderOptionTitle: {
    color: '#F59E0B',
  },
  accountOptionDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  switchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 12,
  },
  switchingText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  switchNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  switchNoteText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  // Invoice Styles
  invoicesContainer: {
    flex: 1,
    backgroundColor: '#FEFCE8', // Changed from #F8FAFC to app background
  },
  invoicesContent: {
    flex: 1,
  },
  invoicesList: {
    padding: 16,
  },
  invoiceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  newInvoiceItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  invoiceDate: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 2,
  },
  invoiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    marginRight: 8,
  },
  moreButton: {
    padding: 4,
  },
  invoiceDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusOverdue: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextPaid: {
    color: '#065F46',
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextOverdue: {
    color: '#991B1B',
  },
  // Upgrade Prompt Styles
  upgradePrompt: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  upgradePromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradePromptIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upgradePromptText: {
    flex: 1,
  },
  upgradePromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  upgradePromptSubtitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FEFCE8', // Changed from #F8FAFC to app background
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  invoiceDetail: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  detailLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  modalActions: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  paidButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  contactButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  paidButtonText: {
    color: '#FFFFFF',
  },
  contactButtonText: {
    color: '#F59E0B',
  },
  // Bottom Action Buttons
  editButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerEditButton: {
    backgroundColor: '#F59E0B',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: '#FEF3C7',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  saveButton: {
    backgroundColor: '#F59E0B',
    marginLeft: 8,
  },
  providerSaveButton: {
    backgroundColor: '#F59E0B',
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#4B5563',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
});

export default ProfileScreen;