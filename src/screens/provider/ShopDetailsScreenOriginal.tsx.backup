import React, { useState, useEffect, useMemo } from 'react';
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
  ActionSheetIOS,
  PermissionsAndroid,
  SafeAreaView,
  StatusBar,
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

const { width } = Dimensions.get('window');

// API Configuration
const API_BASE_URL = 'https://your-api-domain.com/api/v1';

// API Endpoints
const API_ENDPOINTS = {
  SHOPS: `${API_BASE_URL}/shops`,
  SERVICES: `${API_BASE_URL}/services`,
  UPLOAD_IMAGE: `${API_BASE_URL}/upload/image`,
  UPLOAD_LOGO: `${API_BASE_URL}/upload/logo`,
  UPLOAD_SERVICE_IMAGE: `${API_BASE_URL}/upload/service-image`,
};

// Type definitions
type ProviderStackParamList = {
  ShopDetails: {
    shop?: Shop;
    onSave?: (shop: Shop) => void;
  };
};

type ShopDetailsRouteProp = RouteProp<ProviderStackParamList, 'ShopDetails'>;
type ShopDetailsNavigationProp = StackNavigationProp<ProviderStackParamList, 'ShopDetails'>;

export interface TimeSlot {
  start: string;
  end: string;
  isBooked?: boolean;
  bookingId?: string;
}

export interface BusinessHours {
  start: string;
  end: string;
  isOpen: boolean;
}

export interface DailySchedule {
  date: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  timeSlots: TimeSlot[];
  isHoliday: boolean;
  holidayName?: string;
  note?: string;
  maxBookings?: number;
}

export interface WeeklyTemplate {
  [key: string]: BusinessHours; // Monday, Tuesday, etc.
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category_id: string;
  image: string;
  rating: number;
  reviews_count: number;
  professional_name: string;
  location: string;
  certificate_images: string[];
  before_after_images: string[];
  payment_methods: string[];
  is_favorite: boolean;
  created_at: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  isActive: boolean;
  imageUrl?: string;
  logoUrl?: string;
  services?: Service[];
  weeklyTemplate: WeeklyTemplate;
  dailySchedules: DailySchedule[];
  advanceBookingDays: number;
  slotDuration: number;
  bufferTime: number;
  autoApproval: boolean;
  timeZone: string;
  created_at?: string;
  updated_at?: string;
}

