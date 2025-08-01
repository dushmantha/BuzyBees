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
import normalizedShopService, { supabase } from '../../lib/supabase/normalized';
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
  location_type: 'in_house' | 'on_location';
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
  timezone?: string;
  priority?: number;
  description?: string;
}

export interface SpecialDay {
  id?: string;
  date: string;
  name: string;
  type: 'holiday' | 'special_hours' | 'closed' | 'event';
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  description?: string;
  recurring?: 'none' | 'weekly' | 'monthly' | 'yearly';
  recurring_until?: string;
  color?: string;
  priority?: number;
  is_active?: boolean;
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
  
  // State to track if we've loaded data from the database
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Debug: Log the existing shop data structure and test storage
  React.useEffect(() => {
    if (existingShop) {
      
    }

    // Test storage connection when component loads (non-blocking)
    const testStorage = async () => {
      try {
        
        const result = await integratedShopService.setupStorage();
        
      } catch (error) {
        
      }
    };
    
    testStorage();
  }, [existingShop]);

  // Helper function to deduplicate arrays by ID
  const deduplicateById = <T extends { id: string }>(array: T[]): T[] => {
    const seen = new Set<string>();
    return array.filter(item => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  };

  // Function to refresh shop data from database for editing mode  
  const refreshShopData = async (source = 'manual') => {
    if (!isEditing || !existingShop?.id) {
      return;
    }
    
    setIsRefreshing(true);
    
    try {
        // Try to get shop data using the normalized service
        const result = await normalizedShopService.getShopById(existingShop.id);
        
        // If normalized service fails, try direct queries for each data type
        if (!result.success) {
          
          try {
            // Load staff data
            const { data: staffData, error: staffError } = await supabase
              .from('shop_staff')
              .select('*')
              .eq('shop_id', existingShop.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false });

            // Load services data (show ALL services - active and inactive)
            const { data: servicesData, error: servicesError } = await supabase
              .from('shop_services')
              .select('*')
              .eq('shop_id', existingShop.id)
              .order('created_at', { ascending: false });

            // Load discounts data
            const { data: discountsData, error: discountsError } = await supabase
              .from('shop_discounts')
              .select('*')
              .eq('shop_id', existingShop.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false });
            // Update shop state with all the data we could fetch (deduplicated)
            setShop(prev => ({
              ...prev,
              staff: !staffError ? deduplicateById(staffData || []) : prev.staff,
              services: !servicesError ? deduplicateById(servicesData || []) : prev.services,
              discounts: !discountsError ? deduplicateById(discountsData || []) : prev.discounts
            }));
            
            return; // Exit early after direct queries
          } catch (directError) {
            
            // Continue to check normalized service result below
          }
        }
        if (result.success && result.data) {
          
          // Log the actual staff data to see what we're getting
          if (result.data.staff && result.data.staff.length > 0) {
            
          }
          
          setShop(prev => {
            const updatedShop = {
              ...prev,
              staff: deduplicateById(result.data!.staff || []),
              services: deduplicateById(result.data!.services || []),
              discounts: deduplicateById(result.data!.discounts || [])
            };
            
            return updatedShop;
          });
        } else {
          
          // Set empty arrays if no data is available at all
          setShop(prev => ({
            ...prev,
            staff: prev.staff?.length > 0 ? prev.staff : [],
            services: prev.services?.length > 0 ? prev.services : [],
            discounts: prev.discounts?.length > 0 ? prev.discounts : []
          }));
        }
      } catch (error) {
        
        // Keep existing data on error
      } finally {
        setIsRefreshing(false);
        setHasLoadedData(true);  // Mark as loaded after any refresh
      }
  };
  // hasLoadedData state is declared above
  
  // AUTO-LOAD DATA: Load immediately when we detect editing mode
  React.useEffect(() => {
    if (!isEditing || !existingShop?.id) return;
    
    // Create an async function to load data
    const autoLoadData = async () => {
      try {
        // Method 1: Try the normalized service
        const shopResult = await normalizedShopService.getShopById(existingShop.id);
        
        if (shopResult.success && shopResult.data) {
          
          // Update the state (deduplicated)
          setShop(prev => {
            const updated = {
              ...prev,
              staff: deduplicateById(shopResult.data!.staff || []),
              services: deduplicateById(shopResult.data!.services || []),
              discounts: deduplicateById(shopResult.data!.discounts || [])
            };
            
            return updated;
          });
          
          setHasLoadedData(true);
          return; // Success, exit early
        }
        
        // Method 2: Direct table queries as fallback
        const [staffRes, servicesRes, discountsRes] = await Promise.all([
          supabase.from('shop_staff').select('*').eq('shop_id', existingShop.id).eq('is_active', true).order('created_at', { ascending: false }),
          supabase.from('shop_services').select('*').eq('shop_id', existingShop.id).order('created_at', { ascending: false }), // Show ALL services
          supabase.from('shop_discounts').select('*').eq('shop_id', existingShop.id).eq('is_active', true).order('created_at', { ascending: false })
        ]);
        // Update state with whatever data we got (deduplicated)
        setShop(prev => {
          const updated = {
            ...prev,
            staff: deduplicateById(staffRes.data || []),
            services: deduplicateById(servicesRes.data || []),
            discounts: deduplicateById(discountsRes.data || [])
          };
          
          return updated;
        });
        
        setHasLoadedData(true);
        
      } catch (error) {
        
        // Even on error, mark as loaded to prevent infinite attempts
        setHasLoadedData(true);
      }
    };
    
    // Execute the auto-load immediately
    autoLoadData();
    
    // FAILSAFE: Force a refresh after 1 second if data is still empty
    const failsafeTimer = setTimeout(() => {
      if (shop.staff.length === 0 && shop.services.length === 0 && shop.discounts.length === 0) {
        
        refreshShopData('failsafe');
      }
    }, 1000);
    
    return () => clearTimeout(failsafeTimer);
    
  }, [isEditing, existingShop?.id]); // Remove hasLoadedData from dependencies!

  // Tab refresh: Refresh data when switching to staff, services, or discounts tabs
  React.useEffect(() => {
    if (!isEditing || !existingShop?.id) return;
    if (!['staff', 'services', 'discounts'].includes(activeTab)) return;
    if (!hasLoadedData) return; // Only refresh after initial load
    refreshShopData('tab-switch');
    
  }, [activeTab]); // Simplified dependencies

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
  const [shop, setShop] = useState<Shop>(() => {
    const initialShop = {
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
      services: [],  // Always start with empty arrays
      discounts: [],  // Data will be loaded from database
      staff: []  // This ensures fresh data is always loaded
    };
    return initialShop;
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'staff' | 'services' | 'discounts' | 'settings'>('basic');
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState({
    isUploading: false,
    currentImage: 0,
    totalImages: 0,
    currentImageName: '',
    uploadedImages: 0,
    message: ''
  });
  
  // Debug: Log progress state changes
  React.useEffect(() => {
    
  }, [uploadProgress]);
  
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
    city: existingShop?.city || '',
    state: existingShop?.state || '',
    country: existingShop?.country || 'Sweden',
    phone: existingShop?.phone || '',
    email: existingShop?.email || ''
  });

  // Service form state
  const [serviceForm, setServiceForm] = useState<Partial<Service>>({
    name: '', description: '', price: 0, duration: 60, category: '', assigned_staff: [], location_type: 'in_house', is_active: true
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
  
  // Force re-render state for avatar
  const [avatarRefresh, setAvatarRefresh] = useState(0);

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

  // Helper function to safely get avatar URL (handles array corruption)
  const getSafeAvatarUrl = (avatar_url: any): string | undefined => {
    if (!avatar_url) return undefined;
    if (typeof avatar_url === 'string') return avatar_url;
    if (Array.isArray(avatar_url)) {
      console.warn('🚨 Avatar URL is array, using first item:', avatar_url);
      return avatar_url.length > 0 ? avatar_url[0] : undefined;
    }
    return undefined;
  };

  // Load complete shop data if editing
  useEffect(() => {
    const loadCompleteShopData = async () => {
      if (isEditing && existingShop && existingShop.id) {
        
        setIsLoading(true);
        
        try {
          // Try to fetch complete shop data from database using normalized service
          console.log('🚨 FETCHING: Getting shop data for ID:', existingShop.id);
          const response = await normalizedShopService.getShopById(existingShop.id);
          console.log('🚨 FETCHED: Response:', response);
          
          if (response.success && response.data) {
            const completeShop = response.data;
            console.log('🚨 FETCHED: Complete shop data:', completeShop);
            console.log('🚨 FETCHED: Business hours from DB:', completeShop.business_hours);
            
            
            if (completeShop) {
              // Map the complete shop data to our expected format
              const mappedShop = {
                ...existingShop, // Start with the basic data
                // Override with complete data if available
                images: completeShop.images || [],
                services: completeShop.services || [],
                staff: completeShop.staff || [],
                business_hours: (() => {
                  console.log('🚨 LOADING: completeShop.business_hours:', completeShop.business_hours);
                  console.log('🚨 LOADING: existingShop.business_hours:', existingShop.business_hours);
                  
                  const dbBusinessHours = completeShop.business_hours || existingShop.business_hours;
                  
                  // Convert database format to frontend format if we have database data
                  let businessHours;
                  if (dbBusinessHours && dbBusinessHours.length > 0) {
                    // Check if it's already in frontend format (has isOpen field) or database format (has is_open field)
                    const firstEntry = dbBusinessHours[0];
                    if (firstEntry.hasOwnProperty('is_open')) {
                      // Database format - convert to frontend format
                      businessHours = dbBusinessHours.map((hour: any) => ({
                        day: hour.day,
                        isOpen: hour.is_open ?? true,
                        openTime: hour.open_time || '09:00',
                        closeTime: hour.close_time || '17:00',
                        isAlwaysOpen: hour.is_always_open || false
                      }));
                      console.log('🚨 CONVERTED: Database format to frontend format');
                    } else {
                      // Already in frontend format
                      businessHours = dbBusinessHours;
                      console.log('🚨 LOADED: Already in frontend format');
                    }
                  } else {
                    // No database data - use defaults
                    businessHours = createDefaultBusinessHours();
                    console.log('🚨 CREATED: Default business hours');
                  }
                  
                  // Deduplicate business hours by day (keep the first occurrence of each day)
                  const deduplicatedBusinessHours = businessHours.filter((hour: any, index: number, self: any[]) => 
                    index === self.findIndex((h: any) => h.day === hour.day)
                  );
                  
                  console.log('🚨 LOADING: Final business_hours:', deduplicatedBusinessHours);
                  console.log('🚨 DEDUPLICATION: Original count:', businessHours.length, 'Final count:', deduplicatedBusinessHours.length);
                  
                  
                  return deduplicatedBusinessHours;
                })(),
                special_days: completeShop.special_days || [],
                discounts: completeShop.discounts || [],
                logo_url: completeShop.logo_url || existingShop.logo_url || '',
                timezone: completeShop.timezone || existingShop.timezone || 'Europe/Stockholm',
                advance_booking_days: completeShop.advance_booking_days || existingShop.advance_booking_days || 30,
                slot_duration: completeShop.slot_duration || existingShop.slot_duration || 60,
                buffer_time: completeShop.buffer_time || existingShop.buffer_time || 15,
                auto_approval: completeShop.auto_approval ?? existingShop.auto_approval ?? true,
                // Location fields
                city: completeShop.city || existingShop.city || '',
                state: completeShop.state || existingShop.state || '',
                country: completeShop.country || existingShop.country || 'Sweden',
              };
              
              setShop(mappedShop);
              // Also update formValues ref
              formValues.current = {
                name: mappedShop.name || '',
                description: mappedShop.description || '',
                address: mappedShop.address || '',
                city: mappedShop.city || '',
                state: mappedShop.state || '',
                country: mappedShop.country || 'Sweden',
                phone: mappedShop.phone || '',
                email: mappedShop.email || ''
              };
            } else {
              
              setShop(existingShop);
              // Also update formValues ref
              formValues.current = {
                name: existingShop.name || '',
                description: existingShop.description || '',
                address: existingShop.address || '',
                city: existingShop.city || '',
                state: existingShop.state || '',
                country: existingShop.country || 'Sweden',
                phone: existingShop.phone || '',
                email: existingShop.email || ''
              };
            }
          } else {
            
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
    
    // Use the formValues ref as the primary source of truth, with fallback to state
    const currentName = formValues.current.name || shop.name || '';
    const trimmedName = currentName.trim();
    
    if (!trimmedName || trimmedName.length === 0) {
      
      setActiveTab('basic'); // Switch to basic tab to show the error
      Alert.alert('Validation Error', 'Shop name is required');
      return false;
    }
    
    // Check address validation using formValues
    const currentAddress = formValues.current.address || shop.address || '';
    const trimmedAddress = currentAddress.trim();
    
    if (!trimmedAddress || trimmedAddress.length === 0) {
      
      Alert.alert('Validation Error', 'Address is required');
      return false;
    }
    
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
      
      // Check if any images are actually selected
      const hasImages = shop.images && shop.images.length > 0 && shop.images.some(img => img && img.trim() !== '');
      const hasLogo = shop.logo_url && shop.logo_url.trim() !== '';
      
      if (!hasImages && !hasLogo) {
        
      } else {
        
      }

      // Check storage connection before proceeding (but don't block shop creation)
      
      const storageTest = await integratedShopService.setupStorage();
      // Also try verifying with integrated service
      
      const integratedTest = await integratedShopService.verifySetup();
      // Try to initialize schema/storage if needed
      if (!storageTest.success && !integratedTest.success) {
        
        const initResult = await integratedShopService.initializeSchema();
        
      }
      
      // Determine storage availability - prioritize storage accessibility over bucket existence
      let storageAvailable = false;
      
      // Check if storage is accessible (even if buckets are missing)
      if (storageTest.success && storageTest.data?.storage_accessible) {
        
        storageAvailable = true;
        
        // Log bucket status for debugging
        if (storageTest.data.shop_images_bucket && storageTest.data.user_avatars_bucket) {
          
        } else {
        }
      } else if (integratedTest.success && integratedTest.data?.storage_buckets) {
        
        storageAvailable = true;
      } else {
        
        storageAvailable = false;
      }
    
    // Force a longer delay and multiple state checks to ensure synchronization
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force React to flush any pending state updates
    await new Promise(resolve => {
      setShop(prevShop => {
        
        return prevShop; // No change, just force a re-render
      });
      setTimeout(resolve, 100);
    });
    
    // Re-check the current shop state before validation
    try {
      const validationResult = validateBasicInfo();
      
      if (!validationResult) {
        
        return;
      }
    } catch (validationError) {
      
      Alert.alert('Validation Error', 'Failed to validate shop data: ' + (validationError.message || 'Unknown error'));
      return;
    }
    
    // Get the latest shop state (in case of async state updates)
    const currentShop = await new Promise<typeof shop>(resolve => {
      setShop(prevShop => {
        resolve(prevShop);
        return prevShop;
      });
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
    if (currentShop.images && currentShop.images.length > 0) {
      currentShop.images.forEach((img, i) => {
        const valid = isValidImageUrl(img);
        
      });
    }
    
    if (!hasValidImages && !hasValidLogo) {
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
    
    // Show initial message about what we're doing
    if (hasImages || hasLogo) {
      
    }
      
      // Initialize upload progress if there are any images to upload
      // Use currentShop instead of shop to ensure we have the latest state
      const hasLogoToUpload = currentShop.logo_url && currentShop.logo_url.startsWith('file://');
      const localImages = (currentShop.images || []).filter(img => img && img.startsWith('file://'));
      const totalImagesToUpload = (hasLogoToUpload ? 1 : 0) + localImages.length;
      
      // Debug: Check if images are properly stored
      
      if (shop.images && Array.isArray(shop.images)) {
        shop.images.forEach((img, index) => {
          
        });
      }
      
      if (shop.logo_url) {
        
      }
      
      
      if (totalImagesToUpload > 0) {
        
        setUploadProgress({
          isUploading: true,
          currentImage: 0,
          totalImages: totalImagesToUpload,
          currentImageName: '',
          uploadedImages: 0,
          message: `Starting upload of ${totalImagesToUpload} image(s)...`
        });
        
        // Small delay to show the initial progress
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        
      }
      
      // Check each image in the array
      if (shop.images && shop.images.length > 0) {
        shop.images.forEach((img, index) => {
          
        });
      } else {
        
      }
      
      // Upload logo if it's a local URI (and storage is available)
      let uploadedLogoUrl = currentShop.logo_url;
      if (currentShop.logo_url && currentShop.logo_url.startsWith('file://')) {
        if (storageAvailable) {
          
          // Update progress for logo upload
          setUploadProgress(prev => ({
            ...prev,
            currentImage: 1,
            currentImageName: 'Logo',
            message: 'Uploading shop logo...'
          }));
          
          const logoResult = await integratedShopService.uploadImage(currentShop.logo_url, 'shops/logos');
          if (logoResult.success && logoResult.data) {
            uploadedLogoUrl = logoResult.data;
            
            // Update progress - logo completed
            setUploadProgress(prev => ({
              ...prev,
              uploadedImages: 1,
              message: '✅ Logo uploaded successfully!'
            }));
          } else {
            uploadedLogoUrl = ''; // Set to empty string instead of keeping local URI
            
            // Update progress - logo failed
            setUploadProgress(prev => ({
              ...prev,
              message: '❌ Logo upload failed: ' + (logoResult.error || 'Unknown error')
            }));
          }
        } else {
          
          uploadedLogoUrl = '';
        }
      } else if (currentShop.logo_url && !currentShop.logo_url.startsWith('http')) {
        
        uploadedLogoUrl = '';
      } else {
        
      }
      
      // Upload shop images that are local URIs
      let uploadedImageUrls: string[] = [];
      const existingImages = (currentShop.images || []).filter(img => img && !img.startsWith('file://'));
      if (localImages.length > 0) {
        if (storageAvailable) {
          
          // Use already calculated values
          let uploadedCount = hasLogoToUpload ? 1 : 0; // Start counting from logo if uploaded
          
          // Upload images one by one to show progress
          for (let i = 0; i < localImages.length; i++) {
            const imageUri = localImages[i];
            
            // Update progress for current image
            setUploadProgress(prev => ({
              ...prev,
              currentImage: uploadedCount + 1,
              currentImageName: `Image ${i + 1}`,
              uploadedImages: uploadedCount,
              message: `Uploading image ${i + 1} of ${localImages.length}...`
            }));
            const imageResult = await integratedShopService.uploadImage(imageUri, 'shops/images');
            
            if (imageResult.success && imageResult.data) {
              uploadedImageUrls.push(imageResult.data);
              uploadedCount++;
              // Update progress - image completed
              setUploadProgress(prev => ({
                ...prev,
                uploadedImages: uploadedCount,
                message: `✅ Image ${i + 1} uploaded successfully!`
              }));
            } else {
              // Update progress - image failed
              setUploadProgress(prev => ({
                ...prev,
                message: `❌ Image ${i + 1} failed: ${imageResult.error || 'Unknown error'}`
              }));
            }
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Final upload completion message
          const totalUploaded = uploadedImageUrls.length + (uploadedLogoUrl && uploadedLogoUrl !== currentShop.logo_url ? 1 : 0);
          if (totalUploaded > 0) {
            setUploadProgress(prev => ({
              ...prev,
              message: `🎉 All uploads complete! ${totalUploaded} image(s) uploaded successfully.`
            }));
            
            // Show completion message briefly
            setTimeout(() => {
              setUploadProgress(prev => ({
                ...prev,
                isUploading: false
              }));
            }, 2000);
          }
        } else {
          
        }
      } else {
        
      }
      
      // Combine existing and newly uploaded images
      const allImages = [...existingImages, ...uploadedImageUrls];
      
      // Use the main image (logo or first shop image) as image_url
      const mainImageUrl = uploadedLogoUrl || allImages[0] || '';
      
      // Validate all image URLs before storing
      const validAllImages = allImages.filter(url => url && url.trim() !== '' && url.startsWith('http'));
      const validLogoUrl = (uploadedLogoUrl && uploadedLogoUrl.startsWith('http')) ? uploadedLogoUrl : '';
      const validMainImageUrl = (mainImageUrl && mainImageUrl.startsWith('http')) ? mainImageUrl : '';
      validAllImages.forEach((url, index) => {
        
      });
      if (validLogoUrl) {
        
      }
      
      // Extract basic business hours for backward compatibility
      const getBusinessHours = (businessHours: any[]) => {
        const mondayHours = businessHours.find(h => h.day === 'Monday');
        return {
          start: mondayHours?.isOpen ? mondayHours.openTime : '09:00',
          end: mondayHours?.isOpen ? mondayHours.closeTime : '17:00'
        };
      };

      const hours = getBusinessHours(currentShop.business_hours || []);

      // Use formValues ref as primary source of truth (consistent with validation)
      // Ensure we have valid data before proceeding
      const safeName = formValues.current.name || currentShop.name || '';
      const safeDescription = formValues.current.description || currentShop.description || '';
      const safeAddress = formValues.current.address || currentShop.address || '';
      const safePhone = formValues.current.phone || currentShop.phone || '';
      const safeEmail = formValues.current.email || currentShop.email || '';
      
      const shopData = {
        name: safeName.trim(),
        description: safeDescription.trim(),
        category: currentShop.category || 'Beauty & Wellness',
        address: safeAddress.trim(),
        city: (formValues.current.city || currentShop.city || '').trim(),
        state: (formValues.current.state || currentShop.state || '').trim(),
        country: (formValues.current.country || currentShop.country || 'Sweden').trim(),
        phone: safePhone.trim(),
        email: safeEmail.trim(),
        website_url: currentShop.website_url?.trim() || null,
        image_url: validMainImageUrl,
        business_hours_start: hours.start,
        business_hours_end: hours.end,
        is_active: currentShop.is_active,
        // Enhanced data fields
        logo_url: validLogoUrl,
        images: validAllImages, // Send as array, will be handled properly by auth service
        business_hours: currentShop.business_hours || [],
        special_days: currentShop.special_days || [],
        services: shop.services || [],
        staff: shop.staff || [],
        discounts: shop.discounts || [],
        timezone: currentShop.timezone || 'Europe/Stockholm',
        advance_booking_days: currentShop.advance_booking_days || 30,
        slot_duration: currentShop.slot_duration || 60,
        buffer_time: currentShop.buffer_time || 15,
        auto_approval: currentShop.auto_approval ?? true
      };
      // CRITICAL DEBUG: Show what business hours data we're sending
      console.log('🚨 FRONTEND: About to call updateShop');
      console.log('🚨 FRONTEND: currentShop.business_hours:', JSON.stringify(currentShop.business_hours, null, 2));
      console.log('🚨 FRONTEND: shopData.business_hours:', JSON.stringify(shopData.business_hours, null, 2));
      

      let result;
      if (isEditing && shop.id) {
        
        result = await normalizedShopService.updateShop(shop.id, shopData);
      } else {
        
        // Extra safety check
        if (!shopData) {
          
          throw new Error('CRITICAL: shopData is undefined before service call');
        }
        if (!shopData.name || shopData.name.trim() === '') {
          
          throw new Error('CRITICAL: shopData.name is empty before service call');
        }
        // Make absolutely sure we have valid data
        if (!shopData) {
          
          throw new Error('shopData became undefined before service call');
        }
        
        // Create a fresh copy to avoid any reference issues
        const finalShopData = { ...shopData };
        
        result = await normalizedShopService.createShop(finalShopData);
        
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

        // Create detailed success message about images
        let successMessage = isEditing ? 'Shop updated successfully!' : 'Shop created successfully!';
        let imageStatusMessage = '';
        
        // Check image upload status - handle both new and existing images
        // More robust checking for valid image URLs - include both local file URIs and HTTP URLs
        const isValidImageUrl = (url) => {
          if (!url || typeof url !== 'string') return false;
          const trimmed = url.trim();
          if (trimmed === '') return false;
          // Accept both local file URIs and HTTP URLs (for both new and existing images)
          return trimmed.startsWith('file://') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('supabase');
        };
        
        const existingImages = shop.images?.filter(img => isValidImageUrl(img)) || [];
        const existingLogo = isValidImageUrl(shop.logo_url) ? 1 : 0;
        const newImages = validAllImages?.length || 0;
        const newLogo = isValidImageUrl(validLogoUrl) ? 1 : 0;
        
        const totalExistingImages = existingImages.length + existingLogo;
        const totalNewImages = newImages + newLogo;
        const totalFinalImages = totalExistingImages + totalNewImages;
        
        // Debug each image URL individually
        if (shop.images && shop.images.length > 0) {
          shop.images.forEach((img, index) => {
            
          });
        }
        if (shop.logo_url) {
          
        }
        
        if (isEditing) {
          // For editing existing shops
          // Fallback: if we can't count properly, check if there are ANY images present
          const hasValidImages = shop.images && shop.images.some(img => isValidImageUrl(img));
          const hasValidLogo = isValidImageUrl(shop.logo_url);
          const hasAnyImages = hasValidImages || hasValidLogo;
          
          if (totalFinalImages === 0 && !hasAnyImages) {
            imageStatusMessage = '';
          } else if (totalFinalImages === 0 && hasAnyImages) {
            // Images exist but are already uploaded (HTTP URLs, not file:// URIs)
            const validImageCount = (shop.images?.filter(img => isValidImageUrl(img)).length || 0) + (hasValidLogo ? 1 : 0);
            imageStatusMessage = '';
          } else if (totalNewImages > 0) {
            imageStatusMessage = '';
          } else {
            imageStatusMessage = '';
          }
        } else {
          // For creating new shops
          // Check if images were selected but not uploaded due to storage issues
          const hasValidImages = shop.images && shop.images.some(img => isValidImageUrl(img));
          const hasValidLogo = isValidImageUrl(shop.logo_url);
          const hasAnyImages = hasValidImages || hasValidLogo;
          
          if (totalNewImages === 0 && !hasAnyImages) {
            imageStatusMessage = '';
          } else if (totalNewImages === 0 && hasAnyImages) {
            // Images exist but are already uploaded (HTTP URLs, not new file:// URIs)
            const validImageCount = (shop.images?.filter(img => isValidImageUrl(img)).length || 0) + (hasValidLogo ? 1 : 0);
            imageStatusMessage = '';
          } else {
            imageStatusMessage = '';
          }
        }
        
        // Add storage status if there were upload issues during this session
        const localImages = shop.images?.filter(img => img && img.startsWith('file://')) || [];
        const localLogo = shop.logo_url && shop.logo_url.startsWith('file://') ? 1 : 0;
        const totalLocalImages = localImages.length + localLogo;
        
        
        const fullMessage = successMessage;
        
        Alert.alert(
          'Success',
          fullMessage,
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
      // Check if this is the "Shop data is required" error
      if (error?.message?.includes('Shop data is required') || error?.message?.includes('undefined or null')) {
        Alert.alert('Data Error', 'There was an issue with the shop data. Please check all required fields and try again.');
      } else {
        Alert.alert('Save Error', error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    } finally {
      setIsSaving(false);
      // Reset upload progress
      setUploadProgress({
        isUploading: false,
        currentImage: 0,
        totalImages: 0,
        currentImageName: '',
        uploadedImages: 0,
        message: ''
      });
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
      
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        
        if (asset.uri) {
          try {
            // Skip compression for now and use original URI directly
            const imageUri = asset.uri;
            if (type === 'logo') {
              
              setShop(prev => {
                const updated = { ...prev, logo_url: imageUri };
                return updated;
              });
              
            } else {
              
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                // Ensure array is long enough
                while (newImages.length <= selectedImageIndex) {
                  newImages.push('');
                }
                newImages[selectedImageIndex] = imageUri;
                const updated = { ...prev, images: newImages };
                
                return updated;
              });
              
              // Verify state was set (delayed check)
              setTimeout(() => {
                
              }, 100);
            }
          } catch (error) {
            
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
          
        }
      } else {
        
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
            console.log('🔄 Setting staff avatar immediately:', asset.uri);
            // Show the image immediately first
            setStaffForm(prev => {
              console.log('🔄 Staff form before update:', prev.avatar_url);
              const updated = { ...prev, avatar_url: asset.uri! };
              console.log('🔄 Staff form after update:', updated.avatar_url);
              return updated;
            });
            
            // Force re-render
            setAvatarRefresh(prev => prev + 1);
            
            // Then compress avatar image in background
            try {
              const compressionResult = await compressAvatarImage(asset.uri);
              console.log('🗜️ Compression result:', compressionResult);
              
              if (compressionResult.success && compressionResult.uri) {
                console.log('✅ Updating with compressed version:', compressionResult.uri);
                // Update with compressed version
                setStaffForm(prev => ({ ...prev, avatar_url: compressionResult.uri! }));
              } else {
                console.log('⚠️ Compression failed, keeping original');
              }
            } catch (compressionError) {
              console.error('❌ Compression error:', compressionError);
            }
            // If compression fails, keep the original image (already set above)
          } else {
            // Compress shop image
            const compressionResult = await compressShopImage(asset.uri);
            
            if (compressionResult.success && compressionResult.uri) {
              
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                newImages[selectedImageIndex] = compressionResult.uri!;
                return { ...prev, images: newImages };
              });
            } else {
              
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                newImages[selectedImageIndex] = asset.uri!;
                return { ...prev, images: newImages };
              });
            }
          }
        } catch (error) {
          
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
      
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        
        if (asset.uri) {
          try {
            // Use original image URI directly for now
            const imageUri = asset.uri;
            
            setShop(prev => {
              const newImages = [...(prev.images || [])];
              // Ensure the array is long enough
              while (newImages.length <= index) {
                newImages.push('');
              }
              newImages[index] = imageUri;
              
              const updated = { ...prev, images: newImages };
              return updated;
            });
            
          } catch (error) {
            
            // Fall back to original image
            
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
          
        }
      } else {
        
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
      
      return { ...prev, images: newImages };
    });
  };

  // Business hours management
  const updateBusinessHours = (day: string, field: keyof BusinessHours, value: any) => {
    console.log('🚨 updateBusinessHours called:', { day, field, value });
    
    
    setShop(prev => {
      const oldHour = prev.business_hours.find(h => h.day === day);
      console.log('🚨 Old business hour for', day, ':', oldHour);
      
      const updatedHours = prev.business_hours.map(hour =>
        hour.day === day ? { ...hour, [field]: value } : hour
      );
      
      const newHour = updatedHours.find(h => h.day === day);
      console.log('🚨 New business hour for', day, ':', newHour);
      
      return {
        ...prev,
        business_hours: updatedHours
      };
    });
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
        category: shop.category, location_type: 'in_house', is_active: true
      });
    }
    setShowServiceModal(true);
  };

  const saveService = async () => {
    if (!serviceForm.name?.trim()) {
      Alert.alert('Error', 'Service name is required');
      return;
    }
    if (!serviceForm.price || serviceForm.price <= 0) {
      Alert.alert('Error', 'Service price must be greater than 0');
      return;
    }

    const serviceData = {
      name: serviceForm.name!.trim(),
      description: serviceForm.description || '',
      price: serviceForm.price!,
      duration: serviceForm.duration || 60,
      category: serviceForm.category || shop.category,
      assigned_staff: serviceForm.assigned_staff || [],
      location_type: serviceForm.location_type || 'in_house',
      is_active: serviceForm.is_active ?? true
    };

    if (isEditing && shop.id) {
      // For existing shops, save directly to database
      
      try {
        let result;
        if (editingService) {
          
          result = await normalizedShopService.updateService(editingService.id!, serviceData);
        } else {
          
          result = await normalizedShopService.createService(shop.id, serviceData);
          
          // If normalized service fails due to missing tables, fall back to local state
          if (!result.success && result.error?.includes('does not exist')) {
            
            result = { success: true, data: serviceData };
            
            // Add to local state as fallback
            const newService: Service = {
              id: Date.now().toString(),
              ...serviceData
            };

            setShop(prev => ({
              ...prev,
              services: deduplicateById([...(prev.services || []), newService])
            }));
          }
        }
        
        if (result.success) {
          
          // Only refresh from database if it was actually saved to database (not fallback)
          if (!result.error?.includes('does not exist')) {
            await refreshShopData('after-save');
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to save service');
        }
      } catch (error) {
        
        Alert.alert('Error', 'An unexpected error occurred while saving service');
      }
    } else {
      // For new shops, add to local state (will be saved when shop is created)
      const newService: Service = {
        id: editingService?.id || Date.now().toString(),
        ...serviceData
      };

      setShop(prev => {
        const services = prev.services || [];
        let updatedShop;
        if (editingService) {
          updatedShop = {
            ...prev,
            services: services.map(s => s.id === editingService.id ? newService : s)
          };
        } else {
          updatedShop = {
            ...prev,
            services: deduplicateById([...services, newService])
          };
        }
        return updatedShop;
      });
    }

    setShowServiceModal(false);
    setEditingService(null);
  };

  const toggleServiceStatus = async (service: Service, value: boolean) => {
    try {
      const result = await normalizedShopService.updateService(service.id, { is_active: value });
      if (result.success) {
        // Update local state
        setShop(prev => ({
          ...prev,
          services: prev.services.map(s => s.id === service.id ? { ...s, is_active: value } : s)
        }));
      } else {
        Alert.alert('Error', 'Failed to update service status');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating service status');
    }
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
          onPress: async () => {
            if (isEditing && shop.id) {
              // For existing shops, delete from database
              const result = await normalizedShopService.deleteService(serviceId);
              
              if (result.success) {
                
                // Refresh the complete shop data
                await refreshShopData('after-save');
              } else {
                
                Alert.alert('Error', result.error || 'Failed to delete service');
              }
            } else {
              // For new shops, remove from local state
              
              setShop(prev => ({
                ...prev,
                services: (prev.services || []).filter(s => s.id !== serviceId)
              }));
            }
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

  const saveDiscount = async () => {
    if (!discountForm.description?.trim()) {
      Alert.alert('Error', 'Discount description is required');
      return;
    }
    if (!discountForm.value || discountForm.value <= 0) {
      Alert.alert('Error', 'Discount value must be greater than 0');
      return;
    }

    const discountData = {
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
      applicable_services: discountForm.applicable_services || [],
      conditions: discountForm.conditions || {}
    };

    if (isEditing && shop.id) {
      // For existing shops, save directly to database
      
      try {
        let result;
        if (editingDiscount) {
          
          result = await normalizedShopService.updateDiscount(editingDiscount.id!, discountData);
        } else {
          
          result = await normalizedShopService.createDiscount(shop.id, discountData);
          
          // If normalized service fails due to missing tables, fall back to local state
          if (!result.success && result.error?.includes('does not exist')) {
            
            result = { success: true, data: discountData };
            
            // Add to local state as fallback
            const newDiscount: Discount = {
              id: Date.now().toString(),
              ...discountData
            };

            setShop(prev => ({
              ...prev,
              discounts: deduplicateById([...(prev.discounts || []), newDiscount])
            }));
          }
        }
        
        if (result.success) {
          
          // Only refresh from database if it was actually saved to database (not fallback)
          if (!result.error?.includes('does not exist')) {
            await refreshShopData('after-save');
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to save discount');
        }
      } catch (error) {
        
        Alert.alert('Error', 'An unexpected error occurred while saving discount');
      }
    } else {
      // For new shops, add to local state (will be saved when shop is created)
      const newDiscount: Discount = {
        id: editingDiscount?.id || Date.now().toString(),
        ...discountData
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
            discounts: deduplicateById([...discounts, newDiscount])
          };
        }
      });
    }

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
          onPress: async () => {
            if (isEditing && shop.id) {
              // For existing shops, delete from database
              const result = await normalizedShopService.deleteDiscount(discountId);
              
              if (result.success) {
                
                // Refresh the complete shop data
                await refreshShopData('after-save');
              } else {
                
                Alert.alert('Error', result.error || 'Failed to delete discount');
              }
            } else {
              // For new shops, remove from local state
              
              setShop(prev => ({
                ...prev,
                discounts: (prev.discounts || []).filter(d => d.id !== discountId)
              }));
            }
          }
        }
      ]
    );
  };

  // Staff management
  const closeStaffModal = () => {
    console.log('🔄 Closing staff modal and resetting form');
    setShowStaffModal(false);
    setEditingStaff(null);
    
    // Reset staff form to ensure clean state
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
    setAvatarRefresh(prev => prev + 1);
    setNewSpecialty('');
  };

  const openStaffModal = (staff?: Staff) => {
    console.log('📝 Opening staff modal, staff:', staff ? 'editing' : 'new');
    if (staff) {
      setEditingStaff(staff);
      
      // Fix avatar_url if it's an array (data corruption fix)
      let avatar_url = staff.avatar_url;
      if (Array.isArray(avatar_url)) {
        console.warn('🚨 Staff avatar_url is an array, fixing:', avatar_url);
        avatar_url = avatar_url.length > 0 ? avatar_url[0] : undefined;
      }
      
      const formData = {
        ...staff,
        avatar_url: avatar_url
      };
      console.log('📝 Setting staff form to:', formData);
      setStaffForm(formData);
    } else {
      setEditingStaff(null);
      const emptyForm = {
        name: '', 
        email: '', 
        phone: '', 
        role: '', 
        specialties: [], 
        bio: '', 
        experience_years: 0, 
        is_active: true,
        avatar_url: undefined
      };
      console.log('📝 Setting empty staff form:', emptyForm);
      setStaffForm(emptyForm);
      setNewSpecialty('');
      setAvatarRefresh(prev => prev + 1); // Force avatar re-render
    }
    setShowStaffModal(true);
  };

  const saveStaff = async () => {
    if (!staffForm.name?.trim()) {
      Alert.alert('Error', 'Staff name is required');
      return;
    }
    if (!staffForm.email?.trim() || !staffForm.email.includes('@')) {
      Alert.alert('Error', 'Valid email is required');
      return;
    }

    // Ensure avatar_url is a single string, not an array
    let avatar_url = staffForm.avatar_url;
    if (Array.isArray(avatar_url)) {
      console.warn('🚨 Fixing avatar_url array before save:', avatar_url);
      avatar_url = avatar_url.length > 0 ? avatar_url[0] : undefined;
    }

    const staffData = {
      name: staffForm.name!.trim(),
      email: staffForm.email!.trim(),
      phone: staffForm.phone || '',
      role: staffForm.role || '',
      specialties: (staffForm.specialties || []).filter(s => s && s.trim()),
      avatar_url: avatar_url,
      bio: staffForm.bio?.trim() || '',
      experience_years: staffForm.experience_years || 0,
      is_active: staffForm.is_active ?? true
    };

    if (isEditing && shop.id) {
      // For existing shops, save directly to database
      try {
        let result;
        if (editingStaff) {
          
          result = await normalizedShopService.updateStaff(editingStaff.id!, staffData);
        } else {
          
          result = await normalizedShopService.createStaff(shop.id, staffData);
          
          // If normalized service fails due to missing tables, fall back to local state
          if (!result.success && result.error?.includes('does not exist')) {
            
            result = { success: true, data: staffData };
            
            // Add to local state as fallback
            const newStaff: Staff = {
              id: Date.now().toString(),
              ...staffData
            };

            setShop(prev => ({
              ...prev,
              staff: deduplicateById([...(prev.staff || []), newStaff])
            }));
          }
        }
        
        if (result.success) {
          
          // Only refresh from database if it was actually saved to database (not fallback)
          if (!result.error?.includes('does not exist')) {
            await refreshShopData('after-save');
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to save staff member');
        }
      } catch (error) {
        
        Alert.alert('Error', 'An unexpected error occurred while saving staff');
      }
    } else {
      // For new shops, add to local state (will be saved when shop is created)
      const newStaff: Staff = {
        id: editingStaff?.id || Date.now().toString(),
        ...staffData
      };

      setShop(prev => {
        
        const staff = prev.staff || [];
        let updatedShop;
        if (editingStaff) {
          updatedShop = {
            ...prev,
            staff: staff.map(s => s.id === editingStaff.id ? newStaff : s)
          };
        } else {
          updatedShop = {
            ...prev,
            staff: deduplicateById([...staff, newStaff])
          };
        }
        
        return updatedShop;
      });
    }

    closeStaffModal();
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
          onPress: async () => {
            if (isEditing && shop.id) {
              // For existing shops, delete from database
              const result = await normalizedShopService.deleteStaff(staffId);
              
              if (result.success) {
                
                // Refresh the complete shop data
                await refreshShopData('after-save');
              } else {
                
                Alert.alert('Error', result.error || 'Failed to delete staff member');
              }
            } else {
              // For new shops, remove from local state
              
              setShop(prev => ({
                ...prev,
                staff: (prev.staff || []).filter(s => s.id !== staffId)
              }));
            }
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
              // Update the ref value immediately
              formValues.current.name = text;
              
              // Also update state for UI
              setShop(prev => {
                const newState = { ...prev, name: text };
                
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
              // Update the ref value immediately
              formValues.current.address = text;
              
              // Also update state for UI
              setShop(prev => {
                
                const newState = { ...prev, address: text };
                
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
              onChangeText={(text) => {
                formValues.current.city = text;
                setShop(prev => ({ ...prev, city: text }));
              }}
              placeholder="City"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
            <Text style={styles.label}>State/Province</Text>
            <TextInput
              style={styles.input}
              value={shop.state}
              onChangeText={(text) => {
                formValues.current.state = text;
                setShop(prev => ({ ...prev, state: text }));
              }}
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
            onChangeText={(text) => {
              formValues.current.country = text;
              setShop(prev => ({ ...prev, country: text }));
            }}
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
        
        {(shop.business_hours || [])
          .filter((hours, index, self) => 
            // Remove duplicates by keeping only the first occurrence of each day
            index === self.findIndex(h => h.day === hours.day)
          )
          .map((hours, index) => (
          <View key={`business-hour-${hours.day}-${index}`} style={styles.dayRow}>
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
        <View style={styles.sectionActions}>
          {isEditing && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshShopData}
              disabled={isRefreshing}
            >
              <Ionicons name="refresh" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openServiceModal()}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Service</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : shop.services && shop.services.length > 0 ? (
        <FlatList
          data={shop.services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.serviceCard, !item.is_active && styles.inactiveServiceCard]}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceInfo}>
                  <View style={styles.serviceNameRow}>
                    <Text style={[styles.serviceName, !item.is_active && styles.inactiveServiceName]}>
                      {item.name}
                    </Text>
                    {!item.is_active && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.serviceCategory, !item.is_active && styles.inactiveServiceCategory]}>
                    {item.category}
                  </Text>
                </View>
                <View style={styles.serviceActions}>
                  <Switch
                    value={item.is_active}
                    onValueChange={(value) => toggleServiceStatus(item, value)}
                    trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                    thumbColor={item.is_active ? '#10B981' : '#9CA3AF'}
                    style={styles.serviceSwitch}
                  />
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
        <View style={styles.sectionActions}>
          {isEditing && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshShopData}
              disabled={isRefreshing}
            >
              <Ionicons name="refresh" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openStaffModal()}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Staff</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading staff...</Text>
        </View>
      ) : shop.staff && shop.staff.length > 0 ? (
        <FlatList
          data={shop.staff}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.staffCard}>
              <View style={styles.staffHeader}>
                <View style={styles.staffAvatar}>
                  {getSafeAvatarUrl(item.avatar_url) ? (
                    <Image source={{ uri: getSafeAvatarUrl(item.avatar_url)! }} style={styles.avatarImage} />
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
        <View style={styles.sectionActions}>
          {isEditing && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshShopData}
              disabled={isRefreshing}
            >
              <Ionicons name="refresh" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openDiscountModal()}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Discount</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading discounts...</Text>
        </View>
      ) : shop.discounts && shop.discounts.length > 0 ? (
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
                <Text style={styles.label}>Service Location</Text>
                <View style={styles.locationTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.locationTypeOption,
                      serviceForm.location_type === 'in_house' && styles.selectedLocationOption
                    ]}
                    onPress={() => setServiceForm(prev => ({ ...prev, location_type: 'in_house' }))}
                  >
                    <Ionicons 
                      name="storefront-outline" 
                      size={20} 
                      color={serviceForm.location_type === 'in_house' ? '#10B981' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.locationTypeText,
                      serviceForm.location_type === 'in_house' && styles.selectedLocationText
                    ]}>
                      In-House
                    </Text>
                    <Text style={styles.locationTypeDescription}>
                      Client comes to shop
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.locationTypeOption,
                      serviceForm.location_type === 'on_location' && styles.selectedLocationOption
                    ]}
                    onPress={() => setServiceForm(prev => ({ ...prev, location_type: 'on_location' }))}
                  >
                    <Ionicons 
                      name="car-outline" 
                      size={20} 
                      color={serviceForm.location_type === 'on_location' ? '#10B981' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.locationTypeText,
                      serviceForm.location_type === 'on_location' && styles.selectedLocationText
                    ]}>
                      On-Location
                    </Text>
                    <Text style={styles.locationTypeDescription}>
                      You go to client
                    </Text>
                  </TouchableOpacity>
                </View>
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
  )

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
  )

  const renderStaffModal = () => (
    <Modal
      visible={showStaffModal}
      transparent
      animationType="slide"
      onRequestClose={closeStaffModal}
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
              <TouchableOpacity onPress={closeStaffModal}>
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
                    {(() => {
                      const avatarUrl = getSafeAvatarUrl(staffForm.avatar_url);
                      console.log('🖼️ Rendering avatar (refresh:', avatarRefresh, '), staffForm.avatar_url:', staffForm.avatar_url);
                      console.log('🖼️ Safe avatar URL:', avatarUrl);
                      return avatarUrl ? (
                        <Image 
                          key={`${avatarUrl}-${avatarRefresh}`} // Force re-render when URI or refresh changes
                          source={{ uri: avatarUrl }} 
                          style={styles.avatarPreview}
                          onLoad={() => console.log('✅ Avatar image loaded successfully')}
                          onError={(error) => console.error('❌ Avatar image failed to load:', error)}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                          <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                        </View>
                      );
                    })()}
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
                onPress={closeStaffModal}
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
            style={styles.timeSlotGrid}
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
            }
          }
          />
        </View>
      </View>
    </Modal>
  );

  // Main component render
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
      
      {/* Upload Progress Indicator */}
      {uploadProgress.isUploading && (
        <View style={styles.uploadProgressContainer}>
          <View style={styles.uploadProgressHeader}>
            <Text style={styles.uploadProgressTitle}>
              📸 Uploading Images ({uploadProgress.uploadedImages}/{uploadProgress.totalImages})
            </Text>
            <Text style={styles.uploadProgressMessage}>
              {uploadProgress.message}
            </Text>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  width: `${(uploadProgress.uploadedImages / uploadProgress.totalImages) * 100}%` 
                }
              ]} 
            />
          </View>
          
          {/* Current Image Info */}
          {uploadProgress.currentImageName && (
            <Text style={styles.currentImageText}>
              {uploadProgress.currentImageName}
            </Text>
          )}
        </View>
      )}
      
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
  )
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
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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

  // Upload Progress Styles
  uploadProgressContainer: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  uploadProgressHeader: {
    marginBottom: 12,
  },
  uploadProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  uploadProgressMessage: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  currentImageText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },

  // Location Type Styles
  locationTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  locationTypeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FEFCE8',
    alignItems: 'center',
    gap: 8,
  },
  selectedLocationType: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  locationTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedLocationTypeTitle: {
    color: '#92400E',
  },
  locationTypeDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedLocationTypeDesc: {
    color: '#92400E',
  },

  // Inactive service styles
  inactiveServiceCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.9,
  },
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inactiveServiceName: {
    color: '#6B7280',
  },
  inactiveServiceCategory: {
    color: '#9CA3AF',
  },
  inactiveBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default ShopDetailsScreen;