import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  Platform,
  Modal,
  FlatList,
  Dimensions,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  launchImageLibrary, 
  launchCamera, 
  MediaType,
  ImagePickerOptions,
  ImagePickerResponse
} from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { compressLogoImage, compressShopImage, compressAvatarImage } from '../../utils/imageCompression';

// Import our Supabase service and auth context
import { authService } from '../../lib/supabase/index';
import integratedShopService from '../../lib/supabase/integrated';
import { useAuth } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');

// Type definitions
type ProviderStackParamList = {
  ShopDetails: {
    shop?: Shop;
    onSave?: (shop: Shop) => void;
  };
  ProviderTabs: {
    screen?: 'ProviderHomeTab' | 'QueueTab' | 'ServicesTab' | 'EarningsTab' | 'ProfileTab';
  };
};

type ShopDetailsRouteProp = RouteProp<ProviderStackParamList, 'ShopDetails'>;
type ShopDetailsNavigationProp = StackNavigationProp<ProviderStackParamList, 'ShopDetails'>;

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  specialties: string[];
  avatar_url?: string;
  bio?: string;
  experience_years?: number;
  is_active: boolean;
  created_at?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  image?: string;
  discount?: Discount;
  assigned_staff?: string[];
  is_active: boolean;
}

export interface Discount {
  id: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'package';
  value: number;
  description: string;
  min_amount?: number;
  max_discount?: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  usage_limit?: number;
  used_count: number;
  applicable_services?: string[];
  conditions?: string;
}

export interface BusinessHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  isAlwaysOpen?: boolean;
}

export interface SpecialDay {
  id: string;
  date: string;
  name: string;
  type: 'holiday' | 'special_hours' | 'closed' | 'event';
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  description?: string;
  recurring?: 'none' | 'weekly' | 'monthly' | 'yearly';
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  description: string;
  category: string;
  website_url?: string;
  image_url?: string;
  images?: string[];
  logo_url?: string;
  business_hours: BusinessHours[];
  special_days: SpecialDay[];
  timezone: string;
  advance_booking_days: number;
  slot_duration: number;
  buffer_time: number;
  auto_approval: boolean;
  is_active: boolean;
  services?: Service[];
  discounts?: Discount[];
  staff?: Staff[];
  created_at?: string;
  updated_at?: string;
}

// Service categories
const SERVICE_CATEGORIES = [
  'Beauty & Wellness', 'Hair Salon', 'Spa & Wellness', 'Nail Care',
  'Massage Therapy', 'Skincare', 'Fitness & Health', 'Home Services',
  'Auto Services', 'Pet Care', 'Food & Dining', 'Education', 'Other'
];

// Common role suggestions (for placeholder/examples)
const ROLE_SUGGESTIONS = [
  'Manager', 'Technician', 'Specialist', 'Assistant', 'Consultant', 
  'Cleaner', 'Supervisor', 'Coordinator', 'Expert', 'Professional'
];

// Common specialty suggestions (for placeholder/examples)
const SPECIALTY_SUGGESTIONS = [
  'Deep Cleaning', 'Window Cleaning', 'Carpet Cleaning', 'Office Cleaning',
  'Residential Cleaning', 'Commercial Cleaning', 'Maintenance', 'Repair Work',
  'Installation', 'Consultation', 'Quality Control', 'Customer Service'
];

// Discount types
const DISCOUNT_TYPES = [
  { id: 'percentage', name: 'Percentage Off', icon: 'calculator-outline', description: 'e.g., 20% off' },
  { id: 'fixed', name: 'Fixed Amount', icon: 'cash-outline', description: 'e.g., $10 off' },
  { id: 'bogo', name: 'Buy One Get One', icon: 'gift-outline', description: 'Special offers' },
  { id: 'package', name: 'Package Deal', icon: 'bag-outline', description: 'Bundle discounts' }
];

// Days of the week
const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Special day types
const SPECIAL_DAY_TYPES = [
  { id: 'holiday', name: 'Public Holiday', icon: 'calendar-outline', color: '#EF4444' },
  { id: 'special_hours', name: 'Special Hours', icon: 'time-outline', color: '#F59E0B' },
  { id: 'closed', name: 'Closed', icon: 'close-circle-outline', color: '#6B7280' },
  { id: 'event', name: 'Special Event', icon: 'star-outline', color: '#8B5CF6' }
];

// Recurring options
const RECURRING_OPTIONS = [
  { id: 'none', name: 'One-time only' },
  { id: 'weekly', name: 'Every week' },
  { id: 'monthly', name: 'Every month' },
  { id: 'yearly', name: 'Every year' }
];

// Timezones (simplified)
const TIMEZONES = [
  'Europe/Stockholm', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney'
];

