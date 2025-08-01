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
import { normalizedShopService } from '../lib/supabase/normalized';

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
  
  // Provider-specific data from provider_businesses table
  provider_business?: {
    id: string;
    name: string; // business name
    category: string; // service category
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    website_url?: string;
    is_verified: boolean;
    women_owned_business?: boolean;
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


interface ApiResponse<T> {
  data: T;
  success: boolean;
  total_count?: number;
  has_more?: boolean;
}

const ProfileScreen = ({ navigation }: { navigation: any }) => {
  // Removed tab functionality - ProfileScreen now only shows profile content
  
  // Use the global account context and notifications
  const { accountType, setAccountType, isLoading: accountSwitchLoading } = useAccount();
  const { notificationCount } = useNotifications();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tempProfile, setTempProfile] = useState<ProfileData | null>(null);
  const [showAccountSwitchModal, setShowAccountSwitchModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [providerSkills, setProviderSkills] = useState<any[]>([]);
  const [providerCertifications, setProviderCertifications] = useState<any[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);
  
  // Form states for adding skills
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    experience_level: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert',
    years_experience: 0,
    is_certified: false
  });
  
  // Form states for adding certifications
  const [newCert, setNewCert] = useState({
    certification_name: '',
    issued_by: '',
    issue_date: '',
    expiry_date: '',
    certificate_number: '',
    verification_url: ''
  });
  
  
  const { signOut } = useAuth();
  const { showImagePickerOptions, isLoading: isImageLoading } = useImagePicker();

  const userId = '1';


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
    updated_at: new Date().toISOString(),
    // Add default provider_business for provider accounts
    provider_business: accountType === 'provider' ? {
      id: 'mock-provider-id',
      name: '',
      category: '',
      description: '',
      is_verified: false,
      women_owned_business: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : undefined,
    // Add default consumer_details for consumer accounts
    consumer_details: accountType === 'consumer' ? {
      id: 'mock-consumer-id',
      budget_range: '',
      location_preference: '',
      service_history: 0,
      total_spent: 0,
      average_rating_given: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : undefined
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
            updated_at: new Date().toISOString(),
            provider_business: accountType === 'provider' ? {
              id: 'temp-provider-id',
              name: '',
              category: '',
              description: '',
              is_verified: false,
              women_owned_business: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined,
            consumer_details: accountType === 'consumer' ? {
              id: 'temp-consumer-id',
              budget_range: '',
              location_preference: '',
              service_history: 0,
              total_spent: 0,
              average_rating_given: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined
          };
          setProfile(defaultProfile);
          
          // Profile loaded successfully - no invoice loading needed
          console.log('✅ Fallback profile created successfully');
          
          setIsLoading(false);
          return;
        }
        
        // Get real user profile from normalizedShopService
        const profileResponse = await normalizedShopService.getUserProfile();
        
        if (profileResponse.success && profileResponse.data) {
          console.log('✅ Real profile loaded:', JSON.stringify(profileResponse.data, null, 2));
          
          // Ensure the profile has all required fields with safe defaults
          const safeProfileData = {
            ...profileResponse.data,
            full_name: profileResponse.data.full_name || `${profileResponse.data.first_name || ''} ${profileResponse.data.last_name || ''}`.trim() || 'User',
            first_name: profileResponse.data.first_name || '',
            last_name: profileResponse.data.last_name || '', 
            email: profileResponse.data.email || currentUser.email || '',
            phone: profileResponse.data.phone || '',
            address: profileResponse.data.address || '',
            bio: profileResponse.data.bio || '',
            avatar_url: profileResponse.data.avatar_url || null,
            gender: profileResponse.data.gender || '',
            birth_date: profileResponse.data.birth_date || '',
            account_type: profileResponse.data.account_type || accountType,
            is_premium: profileResponse.data.is_premium || false,
            email_verified: profileResponse.data.email_verified || false,
            phone_verified: profileResponse.data.phone_verified || false,
            provider_business: profileResponse.data.provider_business || null
          };
          
          setProfile(safeProfileData);
          
          // Update account type in context if different
          const profileAccountType = safeProfileData.account_type;
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
            updated_at: new Date().toISOString(),
            provider_business: accountType === 'provider' ? {
              id: `${currentUser.id}-provider`,
              name: '',
              category: '',
              description: '',
              is_verified: false,
              women_owned_business: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined,
            consumer_details: accountType === 'consumer' ? {
              id: `${currentUser.id}-consumer`,
              budget_range: '',
              location_preference: '',
              service_history: 0,
              total_spent: 0,
              average_rating_given: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined
          };
          setProfile(defaultProfile);
        }
        
        // Profile loaded - no invoice data needed in profile screen
        console.log('✅ Profile data loaded successfully');
        
        
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
          updated_at: new Date().toISOString(),
          provider_business: accountType === 'provider' ? {
            id: 'fallback-provider-id',
            name: '',
            category: '',
            description: '',
            is_verified: false,
            women_owned_business: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } : undefined,
          consumer_details: accountType === 'consumer' ? {
            id: 'fallback-consumer-id',
            budget_range: '',
            location_preference: '',
            service_history: 0,
            total_spent: 0,
            average_rating_given: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } : undefined
        };
        setProfile(defaultProfile);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [accountType]);

  // Load skills and certifications for provider accounts
  useEffect(() => {
    if (accountType === 'provider' && profile) {
      loadProviderSkills();
      loadProviderCertifications();
    }
  }, [accountType, profile]);

  const loadProviderSkills = async () => {
    try {
      setIsLoadingSkills(true);
      const response = await normalizedShopService.getProviderSkills();
      if (response.success) {
        setProviderSkills(response.data);
      } else {
        console.error('Failed to load skills:', response.error);
      }
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setIsLoadingSkills(false);
    }
  };

  const loadProviderCertifications = async () => {
    try {
      setIsLoadingCerts(true);
      const response = await normalizedShopService.getProviderCertifications();
      if (response.success) {
        setProviderCertifications(response.data);
      } else {
        console.error('Failed to load certifications:', response.error);
      }
    } catch (error) {
      console.error('Error loading certifications:', error);
    } finally {
      setIsLoadingCerts(false);
    }
  };


  // Handle upgrade to premium
  const handleUpgrade = async () => {
    try {
      setShowUpgradeModal(false);
      
      Alert.alert('Processing', 'Upgrading your account...', [], { cancelable: false });
      
      // Update user profile to set is_premium to true
      const response = await normalizedShopService.updateUserProfile({ is_premium: true });
      
      if (response.success) {
        // Reload the profile to get updated data
        const profileResponse = await normalizedShopService.getUserProfile();
        if (profileResponse.success) {
          setProfile(profileResponse.data);
        }
        Alert.alert('Success!', 'Your account has been upgraded to Pro. You now have unlimited access to all payments and premium features.');
        
      } else {
        throw new Error(response.error || 'Upgrade failed');
      }
    } catch (error) {
      console.error('Error upgrading account:', error);
      Alert.alert('Error', 'Failed to upgrade account. Please try again.');
    }
  };

  // Skills and Certifications Management
  const handleDeleteSkill = async (skillId: string) => {
    Alert.alert(
      'Delete Skill',
      'Are you sure you want to delete this skill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await normalizedShopService.deleteProviderSkill(skillId);
              if (response.success) {
                loadProviderSkills(); // Reload skills
                Alert.alert('Success', 'Skill deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete skill');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete skill');
            }
          }
        }
      ]
    );
  };

  const handleDeleteCertification = async (certId: string) => {
    Alert.alert(
      'Delete Certification',
      'Are you sure you want to delete this certification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await normalizedShopService.deleteProviderCertification(certId);
              if (response.success) {
                loadProviderCertifications(); // Reload certifications
                Alert.alert('Success', 'Certification deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete certification');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete certification');
            }
          }
        }
      ]
    );
  };

  const handleAddSkill = async (skillData?: any) => {
    try {
      const dataToAdd = skillData || newSkill;
      
      // Validate required fields
      if (!dataToAdd.skill_name.trim()) {
        Alert.alert('Validation Error', 'Please enter a skill name');
        return;
      }
      
      const response = await normalizedShopService.addProviderSkill(dataToAdd);
      if (response.success) {
        loadProviderSkills(); // Reload skills
        setShowSkillModal(false);
        // Reset form
        setNewSkill({
          skill_name: '',
          experience_level: 'Beginner',
          years_experience: 0,
          is_certified: false
        });
        Alert.alert('Success', 'Skill added successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to add skill');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add skill');
    }
  };

  const handleAddCertification = async (certData?: any) => {
    try {
      const dataToAdd = certData || newCert;
      
      // Validate required fields
      if (!dataToAdd.certification_name.trim()) {
        Alert.alert('Validation Error', 'Please enter a certification name');
        return;
      }
      if (!dataToAdd.issued_by.trim()) {
        Alert.alert('Validation Error', 'Please enter the issuing organization');
        return;
      }
      if (!dataToAdd.issue_date.trim()) {
        Alert.alert('Validation Error', 'Please enter the issue date');
        return;
      }
      
      const response = await normalizedShopService.addProviderCertification(dataToAdd);
      if (response.success) {
        loadProviderCertifications(); // Reload certifications
        setShowCertModal(false);
        // Reset form
        setNewCert({
          certification_name: '',
          issued_by: '',
          issue_date: '',
          expiry_date: '',
          certificate_number: '',
          verification_url: ''
        });
        Alert.alert('Success', 'Certification added successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to add certification');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add certification');
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

      console.log('Account type switched successfully');
      

    } catch (error) {
      console.error('Error switching account:', error);
      Alert.alert('Error', 'Failed to switch account mode. Please try again.');
    }
  };

  const handleEdit = useCallback(() => {
    console.log('🔧 Starting edit mode, current profile:', JSON.stringify(profile, null, 2));
    
    if (profile) {
      // Ensure all required fields have safe defaults
      const safeProfile = {
        ...profile,
        full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User Name',
        email: profile.email || '',
        phone: profile.phone || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        address: profile.address || '',
        bio: profile.bio || '',
        gender: profile.gender || '',
        birth_date: profile.birth_date || '',
        provider_business: profile.provider_business ? {
          ...profile.provider_business,
          name: profile.provider_business.name || '',
          description: profile.provider_business.description || '',
          category: profile.provider_business.category || '',
          address: profile.provider_business.address || '',
          city: profile.provider_business.city || '',
          state: profile.provider_business.state || '',
          country: profile.provider_business.country || '',
          phone: profile.provider_business.phone || '',
          email: profile.provider_business.email || '',
          website_url: profile.provider_business.website_url || '',
          women_owned_business: profile.provider_business.women_owned_business || false
        } : null
      };
      
      console.log('🔧 Setting temp profile:', JSON.stringify(safeProfile, null, 2));
      setTempProfile(safeProfile);
      setIsEditing(true);
    } else {
      console.error('❌ No profile data available for editing');
      Alert.alert('Error', 'Profile data not loaded. Please refresh the screen.');
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    if (!tempProfile) return;

    const validateForm = (): boolean => {
      console.log('🔍 Validating form with tempProfile:', JSON.stringify(tempProfile, null, 2));
      
      if (!tempProfile.full_name || !tempProfile.full_name.trim()) {
        console.log('❌ Validation failed: full_name is empty or undefined');
        Alert.alert('Validation Error', 'Please enter your name');
        return false;
      }
      if (!tempProfile.email || !/^\S+@\S+\.\S+$/.test(tempProfile.email)) {
        console.log('❌ Validation failed: email is invalid');
        Alert.alert('Validation Error', 'Please enter a valid email address');
        return false;
      }
      if (!tempProfile.phone || !tempProfile.phone.trim()) {
        console.log('❌ Validation failed: phone is empty or undefined');
        Alert.alert('Validation Error', 'Please enter your phone number');
        return false;
      }
      
      console.log('✅ Form validation passed');
      return true;
    };

    if (!validateForm()) return;
    
    try {
      setIsSaving(true);
      
      // Split the update into user profile and provider business
      // Clean up data - convert empty strings to null for optional fields, keep required fields as strings
      const userProfileData = {
        first_name: tempProfile.first_name || '',
        last_name: tempProfile.last_name || '',
        full_name: tempProfile.full_name || '',
        phone: tempProfile.phone || '',
        address: tempProfile.address?.trim() || null,
        bio: tempProfile.bio?.trim() || null,
        avatar_url: tempProfile.avatar_url?.trim() || null,
        gender: tempProfile.gender?.trim() || null,
        birth_date: tempProfile.birth_date?.trim() || null
      };

      // Update user profile
      const userResponse = await normalizedShopService.updateUserProfile(userProfileData);
      
      if (!userResponse.success) {
        throw new Error(userResponse.error || 'Failed to update user profile');
      }

      // Update provider business if it exists
      if (tempProfile.provider_business && tempProfile.account_type === 'provider') {
        const businessData = {
          name: tempProfile.provider_business.name || '',
          description: tempProfile.provider_business.description?.trim() || null,
          category: tempProfile.provider_business.category?.trim() || null,
          address: tempProfile.provider_business.address?.trim() || null,
          city: tempProfile.provider_business.city?.trim() || null,
          state: tempProfile.provider_business.state?.trim() || null,
          country: tempProfile.provider_business.country?.trim() || null,
          phone: tempProfile.provider_business.phone?.trim() || null,
          email: tempProfile.provider_business.email?.trim() || null,
          website_url: tempProfile.provider_business.website_url?.trim() || null,
          women_owned_business: tempProfile.provider_business.women_owned_business || false
        };

        const businessResponse = await normalizedShopService.updateProviderBusiness(businessData);
        
        if (!businessResponse.success) {
          throw new Error(businessResponse.error || 'Failed to update business profile');
        }
      }

      // Reload the profile to get the updated data
      const profileResponse = await normalizedShopService.getUserProfile();
      
      if (profileResponse.success) {
        setProfile(profileResponse.data);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        throw new Error('Failed to reload profile');
      }
      
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [tempProfile]);

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
    if (tempProfile && tempProfile.provider_business) {
      setTempProfile(prev => prev ? {
        ...prev,
        provider_business: {
          ...prev.provider_business!,
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
      if (imageUri) {
        // Update tempProfile if it exists (editing mode)
        if (tempProfile) {
          setTempProfile(prev => prev ? { ...prev, avatar_url: imageUri } : null);
        }
        
        // Also update the main profile to show the image immediately
        setProfile(prev => prev ? { ...prev, avatar_url: imageUri } : null);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error in image picker:', error);
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
      return false;
    }
  }, [showImagePickerOptions, tempProfile]);




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

  const renderField = (label: string, field: keyof ProfileData, isTextArea = false, isReadOnly = false) => {
    const currentProfile = isEditing ? tempProfile : profile;
    if (!currentProfile) return null;

    // Handle nested fields properly
    let value = currentProfile[field];
    if (field === 'full_name' && !value) {
      value = `${currentProfile.first_name || ''} ${currentProfile.last_name || ''}`.trim();
    }

    const handleVerificationPress = () => {
      if (field === 'email') {
        Alert.alert(
          'Email Verification Required',
          'To change your email address, please verify your new email. This helps keep your account secure.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Email', onPress: () => {
              // Navigate to email verification or show verification modal
              Alert.alert('Feature Coming Soon', 'Email verification feature will be available soon.');
            }}
          ]
        );
      } else if (field === 'phone') {
        Alert.alert(
          'Phone Verification Required', 
          'To change your phone number, please verify your new number via SMS. This helps keep your account secure.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Phone', onPress: () => {
              // Navigate to phone verification or show verification modal
              Alert.alert('Feature Coming Soon', 'Phone verification feature will be available soon.');
            }}
          ]
        );
      }
    };

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing && !isReadOnly ? (
          <TextInput
            style={[styles.input, isTextArea && styles.textArea]}
            value={String(value || '')}
            onChangeText={(text) => updateField(field, text)}
            multiline={isTextArea}
            numberOfLines={isTextArea ? 3 : 1}
          />
        ) : (
          <View style={styles.readOnlyContainer}>
            <Text style={[styles.value, isReadOnly && styles.readOnlyValue]}>
              {value || 'Not provided'}
            </Text>
            {isReadOnly && isEditing && (
              <TouchableOpacity 
                style={styles.verifyButton}
                onPress={handleVerificationPress}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color="#F59E0B" />
                <Text style={styles.verifyButtonText}>Verify to change</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderProviderField = (label: string, field: string, isTextArea = false, fieldType: 'text' | 'boolean' | 'numeric' = 'text') => {
    const currentProfile = isEditing ? tempProfile : profile;
    if (!currentProfile) return null;

    // Initialize provider_business if it doesn't exist
    if (!currentProfile.provider_business) {
      currentProfile.provider_business = {
        id: '',
        name: '',
        category: '',
        description: '',
        is_verified: false,
        women_owned_business: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    const value = currentProfile.provider_business[field as keyof typeof currentProfile.provider_business];

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing ? (
          fieldType === 'boolean' ? (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => updateProviderField(field, !value)}
            >
              <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                {value && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                {value ? 'Yes' : 'No'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={[styles.input, isTextArea && styles.textArea]}
              value={String(value || '')}
              onChangeText={(text) => updateProviderField(field, text)}
              multiline={isTextArea}
              numberOfLines={isTextArea ? 3 : 1}
              keyboardType={fieldType === 'numeric' ? 'numeric' : 'default'}
            />
          )
        ) : (
          <Text style={styles.value}>
            {fieldType === 'boolean' 
              ? (value ? 'Yes' : 'No')
              : String(value || 'Not provided')
            }
          </Text>
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
    if (accountType !== 'provider' || profile?.is_premium) return null;

    const hiddenPaymentsCount = 0; // No payments in profile anymore

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


      {/* Content */}
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
            {renderField('Email', 'email', false, true)}
            {renderField('Phone', 'phone', false, true)}
            {renderField('Address', 'address')}
            {renderField('Bio', 'bio', true)}
            
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
              {renderProviderField('Business Name', 'name')}
              {renderProviderField('Service Category', 'category')}
              {renderProviderField('Business Description', 'description', true)}
              {renderProviderField('Website URL', 'website_url')}
              {renderProviderField('Women Owned Business', 'women_owned_business', false, 'boolean')}
              
              {/* Skills Management */}
              <View style={styles.fieldContainer}>
                <View style={styles.managementHeader}>
                  <Text style={styles.label}>Skills</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowSkillModal(true)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#F59E0B" />
                    <Text style={styles.addButtonText}>Add Skill</Text>
                  </TouchableOpacity>
                </View>
                {isLoadingSkills ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : providerSkills.length > 0 ? (
                  <View style={styles.skillsList}>
                    {providerSkills.map((skill, index) => (
                      <View key={skill.id || index} style={styles.skillItem}>
                        <View style={styles.skillInfo}>
                          <Text style={styles.skillName}>{skill.skill_name}</Text>
                          <Text style={styles.skillLevel}>
                            {skill.experience_level} • {skill.years_experience || 0} years
                            {skill.is_certified && ' • Certified'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteSkill(skill.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.value}>No skills added yet</Text>
                )}
              </View>
              
              {/* Certifications Management */}
              <View style={styles.fieldContainer}>
                <View style={styles.managementHeader}>
                  <Text style={styles.label}>Certifications</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowCertModal(true)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#F59E0B" />
                    <Text style={styles.addButtonText}>Add Certification</Text>
                  </TouchableOpacity>
                </View>
                {isLoadingCerts ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : providerCertifications.length > 0 ? (
                  <View style={styles.certsList}>
                    {providerCertifications.map((cert, index) => (
                      <View key={cert.id || index} style={styles.certItem}>
                        <View style={styles.certInfo}>
                          <Text style={styles.certName}>{cert.certification_name}</Text>
                          <Text style={styles.certDetails}>
                            {cert.issued_by} • {new Date(cert.issue_date).getFullYear()}
                            {cert.is_verified && ' • Verified'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteCertification(cert.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.value}>No certifications added yet</Text>
                )}
              </View>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Account Status</Text>
                <Text style={styles.value}>
                  Verified: {currentProfile?.provider_business?.is_verified ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>
          )}

          {accountType === 'consumer' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consumer Information</Text>
              
              {/* Personal Information for Consumers */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Gender</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={currentProfile?.gender || ''}
                    onChangeText={(text) => updateField('gender', text)}
                    placeholder="e.g., Male, Female, Non-binary, Prefer not to say"
                  />
                ) : (
                  <Text style={styles.value}>{currentProfile?.gender || 'Not specified'}</Text>
                )}
              </View>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={currentProfile?.birth_date || ''}
                    onChangeText={(text) => updateField('birth_date', text)}
                    placeholder="YYYY-MM-DD"
                  />
                ) : (
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
                )}
              </View>

              {/* Service Preferences */}
              <Text style={styles.subsectionTitle}>Service Preferences</Text>
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

      {/* Bottom Action Buttons */}
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

      {renderAccountSwitchModal()}
      
      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        title="Upgrade to Pro"
        subtitle="Unlock unlimited payments and premium business features"
        hiddenCount={0}
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

      {/* Add Skill Modal */}
      <Modal
        visible={showSkillModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Skill</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowSkillModal(false);
                // Reset form when closing
                setNewSkill({
                  skill_name: '',
                  experience_level: 'Beginner',
                  years_experience: 0,
                  is_certified: false
                });
              }}
            >
              <Ionicons name="close" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {/* Skill Name */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Skill Name *</Text>
              <TextInput
                style={styles.formInput}
                value={newSkill.skill_name}
                onChangeText={(text) => setNewSkill(prev => ({...prev, skill_name: text}))}
                placeholder="e.g., React Native Development"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Experience Level */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Experience Level *</Text>
              <View style={styles.pickerContainer}>
                {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.pickerOption,
                      newSkill.experience_level === level && styles.pickerOptionSelected
                    ]}
                    onPress={() => setNewSkill(prev => ({...prev, experience_level: level as any}))}
                  >
                    <Text style={[
                      styles.pickerText,
                      newSkill.experience_level === level && styles.pickerTextSelected
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Years of Experience */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Years of Experience</Text>
              <TextInput
                style={styles.formInput}
                value={newSkill.years_experience.toString()}
                onChangeText={(text) => setNewSkill(prev => ({...prev, years_experience: parseInt(text) || 0}))}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Is Certified */}
            <View style={styles.formField}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setNewSkill(prev => ({...prev, is_certified: !prev.is_certified}))}
              >
                <View style={[styles.checkbox, newSkill.is_certified && styles.checkboxChecked]}>
                  {newSkill.is_certified && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>I have certification for this skill</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => {
                  setShowSkillModal(false);
                  setNewSkill({
                    skill_name: '',
                    experience_level: 'Beginner',
                    years_experience: 0,
                    is_certified: false
                  });
                }}
              >
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.addActionButton]}
                onPress={() => handleAddSkill()}
              >
                <Text style={styles.addActionText}>Add Skill</Text>
              </TouchableOpacity>
            </View>

            {/* Demo button for testing */}
            <TouchableOpacity
              style={[styles.actionButton, styles.demoButton]}
              onPress={() => {
                handleAddSkill({
                  skill_name: 'React Native Development',
                  experience_level: 'Advanced',
                  years_experience: 5,
                  is_certified: true
                });
              }}
            >
              <Text style={styles.demoButtonText}>Add Demo Skill (for testing)</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Certification Modal */}
      <Modal
        visible={showCertModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Certification</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowCertModal(false);
                // Reset form when closing
                setNewCert({
                  certification_name: '',
                  issued_by: '',
                  issue_date: '',
                  expiry_date: '',
                  certificate_number: '',
                  verification_url: ''
                });
              }}
            >
              <Ionicons name="close" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {/* Certification Name */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Certification Name *</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.certification_name}
                onChangeText={(text) => setNewCert(prev => ({...prev, certification_name: text}))}
                placeholder="e.g., Professional Mobile Developer"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Issued By */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Issued By *</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.issued_by}
                onChangeText={(text) => setNewCert(prev => ({...prev, issued_by: text}))}
                placeholder="e.g., Tech Certification Board"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Issue Date */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Issue Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.issue_date}
                onChangeText={(text) => setNewCert(prev => ({...prev, issue_date: text}))}
                placeholder="2024-01-15"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Expiry Date */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.expiry_date}
                onChangeText={(text) => setNewCert(prev => ({...prev, expiry_date: text}))}
                placeholder="2027-01-15 (optional)"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Certificate Number */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Certificate Number</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.certificate_number}
                onChangeText={(text) => setNewCert(prev => ({...prev, certificate_number: text}))}
                placeholder="e.g., PMD-2024-001"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Verification URL */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Verification URL</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.verification_url}
                onChangeText={(text) => setNewCert(prev => ({...prev, verification_url: text}))}
                placeholder="https://verify.example.com/cert123"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => {
                  setShowCertModal(false);
                  setNewCert({
                    certification_name: '',
                    issued_by: '',
                    issue_date: '',
                    expiry_date: '',
                    certificate_number: '',
                    verification_url: ''
                  });
                }}
              >
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.addActionButton]}
                onPress={() => handleAddCertification()}
              >
                <Text style={styles.addActionText}>Add Certification</Text>
              </TouchableOpacity>
            </View>

            {/* Demo button for testing */}
            <TouchableOpacity
              style={[styles.actionButton, styles.demoButton]}
              onPress={() => {
                handleAddCertification({
                  certification_name: 'Professional Mobile Developer',
                  issued_by: 'Tech Certification Board',
                  issue_date: '2024-01-15',
                  expiry_date: '2027-01-15',
                  certificate_number: 'PMD-2024-001'
                });
              }}
            >
              <Text style={styles.demoButtonText}>Add Demo Certification (for testing)</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 12,
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
  // New styles for read-only fields and verification
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyValue: {
    flex: 1,
    color: '#6B7280',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginLeft: 12,
  },
  verifyButtonText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
    marginLeft: 4,
  },
  // Checkbox styles for boolean fields
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  // Skills and Certifications Management Styles
  managementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  addButtonText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
    marginLeft: 4,
  },
  skillsList: {
    marginTop: 8,
  },
  skillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  skillLevel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  certsList: {
    marginTop: 8,
  },
  certItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  certInfo: {
    flex: 1,
  },
  certName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  certDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  // Form styles for modals
  formField: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  pickerOptionSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  pickerText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  pickerTextSelected: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  // Modal action buttons
  cancelActionButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  addActionButton: {
    backgroundColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  cancelActionText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  addActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  demoButton: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginTop: 16,
  },
  demoButtonText: {
    color: '#4338CA',
    fontWeight: '500',
    fontSize: 14,
  },
});

export default ProfileScreen;