// API Service Class
class ShopAPI {
  private static async makeRequest(url: string, options: RequestInit = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  private static getAuthToken(): string {
    return 'your-auth-token-here';
  }

  static async createShop(shopData: Omit<Shop, 'id' | 'created_at' | 'updated_at'>): Promise<Shop> {
    const response = await this.makeRequest(API_ENDPOINTS.SHOPS, {
      method: 'POST',
      body: JSON.stringify(shopData),
    });
    return response.data;
  }

  static async updateShop(shopId: string, shopData: Partial<Shop>): Promise<Shop> {
    const response = await this.makeRequest(`${API_ENDPOINTS.SHOPS}/${shopId}`, {
      method: 'PUT',
      body: JSON.stringify(shopData),
    });
    return response.data;
  }

  static async getShop(shopId: string): Promise<Shop> {
    const response = await this.makeRequest(`${API_ENDPOINTS.SHOPS}/${shopId}`);
    return response.data;
  }

  static async getProviderShops(providerId: string): Promise<Shop[]> {
    const response = await this.makeRequest(`${API_ENDPOINTS.SHOPS}?provider_id=${providerId}`);
    return response.data;
  }

  static async hideShop(shopId: string): Promise<void> {
    await this.makeRequest(`${API_ENDPOINTS.SHOPS}/${shopId}/hide`, {
      method: 'PATCH',
    });
  }

  static async deleteShop(shopId: string): Promise<void> {
    await this.makeRequest(`${API_ENDPOINTS.SHOPS}/${shopId}`, {
      method: 'DELETE',
    });
  }

  static async toggleShopVisibility(shopId: string, isVisible: boolean): Promise<Shop> {
    const response = await this.makeRequest(`${API_ENDPOINTS.SHOPS}/${shopId}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ is_visible: isVisible }),
    });
    return response.data;
  }

  static async uploadShopImage(imageUri: string, shopId?: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'shop-image.jpg',
    } as any);
    
    if (shopId) {
      formData.append('shop_id', shopId);
    }

    const response = await fetch(API_ENDPOINTS.UPLOAD_IMAGE, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const result = await response.json();
    return result.data.url;
  }

  static async uploadShopLogo(imageUri: string, shopId?: string): Promise<string> {
    const formData = new FormData();
    formData.append('logo', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'shop-logo.jpg',
    } as any);
    
    if (shopId) {
      formData.append('shop_id', shopId);
    }

    const response = await fetch(API_ENDPOINTS.UPLOAD_LOGO, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload logo');
    }

    const result = await response.json();
    return result.data.url;
  }
}

// Image Picker Hook
const useImagePicker = () => {
  const [isLoading, setIsLoading] = useState(false);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission error:', err);
        return false;
      }
    }
    return true;
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        let permissions = [];
        
        if (Platform.Version >= 33) {
          permissions = [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES];
        } else {
          permissions = [
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ];
        }

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        return Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn('Storage permission error:', err);
        return false;
      }
    }
    return true;
  };

  const pickFromLibrary = async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant storage permission to select photos.',
          [{ text: 'OK' }]
        );
        return null;
      }

      const options: ImagePickerOptions = {
        mediaType: 'photo' as MediaType,
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        includeBase64: false,
      };

      return new Promise((resolve) => {
        launchImageLibrary(options, (response: ImagePickerResponse) => {
          setIsLoading(false);
          
          if (response.didCancel) {
            console.log('User cancelled image picker');
            resolve(null);
            return;
          }
          
          if (response.errorMessage) {
            console.error('ImagePicker Error:', response.errorMessage);
            Alert.alert('Error', 'Failed to select image: ' + response.errorMessage);
            resolve(null);
            return;
          }
          
          if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            const uri = asset.uri;
            
            if (!uri) {
              Alert.alert('Error', 'Failed to get image URI');
              resolve(null);
              return;
            }
            
            resolve(uri);
          } else {
            console.error('No assets in response');
            resolve(null);
          }
        });
      });
    } catch (error) {
      setIsLoading(false);
      console.error('Error picking from library:', error);
      Alert.alert('Error', 'Failed to access photo library');
      return null;
    }
  };

  const takePhoto = async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant camera permission to take photos.',
          [{ text: 'OK' }]
        );
        return null;
      }

      const options: ImagePickerOptions = {
        mediaType: 'photo' as MediaType,
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        includeBase64: false,
        saveToPhotos: true,
      };

      return new Promise((resolve) => {
        launchCamera(options, (response: ImagePickerResponse) => {
          setIsLoading(false);
          
          if (response.didCancel) {
            console.log('User cancelled camera');
            resolve(null);
            return;
          }
          
          if (response.errorMessage) {
            console.error('Camera Error:', response.errorMessage);
            Alert.alert('Error', 'Failed to take photo: ' + response.errorMessage);
            resolve(null);
            return;
          }
          
          if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            const uri = asset.uri;
            
            if (!uri) {
              Alert.alert('Error', 'Failed to get photo URI');
              resolve(null);
              return;
            }
            
            resolve(uri);
          } else {
            console.error('No assets in camera response');
            resolve(null);
          }
        });
      });
    } catch (error) {
      setIsLoading(false);
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to access camera');
      return null;
    }
  };

  const showImagePickerOptions = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const options = [
        {
          text: 'Cancel',
          style: 'cancel' as const,
          onPress: () => resolve(null),
        },
        {
          text: 'Take Photo',
          onPress: async () => {
            const uri = await takePhoto();
            resolve(uri);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const uri = await pickFromLibrary();
            resolve(uri);
          },
        },
      ];

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: options.map(option => option.text),
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex !== undefined && buttonIndex < options.length) {
              options[buttonIndex].onPress();
            }
          }
        );
      } else {
        Alert.alert('Select Image', 'Choose an option', options);
      }
    });
  };

  return {
    showImagePickerOptions,
    pickFromLibrary,
    takePhoto,
    isLoading,
  };
};

const ShopDetailsScreen: React.FC = () => {
  const navigation = useNavigation<ShopDetailsNavigationProp>();
  const route = useRoute<ShopDetailsRouteProp>();
  const { shop, onSave } = route.params || {};
  const { showImagePickerOptions, isLoading: imagePickerLoading } = useImagePicker();

  const [isEditing, setIsEditing] = useState(!shop);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [images, setImages] = useState<string[]>(shop?.imageUrl ? [shop.imageUrl] : []);
  const [logoUri, setLogoUri] = useState<string | null>(shop?.logoUrl || null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDaySchedule, setSelectedDaySchedule] = useState<DailySchedule | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentView, setCurrentView] = useState<'calendar' | 'week'>('calendar');
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const [formData, setFormData] = useState<Omit<Shop, 'id' | 'isActive'>>({
    name: shop?.name || '',
    address: shop?.address || '',
    phone: shop?.phone || '',
    email: shop?.email || '',
    description: shop?.description || '',
    logoUrl: shop?.logoUrl || '',
    services: shop?.services || [],
    weeklyTemplate: shop?.weeklyTemplate || {
      Monday: { start: '09:00', end: '18:00', isOpen: true },
      Tuesday: { start: '09:00', end: '18:00', isOpen: true },
      Wednesday: { start: '09:00', end: '18:00', isOpen: true },
      Thursday: { start: '09:00', end: '18:00', isOpen: true },
      Friday: { start: '09:00', end: '18:00', isOpen: true },
      Saturday: { start: '10:00', end: '16:00', isOpen: true },
      Sunday: { start: '10:00', end: '16:00', isOpen: false },
    },
    dailySchedules: shop?.dailySchedules || [],
    advanceBookingDays: shop?.advanceBookingDays || 30,
    slotDuration: shop?.slotDuration || 60,
    bufferTime: shop?.bufferTime || 15,
    autoApproval: shop?.autoApproval ?? true,
    timeZone: shop?.timeZone || 'UTC',
  });

  const [isActive, setIsActive] = useState(shop?.isActive ?? true);
  const [newService, setNewService] = useState<Partial<Service>>({
    name: '',
    description: '',
    price: 0,
    duration: 60,
    professional_name: '',
    location: formData.address,
    rating: 0,
    reviews_count: 0,
    certificate_images: [],
    before_after_images: [],
    payment_methods: ['Gift Card', 'Klarna'],
    is_favorite: false,
  });

  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot>({
    start: '09:00',
    end: '10:00',
  });

  // Generate time slots based on business hours
  const generateTimeSlots = (startTime: string, endTime: string, slotDuration: number, bufferTime: number): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    const totalSlotTime = slotDuration + bufferTime;
    
    while (start.getTime() + slotDuration * 60000 <= end.getTime()) {
      const slotEnd = new Date(start.getTime() + slotDuration * 60000);
      slots.push({
        start: start.toTimeString().substring(0, 5),
        end: slotEnd.toTimeString().substring(0, 5),
        isBooked: false,
      });
      start.setMinutes(start.getMinutes() + totalSlotTime);
    }
    
    return slots;
  };

  // Logo upload functionality
  const handleLogoUpload = async () => {
    try {
      const imageUri = await showImagePickerOptions();
      if (!imageUri) return;
  
      console.log('Selected image URI:', imageUri);
  
      setLogoUri(imageUri);
      setFormData(prev => ({ ...prev, logoUrl: imageUri }));
  
      setIsUploadingLogo(true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalLogoUrl = imageUri;
      
      setLogoUri(finalLogoUrl);
      setFormData(prev => ({ ...prev, logoUrl: finalLogoUrl }));
      
      Alert.alert('Success', 'Logo updated successfully!');
      
    } catch (error) {
      console.error('Error selecting logo:', error);
      
      Alert.alert(
        'Error', 
        'Failed to select logo. Please try again.',
        [
          { text: 'OK' },
          {
            text: 'Retry',
            onPress: () => handleLogoUpload(),
          },
        ]
      );
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert(
      'Remove Logo',
      'Are you sure you want to remove the shop logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setLogoUri(null);
            setFormData(prev => ({ ...prev, logoUrl: '' }));
          },
        },
      ],
    );
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const getScheduleForDate = (date: Date): DailySchedule | null => {
    const dateString = formatDate(date);
    const existingSchedule = formData.dailySchedules.find(schedule => schedule.date === dateString);
    
    if (existingSchedule) {
      return existingSchedule;
    }
    
    const dayOfWeek = getDayOfWeek(date);
    const template = formData.weeklyTemplate[dayOfWeek];
    
    if (!template || !template.isOpen) {
      return null;
    }
    
    const timeSlots = generateTimeSlots(
      template.start,
      template.end,
      formData.slotDuration,
      formData.bufferTime
    );
    
    return {
      date: dateString,
      isOpen: true,
      openTime: template.start,
      closeTime: template.end,
      timeSlots,
      isHoliday: false,
      maxBookings: timeSlots.length,
    };
  };

  const updateDailySchedule = (schedule: DailySchedule) => {
    const existingIndex = formData.dailySchedules.findIndex(s => s.date === schedule.date);
    
    if (existingIndex >= 0) {
      const updatedSchedules = [...formData.dailySchedules];
      updatedSchedules[existingIndex] = schedule;
      setFormData(prev => ({ ...prev, dailySchedules: updatedSchedules }));
    } else {
      setFormData(prev => ({
        ...prev,
        dailySchedules: [...prev.dailySchedules, schedule],
      }));
    }
  };

  const handleDateSelect = (date: Date) => {
    const dateString = formatDate(date);
    setSelectedDate(dateString);
    const schedule = getScheduleForDate(date);
    setSelectedDaySchedule(schedule);
    setShowTimeSlotModal(true);
  };

  const handleTimeSlotUpdate = () => {
    if (!selectedDate || !selectedDaySchedule) return;
    
    updateDailySchedule(selectedDaySchedule);
    setShowTimeSlotModal(false);
  };

  const handleWeeklyTemplateChange = (day: string, field: keyof BusinessHours, value: any) => {
    setFormData(prev => ({
      ...prev,
      weeklyTemplate: {
        ...prev.weeklyTemplate,
        [day]: {
          ...prev.weeklyTemplate[day],
          [field]: value,
        },
      },
    }));
  };

  const applyWeeklyTemplateToMonth = () => {
    Alert.alert(
      'Apply Weekly Template',
      'This will override all existing schedules for the current month. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            const newSchedules: DailySchedule[] = [];
            
            for (let day = 1; day <= daysInMonth; day++) {
              const date = new Date(year, month, day);
              const dayOfWeek = getDayOfWeek(date);
              const template = formData.weeklyTemplate[dayOfWeek];
              
              if (template.isOpen) {
                const timeSlots = generateTimeSlots(
                  template.start,
                  template.end,
                  formData.slotDuration,
                  formData.bufferTime
                );
                
                newSchedules.push({
                  date: formatDate(date),
                  isOpen: true,
                  openTime: template.start,
                  closeTime: template.end,
                  timeSlots,
                  isHoliday: false,
                  maxBookings: timeSlots.length,
                });
              }
            }
            
            const filteredSchedules = formData.dailySchedules.filter(schedule => {
              const scheduleDate = new Date(schedule.date);
              return scheduleDate.getMonth() !== month || scheduleDate.getFullYear() !== year;
            });
            
            setFormData(prev => ({
              ...prev,
              dailySchedules: [...filteredSchedules, ...newSchedules],
            }));
          },
        },
      ]
    );
  };

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? (shop ? 'Edit Shop' : 'Add New Shop') : 'Shop Details',
      headerStyle: {
        backgroundColor: '#FEFCE8', // Match EarningsScreen background
      },
      headerTitleStyle: {
        color: '#1F2937',
        fontSize: 18,
        fontWeight: '600',
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
          style={styles.headerButton}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#F59E0B" />
          ) : (
            <Text style={styles.headerButtonText}>
              {isEditing ? 'Save' : 'Edit'}
            </Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [isEditing, formData, images, isSaving]);

  const selectImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Maximum Images', 'You can only upload up to 5 images');
      return;
    }
  
    try {
      const imageUri = await showImagePickerOptions();
      if (imageUri) {
        console.log('Adding image:', imageUri);
        setImages(prev => [...prev, imageUri]);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  useEffect(() => {
    if (shop?.logoUrl) {
      console.log('Setting initial logo from shop:', shop.logoUrl);
      setLogoUri(shop.logoUrl);
    }
  }, [shop]);

  const removeImage = (index: number) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setImages(prev => prev.filter((_, i) => i !== index));
          },
        },
      ],
    );
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleServiceInputChange = (field: keyof Service, value: any) => {
    setNewService(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddService = async () => {
    if (!newService.name?.trim()) {
      Alert.alert('Error', 'Please enter a service name');
      return;
    }

    try {
      setIsSaving(true);

      const serviceData: Omit<Service, 'id' | 'created_at'> = {
        name: newService.name!,
        description: newService.description || '',
        price: newService.price || 0,
        duration: newService.duration || 60,
        professional_name: newService.professional_name || '',
        location: newService.location || formData.address,
        rating: newService.rating || 0,
        reviews_count: newService.reviews_count || 0,
        certificate_images: newService.certificate_images || [],
        before_after_images: newService.before_after_images || [],
        payment_methods: newService.payment_methods || ['Gift Card', 'Klarna'],
        is_favorite: newService.is_favorite || false,
        category_id: '1',
        image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=300&h=200&fit=crop',
      };

      // If shop exists, create service via API
      let createdService: Service;
      if (shop?.id) {
        // Add shop_id to service data
        const serviceWithShop = { ...serviceData, shop_id: shop.id };
        createdService = await ShopAPI.createService(serviceWithShop);
      } else {
        // For new shops, create service locally
        createdService = {
          id: Math.random().toString(36).substr(2, 9),
          ...serviceData,
          created_at: new Date().toISOString(),
        };
      }

      // Update local state
      setFormData(prev => ({
        ...prev,
        services: [...(prev.services || []), createdService],
      }));

      // Reset form
      setNewService({
        name: '',
        description: '',
        price: 0,
        duration: 60,
        professional_name: '',
        location: formData.address,
        rating: 0,
        reviews_count: 0,
        certificate_images: [],
        before_after_images: [],
        payment_methods: ['Gift Card', 'Klarna'],
        is_favorite: false,
      });

      setShowServiceModal(false);
      Alert.alert('Success', 'Service added successfully!');
    } catch (error) {
      console.error('Error adding service:', error);
      Alert.alert('Error', 'Failed to add service. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    Alert.alert(
      'Remove Service',
      'Are you sure you want to remove this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);

              // If shop exists and service has been saved, delete via API
              if (shop?.id) {
                await ShopAPI.deleteService(serviceId);
              }

              // Update local state
              setFormData(prev => ({
                ...prev,
                services: prev.services?.filter(s => s.id !== serviceId) || [],
              }));

              Alert.alert('Success', 'Service removed successfully!');
            } catch (error) {
              console.error('Error removing service:', error);
              Alert.alert('Error', 'Failed to remove service. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }
  
    setIsSaving(true);
    try {
      const savedShopData: Omit<Shop, 'id' | 'created_at' | 'updated_at'> = {
        ...formData,
        isActive,
        imageUrl: images[0] || shop?.imageUrl || '',
        logoUrl: logoUri || formData.logoUrl || '',
      };
  
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const savedShop: Shop = {
        id: shop?.id || Math.random().toString(36).substr(2, 9),
        ...savedShopData,
        created_at: shop?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
  
      console.log('Saved shop:', savedShop);
  
      if (onSave) {
        onSave(savedShop);
      }
      
      setIsEditing(false);
      Alert.alert('Success', shop ? 'Shop updated successfully!' : 'Shop created successfully!');
      
      if (!shop) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving shop:', error);
      Alert.alert('Error', 'Failed to save shop. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete shop functionality
  const handleDeleteShop = () => {
    if (!shop?.id) return;

    Alert.alert(
      'Delete Shop',
      'Are you sure you want to permanently delete this shop? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await ShopAPI.deleteShop(shop.id);
              Alert.alert('Success', 'Shop deleted successfully!');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting shop:', error);
              Alert.alert('Error', 'Failed to delete shop. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  // Hide shop functionality
  const handleHideShop = () => {
    if (!shop?.id) return;

    Alert.alert(
      'Hide Shop',
      'This will hide the shop from customers but keep all data. You can make it visible again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          onPress: async () => {
            try {
              setIsLoading(true);
              await ShopAPI.hideShop(shop.id);
              Alert.alert('Success', 'Shop hidden successfully!');
              setIsActive(false);
            } catch (error) {
              console.error('Error hiding shop:', error);
              Alert.alert('Error', 'Failed to hide shop. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderField = (label: string, field: keyof typeof formData, isTextArea = false) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={[styles.input, isTextArea && styles.textArea]}
          value={formData[field] as string}
          onChangeText={text => handleInputChange(field, text)}
          placeholder={`Enter ${label.toLowerCase()}`}
          multiline={isTextArea}
          numberOfLines={isTextArea ? 4 : 1}
        />
      ) : (
        <Text style={styles.value}>{formData[field] || 'Not specified'}</Text>
      )}
    </View>
  );

  // Logo section renderer
  const renderLogoSection = () => (
    <View style={styles.logoContainer}>
      <Text style={styles.logoTitle}>Shop Logo</Text>
      
      {logoUri ? (
        <View style={styles.logoWrapper}>
          <Image 
            source={{ uri: logoUri }} 
            style={styles.logoImage}
            onError={(error) => {
              console.error('Image load error:', error);
              setLogoUri(null);
              Alert.alert('Error', 'Failed to load image. Please try selecting another image.');
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', logoUri);
            }}
          />
          {isEditing && (
            <TouchableOpacity
              style={styles.removeLogoButton}
              onPress={handleRemoveLogo}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          )}
          <View style={styles.logoLabel}>
            <Text style={styles.logoLabelText}>Shop Logo</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noLogoContainer}>
          <View style={styles.placeholderLogo}>
            <Ionicons name="business-outline" size={40} color="#9CA3AF" />
            <Text style={styles.placeholderLogoText}>No Logo</Text>
          </View>
          {isEditing && (
            <TouchableOpacity 
              style={styles.uploadLogoButton} 
              onPress={handleLogoUpload}
              disabled={isUploadingLogo}
            >
              {isUploadingLogo ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={16} color="#F59E0B" />
                  <Text style={styles.uploadLogoText}>Upload Logo</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {logoUri && isEditing && (
        <TouchableOpacity 
          style={styles.changeLogoButton} 
          onPress={handleLogoUpload}
          disabled={isUploadingLogo}
        >
          {isUploadingLogo ? (
            <>
              <ActivityIndicator size="small" color="#F59E0B" />
              <Text style={styles.changeLogoText}>Uploading...</Text>
            </>
          ) : (
            <>
              <Ionicons name="refresh-outline" size={16} color="#F59E0B" />
              <Text style={styles.changeLogoText}>Change Logo</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderBookingSettings = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.sectionTitle}>Booking Settings</Text>
      
      <View style={styles.settingsGrid}>
        <View style={styles.settingItem}>
          <Text style={styles.label}>Advance Booking Days</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.numberInput]}
              value={formData.advanceBookingDays.toString()}
              onChangeText={text => handleInputChange('advanceBookingDays', parseInt(text) || 30)}
              keyboardType="numeric"
              placeholder="30"
            />
          ) : (
            <Text style={styles.value}>{formData.advanceBookingDays} days</Text>
          )}
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.label}>Slot Duration (min)</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.numberInput]}
              value={formData.slotDuration.toString()}
              onChangeText={text => handleInputChange('slotDuration', parseInt(text) || 60)}
              keyboardType="numeric"
              placeholder="60"
            />
          ) : (
            <Text style={styles.value}>{formData.slotDuration} minutes</Text>
          )}
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.label}>Buffer Time (min)</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.numberInput]}
              value={formData.bufferTime.toString()}
              onChangeText={text => handleInputChange('bufferTime', parseInt(text) || 15)}
              keyboardType="numeric"
              placeholder="15"
            />
          ) : (
            <Text style={styles.value}>{formData.bufferTime} minutes</Text>
          )}
        </View>

        <View style={styles.settingItem}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Auto Approval</Text>
            {isEditing ? (
              <Switch
                value={formData.autoApproval}
                onValueChange={value => handleInputChange('autoApproval', value)}
                trackColor={{ false: '#D1D5DB', true: '#FCD34D' }}
                thumbColor={formData.autoApproval ? '#F59E0B' : '#9CA3AF'}
              />
            ) : (
              <Text style={styles.value}>{formData.autoApproval ? 'Enabled' : 'Disabled'}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const renderWeeklyTemplate = () => (
    <View style={styles.fieldContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Weekly Schedule Template</Text>
        {isEditing && (
          <TouchableOpacity
            style={styles.applyTemplateButton}
            onPress={applyWeeklyTemplateToMonth}
          >
            <Ionicons name="calendar-outline" size={16} color="#F59E0B" />
            <Text style={styles.applyTemplateText}>Apply to Month</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {daysOfWeek.map(day => (
        <View key={day} style={styles.weekDayContainer}>
          <View style={styles.weekDayHeader}>
            <Text style={styles.weekDayName}>{day}</Text>
            {isEditing && (
              <Switch
                value={formData.weeklyTemplate[day]?.isOpen || false}
                onValueChange={value => handleWeeklyTemplateChange(day, 'isOpen', value)}
                trackColor={{ false: '#FEE2E2', true: '#FEF3C7' }}
                thumbColor={formData.weeklyTemplate[day]?.isOpen ? '#F59E0B' : '#EF4444'}
              />
            )}
          </View>
          
          {formData.weeklyTemplate[day]?.isOpen && (
            <View style={styles.timeContainer}>
              {isEditing ? (
                <>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    value={formData.weeklyTemplate[day]?.start || ''}
                    onChangeText={text => handleWeeklyTemplateChange(day, 'start', text)}
                    placeholder="09:00"
                  />
                  <Text style={styles.timeSeparator}>to</Text>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    value={formData.weeklyTemplate[day]?.end || ''}
                    onChangeText={text => handleWeeklyTemplateChange(day, 'end', text)}
                    placeholder="18:00"
                  />
                </>
              ) : (
                <Text style={styles.value}>
                  {formData.weeklyTemplate[day]?.start} - {formData.weeklyTemplate[day]?.end}
                </Text>
              )}
            </View>
          )}
          
          {!formData.weeklyTemplate[day]?.isOpen && (
            <Text style={styles.closedText}>Closed</Text>
          )}
        </View>
      ))}
    </View>
  );

  const renderCalendar = () => {
    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
            style={styles.calendarNavButton}
          >
            <Ionicons name="chevron-back" size={20} color="#F59E0B" />
          </TouchableOpacity>
          
          <Text style={styles.calendarTitle}>{monthName}</Text>
          
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
            style={styles.calendarNavButton}
          >
            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarWeekDays}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <Text key={day} style={styles.calendarWeekDay}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {days.map((date, index) => {
            if (!date) {
              return <View key={index} style={styles.calendarEmptyDay} />;
            }

            const schedule = getScheduleForDate(date);
            const isToday = formatDate(date) === formatDate(new Date());
            const isPast = date < new Date();
            const isSelected = formatDate(date) === selectedDate;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  isToday && styles.calendarToday,
                  isSelected && styles.calendarSelected,
                  !schedule?.isOpen && styles.calendarClosed,
                  isPast && styles.calendarPast,
                ]}
                onPress={() => isEditing && !isPast && handleDateSelect(date)}
                disabled={!isEditing || isPast}
              >
                <Text style={[
                  styles.calendarDayText,
                  isToday && styles.calendarTodayText,
                  isSelected && styles.calendarSelectedText,
                  !schedule?.isOpen && styles.calendarClosedText,
                  isPast && styles.calendarPastText,
                ]}>
                  {date.getDate()}
                </Text>
                
                {schedule?.isOpen && (
                  <View style={[
                    styles.calendarDayIndicator,
                    schedule.isHoliday && styles.calendarHolidayIndicator
                  ]}>
                    <Text style={styles.calendarSlotsText}>
                      {schedule.timeSlots?.filter(slot => !slot.isBooked).length || 0}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderScheduleManagement = () => (
    <View style={styles.fieldContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Schedule Management</Text>
        {isEditing && (
          <TouchableOpacity
            style={styles.addScheduleButton}
            onPress={() => setShowCalendarModal(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#F59E0B" />
            <Text style={styles.addScheduleText}>Manage Calendar</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {renderCalendar()}
    </View>
  );

  const renderServices = () => (
    <View style={styles.fieldContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.label}>Services</Text>
        {isEditing && (
          <TouchableOpacity
            style={styles.addServiceButton}
            onPress={() => setShowServiceModal(true)}
          >
            <Ionicons name="add" size={20} color="#F59E0B" />
            <Text style={styles.addServiceText}>Add Service</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {formData.services && formData.services.length > 0 ? (
        <View>
          {formData.services.map((item) => (
            <View key={item.id} style={styles.serviceItem}>
              <View style={styles.serviceHeader}>
                <Image 
                  source={{ uri: item.image }} 
                  style={styles.serviceImage}
                />
                <View style={styles.serviceInfo}>
                  <View style={styles.serviceNameRow}>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    <View style={styles.serviceActions}>
                      <Text style={styles.servicePrice}>${item.price}</Text>
                      {isEditing && (
                        <TouchableOpacity
                          onPress={() => handleRemoveService(item.id)}
                          style={styles.removeButton}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={styles.serviceDescription}>{item.description}</Text>
                  <View style={styles.serviceDetails}>
                    <View style={styles.serviceDetailItem}>
                      <Ionicons name="time-outline" size={12} color="#6B7280" />
                      <Text style={styles.serviceDetail}>{item.duration} min</Text>
                    </View>
                    <View style={styles.serviceDetailItem}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.serviceDetail}>{item.rating}/5</Text>
                    </View>
                    <View style={styles.serviceDetailItem}>
                      <Ionicons name="chatbox-outline" size={12} color="#6B7280" />
                      <Text style={styles.serviceDetail}>{item.reviews_count} reviews</Text>
                    </View>
                  </View>
                  <Text style={styles.professionalName}>with {item.professional_name}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyServicesContainer}>
          <Ionicons name="briefcase-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyServicesText}>No services added yet</Text>
          <Text style={styles.emptyServicesSubtext}>Add your first service to get started</Text>
        </View>
      )}
    </View>
  );

  // Danger Zone for existing shops
  const renderDangerZone = () => {
    if (!shop?.id) return null;

    return (
      <View style={styles.dangerZone}>
        <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
        <Text style={styles.dangerZoneDescription}>
          These actions cannot be undone. Please proceed with caution.
        </Text>
        
        <View style={styles.dangerActions}>
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleHideShop}
          >
            <Ionicons name="eye-off-outline" size={16} color="#F59E0B" />
            <Text style={styles.dangerButtonText}>Hide from Users</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dangerButton, styles.deleteButton]}
            onPress={handleDeleteShop}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={[styles.dangerButtonText, styles.deleteButtonText]}>Delete Shop</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTimeSlotModal = () => (
    <Modal
      visible={showTimeSlotModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Manage Schedule - {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : ''}
          </Text>
          <TouchableOpacity
            onPress={() => setShowTimeSlotModal(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#4B5563" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {selectedDaySchedule && (
            <>
              {/* Day Status Toggle */}
              <View style={styles.dayStatusContainer}>
                <View style={styles.dayStatusHeader}>
                  <Ionicons 
                    name={selectedDaySchedule.isOpen ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={selectedDaySchedule.isOpen ? "#F59E0B" : "#EF4444"} 
                  />
                  <Text style={styles.dayStatusTitle}>Day Status</Text>
                </View>
                <Switch
                  value={selectedDaySchedule.isOpen}
                  onValueChange={(value) => {
                    setSelectedDaySchedule(prev => prev ? { ...prev, isOpen: value } : null);
                  }}
                  trackColor={{ false: '#FEE2E2', true: '#FEF3C7' }}
                  thumbColor={selectedDaySchedule.isOpen ? '#F59E0B' : '#EF4444'}
                />
              </View>

              {selectedDaySchedule.isOpen && (
                <>
                  {/* Operating Hours */}
                  <View style={styles.operatingHoursContainer}>
                    <Text style={styles.sectionSubTitle}>Operating Hours</Text>
                    <View style={styles.timeContainer}>
                      <View style={styles.timeInputContainer}>
                        <Text style={styles.timeLabel}>Open Time</Text>
                        <TextInput
                          style={[styles.input, styles.timeInput]}
                          value={selectedDaySchedule.openTime}
                          onChangeText={(text) => {
                            setSelectedDaySchedule(prev => prev ? { 
                              ...prev, 
                              openTime: text,
                              timeSlots: generateTimeSlots(text, prev.closeTime, formData.slotDuration, formData.bufferTime)
                            } : null);
                          }}
                          placeholder="09:00"
                        />
                      </View>
                      <View style={styles.timeInputContainer}>
                        <Text style={styles.timeLabel}>Close Time</Text>
                        <TextInput
                          style={[styles.input, styles.timeInput]}
                          value={selectedDaySchedule.closeTime}
                          onChangeText={(text) => {
                            setSelectedDaySchedule(prev => prev ? { 
                              ...prev, 
                              closeTime: text,
                              timeSlots: generateTimeSlots(prev.openTime, text, formData.slotDuration, formData.bufferTime)
                            } : null);
                          }}
                          placeholder="18:00"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Holiday/Special Day */}
                  <View style={styles.specialDayContainer}>
                    <View style={styles.specialDayHeader}>
                      <Text style={styles.sectionSubTitle}>Special Day</Text>
                      <Switch
                        value={selectedDaySchedule.isHoliday}
                        onValueChange={(value) => {
                          setSelectedDaySchedule(prev => prev ? { ...prev, isHoliday: value } : null);
                        }}
                        trackColor={{ false: '#D1D5DB', true: '#FDE68A' }}
                        thumbColor={selectedDaySchedule.isHoliday ? '#F59E0B' : '#9CA3AF'}
                      />
                    </View>
                    
                    {selectedDaySchedule.isHoliday && (
                      <TextInput
                        style={styles.input}
                        value={selectedDaySchedule.holidayName || ''}
                        onChangeText={(text) => {
                          setSelectedDaySchedule(prev => prev ? { ...prev, holidayName: text } : null);
                        }}
                        placeholder="Holiday name (e.g., Christmas Day)"
                      />
                    )}
                  </View>

                  {/* Notes */}
                  <View style={styles.notesContainer}>
                    <Text style={styles.sectionSubTitle}>Notes</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={selectedDaySchedule.note || ''}
                      onChangeText={(text) => {
                        setSelectedDaySchedule(prev => prev ? { ...prev, note: text } : null);
                      }}
                      placeholder="Special notes for this day..."
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* Time Slots Preview */}
                  <View style={styles.timeSlotsContainer}>
                    <Text style={styles.sectionSubTitle}>
                      Available Time Slots ({selectedDaySchedule.timeSlots?.filter(slot => !slot.isBooked).length || 0} available)
                    </Text>
                    
                    <View style={styles.timeSlotsGrid}>
                      {selectedDaySchedule.timeSlots?.map((slot, index) => (
                        <View
                          key={index}
                          style={[
                            styles.timeSlotCard,
                            slot.isBooked && styles.bookedTimeSlot
                          ]}
                        >
                          <Text style={[
                            styles.timeSlotText,
                            slot.isBooked && styles.bookedTimeSlotText
                          ]}>
                            {slot.start} - {slot.end}
                          </Text>
                          {slot.isBooked && (
                            <View style={styles.bookedIndicator}>
                              <Ionicons name="person" size={12} color="#EF4444" />
                              <Text style={styles.bookedText}>Booked</Text>
                            </View>
                          )}
                        </View>
                      )) || []}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.quickActionsContainer}>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => {
                          if (selectedDaySchedule) {
                            const newSlots = generateTimeSlots(
                              selectedDaySchedule.openTime,
                              selectedDaySchedule.closeTime,
                              formData.slotDuration,
                              formData.bufferTime
                            );
                            setSelectedDaySchedule(prev => prev ? { ...prev, timeSlots: newSlots } : null);
                          }
                        }}
                      >
                        <Ionicons name="refresh" size={16} color="#F59E0B" />
                        <Text style={styles.quickActionText}>Regenerate Slots</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quickActionButton, styles.clearActionButton]}
                        onPress={() => {
                          Alert.alert(
                            'Clear All Bookings',
                            'This will remove all bookings for this day. Continue?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Clear',
                                style: 'destructive',
                                onPress: () => {
                                  if (selectedDaySchedule) {
                                    const clearedSlots = selectedDaySchedule.timeSlots?.map(slot => ({
                                      ...slot,
                                      isBooked: false,
                                      bookingId: undefined
                                    })) || [];
                                    setSelectedDaySchedule(prev => prev ? { ...prev, timeSlots: clearedSlots } : null);
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash" size={16} color="#EF4444" />
                        <Text style={[styles.quickActionText, styles.clearActionText]}>Clear Bookings</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              {!selectedDaySchedule.isOpen && (
                <View style={styles.closedDayContainer}>
                  <Ionicons name="moon-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.closedDayText}>Shop is closed on this day</Text>
                  <Text style={styles.closedDaySubtext}>Toggle the day status above to open</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.cancelModalButton}
            onPress={() => setShowTimeSlotModal(false)}
          >
            <Text style={styles.cancelModalButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveModalButton}
            onPress={handleTimeSlotUpdate}
          >
            <Text style={styles.saveModalButtonText}>Save Schedule</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderServiceModal = () => (
    <Modal
      visible={showServiceModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add New Service</Text>
          <TouchableOpacity
            onPress={() => setShowServiceModal(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#4B5563" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Service Name *</Text>
            <TextInput
              style={styles.input}
              value={newService.name}
              onChangeText={text => handleServiceInputChange('name', text)}
              placeholder="Enter service name"
            />
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newService.description}
              onChangeText={text => handleServiceInputChange('description', text)}
              placeholder="Enter service description"
              multiline
              numberOfLines={4}
            />
          </View>
          
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Price ($)</Text>
              <TextInput
                style={styles.input}
                value={newService.price?.toString()}
                onChangeText={text => handleServiceInputChange('price', parseFloat(text) || 0)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            
            <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Duration (min)</Text>
              <TextInput
                style={styles.input}
                value={newService.duration?.toString()}
                onChangeText={text => handleServiceInputChange('duration', parseInt(text) || 60)}
                placeholder="60"
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Professional Name</Text>
            <TextInput
              style={styles.input}
              value={newService.professional_name}
              onChangeText={text => handleServiceInputChange('professional_name', text)}
              placeholder="Enter professional name"
            />
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.cancelModalButton}
            onPress={() => setShowServiceModal(false)}
          >
            <Text style={styles.cancelModalButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveModalButton}
            onPress={handleAddService}
          >
            <Text style={styles.saveModalButtonText}>Add Service</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>
            {isSaving ? 'Saving shop details...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
      
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Shop Logo Section */}
        {renderLogoSection()}

        {/* Shop Images */}
        <View style={styles.imageContainer}>
          <Text style={styles.imagesTitle}>Shop Images ({images.length}/5)</Text>
          
          {images.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScrollView}
              contentContainerStyle={styles.imagesScrollContent}
            >
              {images.map((imageUri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: imageUri }} style={styles.shopImage} />
                  {isEditing && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                  {index === 0 && (
                    <View style={styles.mainImageBadge}>
                      <Text style={styles.mainImageText}>Main</Text>
                    </View>
                  )}
                </View>
              ))}
              
              {isEditing && images.length < 5 && (
                <TouchableOpacity 
                  style={styles.addImageButton}
                  onPress={selectImage}
                  disabled={imagePickerLoading}
                >
                  {imagePickerLoading ? (
                    <ActivityIndicator size="small" color="#F59E0B" />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={32} color="#F59E0B" />
                      <Text style={styles.addImageText}>Add Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            <View style={styles.noImagesContainer}>
              <View style={styles.placeholderImage}>
                <Ionicons name="storefront-outline" size={60} color="#9CA3AF" />
                <Text style={styles.placeholderText}>No Images</Text>
              </View>
              {isEditing && (
                <TouchableOpacity 
                  style={styles.changeImageButton} 
                  onPress={selectImage}
                  disabled={imagePickerLoading}
                >
                  {imagePickerLoading ? (
                    <ActivityIndicator size="small" color="#F59E0B" />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={16} color="#F59E0B" />
                      <Text style={styles.changeImageText}>Add First Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Shop Details Form */}
        <View style={styles.formContainer}>
          {renderField('Shop Name', 'name')}
          {renderField('Address', 'address', true)}
          
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
              {renderField('Phone', 'phone')}
            </View>
            <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
              {renderField('Email', 'email')}
            </View>
          </View>
          
          {renderField('Description', 'description', true)}
          {renderBookingSettings()}
          {renderWeeklyTemplate()}
          {renderScheduleManagement()}
          {renderServices()}

          {/* Active Status Toggle */}
          <View style={styles.fieldContainer}>
            <View style={styles.statusContainer}>
              <View style={styles.statusHeader}>
                <Ionicons 
                  name={isActive ? "checkmark-circle" : "pause-circle"} 
                  size={20} 
                  color={isActive ? "#F59E0B" : "#EF4444"} 
                />
                <Text style={styles.label}>Shop Status</Text>
              </View>
              {isEditing ? (
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#FEE2E2', true: '#FEF3C7' }}
                  thumbColor={isActive ? '#F59E0B' : '#EF4444'}
                />
              ) : (
                <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={[styles.statusText, isActive ? styles.activeText : styles.inactiveText]}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.statusHint}>
              {isActive 
                ? '✅ Your shop is currently visible to customers and accepting bookings.' 
                : '⚠️ Your shop is currently hidden from customers and not accepting bookings.'}
            </Text>
          </View>

          {/* Danger Zone for existing shops */}
          {renderDangerZone()}
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={() => shop ? setIsEditing(false) : navigation.goBack()}
              disabled={isSaving}
            >
              <Ionicons name="close-outline" size={20} color="#6B7280" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.saveButton]} 
              onPress={handleSave}
              disabled={isSaving}
            >
              <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {renderServiceModal()}
      {renderTimeSlotModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCE8', // Updated to match EarningsScreen
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  headerButton: {
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEF3C7', // Updated to match yellow theme
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  headerButtonText: {
    color: '#F59E0B', // Updated to match yellow theme
    fontSize: 16,
    fontWeight: '600',
  },

  // Logo Styles
  logoContainer: {
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E2E8F0',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  removeLogoButton: {
    position: 'absolute',
    top: -5,
    right: '35%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoLabel: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: '#F59E0B', // Updated to match yellow theme
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logoLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noLogoContainer: {
    alignItems: 'center',
  },
  placeholderLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  placeholderLogoText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  uploadLogoButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FEF3C7', // Updated to match yellow theme
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  uploadLogoText: {
    color: '#F59E0B', // Updated to match yellow theme
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  changeLogoButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  changeLogoText: {
    color: '#F59E0B', // Updated to match yellow theme
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },

  imageContainer: {
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  imagesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  imagesScrollView: {
    marginHorizontal: -8,
  },
  imagesScrollContent: {
    paddingHorizontal: 8,
  },
  imageWrapper: {
    position: 'relative',
    marginHorizontal: 8,
  },
  shopImage: {
    width: 150,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  mainImageBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#F59E0B', // Updated to match yellow theme
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mainImageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addImageButton: {
    width: 150,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#FCD34D', // Updated to match yellow theme
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  addImageText: {
    color: '#F59E0B', // Updated to match yellow theme
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  noImagesContainer: {
    alignItems: 'center',
  },
  placeholderImage: {
    width: 200,
    height: 150,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  changeImageButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7', // Updated to match yellow theme
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  changeImageText: {
    color: '#F59E0B', // Updated to match yellow theme
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  fieldContainer: {
    marginBottom: 20,
  },
  rowContainer: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  value: {
    fontSize: 16,
    color: '#1F2937',
    paddingTop: 8,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  // Booking Settings
  settingsGrid: {
    gap: 16,
  },
  settingItem: {
    marginBottom: 16,
  },
  numberInput: {
    width: '100%',
  },

  // Weekly Template
  weekDayContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weekDayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  timeInput: {
    flex: 1,
  },
  timeSeparator: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  closedText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  applyTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7', // Updated to match yellow theme
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  applyTemplateText: {
    color: '#F59E0B', // Updated to match yellow theme
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Calendar
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  calendarNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF3C7', // Updated to match yellow theme
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
  },
  calendarEmptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  calendarToday: {
    borderColor: '#F59E0B', // Updated to match yellow theme
    borderWidth: 2,
  },
  calendarSelected: {
    backgroundColor: '#F59E0B', // Updated to match yellow theme
    borderColor: '#F59E0B',
  },
  calendarClosed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  calendarPast: {
    opacity: 0.5,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  calendarTodayText: {
    color: '#F59E0B', // Updated to match yellow theme
  },
  calendarSelectedText: {
    color: '#FFFFFF',
  },
  calendarClosedText: {
    color: '#DC2626',
  },
  calendarPastText: {
    color: '#9CA3AF',
  },
  calendarDayIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#F59E0B', // Updated to match yellow theme
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  calendarHolidayIndicator: {
    backgroundColor: '#F59E0B',
  },
  calendarSlotsText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7', // Updated to match yellow theme
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  addScheduleText: {
    color: '#F59E0B', // Updated to match yellow theme
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Services
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7', // Updated to match yellow theme
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  addServiceText: {
    color: '#F59E0B', // Updated to match yellow theme
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  serviceItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  serviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F59E0B', // Updated to match yellow theme
    marginRight: 8,
  },
  removeButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDetail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
    fontWeight: '500',
  },
  professionalName: {
    fontSize: 13,
    color: '#F59E0B', // Updated to match yellow theme
    fontWeight: '600',
  },
  emptyServicesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyServicesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptyServicesSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Status
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  activeBadge: {
    backgroundColor: '#FEF3C7', // Updated to match yellow theme
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeText: {
    color: '#F59E0B', // Updated to match yellow theme
  },
  inactiveText: {
    color: '#991B1B',
  },
  statusHint: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },

  // Danger Zone
  dangerZone: {
    marginTop: 32,
    padding: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  dangerZoneDescription: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerActions: {
    gap: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#EF4444',
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginHorizontal: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: '#F59E0B', // Updated to match yellow theme
    marginLeft: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saveModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F59E0B', // Updated to match yellow theme
    marginLeft: 8,
  },
  cancelModalButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  saveModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Time Slot Modal Specific Styles
  dayStatusContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  operatingHoursContainer: {
    marginBottom: 20,
  },
  specialDayContainer: {
    marginBottom: 20,
  },
  specialDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesContainer: {
    marginBottom: 20,
  },
  timeSlotsContainer: {
    marginBottom: 20,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginHorizontal: -4,
  },
  timeSlotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 100,
    alignItems: 'center',
  },
  bookedTimeSlot: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  bookedTimeSlotText: {
    color: '#DC2626',
  },
  bookedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookedText: {
    fontSize: 10,
    color: '#EF4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7', // Updated to match yellow theme
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  clearActionButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B', // Updated to match yellow theme
    marginLeft: 6,
  },
  clearActionText: {
    color: '#EF4444',
  },
  closedDayContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  closedDayText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  closedDaySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ShopDetailsScreen;

/*
API Endpoints Documentation:

### Shop Management API

#### 1. Create Shop
**POST** `/api/v1/shops`
```json
{
  "name": "Shop Name",
  "address": "Shop Address",
  "phone": "+1234567890",
  "email": "shop@example.com",
  "description": "Shop description",
  "logoUrl": "https://...",
  "imageUrl": "https://...",
  "isActive": true,
  "weeklyTemplate": {...},
  "dailySchedules": [...],
  "advanceBookingDays": 30,
  "slotDuration": 60,
  "bufferTime": 15,
  "autoApproval": true,
  "timeZone": "UTC"
}
```

#### 2. Update Shop
**PUT** `/api/v1/shops/{shopId}`
```json
{
  "name": "Updated Shop Name",
  "isActive": false,
  // ... other fields to update
}
```

#### 3. Get Shop
**GET** `/api/v1/shops/{shopId}`

#### 4. Get Provider Shops
**GET** `/api/v1/shops?provider_id={providerId}`

#### 5. Hide Shop (Soft Delete)
**PATCH** `/api/v1/shops/{shopId}/hide`

#### 6. Delete Shop (Hard Delete)
**DELETE** `/api/v1/shops/{shopId}`

#### 7. Toggle Shop Visibility
**PATCH** `/api/v1/shops/{shopId}/visibility`
```json
{
  "is_visible": true
}
```

### Service Management API

#### 8. Create Service
**POST** `/api/v1/services`
```json
{
  "shop_id": "shop_123",
  "name": "Haircut",
  "description": "Professional haircut service",
  "price": 25.00,
  "duration": 30,
  "category_id": "hair_services",
  "professional_name": "John Doe",
  "location": "Shop Address",
  "image": "https://...",
  "certificate_images": ["https://..."],
  "before_after_images": ["https://..."],
  "payment_methods": ["Gift Card", "Klarna"],
  "is_favorite": false
}
```

#### 9. Update Service
**PUT** `/api/v1/services/{serviceId}`
```json
{
  "name": "Updated Service Name",
  "price": 30.00,
  // ... other fields to update
}
```

#### 10. Get Service
**GET** `/api/v1/services/{serviceId}`

#### 11. Get Shop Services
**GET** `/api/v1/services?shop_id={shopId}`

#### 12. Get Provider Services (All Shops)
**GET** `/api/v1/services?provider_id={providerId}`

#### 13. Delete Service
**DELETE** `/api/v1/services/{serviceId}`

#### 14. Toggle Service Availability
**PATCH** `/api/v1/services/{serviceId}/availability`
```json
{
  "is_available": true
}
```

#### 15. Bulk Update Shop Services
**POST** `/api/v1/services/bulk-update`
```json
{
  "shop_id": "shop_123",
  "services": [
    {
      "id": "service_1",
      "name": "Updated Service",
      "price": 25.00,
      // ... other service fields
    }
  ]
}
```

### File Upload APIs

#### 16. Upload Shop Image
**POST** `/api/v1/upload/image`
- Content-Type: multipart/form-data
- Body: image file + optional shop_id

#### 17. Upload Shop Logo
**POST** `/api/v1/upload/logo`
- Content-Type: multipart/form-data
- Body: logo file + optional shop_id

#### 18. Upload Service Image
**POST** `/api/v1/upload/service-image`
- Content-Type: multipart/form-data
- Body: image file + optional service_id

### Response Format
```json
{
  "success": true,
  "data": {
    "id": "shop_123",
    "name": "Shop Name",
    // ... shop/service data
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Operation successful"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "name": ["Name is required"],
      "price": ["Price must be greater than 0"]
    }
  }
}
```

### Service Data Model
```typescript
interface Service {
  id: string;
  shop_id?: string; // Added for API relationship
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category_id: string;
  image: string;
  rating: number; // 0-5
  reviews_count: number;
  professional_name: string;
  location: string;
  certificate_images: string[];
  before_after_images: string[];
  payment_methods: string[];
  is_favorite: boolean;
  is_available?: boolean; // For toggling availability
  created_at: string;
  updated_at?: string;
}
```
*/