const ShopDetailsScreen: React.FC = () => {
  const navigation = useNavigation<ShopDetailsNavigationProp>();
  const route = useRoute<ShopDetailsRouteProp>();
  const { user } = useAuth();

  // Set navigation options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: existingShop ? 'Edit Shop' : 'Create Shop',
      headerStyle: { backgroundColor: '#FEFCE8' },
      headerTintColor: '#1F2937',
      headerTitleStyle: { fontWeight: '600' },
      headerRight: () => (
        <TouchableOpacity
          style={[styles.headerSaveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.headerSaveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, existingShop, isSaving]);
  
  const existingShop = route.params?.shop;
  const onSave = route.params?.onSave;
  const isEditing = !!existingShop;

  // Debug: Log the existing shop data structure and test storage
  React.useEffect(() => {
    if (existingShop) {
      console.log('🔍 Existing shop data structure:', JSON.stringify(existingShop, null, 2));
      console.log('🔍 Business hours:', existingShop.business_hours);
      console.log('🔍 Images:', existingShop.images);
      console.log('🔍 Services:', existingShop.services);
      console.log('🔍 Staff:', existingShop.staff);
    }

    // Test storage connection when component loads (non-blocking)
    const testStorage = async () => {
      try {
        console.log('🧪 Running storage test...');
        const result = await authService.testStorageConnection();
        console.log('🧪 Storage test result:', result);
      } catch (error) {
        console.log('🧪 Storage test failed (non-blocking):', error);
      }
    };
    
    testStorage();
  }, [existingShop]);

  // Create default business hours
  const createDefaultBusinessHours = (): BusinessHours[] => {
    return DAYS_OF_WEEK.map(day => ({
      day,
      isOpen: ['Saturday', 'Sunday'].includes(day) ? false : true,
      openTime: '09:00',
      closeTime: '17:00'
    }));
  };

  // Main shop state
  const [shop, setShop] = useState<Shop>(() => ({
    id: existingShop?.id || '',
    name: existingShop?.name || '',
    address: existingShop?.address || '',
    city: existingShop?.city || '',
    state: existingShop?.state || '',
    country: existingShop?.country || 'Sweden',
    phone: existingShop?.phone || '',
    email: existingShop?.email || '',
    description: existingShop?.description || '',
    category: existingShop?.category || SERVICE_CATEGORIES[0],
    website_url: existingShop?.website_url || '',
    image_url: existingShop?.image_url || '',
    images: existingShop?.images || [],
    logo_url: existingShop?.logo_url || '',
    business_hours: existingShop?.business_hours || createDefaultBusinessHours(),
    special_days: existingShop?.special_days || [],
    timezone: existingShop?.timezone || 'Europe/Stockholm',
    advance_booking_days: existingShop?.advance_booking_days || 30,
    slot_duration: existingShop?.slot_duration || 60,
    buffer_time: existingShop?.buffer_time || 15,
    auto_approval: existingShop?.auto_approval ?? true,
    is_active: existingShop?.is_active ?? true,
    services: existingShop?.services || [],
    discounts: existingShop?.discounts || [],
    staff: existingShop?.staff || []
  }));

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'staff' | 'services' | 'discounts' | 'settings'>('basic');
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSpecialDayModal, setShowSpecialDayModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  
  // Form states
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [editingSpecialDay, setEditingSpecialDay] = useState<SpecialDay | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editingTimeSlot, setEditingTimeSlot] = useState<{day: string, type: 'open' | 'close'} | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [imageUploadType, setImageUploadType] = useState<'shop' | 'logo' | 'staff'>('shop');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  
  // Refs for critical inputs
  const shopNameRef = useRef<TextInput>(null);
  const shopAddressRef = useRef<TextInput>(null);
  const shopPhoneRef = useRef<TextInput>(null);
  const shopEmailRef = useRef<TextInput>(null);
  
  // Store the actual text values separately to bypass React state issues
  const formValues = useRef({
    name: existingShop?.name || '',
    description: existingShop?.description || '',
    address: existingShop?.address || '',
    phone: existingShop?.phone || '',
    email: existingShop?.email || ''
  });

  // Service form state
  const [serviceForm, setServiceForm] = useState<Partial<Service>>({
    name: '', description: '', price: 0, duration: 60, category: '', assigned_staff: [], is_active: true
  });

  // Staff form state
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({
    name: '', 
    email: '', 
    phone: '', 
    role: '', 
    specialties: [], 
    bio: '', 
    experience_years: 0, 
    is_active: true,
    avatar_url: undefined
  });
  
  // Staff specialty input
  const [newSpecialty, setNewSpecialty] = useState('');

  // Discount form state
  const [discountForm, setDiscountForm] = useState<Partial<Discount>>({
    type: 'percentage', value: 0, description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true, used_count: 0
  });

  // Special day form state
  const [specialDayForm, setSpecialDayForm] = useState<Partial<SpecialDay>>({
    date: new Date().toISOString().split('T')[0],
    name: '', type: 'holiday', isOpen: false,
    openTime: '09:00', closeTime: '17:00',
    description: '', recurring: 'none'
  });

  // Load complete shop data if editing
  useEffect(() => {
    const loadCompleteShopData = async () => {
      if (isEditing && existingShop && existingShop.id) {
        console.log('🔄 Loading complete shop data for edit mode...');
        setIsLoading(true);
        
        try {
          // Try to fetch complete shop data from database
          const response = await authService.getProviderBusinesses();
          if (response.success && response.data) {
            const completeShop = response.data.find((shop: any) => shop.id === existingShop.id);
            if (completeShop) {
              console.log('✅ Found complete shop data:', completeShop);
              
              // Map the complete shop data to our expected format
              const mappedShop = {
                ...existingShop, // Start with the basic data
                // Override with complete data if available
                images: completeShop.images || [],
                services: completeShop.services || [],
                staff: completeShop.staff || [],
                // Any other enhanced fields that might be available
              };
              
              setShop(mappedShop);
              // Also update formValues ref
              formValues.current = {
                name: mappedShop.name || '',
                description: mappedShop.description || '',
                address: mappedShop.address || '',
                phone: mappedShop.phone || '',
                email: mappedShop.email || ''
              };
            } else {
              console.log('⚠️ Complete shop data not found, using basic data');
              setShop(existingShop);
              // Also update formValues ref
              formValues.current = {
                name: existingShop.name || '',
                description: existingShop.description || '',
                address: existingShop.address || '',
                phone: existingShop.phone || '',
                email: existingShop.email || ''
              };
            }
          } else {
            console.log('⚠️ Failed to fetch complete shop data, using basic data');
            setShop(existingShop);
            // Also update formValues ref
            formValues.current = {
              name: existingShop.name || '',
              description: existingShop.description || '',
              address: existingShop.address || '',
              phone: existingShop.phone || '',
              email: existingShop.email || ''
            };
          }
        } catch (error) {
          console.error('❌ Error loading complete shop data:', error);
          setShop(existingShop);
          // Also update formValues ref
          formValues.current = {
            name: existingShop.name || '',
            description: existingShop.description || '',
            address: existingShop.address || '',
            phone: existingShop.phone || '',
            email: existingShop.email || ''
          };
        } finally {
          setIsLoading(false);
        }
      } else if (isEditing && existingShop) {
        setShop(existingShop);
        // Also update formValues ref
        formValues.current = {
          name: existingShop.name || '',
          description: existingShop.description || '',
          address: existingShop.address || '',
          phone: existingShop.phone || '',
          email: existingShop.email || ''
        };
      }
    };

    loadCompleteShopData();
  }, [isEditing, existingShop]);

  // More robust validation that uses formValues ref to bypass state timing issues
  const validateBasicInfo = useCallback((): boolean => {
    console.log('🔍 Validation check - State value:', shop.name);
    console.log('🔍 Validation check - FormValues ref value:', formValues.current.name);
    
    // Use the formValues ref as the primary source of truth
    const currentName = formValues.current.name;
    const trimmedName = currentName.trim();
    
    console.log('🔍 Using formValues.current.name:', currentName);
    console.log('🔍 Trimmed name:', trimmedName);
    console.log('🔍 Trimmed name length:', trimmedName.length);
    
    if (!trimmedName || trimmedName.length === 0) {
      console.log('❌ Validation failed - shop name is empty');
      setActiveTab('basic'); // Switch to basic tab to show the error
      Alert.alert('Validation Error', 'Shop name is required');
      return false;
    }
    
    console.log('✅ Validation passed - shop name is:', trimmedName);
    
    // Check address validation using formValues
    const currentAddress = formValues.current.address;
    const trimmedAddress = currentAddress.trim();
    console.log('🔍 Address validation - FormValues ref value:', currentAddress);
    console.log('🔍 Address trimmed:', trimmedAddress);
    
    if (!trimmedAddress || trimmedAddress.length === 0) {
      console.log('❌ Address validation failed - address is empty');
      Alert.alert('Validation Error', 'Address is required');
      return false;
    }
    
    console.log('✅ Address validation passed - address is:', trimmedAddress);
    
    // Check phone validation using formValues
    const currentPhone = formValues.current.phone;
    const trimmedPhone = currentPhone.trim();
    if (!trimmedPhone) {
      Alert.alert('Validation Error', 'Phone number is required');
      return false;
    }
    
    // Check email validation using formValues
    const currentEmail = formValues.current.email;
    const trimmedEmail = currentEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Validation Error', 'Valid email is required');
      return false;
    }
    return true;
  }, []); // No dependencies needed since we're using a ref

  // Save shop
  const handleSave = async () => {
    try {
      console.log('🚨 SAVE BUTTON PRESSED - handleSave function called');
      console.log('💾 Starting save process...');
      console.log('💾 Current shop state:', JSON.stringify(shop, null, 2));
      console.log('💾 Shop images in state:', shop.images);
      console.log('💾 Shop logo_url in state:', shop.logo_url);
      console.log('💾 Images array length:', (shop.images || []).length);
      console.log('💾 Images array contents:', shop.images);
      
      // Check if any images are actually selected
      const hasImages = shop.images && shop.images.length > 0 && shop.images.some(img => img && img.trim() !== '');
      const hasLogo = shop.logo_url && shop.logo_url.trim() !== '';
      console.log('💾 Has images:', hasImages);
      console.log('💾 Has logo:', hasLogo);
      
      if (!hasImages && !hasLogo) {
        console.log('ℹ️ No images or logo provided - shop will be created without images');
      } else {
        console.log('✅ Images detected, proceeding with upload...');
      }

      // Check storage connection before proceeding (but don't block shop creation)
      console.log('🧪 Testing storage connection before upload...');
      const storageTest = await authService.testStorageConnection();
      console.log('🧪 Storage test result:', storageTest);
      
      let storageAvailable = false;
    
    if (!storageTest.success) {
      console.warn('⚠️ Storage not available, attempting to create buckets...');
      
      // Try to create buckets automatically
      const createResult = await authService.createStorageBuckets();
      if (createResult.success) {
        console.log('✅ Buckets created successfully, continuing with save...');
        storageAvailable = true;
      } else {
        console.warn('⚠️ Failed to create buckets automatically');
        console.warn('⚠️ Shop will be created without image upload capability');
        console.warn('⚠️ Please run: fix_storage_buckets_rls.sql in Supabase SQL Editor');
        storageAvailable = false;
        
        // Show warning but allow shop creation to continue
        if (hasImages || hasLogo) {
          Alert.alert(
            'Storage Warning', 
            'Storage buckets are not available. The shop will be created but images cannot be uploaded. You can add images later after fixing the storage setup.',
            [{ text: 'Continue', style: 'default' }]
          );
        }
      }
    } else {
      console.log('✅ Storage connection successful');
      storageAvailable = true;
    }
    
    // Force a longer delay and multiple state checks to ensure synchronization
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force React to flush any pending state updates
    await new Promise(resolve => {
      setShop(prevShop => {
        console.log('🔄 Forcing state flush - current name:', prevShop.name);
        return prevShop; // No change, just force a re-render
      });
      setTimeout(resolve, 100);
    });
    
    // Re-check the current shop state before validation
    console.log('Current shop state before validation:', {
      name: shop.name,
      nameLength: shop.name.length,
      trimmedName: shop.name.trim(),
      trimmedLength: shop.name.trim().length
    });
    
    if (!validateBasicInfo()) return;
    
    // Get the latest shop state (in case of async state updates)
    const currentShop = await new Promise<typeof shop>(resolve => {
      setShop(prevShop => {
        resolve(prevShop);
        return prevShop;
      });
    });
    
    console.log('🔍 Current shop state at validation:', {
      logo_url: currentShop.logo_url,
      images: currentShop.images
    });
    
    // Validate that at least one image is provided
    const isValidImageUrl = (url: string | undefined | null): boolean => {
      if (!url || typeof url !== 'string') return false;
      const trimmed = url.trim();
      if (trimmed === '') return false;
      // Accept both local file URIs and HTTP URLs (for existing shops)
      // Note: iOS uses file:/// (three slashes) for local files
      return trimmed.startsWith('file://') || trimmed.startsWith('http://') || trimmed.startsWith('https://');
    };
    
    const hasValidImages = currentShop.images && currentShop.images.length > 0 && currentShop.images.some(img => isValidImageUrl(img));
    const hasValidLogo = isValidImageUrl(currentShop.logo_url);
    
    console.log('🖼️ Image validation check:');
    console.log('  - Logo URL:', currentShop.logo_url);
    console.log('  - Logo URL type:', typeof currentShop.logo_url);
    console.log('  - Logo URL trimmed:', currentShop.logo_url?.trim());
    console.log('  - Logo valid:', hasValidLogo);
    console.log('  - Images:', currentShop.images);
    console.log('  - Images length:', currentShop.images?.length);
    if (currentShop.images && currentShop.images.length > 0) {
      currentShop.images.forEach((img, i) => {
        const valid = isValidImageUrl(img);
        console.log(`  - Image ${i}: ${img?.substring(0, 50)}... valid: ${valid}`);
      });
    }
    console.log('  - Images valid:', hasValidImages);
    console.log('  - At least one valid image:', hasValidImages || hasValidLogo);
    
    if (!hasValidImages && !hasValidLogo) {
      console.warn('⚠️ NO VALID IMAGES FOUND - but continuing anyway for debugging');
      console.warn('⚠️ This validation is temporarily disabled to debug the issue');
      // Alert.alert(
      //   'Image Required',
      //   'Please add at least one image or logo for your shop.',
      //   [{ text: 'OK' }]
      // );
      // return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save a shop');
      return;
    }

    setIsSaving(true);

    try {
      console.log('🖼️ ===== IMAGE UPLOAD DEBUG START =====');
      console.log('🖼️ Preparing to upload images...');
      console.log('🖼️ Current logo URL:', shop.logo_url);
      console.log('🖼️ Current images array:', shop.images);
      console.log('🖼️ Images array length:', shop.images?.length || 0);
      console.log('🖼️ Logo URL type:', typeof shop.logo_url);
      console.log('🖼️ Logo URL starts with file://?', shop.logo_url?.startsWith('file://'));
      
      // Check each image in the array
      if (shop.images && shop.images.length > 0) {
        shop.images.forEach((img, index) => {
          console.log(`🖼️ Image ${index}:`, img, 'Type:', typeof img, 'Starts with file://?', img?.startsWith('file://'));
        });
      } else {
        console.log('🖼️ No images in array to upload');
      }
      
      // Upload logo if it's a local URI (and storage is available)
      let uploadedLogoUrl = shop.logo_url;
      if (shop.logo_url && shop.logo_url.startsWith('file://')) {
        if (storageAvailable) {
          console.log('📸 Uploading shop logo...');
          console.log('📸 Logo local URI:', shop.logo_url);
          const logoResult = await integratedShopService.uploadImage(shop.logo_url, 'shops/logos');
          console.log('📸 Logo upload result:', logoResult);
          
          if (logoResult.success && logoResult.data) {
            uploadedLogoUrl = logoResult.data;
            console.log('✅ Logo uploaded successfully:', uploadedLogoUrl);
            console.log('✅ Logo URL length:', uploadedLogoUrl.length);
          } else {
            console.error('❌ Failed to upload logo:', logoResult.error);
            console.warn('⚠️ Creating shop without logo due to upload failure');
            uploadedLogoUrl = ''; // Set to empty string instead of keeping local URI
          }
        } else {
          console.warn('⚠️ Storage not available, skipping logo upload');
          uploadedLogoUrl = '';
        }
      } else if (shop.logo_url && !shop.logo_url.startsWith('http')) {
        console.log('ℹ️ Logo URL exists but is not a valid URI, clearing it');
        uploadedLogoUrl = '';
      } else {
        console.log('ℹ️ No logo to upload or already uploaded');
      }
      
      // Upload shop images that are local URIs
      let uploadedImageUrls: string[] = [];
      const localImages = (shop.images || []).filter(img => img && img.startsWith('file://'));
      const existingImages = (shop.images || []).filter(img => img && !img.startsWith('file://'));
      
      console.log(`🖼️ Found ${localImages.length} local images to upload`);
      console.log(`🖼️ Found ${existingImages.length} existing images`);
      
      if (localImages.length > 0) {
        if (storageAvailable) {
          console.log(`📸 Uploading ${localImages.length} shop images...`);
          console.log('📸 Local images to upload:', localImages);
          const imagesResult = await integratedShopService.uploadMultipleImages(localImages, 'shops/images');
          console.log('📸 Multiple images upload result:', imagesResult);
          
          if (imagesResult.success && imagesResult.data && imagesResult.data.length > 0) {
            uploadedImageUrls = imagesResult.data.filter(url => url && url.trim() !== '');
            console.log(`✅ Successfully uploaded ${uploadedImageUrls.length} images:`, uploadedImageUrls);
          } else {
            console.error('❌ Failed to upload images:', imagesResult.error);
            console.warn('⚠️ Creating shop without images due to upload failure');
          }
        } else {
          console.warn(`⚠️ Storage not available, skipping upload of ${localImages.length} images`);
        }
      } else {
        console.log('ℹ️ No new images to upload');
      }
      
      // Combine existing and newly uploaded images
      const allImages = [...existingImages, ...uploadedImageUrls];
      
      // Use the main image (logo or first shop image) as image_url
      const mainImageUrl = uploadedLogoUrl || allImages[0] || '';
      
      // Validate all image URLs before storing
      const validAllImages = allImages.filter(url => url && url.trim() !== '' && url.startsWith('http'));
      const validLogoUrl = (uploadedLogoUrl && uploadedLogoUrl.startsWith('http')) ? uploadedLogoUrl : '';
      const validMainImageUrl = (mainImageUrl && mainImageUrl.startsWith('http')) ? mainImageUrl : '';
      
      console.log('🖼️ Final image summary:');
      console.log('  - Original logo URL:', uploadedLogoUrl);
      console.log('  - Original all images array:', allImages);
      console.log('  - Original main image URL:', mainImageUrl);
      console.log('🖼️ After validation:');
      console.log('  - Valid logo URL:', validLogoUrl);
      console.log('  - Valid all images array:', validAllImages);
      console.log('  - Valid main image URL for database:', validMainImageUrl);
      console.log('🖼️ Verifying image URLs are valid HTTP URLs:');
      validAllImages.forEach((url, index) => {
        console.log(`  - Valid Image ${index + 1}: ${url} (starts with http: ${url.startsWith('http')})`);
      });
      if (validLogoUrl) {
        console.log(`  - Valid Logo: ${validLogoUrl} (starts with http: ${validLogoUrl.startsWith('http')})`);
      }
      
      // Extract basic business hours for backward compatibility
      const getBusinessHours = (businessHours: any[]) => {
        const mondayHours = businessHours.find(h => h.day === 'Monday');
        return {
          start: mondayHours?.isOpen ? mondayHours.openTime : '09:00',
          end: mondayHours?.isOpen ? mondayHours.closeTime : '17:00'
        };
      };

      const hours = getBusinessHours(shop.business_hours || []);

      // Use formValues ref as primary source of truth (consistent with validation)
      const shopData = {
        name: (formValues.current.name || shop.name).trim(),
        description: (formValues.current.description || shop.description).trim(),
        category: shop.category,
        address: (formValues.current.address || shop.address).trim(),
        city: shop.city.trim(),
        state: shop.state.trim(),
        country: shop.country.trim(),
        phone: (formValues.current.phone || shop.phone).trim(),
        email: (formValues.current.email || shop.email).trim(),
        website_url: shop.website_url?.trim() || null,
        image_url: validMainImageUrl,
        business_hours_start: hours.start,
        business_hours_end: hours.end,
        is_active: shop.is_active,
        // Enhanced data fields
        logo_url: validLogoUrl,
        images: validAllImages, // Send as array, will be handled properly by auth service
        business_hours: shop.business_hours || [],
        special_days: shop.special_days || [],
        services: shop.services || [],
        staff: shop.staff || [],
        discounts: shop.discounts || [],
        timezone: shop.timezone || 'Europe/Stockholm',
        advance_booking_days: shop.advance_booking_days || 30,
        slot_duration: shop.slot_duration || 60,
        buffer_time: shop.buffer_time || 15,
        auto_approval: shop.auto_approval ?? true
      };

      console.log('🏪 Final shop data being sent to database:', JSON.stringify(shopData, null, 2));
      console.log('🖼️ IMAGE UPLOAD SUMMARY:');
      console.log('  - Images to upload (local):', localImages.length);
      console.log('  - Uploaded image URLs:', uploadedImageUrls);
      console.log('  - Valid all images for DB:', validAllImages);
      console.log('  - Logo URL for DB:', validLogoUrl);
      console.log('  - Main image URL for DB:', validMainImageUrl);
      console.log('🏪 Key fields check:');
      console.log('  - Name:', `"${shopData.name}" (length: ${shopData.name.length})`);
      console.log('  - Description:', `"${shopData.description}" (length: ${shopData.description.length})`);
      console.log('  - Address:', `"${shopData.address}" (length: ${shopData.address.length})`);
      console.log('  - City:', `"${shopData.city}" (length: ${shopData.city.length})`);
      console.log('  - State:', `"${shopData.state}" (length: ${shopData.state.length})`);
      console.log('  - Phone:', `"${shopData.phone}" (length: ${shopData.phone.length})`);
      console.log('  - Email:', `"${shopData.email}" (length: ${shopData.email.length})`);
      console.log('🖼️ Image fields for database:');
      console.log('  - image_url:', `"${shopData.image_url}" (length: ${shopData.image_url?.length || 0})`);
      console.log('  - logo_url:', `"${shopData.logo_url}" (length: ${shopData.logo_url?.length || 0})`);
      console.log('  - images JSON:', shopData.images);

      let result;
      if (isEditing && shop.id) {
        console.log('🔄 Updating existing shop with ID:', shop.id);
        // TODO: Implement updateShop in integrated service
        result = await authService.updateProviderBusiness(shop.id, shopData);
      } else {
        console.log('➕ Creating new shop using integrated service');
        console.log('🏪 Calling integratedShopService.createShop with data:', JSON.stringify(shopData, null, 2));
        result = await integratedShopService.createShop(shopData);
        console.log('🏪 IntegratedShopService result:', result);
      }

      if (result.success) {
        // Parse JSON fields back to objects for the app
        const parsedShopData = {
          ...result.data,
          business_hours: typeof result.data.business_hours === 'string' 
            ? JSON.parse(result.data.business_hours) 
            : result.data.business_hours,
          special_days: typeof result.data.special_days === 'string' 
            ? JSON.parse(result.data.special_days) 
            : result.data.special_days,
          staff: typeof result.data.staff === 'string' 
            ? JSON.parse(result.data.staff) 
            : result.data.staff,
          services: typeof result.data.services === 'string' 
            ? JSON.parse(result.data.services) 
            : result.data.services,
          discounts: typeof result.data.discounts === 'string' 
            ? JSON.parse(result.data.discounts) 
            : result.data.discounts,
          images: typeof result.data.images === 'string' 
            ? JSON.parse(result.data.images) 
            : result.data.images,
          // Include the uploaded image URLs
          image_url: validMainImageUrl || result.data.image_url,
          logo_url: validLogoUrl || '',
          images: validAllImages
        };

        Alert.alert(
          'Success',
          isEditing ? 'Shop updated successfully!' : 'Shop created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onSave) {
                  onSave(parsedShopData);
                }
                // Navigate to provider home screen to show the created shop
                navigation.navigate('ProviderTabs', { 
                  screen: 'ProviderHomeTab',
                  params: { 
                    params: { newShop: parsedShopData }
                  }
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save shop');
      }
    } catch (error) {
      console.error('🚨 ERROR in handleSave:', error);
      Alert.alert('Save Error', error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Image picker with explicit type handling
  const pickImage = (type: 'shop' | 'logo') => {
    const options: ImagePickerOptions = {
      mediaType: 'photo',
      quality: type === 'logo' ? 0.9 : 0.8, // High quality but compressed
      maxWidth: type === 'logo' ? 512 : 1920,
      maxHeight: type === 'logo' ? 512 : 1080,
      includeBase64: false, // Don't include base64 to save memory
    };

    const handleResponse = async (response: ImagePickerResponse) => {
      console.log('🔄 handleResponse called for type:', type, 'with response:', response);
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        console.log('🔄 Asset found:', asset);
        if (asset.uri) {
          try {
            console.log('🗜️ Compressing image before storing...');
            
            // Skip compression for now and use original URI directly
            const imageUri = asset.uri;
            console.log('✅ Using original image URI:', imageUri);
            
            if (type === 'logo') {
              console.log('🔄 Setting logo URL:', imageUri);
              setShop(prev => {
                console.log('🔄 Previous logo_url:', prev.logo_url);
                console.log('🔄 New logo_url:', imageUri);
                const updated = { ...prev, logo_url: imageUri };
                console.log('🔄 Updated shop state:', updated);
                return updated;
              });
            } else {
              console.log('🔄 Adding shop image at index:', selectedImageIndex);
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                // Ensure array is long enough
                while (newImages.length <= selectedImageIndex) {
                  newImages.push('');
                }
                newImages[selectedImageIndex] = imageUri;
                console.log('🔄 Previous images:', prev.images);
                console.log('🔄 New images array:', newImages);
                const updated = { ...prev, images: newImages };
                console.log('🔄 Updated shop state:', updated);
                return updated;
              });
            }
          } catch (error) {
            console.error('❌ Compression error:', error);
            // Fall back to original image
            if (type === 'logo') {
              setShop(prev => ({ ...prev, logo_url: asset.uri! }));
            } else {
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                newImages[selectedImageIndex] = asset.uri!;
                return { ...prev, images: newImages };
              });
            }
          }
        } else {
          console.log('❌ No URI found in asset');
        }
      } else {
        console.log('❌ No assets found in response');
      }
    };

    Alert.alert(
      `Select ${type === 'logo' ? 'Logo' : 'Shop Photo'}`,
      'Choose how you want to select an image',
      [
        { text: 'Camera', onPress: () => launchCamera(options, handleResponse) },
        { text: 'Gallery', onPress: () => launchImageLibrary(options, handleResponse) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleImageResponse = async (response: ImagePickerResponse) => {
    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      if (asset.uri) {
        try {
          if (imageUploadType === 'staff') {
            console.log('🗜️ Compressing staff avatar...');
            
            // Compress avatar image
            const compressionResult = await compressAvatarImage(asset.uri);
            
            if (compressionResult.success && compressionResult.uri) {
              console.log('✅ Staff avatar compressed successfully');
              console.log('✅ Original size:', (compressionResult.originalSize! / 1024 / 1024).toFixed(2), 'MB');
              console.log('✅ Compressed size:', (compressionResult.compressedSize! / 1024 / 1024).toFixed(2), 'MB');
              setStaffForm(prev => ({ ...prev, avatar_url: compressionResult.uri! }));
            } else {
              console.error('❌ Staff avatar compression failed:', compressionResult.error);
              setStaffForm(prev => ({ ...prev, avatar_url: asset.uri! }));
            }
          } else {
            console.log('🗜️ Compressing shop image...');
            
            // Compress shop image
            const compressionResult = await compressShopImage(asset.uri);
            
            if (compressionResult.success && compressionResult.uri) {
              console.log('✅ Shop image compressed successfully');
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                newImages[selectedImageIndex] = compressionResult.uri!;
                return { ...prev, images: newImages };
              });
            } else {
              console.error('❌ Shop image compression failed:', compressionResult.error);
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                newImages[selectedImageIndex] = asset.uri!;
                return { ...prev, images: newImages };
              });
            }
          }
        } catch (error) {
          console.error('❌ Compression error:', error);
          // Fall back to original images
          if (imageUploadType === 'staff') {
            setStaffForm(prev => ({ ...prev, avatar_url: asset.uri! }));
          } else {
            setShop(prev => {
              const newImages = [...(prev.images || [])];
              newImages[selectedImageIndex] = asset.uri!;
              return { ...prev, images: newImages };
            });
          }
        }
      }
    }
  };


  const pickStaffAvatar = () => {
    setImageUploadType('staff');
    const options: ImagePickerOptions = {
      mediaType: 'photo',
      quality: 0.9, // High quality but compressed
      maxWidth: 400,
      maxHeight: 400,
      includeBase64: false, // Don't include base64 to save memory
    };

    Alert.alert(
      'Select Profile Photo',
      'Choose how you want to select a profile image',
      [
        { text: 'Camera', onPress: () => launchCamera(options, handleImageResponse) },
        { text: 'Gallery', onPress: () => launchImageLibrary(options, handleImageResponse) },
        { text: 'Remove', onPress: () => setStaffForm(prev => ({ ...prev, avatar_url: undefined })), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const pickShopImage = (index: number) => {
    const options: ImagePickerOptions = {
      mediaType: 'photo',
      quality: 0.8, // High quality but compressed
      maxWidth: 1920,
      maxHeight: 1080,
      includeBase64: false, // Don't include base64 to save memory
    };

    const handleShopImageResponse = async (response: ImagePickerResponse) => {
      console.log('🎯 handleShopImageResponse called with response:', response);
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        console.log('🎯 Asset found:', asset);
        if (asset.uri) {
          try {
            console.log('🗜️ Compressing shop image before storing...');
            
            // Use original image URI directly for now
            const imageUri = asset.uri;
            console.log('✅ Using original shop image URI:', imageUri);
            
            console.log('🎯 Adding shop image at index:', index, 'URI:', imageUri);
            setShop(prev => {
              const newImages = [...(prev.images || [])];
              // Ensure the array is long enough
              while (newImages.length <= index) {
                newImages.push('');
              }
              newImages[index] = imageUri;
              console.log('🎯 Updated images array:', newImages);
              console.log('🎯 Previous shop state images:', prev.images);
              console.log('🎯 New shop state will have images:', newImages);
              const updated = { ...prev, images: newImages };
              console.log('🎯 Complete updated shop state:', updated);
              return updated;
            });
          } catch (error) {
            console.error('❌ Compression error:', error);
            // Fall back to original image
            console.log('🎯 Adding original shop image at index:', index, 'URI:', asset.uri);
            setShop(prev => {
              const newImages = [...(prev.images || [])];
              while (newImages.length <= index) {
                newImages.push('');
              }
              newImages[index] = asset.uri!;
              return { ...prev, images: newImages };
            });
          }
        } else {
          console.log('❌ No URI found in asset');
        }
      } else {
        console.log('❌ No assets found in response');
      }
    };

    Alert.alert(
      'Select Shop Photo',
      'Choose how you want to select an image',
      [
        { text: 'Camera', onPress: () => launchCamera(options, handleShopImageResponse) },
        { text: 'Gallery', onPress: () => launchImageLibrary(options, handleShopImageResponse) },
        { text: 'Remove', onPress: () => removeShopImage(index), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const removeShopImage = (index: number) => {
    setShop(prev => {
      const newImages = [...(prev.images || [])];
      // Set the specific index to empty string instead of removing the element
      // This keeps the array structure intact for the 5-slot grid
      newImages[index] = '';
      console.log('Removed image at index:', index, 'Updated array:', newImages);
      return { ...prev, images: newImages };
    });
  };

  // Business hours management
  const updateBusinessHours = (day: string, field: keyof BusinessHours, value: any) => {
    setShop(prev => ({
      ...prev,
      business_hours: prev.business_hours.map(hour =>
        hour.day === day ? { ...hour, [field]: value } : hour
      )
    }));
  };

  const openTimePicker = (day: string, type: 'open' | 'close') => {
    const currentHour = shop.business_hours.find(h => h.day === day);
    if (currentHour) {
      const time = type === 'open' ? currentHour.openTime : currentHour.closeTime;
      const [hours, minutes] = time.split(':').map(Number);
      setTempDate(new Date(2024, 0, 1, hours, minutes));
      setEditingTimeSlot({ day, type });
      setShowCustomTimePicker(true);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const selectTime = (timeString: string) => {
    if (editingTimeSlot) {
      const field = editingTimeSlot.type === 'open' ? 'openTime' : 'closeTime';
      updateBusinessHours(editingTimeSlot.day, field, timeString);
    }
    setShowCustomTimePicker(false);
    setEditingTimeSlot(null);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate && editingTimeSlot) {
      const timeString = selectedDate.toTimeString().slice(0, 5);
      const field = editingTimeSlot.type === 'open' ? 'openTime' : 'closeTime';
      updateBusinessHours(editingTimeSlot.day, field, timeString);
    }
    setEditingTimeSlot(null);
  };

  // Special days management
  const openSpecialDayModal = (specialDay?: SpecialDay) => {
    if (specialDay) {
      setEditingSpecialDay(specialDay);
      setSpecialDayForm(specialDay);
    } else {
      setEditingSpecialDay(null);
      setSpecialDayForm({
        date: new Date().toISOString().split('T')[0],
        name: '', type: 'holiday', isOpen: false,
        openTime: '09:00', closeTime: '17:00',
        description: '', recurring: 'none'
      });
    }
    setShowSpecialDayModal(true);
  };

  const saveSpecialDay = () => {
    if (!specialDayForm.name?.trim()) {
      Alert.alert('Error', 'Special day name is required');
      return;
    }
    if (!specialDayForm.date) {
      Alert.alert('Error', 'Date is required');
      return;
    }

    const newSpecialDay: SpecialDay = {
      id: editingSpecialDay?.id || Date.now().toString(),
      name: specialDayForm.name!.trim(),
      date: specialDayForm.date!,
      type: specialDayForm.type!,
      isOpen: specialDayForm.isOpen!,
      openTime: specialDayForm.openTime,
      closeTime: specialDayForm.closeTime,
      description: specialDayForm.description?.trim(),
      recurring: specialDayForm.recurring
    };

    setShop(prev => {
      const specialDays = prev.special_days || [];
      if (editingSpecialDay) {
        return {
          ...prev,
          special_days: specialDays.map(d => d.id === editingSpecialDay.id ? newSpecialDay : d)
        };
      } else {
        return {
          ...prev,
          special_days: [...specialDays, newSpecialDay]
        };
      }
    });

    setShowSpecialDayModal(false);
    setEditingSpecialDay(null);
  };

  const deleteSpecialDay = (dayId: string) => {
    Alert.alert(
      'Delete Special Day',
      'Are you sure you want to delete this special day?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setShop(prev => ({
              ...prev,
              special_days: prev.special_days.filter(d => d.id !== dayId)
            }));
          }
        }
      ]
    );
  };

  // Service management (keeping existing functionality)
  const openServiceModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setServiceForm(service);
    } else {
      setEditingService(null);
      setServiceForm({
        name: '', description: '', price: 0, duration: 60,
        category: shop.category, is_active: true
      });
    }
    setShowServiceModal(true);
  };

  const saveService = () => {
    if (!serviceForm.name?.trim()) {
      Alert.alert('Error', 'Service name is required');
      return;
    }
    if (!serviceForm.price || serviceForm.price <= 0) {
      Alert.alert('Error', 'Service price must be greater than 0');
      return;
    }

    const newService: Service = {
      id: editingService?.id || Date.now().toString(),
      name: serviceForm.name!.trim(),
      description: serviceForm.description || '',
      price: serviceForm.price!,
      duration: serviceForm.duration || 60,
      category: serviceForm.category || shop.category,
      is_active: serviceForm.is_active ?? true,
      discount: editingService?.discount
    };

    setShop(prev => {
      const services = prev.services || [];
      if (editingService) {
        return {
          ...prev,
          services: services.map(s => s.id === editingService.id ? newService : s)
        };
      } else {
        return {
          ...prev,
          services: [...services, newService]
        };
      }
    });

    setShowServiceModal(false);
    setEditingService(null);
  };

  const deleteService = (serviceId: string) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setShop(prev => ({
              ...prev,
              services: (prev.services || []).filter(s => s.id !== serviceId)
            }));
          }
        }
      ]
    );
  };

  // Discount management (keeping existing functionality)
  const openDiscountModal = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setDiscountForm(discount);
    } else {
      setEditingDiscount(null);
      setDiscountForm({
        type: 'percentage', value: 0, description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_active: true, used_count: 0
      });
    }
    setShowDiscountModal(true);
  };

  const saveDiscount = () => {
    if (!discountForm.description?.trim()) {
      Alert.alert('Error', 'Discount description is required');
      return;
    }
    if (!discountForm.value || discountForm.value <= 0) {
      Alert.alert('Error', 'Discount value must be greater than 0');
      return;
    }

    const newDiscount: Discount = {
      id: editingDiscount?.id || Date.now().toString(),
      type: discountForm.type!,
      value: discountForm.value!,
      description: discountForm.description!.trim(),
      start_date: discountForm.start_date!,
      end_date: discountForm.end_date!,
      is_active: discountForm.is_active ?? true,
      used_count: discountForm.used_count || 0,
      min_amount: discountForm.min_amount,
      max_discount: discountForm.max_discount,
      usage_limit: discountForm.usage_limit,
      applicable_services: discountForm.applicable_services,
      conditions: discountForm.conditions
    };

    setShop(prev => {
      const discounts = prev.discounts || [];
      if (editingDiscount) {
        return {
          ...prev,
          discounts: discounts.map(d => d.id === editingDiscount.id ? newDiscount : d)
        };
      } else {
        return {
          ...prev,
          discounts: [...discounts, newDiscount]
        };
      }
    });

    setShowDiscountModal(false);
    setEditingDiscount(null);
  };

  const deleteDiscount = (discountId: string) => {
    Alert.alert(
      'Delete Discount',
      'Are you sure you want to delete this discount?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setShop(prev => ({
              ...prev,
              discounts: (prev.discounts || []).filter(d => d.id !== discountId)
            }));
          }
        }
      ]
    );
  };

  // Staff management
  const openStaffModal = (staff?: Staff) => {
    if (staff) {
      setEditingStaff(staff);
      setStaffForm(staff);
    } else {
      setEditingStaff(null);
      setStaffForm({
        name: '', 
        email: '', 
        phone: '', 
        role: '', 
        specialties: [], 
        bio: '', 
        experience_years: 0, 
        is_active: true,
        avatar_url: undefined
      });
      setNewSpecialty('');
    }
    setShowStaffModal(true);
  };

  const saveStaff = () => {
    if (!staffForm.name?.trim()) {
      Alert.alert('Error', 'Staff name is required');
      return;
    }
    if (!staffForm.email?.trim() || !staffForm.email.includes('@')) {
      Alert.alert('Error', 'Valid email is required');
      return;
    }

    const newStaff: Staff = {
      id: editingStaff?.id || Date.now().toString(),
      name: staffForm.name!.trim(),
      email: staffForm.email!.trim(),
      phone: staffForm.phone || '',
      role: staffForm.role || '',
      specialties: (staffForm.specialties || []).filter(s => s && s.trim()),
      avatar_url: staffForm.avatar_url,
      bio: staffForm.bio?.trim() || '',
      experience_years: staffForm.experience_years || 0,
      is_active: staffForm.is_active ?? true
    };

    setShop(prev => {
      const staff = prev.staff || [];
      if (editingStaff) {
        return {
          ...prev,
          staff: staff.map(s => s.id === editingStaff.id ? newStaff : s)
        };
      } else {
        return {
          ...prev,
          staff: [...staff, newStaff]
        };
      }
    });

    setShowStaffModal(false);
    setEditingStaff(null);
  };

  const deleteStaff = (staffId: string) => {
    Alert.alert(
      'Delete Staff Member',
      'Are you sure you want to delete this staff member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setShop(prev => ({
              ...prev,
              staff: (prev.staff || []).filter(s => s.id !== staffId)
            }));
          }
        }
      ]
    );
  };

  const addSpecialty = () => {
    const trimmedSpecialty = newSpecialty.trim();
    if (trimmedSpecialty && !(staffForm.specialties || []).includes(trimmedSpecialty)) {
      setStaffForm(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []).filter(s => s && s.trim()), trimmedSpecialty]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setStaffForm(prev => ({
      ...prev,
      specialties: (prev.specialties || []).filter(s => s && s.trim() && s !== specialty)
    }));
  };

  const addSuggestedSpecialty = (specialty: string) => {
    if (specialty && specialty.trim() && !(staffForm.specialties || []).includes(specialty)) {
      setStaffForm(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []).filter(s => s && s.trim()), specialty]
      }));
    }
  };

  // Render methods

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { id: 'basic', label: 'Basic', icon: 'information-circle-outline' },
        { id: 'schedule', label: 'Schedule', icon: 'calendar-outline' },
        { id: 'staff', label: 'Staff', icon: 'people-outline' },
        { id: 'services', label: 'Services', icon: 'construct-outline' },
        { id: 'discounts', label: 'Discounts', icon: 'pricetag-outline' },
        { id: 'settings', label: 'Settings', icon: 'settings-outline' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tabItem, activeTab === tab.id && styles.activeTabItem]}
          onPress={() => setActiveTab(tab.id as any)}
        >
          <Ionicons 
            name={tab.icon as any} 
            size={18} 
            color={activeTab === tab.id ? '#FFFFFF' : '#6B7280'} 
          />
          <Text style={[
            styles.tabLabel,
            activeTab === tab.id && styles.activeTabLabel
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.section}>
      {/* Images Section */}
      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>Shop Images</Text>
        
        {/* Shop Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.imageLabel}>Shop Logo</Text>
          <TouchableOpacity style={styles.logoContainer} onPress={() => pickImage('logo')}>
            {shop.logo_url ? (
              <Image source={{ uri: shop.logo_url }} style={styles.logoImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="business-outline" size={32} color="#9CA3AF" />
                <Text style={styles.imagePlaceholderText}>Add Logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Debug Info */}
        <View style={{ padding: 10, backgroundColor: '#f0f0f0', marginVertical: 10 }}>
          <Text style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>
            🔍 Image Debug Info:
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Images array length: {(shop.images || []).length}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Logo: {shop.logo_url ? '✅ Set' : '❌ None'}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Compression: ✅ Built-in (80-90% quality, optimized dimensions)
          </Text>
          {(shop.images || []).filter(img => img && img.trim() !== '').length > 0 && (
            <Text style={{ fontSize: 12, color: '#666' }}>
              Shop images: {(shop.images || []).filter(img => img && img.trim() !== '').length} selected
            </Text>
          )}
          
          {/* Test Buttons */}
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <TouchableOpacity 
              style={{
                backgroundColor: '#10B981',
                padding: 8,
                borderRadius: 4,
                marginTop: 10,
                alignItems: 'center',
                flex: 1
              }}
              onPress={() => {
                console.log('🧪 TEST: Current shop state images:', shop.images);
                console.log('🧪 TEST: Current shop state logo:', shop.logo_url);
                console.log('🧪 TEST: Testing fake image URLs...');
                setShop(prev => ({
                  ...prev,
                  logo_url: 'https://fezdmxvqurczeqmqvgzm.supabase.co/storage/v1/object/public/user-avatars//WhatsApp%20Image%202024-08-05%20at%2013.01.37.jpeg',
                  images: ['https://fezdmxvqurczeqmqvgzm.supabase.co/storage/v1/object/public/shop-images//Simulator%20Screenshot%20-%20iPhone%2015%20-%202025-07-27%20at%2000.08.21.png']
                }));
                console.log('🧪 TEST: Set fake URLs, check debug info above');
              }}
            >
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                🧪 Set Test URLs
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{
                backgroundColor: '#3B82F6',
                padding: 8,
                borderRadius: 4,
                marginTop: 10,
                alignItems: 'center',
                flex: 1
              }}
              onPress={async () => {
                console.log('🧪 COMPREHENSIVE TEST: Starting...');
                
                // Test 1: Authentication
                console.log('🔐 Testing authentication...');
                const currentUser = await authService.getCurrentUser();
                console.log('🔐 Current user:', currentUser);
                
                // Test 2: Storage
                console.log('🗄️ Testing storage...');
                const storageTest = await authService.testStorageConnection();
                console.log('🗄️ Storage test:', storageTest);
                
                // Test 3: Upload a test image
                if (shop.logo_url && shop.logo_url.startsWith('file://')) {
                  console.log('📸 Testing image upload...');
                  const uploadResult = await authService.uploadImage(shop.logo_url, 'shops/test');
                  console.log('📸 Upload result:', uploadResult);
                }
                
                // Test 4: Create a minimal shop
                console.log('🏪 Testing shop creation...');
                const testShopData = {
                  name: 'Test Shop ' + Date.now(),
                  description: 'Test Description',
                  category: 'Beauty & Wellness',
                  address: 'Test Address',
                  city: 'Test City',
                  state: 'Test State',
                  country: 'Sweden',
                  phone: '1234567890',
                  email: 'test@test.com',
                  logo_url: validAllImages[0] || '',
                  images: validAllImages,
                  image_url: validAllImages[0] || '',
                  business_hours: shop.business_hours || [],
                  services: shop.services || [],
                  staff: shop.staff || [],
                  discounts: shop.discounts || [],
                  special_days: shop.special_days || []
                };
                
                console.log('🏪 Test shop data:', testShopData);
                const createResult = await authService.createProviderBusiness(testShopData);
                console.log('🏪 Create result:', createResult);
                
                if (createResult.success) {
                  Alert.alert('Success!', 'Test shop created successfully');
                } else {
                  Alert.alert('Error', 'Shop creation failed: ' + createResult.error);
                }
              }}
            >
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                🧪 Full Test
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: 'orange',
                padding: 5,
                borderRadius: 3,
                margin: 2,
              }}
              onPress={() => {
                console.log('🔍 DEBUG: Current shop state:');
                console.log('  - Shop object:', JSON.stringify(shop, null, 2));
                console.log('  - Logo URL:', shop.logo_url);
                console.log('  - Images array:', shop.images);
                console.log('  - Image count:', shop.images?.length || 0);
                
                const imageInfo = `Logo URL: ${shop.logo_url || 'None'}\n\nImages (${shop.images?.length || 0}):\n${
                  shop.images?.map((img, i) => `${i + 1}. ${img || 'empty'}`).join('\n') || 'No images'
                }`;
                
                Alert.alert('Shop Image State', imageInfo);
              }}
            >
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                🔍 Debug Test
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: 'purple',
                padding: 5,
                borderRadius: 3,
                margin: 2,
              }}
              onPress={async () => {
                console.log('🔍 VERIFY DATABASE: Starting integrated verification...');
                
                const verifyResult = await integratedShopService.verifySetup();
                console.log('🔍 Integrated verification result:', verifyResult);
                
                if (verifyResult.success) {
                  Alert.alert('Integrated Setup OK!', verifyResult.message || 'Integrated shop system is working correctly');
                } else {
                  Alert.alert('Integrated Setup Issues', verifyResult.error || 'Integrated setup has issues. Check console for details.');
                }
              }}
            >
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                🔍 Verify DB
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: 'orange',
                padding: 5,
                borderRadius: 3,
                margin: 2,
              }}
              onPress={async () => {
                Alert.alert(
                  'Storage Setup Required', 
                  'Automatic bucket creation is disabled due to RLS policy conflicts.\n\nTo fix storage:\n1. Go to Supabase SQL Editor\n2. Run: fix_storage_rls_complete.sql\n3. This will create buckets and fix policies',
                  [
                    { text: 'OK', style: 'default' },
                    { 
                      text: 'Show Console', 
                      onPress: () => {
                        console.log('📋 STORAGE FIX INSTRUCTIONS:');
                        console.log('1. Open Supabase Dashboard');
                        console.log('2. Go to SQL Editor');
                        console.log('3. Run file: fix_storage_rls_complete.sql');
                        console.log('4. This will fix all storage bucket and RLS issues');
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                ⚠️ Fix Storage
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shop Photos Grid */}
        <View style={styles.photosSection}>
          <Text style={styles.imageLabel}>Shop Photos (up to 5)</Text>
          <View style={styles.photosGrid}>
            {[0, 1, 2, 3, 4].map((index) => {
              const imageUrl = shop.images?.[index];
              const hasImage = imageUrl && imageUrl.trim() !== '';
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.photoBox}
                  onPress={() => pickShopImage(index)}
                >
                  {hasImage ? (
                    <Image source={{ uri: imageUrl }} style={styles.photoImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={20} color="#9CA3AF" />
                      <Text style={styles.photoPlaceholderText}>Add</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Basic Information */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shop Name *</Text>
          <TextInput
            ref={shopNameRef}
            style={styles.input}
            value={shop.name}
            onChangeText={(text) => {
              console.log('📝 Shop name onChange called with:', text);
              console.log('📝 Text length:', text.length);
              // Update the ref value immediately
              formValues.current.name = text;
              console.log('📝 Updated formValues.name:', formValues.current.name);
              // Also update state for UI
              setShop(prev => {
                console.log('📝 Previous state name:', prev.name);
                const newState = { ...prev, name: text };
                console.log('📝 New state name:', newState.name);
                return newState;
              });
            }}
            placeholder="Enter shop name"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <TouchableOpacity 
            style={styles.selectInput}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.selectInputText}>{shop.category}</Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={shop.description}
            onChangeText={(text) => {
              console.log('📝 Shop description onChange called with:', text);
              formValues.current.description = text;
              setShop(prev => ({ ...prev, description: text }));
            }}
            placeholder="Describe your shop and services"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={shop.phone}
            onChangeText={(text) => {
              formValues.current.phone = text;
              setShop(prev => ({ ...prev, phone: text }));
            }}
            placeholder="+46 XX XXX XX XX"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={shop.email}
            onChangeText={(text) => {
              formValues.current.email = text;
              setShop(prev => ({ ...prev, email: text }));
            }}
            placeholder="shop@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website (Optional)</Text>
          <TextInput
            style={styles.input}
            value={shop.website_url}
            onChangeText={(text) => setShop(prev => ({ ...prev, website_url: text }))}
            placeholder="https://yourwebsite.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Address Information */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Address</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Street Address *</Text>
          <TextInput
            style={styles.input}
            value={shop.address}
            onChangeText={(text) => {
              console.log('🏠 Address onChange called with:', text);
              console.log('🏠 Address text length:', text.length);
              // Update the ref value immediately
              formValues.current.address = text;
              console.log('🏠 Updated formValues.address:', formValues.current.address);
              // Also update state for UI
              setShop(prev => {
                console.log('🏠 Previous address state:', prev.address);
                const newState = { ...prev, address: text };
                console.log('🏠 New address state:', newState.address);
                return newState;
              });
            }}
            placeholder="Street address"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              value={shop.city}
              onChangeText={(text) => setShop(prev => ({ ...prev, city: text }))}
              placeholder="City"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
            <Text style={styles.label}>State/Province</Text>
            <TextInput
              style={styles.input}
              value={shop.state}
              onChangeText={(text) => setShop(prev => ({ ...prev, state: text }))}
              placeholder="State"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            value={shop.country}
            onChangeText={(text) => setShop(prev => ({ ...prev, country: text }))}
            placeholder="Country"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>
    </View>
  );

  const renderScheduleTab = () => (
    <View style={styles.section}>
      {/* Business Hours */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Regular Business Hours</Text>
        
        {(shop.business_hours || []).map((hours) => (
          <View key={hours.day} style={styles.dayRow}>
            <View style={styles.dayInfo}>
              <Text style={styles.dayName}>{hours.day}</Text>
              <Switch
                value={hours.isOpen}
                onValueChange={(value) => updateBusinessHours(hours.day, 'isOpen', value)}
                trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                thumbColor={hours.isOpen ? '#F59E0B' : '#9CA3AF'}
              />
            </View>
            
            {hours.isOpen && (
              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimePicker(hours.day, 'open')}
                >
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.timeText}>{hours.openTime}</Text>
                </TouchableOpacity>
                
                <Text style={styles.timeSeparator}>to</Text>
                
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimePicker(hours.day, 'close')}
                >
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.timeText}>{hours.closeTime}</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {!hours.isOpen && (
              <Text style={styles.closedText}>Closed</Text>
            )}
          </View>
        ))}
      </View>

      {/* Special Days */}
      <View style={styles.formSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Special Days & Holidays</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openSpecialDayModal()}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {shop.special_days && shop.special_days.length > 0 ? (
          <FlatList
            data={shop.special_days}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const typeConfig = SPECIAL_DAY_TYPES.find(t => t.id === item.type);
              return (
                <View style={styles.specialDayCard}>
                  <View style={styles.specialDayHeader}>
                    <View style={[styles.specialDayIcon, { backgroundColor: typeConfig?.color + '20' }]}>
                      <Ionicons 
                        name={typeConfig?.icon as any || 'calendar'} 
                        size={20} 
                        color={typeConfig?.color || '#6B7280'} 
                      />
                    </View>
                    <View style={styles.specialDayInfo}>
                      <Text style={styles.specialDayName}>{item.name}</Text>
                      <Text style={styles.specialDayDate}>
                        {new Date(item.date).toLocaleDateString()}
                        {item.recurring !== 'none' && ` • ${RECURRING_OPTIONS.find(r => r.id === item.recurring)?.name}`}
                      </Text>
                      <Text style={styles.specialDayType}>{typeConfig?.name}</Text>
                    </View>
                    <View style={styles.specialDayActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => openSpecialDayModal(item)}
                      >
                        <Ionicons name="create-outline" size={18} color="#F59E0B" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => deleteSpecialDay(item.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {item.isOpen && item.openTime && item.closeTime && (
                    <View style={styles.specialDayHours}>
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text style={styles.specialDayHoursText}>
                        {item.openTime} - {item.closeTime}
                      </Text>
                    </View>
                  )}
                  
                  {item.description && (
                    <Text style={styles.specialDayDescription}>{item.description}</Text>
                  )}
                </View>
              );
            }}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Special Days Added</Text>
            <Text style={styles.emptyStateDescription}>
              Add holidays, special hours, or events to keep customers informed
            </Text>
          </View>
        )}
      </View>

      {/* Timezone Selection */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Timezone</Text>
        <TouchableOpacity 
          style={styles.selectInput}
          onPress={() => setShowTimezoneModal(true)}
        >
          <Text style={styles.selectInputText}>{shop.timezone}</Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderServices = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Services</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openServiceModal()}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      {shop.services && shop.services.length > 0 ? (
        <FlatList
          data={shop.services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{item.name}</Text>
                  <Text style={styles.serviceCategory}>{item.category}</Text>
                </View>
                <View style={styles.serviceActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openServiceModal(item)}
                  >
                    <Ionicons name="create-outline" size={18} color="#F59E0B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteService(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={styles.serviceDescription}>{item.description}</Text>
              
              <View style={styles.serviceDetails}>
                <View style={styles.serviceDetail}>
                  <Ionicons name="cash-outline" size={16} color="#10B981" />
                  <Text style={styles.serviceDetailText}>${item.price}</Text>
                </View>
                <View style={styles.serviceDetail}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.serviceDetailText}>{item.duration} min</Text>
                </View>
                <View style={styles.serviceDetail}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }
                  ]} />
                  <Text style={styles.serviceDetailText}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              
              {item.discount && (
                <View style={styles.discountBadge}>
                  <Ionicons name="pricetag" size={14} color="#F59E0B" />
                  <Text style={styles.discountText}>{item.discount.description}</Text>
                </View>
              )}
            </View>
          )}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No Services Added</Text>
          <Text style={styles.emptyStateDescription}>
            Add services that your shop offers to attract customers
          </Text>
        </View>
      )}
    </View>
  );

  const renderStaff = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Staff Members</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openStaffModal()}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      {shop.staff && shop.staff.length > 0 ? (
        <FlatList
          data={shop.staff}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.staffCard}>
              <View style={styles.staffHeader}>
                <View style={styles.staffAvatar}>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={24} color="#6B7280" />
                  )}
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{item.name}</Text>
                  <Text style={styles.staffRole}>{item.role}</Text>
                  <Text style={styles.staffContact}>{item.email}</Text>
                </View>
                <View style={styles.staffActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openStaffModal(item)}
                  >
                    <Ionicons name="create-outline" size={18} color="#F59E0B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteStaff(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {item.specialties && item.specialties.length > 0 && (
                <View style={styles.specialties}>
                  <Text style={styles.specialtiesLabel}>Specialties:</Text>
                  <View style={styles.specialtyTags}>
                    {item.specialties.filter(specialty => specialty && specialty.trim()).map((specialty, index) => (
                      <View key={index} style={styles.specialtyTag}>
                        <Text style={styles.specialtyText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {item.bio && (
                <Text style={styles.staffBio}>{item.bio}</Text>
              )}
              
              <View style={styles.staffDetails}>
                {item.experience_years && item.experience_years > 0 && (
                  <View style={styles.staffDetail}>
                    <Ionicons name="star-outline" size={16} color="#F59E0B" />
                    <Text style={styles.staffDetailText}>{item.experience_years} years exp.</Text>
                  </View>
                )}
                <View style={styles.staffDetail}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }
                  ]} />
                  <Text style={styles.staffDetailText}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>
          )}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No Staff Members Added</Text>
          <Text style={styles.emptyStateDescription}>
            Add staff members to assign them to services and manage your team
          </Text>
        </View>
      )}
    </View>
  );

  const renderDiscounts = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Discounts & Offers</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openDiscountModal()}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Discount</Text>
        </TouchableOpacity>
      </View>

      {shop.discounts && shop.discounts.length > 0 ? (
        <FlatList
          data={shop.discounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.discountCard}>
              <View style={styles.discountHeader}>
                <View style={styles.discountIcon}>
                  <Ionicons 
                    name={DISCOUNT_TYPES.find(t => t.id === item.type)?.icon as any || 'pricetag'} 
                    size={20} 
                    color="#F59E0B" 
                  />
                </View>
                <View style={styles.discountInfo}>
                  <Text style={styles.discountTitle}>{item.description}</Text>
                  <Text style={styles.discountType}>
                    {DISCOUNT_TYPES.find(t => t.id === item.type)?.name}
                  </Text>
                </View>
                <View style={styles.discountActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openDiscountModal(item)}
                  >
                    <Ionicons name="create-outline" size={18} color="#F59E0B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteDiscount(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.discountDetails}>
                <View style={styles.discountDetail}>
                  <Text style={styles.discountValue}>
                    {item.type === 'percentage' ? `${item.value}%` : `$${item.value}`}
                  </Text>
                  <Text style={styles.discountLabel}>Discount</Text>
                </View>
                <View style={styles.discountDetail}>
                  <Text style={styles.discountValue}>{item.used_count}</Text>
                  <Text style={styles.discountLabel}>Used</Text>
                </View>
                <View style={styles.discountDetail}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }
                  ]} />
                  <Text style={styles.discountLabel}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.discountPeriod}>
                <Text style={styles.discountPeriodText}>
                  Valid: {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="pricetag-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No Discounts Created</Text>
          <Text style={styles.emptyStateDescription}>
            Create attractive discounts to boost customer engagement
          </Text>
        </View>
      )}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      {/* Booking Settings */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Booking Settings</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Advance Booking Days</Text>
          <TextInput
            style={styles.input}
            value={shop.advance_booking_days.toString()}
            onChangeText={(text) => setShop(prev => ({ 
              ...prev, 
              advance_booking_days: parseInt(text) || 30 
            }))}
            placeholder="30"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
          <Text style={styles.inputHint}>How many days in advance customers can book</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Slot Duration (min)</Text>
            <TextInput
              style={styles.input}
              value={shop.slot_duration.toString()}
              onChangeText={(text) => setShop(prev => ({ 
                ...prev, 
                slot_duration: parseInt(text) || 60 
              }))}
              placeholder="60"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
            <Text style={styles.label}>Buffer Time (min)</Text>
            <TextInput
              style={styles.input}
              value={shop.buffer_time.toString()}
              onChangeText={(text) => setShop(prev => ({ 
                ...prev, 
                buffer_time: parseInt(text) || 15 
              }))}
              placeholder="15"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* Shop Status */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Shop Status</Text>
        
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Auto-approve Bookings</Text>
            <Text style={styles.switchDescription}>
              Automatically approve booking requests
            </Text>
          </View>
          <Switch
            value={shop.auto_approval}
            onValueChange={(value) => setShop(prev => ({ ...prev, auto_approval: value }))}
            trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
            thumbColor={shop.auto_approval ? '#F59E0B' : '#9CA3AF'}
          />
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Shop Active</Text>
            <Text style={styles.switchDescription}>
              Enable to make your shop visible to customers
            </Text>
          </View>
          <Switch
            value={shop.is_active}
            onValueChange={(value) => setShop(prev => ({ ...prev, is_active: value }))}
            trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
            thumbColor={shop.is_active ? '#F59E0B' : '#9CA3AF'}
          />
        </View>
      </View>
    </View>
  );

  // Modal components (keeping existing modals and adding new ones)
  const renderSpecialDayModal = () => (
    <Modal
      visible={showSpecialDayModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSpecialDayModal(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardView}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSpecialDay ? 'Edit Special Day' : 'Add Special Day'}
              </Text>
              <TouchableOpacity onPress={() => setShowSpecialDayModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={specialDayForm.name}
                  onChangeText={(text) => setSpecialDayForm(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Christmas Day, Extended Hours"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.selectInputText}>
                    {specialDayForm.date ? new Date(specialDayForm.date).toLocaleDateString() : 'Select Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.specialDayTypeGrid}>
                  {SPECIAL_DAY_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.specialDayTypeOption,
                        specialDayForm.type === type.id && styles.selectedSpecialDayType
                      ]}
                      onPress={() => setSpecialDayForm(prev => ({ ...prev, type: type.id as any }))}
                    >
                      <Ionicons 
                        name={type.icon as any} 
                        size={20} 
                        color={specialDayForm.type === type.id ? type.color : '#6B7280'} 
                      />
                      <Text style={[
                        styles.specialDayTypeName,
                        specialDayForm.type === type.id && { color: type.color }
                      ]}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Open on this day</Text>
                  <Text style={styles.switchDescription}>
                    Enable if the shop will be open
                  </Text>
                </View>
                <Switch
                  value={specialDayForm.isOpen}
                  onValueChange={(value) => setSpecialDayForm(prev => ({ ...prev, isOpen: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                  thumbColor={specialDayForm.isOpen ? '#F59E0B' : '#9CA3AF'}
                />
              </View>

              {specialDayForm.isOpen && (
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.label}>Open Time</Text>
                    <TextInput
                      style={styles.input}
                      value={specialDayForm.openTime}
                      onChangeText={(text) => setSpecialDayForm(prev => ({ ...prev, openTime: text }))}
                      placeholder="09:00"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                    <Text style={styles.label}>Close Time</Text>
                    <TextInput
                      style={styles.input}
                      value={specialDayForm.closeTime}
                      onChangeText={(text) => setSpecialDayForm(prev => ({ ...prev, closeTime: text }))}
                      placeholder="17:00"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Recurring</Text>
                <FlatList
                  data={RECURRING_OPTIONS}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.recurringOption,
                        specialDayForm.recurring === item.id && styles.selectedRecurringOption
                      ]}
                      onPress={() => setSpecialDayForm(prev => ({ ...prev, recurring: item.id as any }))}
                    >
                      <Text style={[
                        styles.recurringOptionText,
                        specialDayForm.recurring === item.id && styles.selectedRecurringOptionText
                      ]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={specialDayForm.description}
                  onChangeText={(text) => setSpecialDayForm(prev => ({ ...prev, description: text }))}
                  placeholder="Additional notes or details"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSpecialDayModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={saveSpecialDay}
              >
                <Text style={styles.saveModalButtonText}>
                  {editingSpecialDay ? 'Update' : 'Add'} Special Day
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  // Keep existing modals but add new ones
  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={SERVICE_CATEGORIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  shop.category === item && styles.selectedCategoryOption
                ]}
                onPress={() => {
                  setShop(prev => ({ ...prev, category: item }));
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[
                  styles.categoryOptionText,
                  shop.category === item && styles.selectedCategoryOptionText
                ]}>
                  {item}
                </Text>
                {shop.category === item && (
                  <Ionicons name="checkmark" size={20} color="#F59E0B" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderTimezoneModal = () => (
    <Modal
      visible={showTimezoneModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTimezoneModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Timezone</Text>
            <TouchableOpacity onPress={() => setShowTimezoneModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={TIMEZONES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  shop.timezone === item && styles.selectedCategoryOption
                ]}
                onPress={() => {
                  setShop(prev => ({ ...prev, timezone: item }));
                  setShowTimezoneModal(false);
                }}
              >
                <Text style={[
                  styles.categoryOptionText,
                  shop.timezone === item && styles.selectedCategoryOptionText
                ]}>
                  {item}
                </Text>
                {shop.timezone === item && (
                  <Ionicons name="checkmark" size={20} color="#F59E0B" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderServiceModal = () => (
    <Modal
      visible={showServiceModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowServiceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardView}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Edit Service' : 'Add Service'}
              </Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Name *</Text>
                <TextInput
                  style={styles.input}
                  value={serviceForm.name}
                  onChangeText={(text) => setServiceForm(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Haircut, Massage, Repair"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={serviceForm.description}
                  onChangeText={(text) => setServiceForm(prev => ({ ...prev, description: text }))}
                  placeholder="Describe what this service includes"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    value={serviceForm.price?.toString()}
                    onChangeText={(text) => setServiceForm(prev => ({ 
                      ...prev, 
                      price: parseFloat(text) || 0 
                    }))}
                    placeholder="25.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                  <Text style={styles.label}>Duration (min)</Text>
                  <TextInput
                    style={styles.input}
                    value={serviceForm.duration?.toString()}
                    onChangeText={(text) => setServiceForm(prev => ({ 
                      ...prev, 
                      duration: parseInt(text) || 60 
                    }))}
                    placeholder="60"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={serviceForm.category}
                  onChangeText={(text) => setServiceForm(prev => ({ ...prev, category: text }))}
                  placeholder="Service category"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign Staff</Text>
                <View style={styles.staffSelection}>
                  {shop.staff && shop.staff.length > 0 ? (
                    shop.staff.map((staff) => (
                      <TouchableOpacity
                        key={staff.id}
                        style={[
                          styles.staffOption,
                          serviceForm.assigned_staff?.includes(staff.id) && styles.selectedStaffOption
                        ]}
                        onPress={() => {
                          const assignedStaff = serviceForm.assigned_staff || [];
                          if (assignedStaff.includes(staff.id)) {
                            setServiceForm(prev => ({
                              ...prev,
                              assigned_staff: assignedStaff.filter(id => id !== staff.id)
                            }));
                          } else {
                            setServiceForm(prev => ({
                              ...prev,
                              assigned_staff: [...assignedStaff, staff.id]
                            }));
                          }
                        }}
                      >
                        <View style={styles.staffOptionContent}>
                          <Text style={[
                            styles.staffOptionName,
                            serviceForm.assigned_staff?.includes(staff.id) && styles.selectedStaffOptionText
                          ]}>
                            {staff.name}
                          </Text>
                          <Text style={styles.staffOptionRole}>{staff.role}</Text>
                        </View>
                        {serviceForm.assigned_staff?.includes(staff.id) && (
                          <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noStaffText}>No staff members available. Add staff first in the Staff tab.</Text>
                  )}
                </View>
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Active Service</Text>
                  <Text style={styles.switchDescription}>
                    Enable to make this service bookable
                  </Text>
                </View>
                <Switch
                  value={serviceForm.is_active}
                  onValueChange={(value) => setServiceForm(prev => ({ ...prev, is_active: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                  thumbColor={serviceForm.is_active ? '#F59E0B' : '#9CA3AF'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowServiceModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={saveService}
              >
                <Text style={styles.saveModalButtonText}>
                  {editingService ? 'Update' : 'Add'} Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const renderDiscountModal = () => (
    <Modal
      visible={showDiscountModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDiscountModal(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardView}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDiscount ? 'Edit Discount' : 'Add Discount'}
              </Text>
              <TouchableOpacity onPress={() => setShowDiscountModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Discount Description *</Text>
                <TextInput
                  style={styles.input}
                  value={discountForm.description}
                  onChangeText={(text) => setDiscountForm(prev => ({ ...prev, description: text }))}
                  placeholder="e.g., 20% off all services, Buy 2 Get 1 Free"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Discount Type</Text>
                <View style={styles.discountTypeGrid}>
                  {DISCOUNT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.discountTypeOption,
                        discountForm.type === type.id && styles.selectedDiscountType
                      ]}
                      onPress={() => setDiscountForm(prev => ({ ...prev, type: type.id as any }))}
                    >
                      <Ionicons 
                        name={type.icon as any} 
                        size={20} 
                        color={discountForm.type === type.id ? '#F59E0B' : '#6B7280'} 
                      />
                      <Text style={[
                        styles.discountTypeName,
                        discountForm.type === type.id && styles.selectedDiscountTypeName
                      ]}>
                        {type.name}
                      </Text>
                      <Text style={styles.discountTypeDesc}>{type.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Value *</Text>
                  <TextInput
                    style={styles.input}
                    value={discountForm.value?.toString()}
                    onChangeText={(text) => setDiscountForm(prev => ({ 
                      ...prev, 
                      value: parseFloat(text) || 0 
                    }))}
                    placeholder={discountForm.type === 'percentage' ? '20' : '10.00'}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                  <Text style={styles.label}>Usage Limit</Text>
                  <TextInput
                    style={styles.input}
                    value={discountForm.usage_limit?.toString()}
                    onChangeText={(text) => setDiscountForm(prev => ({ 
                      ...prev, 
                      usage_limit: parseInt(text) || undefined 
                    }))}
                    placeholder="Unlimited"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Start Date</Text>
                  <TextInput
                    style={styles.input}
                    value={discountForm.start_date}
                    onChangeText={(text) => setDiscountForm(prev => ({ ...prev, start_date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                  <Text style={styles.label}>End Date</Text>
                  <TextInput
                    style={styles.input}
                    value={discountForm.end_date}
                    onChangeText={(text) => setDiscountForm(prev => ({ ...prev, end_date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Active Discount</Text>
                  <Text style={styles.switchDescription}>
                    Enable to make this discount available
                  </Text>
                </View>
                <Switch
                  value={discountForm.is_active}
                  onValueChange={(value) => setDiscountForm(prev => ({ ...prev, is_active: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                  thumbColor={discountForm.is_active ? '#F59E0B' : '#9CA3AF'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDiscountModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={saveDiscount}
              >
                <Text style={styles.saveModalButtonText}>
                  {editingDiscount ? 'Update' : 'Add'} Discount
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const renderStaffModal = () => (
    <Modal
      visible={showStaffModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStaffModal(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardView}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </Text>
              <TouchableOpacity onPress={() => setShowStaffModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Profile Photo */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Profile Photo</Text>
                <View style={styles.avatarUploadSection}>
                  <TouchableOpacity 
                    style={styles.avatarUpload}
                    onPress={pickStaffAvatar}
                  >
                    {staffForm.avatar_url ? (
                      <Image source={{ uri: staffForm.avatar_url }} style={styles.avatarPreview} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                        <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={staffForm.name}
                  onChangeText={(text) => setStaffForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  value={staffForm.email}
                  onChangeText={(text) => setStaffForm(prev => ({ ...prev, email: text }))}
                  placeholder="staff@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={staffForm.phone}
                  onChangeText={(text) => setStaffForm(prev => ({ ...prev, phone: text }))}
                  placeholder="+46 XX XXX XX XX"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Role/Position</Text>
                <TextInput
                  style={styles.input}
                  value={staffForm.role}
                  onChangeText={(text) => setStaffForm(prev => ({ ...prev, role: text }))}
                  placeholder="e.g., Manager, Technician, Specialist, Cleaner"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.inputHint}>Enter the job title or role for this staff member</Text>
                
                {/* Role suggestions */}
                <View style={styles.suggestionSection}>
                  <Text style={styles.suggestionLabel}>Quick suggestions:</Text>
                  <View style={styles.suggestionTags}>
                    {ROLE_SUGGESTIONS.map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={styles.suggestionTag}
                        onPress={() => setStaffForm(prev => ({ ...prev, role }))}
                      >
                        <Text style={styles.suggestionTagText}>{role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Specialties</Text>
                
                {/* Add new specialty */}
                <View style={styles.addSpecialtyRow}>
                  <TextInput
                    style={[styles.input, styles.specialtyInput]}
                    value={newSpecialty}
                    onChangeText={setNewSpecialty}
                    placeholder="Enter specialty (e.g., Deep Cleaning, Repair Work)"
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={addSpecialty}
                  />
                  <TouchableOpacity
                    style={styles.addSpecialtyButton}
                    onPress={addSpecialty}
                    disabled={!newSpecialty.trim()}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                {/* Current specialties */}
                {staffForm.specialties && staffForm.specialties.length > 0 && (
                  <View style={styles.currentSpecialties}>
                    <Text style={styles.currentSpecialtiesLabel}>Current Specialties:</Text>
                    <View style={styles.specialtyTags}>
                      {staffForm.specialties.filter(specialty => specialty && specialty.trim()).map((specialty, index) => (
                        <View key={index} style={styles.specialtyTagWithRemove}>
                          <Text style={styles.specialtyText}>{specialty}</Text>
                          <TouchableOpacity
                            style={styles.removeSpecialtyButton}
                            onPress={() => removeSpecialty(specialty)}
                          >
                            <Ionicons name="close" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {/* Specialty suggestions */}
                <View style={styles.suggestionSection}>
                  <Text style={styles.suggestionLabel}>Common specialties:</Text>
                  <View style={styles.suggestionTags}>
                    {SPECIALTY_SUGGESTIONS.filter(s => !(staffForm.specialties || []).includes(s)).map((specialty) => (
                      <TouchableOpacity
                        key={specialty}
                        style={styles.suggestionTag}
                        onPress={() => addSuggestedSpecialty(specialty)}
                      >
                        <Text style={styles.suggestionTagText}>{specialty}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Experience (years)</Text>
                  <TextInput
                    style={styles.input}
                    value={staffForm.experience_years ? staffForm.experience_years.toString() : ''}
                    onChangeText={(text) => setStaffForm(prev => ({ 
                      ...prev, 
                      experience_years: parseInt(text) || 0 
                    }))}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bio (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={staffForm.bio}
                  onChangeText={(text) => setStaffForm(prev => ({ ...prev, bio: text }))}
                  placeholder="Brief description about this staff member"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Active Staff Member</Text>
                  <Text style={styles.switchDescription}>
                    Enable to make this staff member available for bookings
                  </Text>
                </View>
                <Switch
                  value={staffForm.is_active}
                  onValueChange={(value) => setStaffForm(prev => ({ ...prev, is_active: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                  thumbColor={staffForm.is_active ? '#F59E0B' : '#9CA3AF'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowStaffModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={saveStaff}
              >
                <Text style={styles.saveModalButtonText}>
                  {editingStaff ? 'Update' : 'Add'} Staff
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const renderCustomTimePicker = () => (
    <Modal
      visible={showCustomTimePicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCustomTimePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.timePickerModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <TouchableOpacity onPress={() => setShowCustomTimePicker(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={generateTimeSlots()}
            numColumns={4}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const currentTime = editingTimeSlot ? 
                (editingTimeSlot.type === 'open' ? 
                  shop.business_hours.find(h => h.day === editingTimeSlot.day)?.openTime :
                  shop.business_hours.find(h => h.day === editingTimeSlot.day)?.closeTime
                ) : '';
              
              return (
                <TouchableOpacity
                  style={[
                    styles.timeSlot,
                    currentTime === item && styles.selectedTimeSlot
                  ]}
                  onPress={() => selectTime(item)}
                >
                  <Text style={[
                    styles.timeSlotText,
                    currentTime === item && styles.selectedTimeSlotText
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            style={styles.timeSlotGrid}
          />
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FEFCE8" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading shop details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEFCE8" />
      
      {renderTabBar()}
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'basic' && renderBasicInfo()}
        {activeTab === 'schedule' && renderScheduleTab()}
        {activeTab === 'staff' && renderStaff()}
        {activeTab === 'services' && renderServices()}
        {activeTab === 'discounts' && renderDiscounts()}
        {activeTab === 'settings' && renderSettings()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setSpecialDayForm(prev => ({ 
                ...prev, 
                date: selectedDate.toISOString().split('T')[0] 
              }));
            }
          }}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* Modals */}
      {renderCategoryModal()}
      {renderTimezoneModal()}
      {renderSpecialDayModal()}
      {renderServiceModal()}
      {renderDiscountModal()}
      {renderStaffModal()}
      {renderCustomTimePicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Save Button
  headerSaveButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    minWidth: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  headerSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Tab Bar (updated to 6 tabs)
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    marginHorizontal: 1,
  },
  activeTabItem: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 3,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  section: {
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  
  // Forms
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectInputText: {
    fontSize: 16,
    color: '#1F2937',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 12,
  },

  // Switch
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  switchDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },

  // Images
  imageSection: {
    marginBottom: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photosSection: {
    marginTop: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoBox: {
    width: (width - 64) / 3 - 4,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  photoPlaceholderText: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Business Hours
  dayRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  timeSeparator: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  closedText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
    textAlign: 'right',
  },

  // Special Days
  specialDayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  specialDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  specialDayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  specialDayInfo: {
    flex: 1,
  },
  specialDayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  specialDayDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  specialDayType: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  specialDayActions: {
    flexDirection: 'row',
  },
  specialDayHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  specialDayHoursText: {
    fontSize: 13,
    color: '#6B7280',
  },
  specialDayDescription: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
  },

  // Special Day Modal
  specialDayTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialDayTypeOption: {
    flex: 1,
    minWidth: (width - 64) / 2 - 4,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 6,
  },
  selectedSpecialDayType: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  specialDayTypeName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
  recurringOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  selectedRecurringOption: {
    backgroundColor: '#FEF3C7',
  },
  recurringOptionText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  selectedRecurringOptionText: {
    color: '#92400E',
    fontWeight: '600',
  },

  // Buttons
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  // Cards (keep existing service and discount card styles)
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  serviceCategory: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  serviceActions: {
    flexDirection: 'row',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDetailText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  discountText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 4,
    fontWeight: '500',
  },

  // Discount Cards (keep existing styles)
  discountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  discountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  discountInfo: {
    flex: 1,
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  discountType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  discountActions: {
    flexDirection: 'row',
  },
  discountDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 8,
  },
  discountDetail: {
    alignItems: 'center',
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  discountLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  discountPeriod: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
  },
  discountPeriodText: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveModalButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Category Modal
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedCategoryOption: {
    backgroundColor: '#FEF3C7',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  selectedCategoryOptionText: {
    fontWeight: '600',
    color: '#92400E',
  },

  // Discount Type Grid
  discountTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  discountTypeOption: {
    flex: 1,
    minWidth: (width - 64) / 2 - 4,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 4,
  },
  selectedDiscountType: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  discountTypeName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
  selectedDiscountTypeName: {
    color: '#92400E',
    fontWeight: '600',
  },
  discountTypeDesc: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Staff Cards
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  staffAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  staffRole: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
    marginTop: 2,
  },
  staffContact: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  staffActions: {
    flexDirection: 'row',
  },
  specialties: {
    marginBottom: 12,
  },
  specialtiesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  specialtyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specialtyTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specialtyText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  staffBio: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  staffDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  staffDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  staffDetailText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Staff Selection in Service Modal
  staffSelection: {
    gap: 8,
  },
  staffOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStaffOption: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  staffOptionContent: {
    flex: 1,
  },
  staffOptionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  selectedStaffOptionText: {
    color: '#92400E',
    fontWeight: '600',
  },
  staffOptionRole: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  noStaffText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },

  // Note: Role and specialty selection styles removed as we now use manual input

  // Custom Time Picker
  timePickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    marginTop: 'auto',
  },
  timeSlotGrid: {
    padding: 20,
    maxHeight: 400,
  },
  timeSlot: {
    flex: 1,
    margin: 4,
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedTimeSlot: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Staff Avatar Upload
  avatarUploadSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarUpload: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  avatarPreview: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Specialty Management
  addSpecialtyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  specialtyInput: {
    flex: 1,
  },
  addSpecialtyButton: {
    backgroundColor: '#F59E0B',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentSpecialties: {
    marginBottom: 12,
  },
  currentSpecialtiesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  specialtyTagWithRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  removeSpecialtyButton: {
    padding: 2,
  },

  // Suggestions
  suggestionSection: {
    marginTop: 8,
  },
  suggestionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  suggestionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionTagText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },

  // Bottom spacing
  bottomSpacing: {
    height: 32,
  },
});

export default ShopDetailsScreen;