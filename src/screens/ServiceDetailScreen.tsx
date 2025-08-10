import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { ServiceUtils } from '../services/serviceUtils';
import { ServiceOptionState } from '../types/service';
import type { Service } from '../services/types/service';
import { shopAPI, Shop } from '../services/api/shops/shopAPI';
import { serviceOptionsAPI, ServiceOption } from '../services/api/serviceOptions/serviceOptionsAPI';
import normalizedShopService, { CompleteShopData, supabase } from '../lib/supabase/normalized';
import { favoritesAPI } from '../services/api/favorites/favoritesAPI';

const { width: screenWidth } = Dimensions.get('window');

// Transform shop data to service format for backward compatibility
const transformShopToService = (shop: CompleteShopData): Service => ({
  id: shop.id,
  name: shop.name || 'Unnamed Shop',
  description: shop.description || '',
  price: shop.services && shop.services.length > 0 ? shop.services[0].price : 0,
  duration: shop.services && shop.services.length > 0 ? shop.services[0].duration : 0,
  category_id: (shop.category || 'general').toLowerCase().replace(/\s+/g, '-'),
  image: shop.images && shop.images.length > 0 ? shop.images[0] : '',
  rating: shop.rating || 0,
  reviews_count: shop.reviews_count || 0,
  professional_name: shop.staff && shop.staff.length > 0 ? shop.staff[0].name : '',
  salon_name: shop.name || 'Unnamed Shop',
  location: `${shop.city || 'Unknown City'}, ${shop.country || 'Unknown Country'}`,
  distance: shop.distance || '',
  available_times: shop.business_hours ? extractAvailableTimes(shop.business_hours) : [],
  certificate_images: shop.certificate_images || [],
  before_after_images: shop.before_after_images || shop.images?.slice(1) || [],
  available_time_text: shop.is_active ? 'Check availability' : 'Currently closed',
  welcome_message: shop.welcome_message || shop.description || '',
  special_note: shop.special_note || '',
  payment_methods: shop.payment_methods || [],
  is_favorite: shop.is_favorite || false,
  created_at: shop.created_at,
  logo_url: shop.logo_url // Add logo_url to service data
});

// Helper function to extract available times from business hours
const extractAvailableTimes = (businessHours: any[]): string[] => {
  const times: string[] = [];
  
  // Validate businessHours is an array
  if (!Array.isArray(businessHours) || businessHours.length === 0) {
    return times;
  }
  
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = daysOfWeek[new Date().getDay()];
  
  const todayHours = businessHours.find(bh => 
    bh && bh.day_of_week && typeof bh.day_of_week === 'string' && 
    bh.day_of_week.toLowerCase() === today
  );
  
  if (todayHours && todayHours.is_open && todayHours.open_time && todayHours.close_time) {
    try {
      // Generate time slots based on opening hours
      const openTime = parseInt(todayHours.open_time.split(':')[0]);
      const closeTime = parseInt(todayHours.close_time.split(':')[0]);
      
      if (!isNaN(openTime) && !isNaN(closeTime) && openTime < closeTime) {
        for (let hour = openTime; hour < closeTime; hour++) {
          times.push(`${hour.toString().padStart(2, '0')}:00`);
          times.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    } catch (error) {
      console.warn('Error parsing business hours:', error);
    }
  }
  
  return times;
};

type ServiceDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ServiceDetail'>;
type ServiceDetailScreenRouteProp = RouteProp<RootStackParamList, 'ServiceDetail'>;

// Define service type for tab components
type ServiceTabProps = {
  service: Service;
};

// Image Carousel Component
interface ImageCarouselProps {
  images: string[];
  service: Service;
  onBackPress: () => void;
  onFavoritePress: () => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images = [], service, onBackPress, onFavoritePress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Use provided images array
  const imageList = images.length > 0 ? images : (service.image ? [service.image] : []);
  
  console.log('📷 ImageCarousel received:', imageList.length, 'images');

  // Get image type label with proper categorization
  const getImageTypeLabel = (imageUrl: string, index: number, images: any) => {
    // Check if it's in main shop images
    if (images.main?.includes(imageUrl)) {
      return index === 0 ? 'Main' : `Gallery ${index + 1}`;
    }
    // Check if it's a certificate
    if (images.certificates?.includes(imageUrl)) {
      const certIndex = images.certificates.indexOf(imageUrl) + 1;
      return `Certificate ${certIndex}`;
    }
    // Check if it's before/after
    if (images.beforeAfter?.includes(imageUrl)) {
      const beforeAfterIndex = images.beforeAfter.indexOf(imageUrl);
      return beforeAfterIndex % 2 === 0 ? 'Before' : 'After';
    }
    return `Image ${index + 1}`;
  };

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentIndex(index);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
  };

  // We need to pass the categorized images to get proper labels
  // For now, use a simple approach
  const currentImageLabel = imageList[currentIndex] ? `${currentIndex + 1} of ${imageList.length}` : null;

  return (
    <View style={styles.imageContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={styles.imageScrollView}
      >
        {imageList.length > 0 ? (
          imageList.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              style={styles.serviceImage}
              resizeMode="cover"
            />
          ))
        ) : (
          <View style={[styles.serviceImage, styles.noImageContainer]}>
            <Ionicons name="image-outline" size={48} color="#9CA3AF" />
            <Text style={styles.noImageText}>No images available</Text>
          </View>
        )}
      </ScrollView>

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={onBackPress}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* Favorite Button */}
      <TouchableOpacity 
        style={styles.favoriteButton}
        onPress={onFavoritePress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={service.is_favorite ? 'heart' : 'heart-outline'} 
          size={24} 
          color={service.is_favorite ? '#EF4444' : '#1F2937'} 
        />
      </TouchableOpacity>

      {/* Image Counter and Type */}
      {imageList.length > 1 && (
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {currentIndex + 1} / {imageList.length}
            {currentImageLabel && ` • ${currentImageLabel}`}
          </Text>
        </View>
      )}

      {/* Dots Indicator */}
      {imageList.length > 1 && (
        <View style={styles.dotsContainer}>
          {imageList.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot
              ]}
              onPress={() => goToSlide(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// Staff Selection Component
const StaffSelectionSection: React.FC<{
  staffMembers: any[];
  selectedStaff: string | null;
  onSelectStaff: (staffId: string) => void;
}> = ({ staffMembers, selectedStaff, onSelectStaff }) => (
  <View style={styles.staffSection}>
    <View style={styles.sectionHeader}>
      <Ionicons name="people-outline" size={20} color="#666" />
      <Text style={styles.sectionTitle}>Select Staff Member</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffScroll}>
      {staffMembers.map((staff) => (
        <TouchableOpacity
          key={staff.id}
          style={[
            styles.staffCard,
            selectedStaff === staff.id && styles.selectedStaffCard
          ]}
          onPress={() => onSelectStaff(staff.id)}
        >
          <View style={styles.staffAvatar}>
            {staff.avatar_url ? (
              <Image source={{ uri: staff.avatar_url }} style={styles.staffImage} />
            ) : (
              <View style={styles.staffPlaceholder}>
                <Ionicons name="person" size={30} color="#9CA3AF" />
              </View>
            )}
            {selectedStaff === staff.id && (
              <View style={styles.staffCheckmark}>
                <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
              </View>
            )}
          </View>
          <Text style={[styles.staffName, selectedStaff === staff.id && styles.selectedStaffName]}>
            {staff.name}
          </Text>
          {staff.role && staff.id !== 'any' && (
            <Text style={styles.staffRole}>{staff.role}</Text>
          )}
          {staff.rating > 0 && (
            <View style={styles.staffRating}>
              <Ionicons name="star" size={12} color="#FFC107" />
              <Text style={styles.staffRatingText}>{staff.rating}</Text>
            </View>
          )}
          {staff.specialties && staff.specialties.length > 0 && (
            <Text style={styles.staffSpecialty} numberOfLines={1}>
              {staff.specialties[0]}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// Tab components with real shop data
const AboutTab: React.FC<ServiceTabProps> = ({ service }) => {
  const [shopData, setShopData] = useState<CompleteShopData | null>(null);

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const response = await normalizedShopService.getShopById(service.id);
        if (response.success && response.data) {
          console.log('🔍 About Tab - Shop data from same source as provider saves:', response.data);
          setShopData(response.data);
        }
      } catch (error) {
        console.error('Error fetching shop data for about tab:', error);
      }
    };
    fetchShopData();
  }, [service?.id]);

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.sectionTitle}>About {service.salon_name}</Text>
        </View>
        <Text style={styles.descriptionText}>
          {service.description || 'No description available for this business.'}
        </Text>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact Information</Text>
          
          {shopData?.phone && (
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={20} color="#F59E0B" />
              <Text style={styles.contactText}>{shopData.phone}</Text>
            </View>
          )}
          
          {shopData?.email && (
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={20} color="#F59E0B" />
              <Text style={styles.contactText}>{shopData.email}</Text>
            </View>
          )}
          
          {shopData?.website_url && (
            <View style={styles.contactItem}>
              <Ionicons name="globe-outline" size={20} color="#F59E0B" />
              <Text style={styles.contactText}>{shopData.website_url}</Text>
            </View>
          )}

          {shopData?.address && (
            <View style={styles.contactItem}>
              <Ionicons name="location-outline" size={20} color="#F59E0B" />
              <Text style={styles.contactText}>
                {shopData.address}, {shopData.city}, {shopData.country}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const HoursTab: React.FC<ServiceTabProps> = ({ service }) => {
  const [shopData, setShopData] = useState<CompleteShopData | null>(null);
  const [businessHours, setBusinessHours] = useState<any[]>([]);

  useEffect(() => {
    const fetchShopAndHoursData = async () => {
      try {
        // Fetch basic shop data
        const shopResponse = await normalizedShopService.getShopById(service.id);
        if (shopResponse.success && shopResponse.data) {
          console.log('🔍 Hours Tab - Shop data:', shopResponse.data);
          setShopData(shopResponse.data);
        }

        // Fetch business hours directly from shop_business_hours table
        console.log('🔍 Hours Tab - Fetching business hours from shop_business_hours table for shop:', service.id);
        const { data: hoursData, error: hoursError } = await supabase
          .from('shop_business_hours')
          .select('*')
          .eq('shop_id', service.id)
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (hoursError) {
          console.error('❌ Error fetching business hours:', hoursError);
        } else {
          console.log('✅ Hours Tab - Business hours from shop_business_hours:', hoursData);
          setBusinessHours(hoursData || []);
        }
      } catch (error) {
        console.error('Error fetching shop and hours data:', error);
      }
    };
    fetchShopAndHoursData();
  }, [service?.id]);

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.slice(0, 5); // Remove seconds
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.sectionTitle}>Opening Hours</Text>
        </View>
        
        {businessHours && businessHours.length > 0 ? (
          <View style={styles.hoursContainer}>
            {dayNames.map((dayName, index) => {
              // Find business hours for this day from the shop_business_hours table
              const dayData = businessHours.find(bh => 
                bh.day.toLowerCase() === dayName.toLowerCase()
              );
              
              return (
                <View key={dayName} style={styles.hourRow}>
                  <Text style={styles.dayName}>{dayName}</Text>
                  <Text style={styles.hourTime}>
                    {dayData?.is_open 
                      ? `${formatTime(dayData.open_time || '')} - ${formatTime(dayData.close_time || '')}`
                      : 'Closed'
                    }
                  </Text>
                </View>
              );
            })}
          </View>
        ) : shopData?.business_hours_start && shopData?.business_hours_end ? (
          <View style={styles.hoursContainer}>
            <View style={styles.basicHoursContainer}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <Text style={styles.basicHoursText}>
                General hours: {formatTime(shopData.business_hours_start)} - {formatTime(shopData.business_hours_end)}
              </Text>
            </View>
            <Text style={styles.basicHoursNote}>
              * Detailed daily schedules not available
            </Text>
          </View>
        ) : (
          <View style={styles.noHoursContainer}>
            <Ionicons name="time-outline" size={48} color="#D1D5DB" />
            <Text style={styles.noHoursText}>Opening hours not specified</Text>
          </View>
        )}

        {shopData?.timezone && (
          <Text style={styles.timezoneText}>Timezone: {shopData.timezone}</Text>
        )}
      </View>
    </View>
  );
};

const OffersTab: React.FC<ServiceTabProps> = ({ service }) => {
  const [shopData, setShopData] = useState<CompleteShopData | null>(null);

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const response = await normalizedShopService.getShopById(service.id);
        if (response.success && response.data) {
          console.log('🔍 Offers Tab - Shop discounts from same source as provider saves:', response.data?.discounts);
          setShopData(response.data);
        }
      } catch (error) {
        console.error('Error fetching shop data for offers tab:', error);
      }
    };
    fetchShopData();
  }, [service?.id]);

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pricetag-outline" size={20} color="#666" />
          <Text style={styles.sectionTitle}>Current Offers</Text>
        </View>
        
        {shopData?.discounts && Array.isArray(shopData.discounts) && shopData.discounts.length > 0 ? (
          <View style={styles.offersContainer}>
            {shopData.discounts
              .filter(discount => discount && discount.type && discount.value)
              .map((discount, index) => (
              <View key={index} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <Ionicons name="gift-outline" size={24} color="#F59E0B" />
                  <View style={styles.offerInfo}>
                    <Text style={styles.offerTitle}>
                      {discount.type === 'percentage' ? `${discount.value}% OFF` : `${discount.value} SEK OFF`}
                    </Text>
                    <Text style={styles.offerDescription}>{discount.description || 'Special offer'}</Text>
                  </View>
                </View>
                <Text style={styles.offerPeriod}>
                  Valid: {discount.start_date ? new Date(discount.start_date).toLocaleDateString() : 'Now'} - {discount.end_date ? new Date(discount.end_date).toLocaleDateString() : 'Ongoing'}
                </Text>
                {discount.usage_limit && (
                  <Text style={styles.offerUsage}>
                    Used: {discount.used_count || 0} / {discount.usage_limit}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noOffersContainer}>
            <Ionicons name="pricetag-outline" size={48} color="#D1D5DB" />
            <Text style={styles.noOffersText}>No current offers available</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const ReviewsTab: React.FC<ServiceTabProps> = ({ service }) => (
  <View style={styles.tabContent}>
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="star-outline" size={20} color="#666" />
        <Text style={styles.sectionTitle}>Reviews</Text>
      </View>
      <Text style={styles.descriptionText}>
        {service.reviews_count || 0} reviews • {service.rating || 0} ⭐
      </Text>
      <View style={styles.reviewsPlaceholder}>
        <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
        <Text style={styles.reviewsPlaceholderText}>Reviews feature coming soon</Text>
      </View>
    </View>
  </View>
);

const ServiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<ServiceDetailNavigationProp>();
  const route = useRoute<ServiceDetailScreenRouteProp>();
  
  // Get service data from route params - handle both cases safely
  const routeService = route.params?.service || null;
  const routeServiceId = route.params?.serviceId || route.params?.service?.id || null;
  
  const [service, setService] = useState<Service | null>(routeService || null);
  const [loading, setLoading] = useState(!routeService);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('about');
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [allStaffMembers, setAllStaffMembers] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [shopServices, setShopServices] = useState<any[]>([]);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [selectedServicesWithOptions, setSelectedServicesWithOptions] = useState<Map<string, Set<string>>>(new Map());
  const [servicesLoading, setServicesLoading] = useState(false);
  const [shopData, setShopData] = useState<CompleteShopData | null>(null);
  
  // Remove service options hook to fix React hooks order warning

  // Load service data if not passed directly
  useEffect(() => {
    const loadService = async () => {
      // If we already have the service data, no need to load
      if (routeService) {
        setService(routeService);
        setLoading(false);
        return;
      }

      // If we don't have a service ID, show error
      if (!routeServiceId) {
        console.error('❌ Route service ID is missing');
        setError('Service ID is missing');
        return;
      }
      
      console.log('🔍 Route service ID:', routeServiceId, 'Type:', typeof routeServiceId);

      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching service details for ID:', routeServiceId);
        
        // Fetch shop using normalized service (same as ShopDetailsScreen uses)
        const shopResponse = await normalizedShopService.getShopById(routeServiceId);
        
        if (!shopResponse.success || !shopResponse.data) {
          throw new Error(shopResponse.error || 'Failed to fetch shop details');
        }
        
        const shop = shopResponse.data;
        
        // Validate shop data before transformation
        if (!shop) {
          throw new Error('Shop data is null or undefined');
        }
        
        console.log('🔍 Shop data before transformation:', {
          id: shop.id,
          name: shop.name,
          category: shop.category,
          city: shop.city,
          country: shop.country
        });
        
        // Transform shop to service format
        const serviceData = transformShopToService(shop);
        setService(serviceData);
        
        console.log('✅ Successfully loaded service details:', serviceData.name);
        console.log('✅ Shop ID:', routeServiceId);
        
        // Load favorite status
        const mockUserId = '12345678-1234-1234-1234-123456789012'; // Replace with actual auth.uid()
        const favoriteResponse = await favoritesAPI.isFavorite(mockUserId, serviceData.id);
        if (favoriteResponse.success) {
          serviceData.is_favorite = favoriteResponse.data?.is_favorite || false;
          setService(serviceData);
        }
      } catch (err) {
        console.error('❌ Error loading service:', err);
        setError(err instanceof Error ? err.message : 'Failed to load service');
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [routeServiceId, routeService]);

  // Load services from shop_services table
  useEffect(() => {
    const loadShopServices = async () => {
      if (!routeServiceId) {
        console.log('⚠️ No route service ID for loading services');
        return;
      }

      try {
        setServicesLoading(true);
        console.log('🔍 Loading services for shop ID:', routeServiceId);
        
        // Fetch services directly from shop_services table
        const { data: servicesData, error: servicesError } = await supabase
          .from('shop_services')
          .select('*')
          .eq('shop_id', routeServiceId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });
          
        if (servicesError) {
          console.error('❌ Error fetching services:', servicesError);
          setShopServices([]);
        } else if (servicesData && servicesData.length > 0) {
          console.log('✅ Found', servicesData.length, 'active services');
          console.log('✅ Services with assigned_staff:', servicesData.map(s => ({ 
            name: s.name, 
            price: s.price,
            assigned_staff: s.assigned_staff,
            id: s.id
          })));
          setShopServices(servicesData);
        } else {
          console.log('❌ No active services found for shop:', routeServiceId);
          setShopServices([]);
        }
      } catch (error) {
        console.error('❌ Error in loadShopServices:', error);
        setShopServices([]);
      } finally {
        setServicesLoading(false);
      }
    };

    loadShopServices();
  }, [routeServiceId]); // Only depend on routeServiceId

  // Service options are now handled by the useServiceOptions hook below

  // Load all staff members initially - using same logic as ShopDetailsScreen
  useEffect(() => {
    const loadAllStaff = async () => {
      if (!routeServiceId) return;

      try {
        console.log('🔍 Loading all staff members for shop:', routeServiceId);
        
        // Use the same method as ShopDetailsScreen
        const staffResponse = await normalizedShopService.getStaffByShopId(routeServiceId);
        
        console.log('📊 Staff response:', staffResponse);
        
        let allStaff = [];
        
        if (staffResponse.success && staffResponse.data && staffResponse.data.length > 0) {
          allStaff = staffResponse.data;
          console.log('✅ Staff loaded from normalized service:', allStaff.length, 'staff members');
          console.log('✅ Staff details:', allStaff.map(s => ({ id: s.id, name: s.name, role: s.role })));
        } else {
          // Fallback to direct query (same as ShopDetailsScreen)
          console.log('⚠️ Normalized service failed, trying direct query...');
          
          const { data: staffData, error: staffError } = await supabase
            .from('shop_staff')
            .select('*')
            .eq('shop_id', routeServiceId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
          
          if (staffData && staffData.length > 0) {
            allStaff = staffData;
            console.log('✅ Staff loaded from direct query:', allStaff.length, 'staff members');
          } else {
            console.log('⚠️ No staff found for shop:', routeServiceId);
            console.log('   - Direct query error:', staffError);
          }
        }

        // Transform staff data - simplified since normalized service returns proper format
        const transformedStaff = allStaff.map((staff, index) => {
          // Generate placeholder avatar if none exists
          const avatarColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD'];
          const avatarColor = avatarColors[index % avatarColors.length];
          const placeholderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=${avatarColor.slice(1)}&color=fff&size=120`;
          
          return {
            id: staff.id,
            name: staff.name,
            avatar_url: staff.avatar_url || placeholderAvatar,
            specialties: Array.isArray(staff.specialties) ? staff.specialties : [],
            experience_years: staff.experience_years || 0,
            rating: staff.rating || 4.5,
            role: staff.role || 'Staff',
            email: staff.email || '',
            phone: staff.phone || '',
            bio: staff.bio || '',
            work_schedule: staff.work_schedule || {
              monday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              thursday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              friday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              saturday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              sunday: { isWorking: false, startTime: '09:00', endTime: '18:00' }
            },
            leave_dates: staff.leave_dates || []
          };
        });
        
        console.log('✅ Transformed staff:', transformedStaff.map(s => ({ id: s.id, name: s.name, role: s.role })));

        // Always add "Any Available Staff" as an option
        transformedStaff.push({
          id: 'any',
          name: 'Any Available',
          avatar_url: `https://ui-avatars.com/api/?name=Any&background=6B7280&color=fff&size=120`,
          specialties: ['All Services'],
          experience_years: 0,
          rating: 0,
          work_schedule: {
            monday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            thursday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            friday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            saturday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            sunday: { isWorking: true, startTime: '09:00', endTime: '18:00' }
          },
          leave_dates: []
        });

        setAllStaffMembers(transformedStaff);
        setStaffMembers(transformedStaff);
        console.log('✅ All staff loaded and set:', transformedStaff.length);
        console.log('✅ Staff names:', transformedStaff.map(s => s.name));

      } catch (err) {
        console.error('❌ Error loading all staff:', err);
        // Still add "Any Available" option even if there's an error
        const anyOption = {
          id: 'any',
          name: 'Any Available',
          avatar_url: `https://ui-avatars.com/api/?name=Any&background=6B7280&color=fff&size=120`,
          specialties: ['All Services'],
          experience_years: 0,
          rating: 0,
          role: '',
          email: '',
          phone: '',
          work_schedule: {
            monday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            thursday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            friday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            saturday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            sunday: { isWorking: true, startTime: '09:00', endTime: '18:00' }
          },
          leave_dates: []
        };
        setAllStaffMembers([anyOption]);
        setStaffMembers([anyOption]);
      }
    };

    loadAllStaff();
  }, [routeServiceId]); // Only depend on routeServiceId for initial load

  // Filter staff based on selected services
  useEffect(() => {
    if (allStaffMembers.length === 0) {
      console.log('⚠️ No staff members loaded yet');
      return; // Wait for staff to load first
    }

    // If no services selected, show all staff
    if (selectedServicesWithOptions.size === 0) {
      console.log('🔍 No services selected, showing all staff');
      setStaffMembers(allStaffMembers);
      return;
    }

    console.log('🔍 Filtering staff based on selected services...');
    
    const selectedServiceNames = Array.from(selectedServicesWithOptions.keys());
    console.log('🔍 Selected services:', selectedServiceNames);
    
    // Get the services data to check assigned_staff
    const selectedServicesData = shopServices.filter(service => 
      selectedServiceNames.includes(service.name)
    );
    
    console.log('🔍 Selected services data:', selectedServicesData);
    
    // Collect all staff IDs who can perform the selected services
    const availableStaffIds = new Set();
    
    selectedServicesData.forEach(service => {
      console.log(`📋 Service "${service.name}":`, {
        assigned_staff: service.assigned_staff,
        type: typeof service.assigned_staff,
        isArray: Array.isArray(service.assigned_staff)
      });
      
      if (service.assigned_staff) {
        let staffIds = service.assigned_staff;
        
        // Handle JSONB format
        if (typeof staffIds === 'string') {
          try {
            staffIds = JSON.parse(staffIds);
          } catch (e) {
            console.log(`   - Failed to parse assigned_staff as JSON:`, e);
            staffIds = [];
          }
        }
        
        if (Array.isArray(staffIds)) {
          staffIds.forEach(staffId => {
            console.log(`   - Adding staff ID: ${staffId}`);
            availableStaffIds.add(staffId.toString());
          });
        }
      }
    });
    
    console.log('🔍 Available staff IDs:', Array.from(availableStaffIds));
    console.log('🔍 All staff IDs:', allStaffMembers.map(s => s.id.toString()));
    
    // Filter staff based on assignments
    const filteredStaff = allStaffMembers.filter(staff => {
      // Always include "Any Available" option
      if (staff.id === 'any') return true;
      
      // If no staff assignments found, show all staff (service might not have assignments set)
      if (availableStaffIds.size === 0) return true;
      
      // Check if staff is assigned to any selected service
      const isAssigned = availableStaffIds.has(staff.id.toString());
      console.log(`   - Staff ${staff.name} (${staff.id}): ${isAssigned ? 'INCLUDED' : 'EXCLUDED'}`);
      return isAssigned;
    });
    
    console.log('🔍 Filtered staff:', filteredStaff.map(s => s.name));
    setStaffMembers(filteredStaff);

  }, [selectedServicesWithOptions, shopServices, allStaffMembers]);

  // Load service options for each service
  useEffect(() => {
    const loadServiceOptions = async () => {
      if (!shopServices || shopServices.length === 0) return;

      try {
        setServicesLoading(true);
        console.log('🔍 Loading options for services:', shopServices.length);
        
        // Load options for each service
        const servicesWithOptions = await Promise.all(
          shopServices.map(async (service) => {
            // Only try to load options if service has a valid ID (UUID)
            if (!service.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(service.id)) {
              console.warn('⚠️ Skipping service options for invalid service ID:', service.id, 'Service:', service.name);
              return service;
            }
            
            const { data: options, error } = await serviceOptionsAPI.getServiceOptions(
              service.id,
              routeServiceId || service.shop_id
            );
            
            if (error) {
              console.error('❌ Error loading options for service:', service.name, error);
            }
            
            if (!error && options) {
              return { ...service, options };
            }
            return service;
          })
        );
        
        setShopServices(servicesWithOptions);
        console.log('✅ Loaded service options successfully');
      } catch (err) {
        console.error('❌ Error loading service options:', err);
      } finally {
        setServicesLoading(false);
      }
    };

    // Only load if we have services and haven't loaded options yet
    if (shopServices.length > 0 && !shopServices.some(s => s.options)) {
      loadServiceOptions();
    }
  }, [shopServices, routeServiceId]);

  // Calculate selected count for display
  const selectedCount = Array.from(selectedServicesWithOptions.values())
    .reduce((sum, options) => sum + options.size, 0);

  // Load shop data directly from provider_businesses for images
  useEffect(() => {
    if (!service?.id) return;
    
    const loadShopData = async () => {
      try {
        console.log('📷 Loading shop images from provider_businesses table...');
        
        // Get images directly from provider_businesses table
        const { data: shopData, error: shopError } = await supabase
          .from('provider_businesses')
          .select('images, image_url, logo_url, name')
          .eq('id', service.id)
          .single();
          
        if (!shopError && shopData) {
          console.log('📷 Shop images data loaded:', {
            hasImages: !!shopData.images,
            imagesType: typeof shopData.images,
            imagesLength: Array.isArray(shopData.images) ? shopData.images.length : 'not array',
            imageUrls: shopData.images,
            image_url: shopData.image_url,
            logo_url: shopData.logo_url
          });
          setShopData(shopData);
        } else {
          console.error('❌ Failed to load shop images:', shopError?.message);
        }
      } catch (error) {
        console.error('❌ Error loading shop images:', error);
      }
    };
    loadShopData();
  }, [service?.id]);

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading service details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            {error || 'Service not found'}
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Get images from provider_businesses.images JSONB column
  const getAllImages = () => {
    const allImages = [];
    
    console.log('📷 Getting images from provider_businesses...');
    console.log('ShopData:', shopData);
    
    // Get images from provider_businesses.images (JSONB array)
    if (shopData?.images && Array.isArray(shopData.images)) {
      const validImages = shopData.images.filter(img => img && img.trim() !== '');
      allImages.push(...validImages);
      console.log('📷 Added provider_businesses.images:', validImages.length, validImages);
    }
    
    // Add image_url if it exists and is not already included
    if (shopData?.image_url && shopData.image_url.trim() !== '' && !allImages.includes(shopData.image_url)) {
      allImages.push(shopData.image_url);
      console.log('📷 Added provider_businesses.image_url');
    }
    
    // Fallback to service image if no images found
    if (allImages.length === 0 && service.image && service.image.trim() !== '') {
      allImages.push(service.image);
      console.log('📷 Added fallback service.image');
    }
    
    // Add certificate images if available
    if (service.certificate_images && Array.isArray(service.certificate_images)) {
      const validCerts = service.certificate_images.filter(img => img && img.trim() !== '');
      allImages.push(...validCerts);
      console.log('🏆 Added certificate images:', validCerts.length);
    }
    
    // Add before/after images if available
    if (service.before_after_images && Array.isArray(service.before_after_images)) {
      const validBeforeAfter = service.before_after_images.filter(img => img && img.trim() !== '');
      allImages.push(...validBeforeAfter);
      console.log('🔄 Added before/after images:', validBeforeAfter.length);
    }
    
    console.log('📷 Final images array:', allImages.length, allImages);
    return allImages;
  };
  
  const allServiceImages = getAllImages();

  const handleBookNow = () => {
    if (selectedServicesWithOptions.size === 0) {
      Alert.alert('No Selection', 'Please select at least one service to continue.');
      return;
    }

    if (!selectedStaff) {
      Alert.alert('No Staff Selected', 'Please select a staff member to continue.');
      return;
    }

    // Prepare selected services for booking
    const selectedServices: any[] = [];
    selectedServicesWithOptions.forEach((optionIds, serviceName) => {
      const service = shopServices.find(s => s.name === serviceName);
      if (service) {
        if (optionIds.has('base')) {
          // Base service selected
          selectedServices.push({
            id: service.id,
            name: service.name,
            price: service.price,
            duration: service.duration,
            type: 'base'
          });
        } else {
          // Options selected
          optionIds.forEach(optionId => {
            const option = service.options?.find((opt: any) => opt.id === optionId);
            if (option) {
              selectedServices.push({
                id: option.id,
                name: `${service.name} - ${option.option_name}`,
                price: option.price,
                duration: option.duration,
                type: 'option',
                serviceName: service.name
              });
            }
          });
        }
      }
    });

    const selectedStaffMember = staffMembers.find(staff => staff.id === selectedStaff);
    
    navigation.navigate('BookingSummary', {
      selectedServices,
      totalPrice: calculateTotalPrice(),
      selectedStaff: selectedStaffMember
    });
  };

  const handleFavoritePress = async () => {
    try {
      // Get current user - for now using mock user ID, replace with actual auth user
      const mockUserId = '12345678-1234-1234-1234-123456789012'; // Replace with actual auth.uid()
      
      const response = await favoritesAPI.toggleFavorite(mockUserId, service.id);
      
      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to update favorite');
        return;
      }
      
      // Update service state
      setService(prev => prev ? { ...prev, is_favorite: response.data?.is_favorite || false } : null);
      
      // Show feedback with better messaging
      const isNowFavorited = response.data?.is_favorite || false;
      const message = isNowFavorited ? 'Added to favorites!' : 'Removed from favorites';
      
      console.log('📝 Favorite status updated:', { 
        wasBlank: !service?.is_favorite, 
        nowFavorited: isNowFavorited, 
        message 
      });
      
      Alert.alert('Success', message);
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  // Toggle service expansion
  const toggleServiceExpansion = (serviceId: string) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  // Toggle service option selection
  const toggleServiceOption = (serviceName: string, optionId: string) => {
    setSelectedServicesWithOptions(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(serviceName)) {
        newMap.set(serviceName, new Set());
      }
      const options = newMap.get(serviceName)!;
      if (options.has(optionId)) {
        options.delete(optionId);
        if (options.size === 0) {
          newMap.delete(serviceName);
        }
      } else {
        options.add(optionId);
      }
      return newMap;
    });
  };

  // Calculate total price for selected services and options
  const calculateTotalPrice = () => {
    let total = 0;
    selectedServicesWithOptions.forEach((optionIds, serviceName) => {
      const service = shopServices.find(s => s.name === serviceName);
      if (service) {
        optionIds.forEach(optionId => {
          if (optionId === 'base') {
            // Base service selected
            total += service.price || 0;
          } else {
            // Option selected
            const option = service.options?.find((opt: any) => opt.id === optionId);
            if (option) {
              total += option.price || 0;
            }
          }
        });
      }
    });
    return total;
  };

  // Removed old renderOptionItem as we're using services view now

  // Render services with dropdown options
  const renderServicesContent = () => {
    console.log('🛠️ Rendering services content...');
    console.log('🛠️ Services loading:', servicesLoading);
    console.log('🛠️ Shop services:', shopServices);
    console.log('🛠️ Shop services length:', shopServices?.length);
    console.log('🛠️ Shop services type:', typeof shopServices);
    console.log('🛠️ Shop services is array:', Array.isArray(shopServices));
    console.log('🛠️ Current route service ID:', routeServiceId);
    console.log('🛠️ Current service name:', service?.name);
    
    if (servicesLoading) {
      console.log('🔄 Showing loading state');
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      );
    }

    if (!shopServices || shopServices.length === 0) {
      console.log('⚠️ Showing no services state - shopServices:', shopServices);
      return (
        <View style={styles.noOptionsContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#6B7280" />
          <Text style={styles.noOptionsText}>No services available</Text>
          <Text style={styles.noOptionsSubtext}>This shop has not added any services yet</Text>
        </View>
      );
    }
    
    console.log('✅ Rendering', shopServices.length, 'services');

    return (
      <View style={styles.servicesContainer}>
        <Text style={styles.sectionTitle}>Available Services</Text>
        <Text style={styles.sectionSubtitle}>Select services and customize with options</Text>
        
        {shopServices.map((service, index) => (
          <View key={service.id || index} style={styles.serviceCard}>
            <TouchableOpacity 
              style={styles.serviceHeader}
              onPress={() => toggleServiceExpansion(service.id || service.name)}
            >
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
                <View style={styles.serviceDetails}>
                  <View style={styles.serviceDetailItem}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.serviceDetailText}>{service.duration || 0} min</Text>
                  </View>
                  <View style={styles.serviceDetailItem}>
                    <Ionicons name="cash-outline" size={16} color="#6B7280" />
                    <Text style={styles.serviceDetailText}>From {service.price || 0} SEK</Text>
                  </View>
                </View>
              </View>
              <Ionicons 
                name={expandedServices.has(service.id || service.name) ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#6B7280" 
              />
            </TouchableOpacity>
            
            {expandedServices.has(service.id || service.name) && (
              <View style={styles.serviceOptionsDropdown}>
                {(!service.options || service.options.length === 0) ? (
                  <View style={styles.noOptionsMessage}>
                    <Text style={styles.noOptionsText}>No options available for this service</Text>
                    <TouchableOpacity
                      style={styles.selectBaseService}
                      onPress={() => toggleServiceOption(service.name, 'base')}
                    >
                      <View style={[styles.checkbox, selectedServicesWithOptions.get(service.name)?.has('base') && styles.checkboxSelected]}>
                        {selectedServicesWithOptions.get(service.name)?.has('base') && <Ionicons name="checkmark" size={16} color="white" />}
                      </View>
                      <Text style={styles.selectBaseServiceText}>Select base service ({service.price} SEK)</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  service.options.map((option: any) => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.serviceOption}
                      onPress={() => toggleServiceOption(service.name, option.id)}
                    >
                      <View style={styles.optionLeft}>
                        <View style={[styles.checkbox, selectedServicesWithOptions.get(service.name)?.has(option.id) && styles.checkboxSelected]}>
                          {selectedServicesWithOptions.get(service.name)?.has(option.id) && <Ionicons name="checkmark" size={16} color="white" />}
                        </View>
                        <View style={styles.optionInfo}>
                          <Text style={styles.optionName}>{option.option_name}</Text>
                          {option.option_description && <Text style={styles.optionDescription}>{option.option_description}</Text>}
                          <Text style={styles.optionDuration}>{option.duration} min</Text>
                        </View>
                      </View>
                      <Text style={styles.optionPrice}>{option.price} SEK</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        ))}
        
        {selectedServicesWithOptions.size > 0 && (
          <View style={styles.selectedOptionSummary}>
            <Text style={styles.summaryTitle}>Selected Services ({selectedServicesWithOptions.size})</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Price</Text>
              <Text style={styles.summaryValue}>{calculateTotalPrice()} SEK</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Removed old renderOptionsContent as we're using renderServicesContent now

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Image Carousel */}
        <ImageCarousel
          images={allServiceImages}
          service={service}
          onBackPress={() => navigation.goBack()}
          onFavoritePress={handleFavoritePress}
        />

        {/* Service Info */}
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View style={styles.shopInfoSection}>
              {/* Shop Logo before name */}
              <View style={styles.shopLogoAndName}>
                {shopData?.logo_url ? (
                  <Image 
                    source={{ uri: shopData.logo_url }} 
                    style={styles.shopLogo}
                    onError={() => console.log('❌ Logo failed to load:', shopData.logo_url)}
                    onLoad={() => console.log('✅ Logo loaded successfully')}
                  />
                ) : (
                  <View style={styles.shopLogoPlaceholder}>
                    <Ionicons name="storefront" size={32} color="#F59E0B" />
                  </View>
                )}
                <View style={styles.shopNameSection}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={18} color="#FFC107" />
                    <Text style={styles.ratingText}>{service.rating || 0}</Text>
                    <Text style={styles.reviewsText}>({service.reviews_count || 0} recensioner)</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>From {service.price || 0} SEK</Text>
              <Text style={styles.timeText}>{service.duration || 0} min</Text>
            </View>
          </View>

          {/* Step 1: Service Selection */}
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Select Services</Text>
              {selectedServicesWithOptions.size > 0 && (
                <Text style={styles.stepCount}>{selectedServicesWithOptions.size} selected</Text>
              )}
            </View>
            {renderServicesContent()}
          </View>

          {/* Step 2: Staff Selection - always show staff selection */}
          {true && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepTitleContainer}>
                  <Text style={styles.stepTitle}>
                    Select Staff Member
                  </Text>
                  {selectedServicesWithOptions.size === 0 && (
                    <Text style={styles.stepSubtitle}>
                      Select services above for filtering
                    </Text>
                  )}
                </View>
                {selectedStaff && (
                  <Text style={styles.stepCount}>
                    {staffMembers.find(s => s.id === selectedStaff)?.name || 'Selected'}
                  </Text>
                )}
              </View>
              {staffMembers.length > 0 ? (
                <StaffSelectionSection 
                  staffMembers={staffMembers}
                  selectedStaff={selectedStaff}
                  onSelectStaff={setSelectedStaff}
                />
              ) : (
                <View style={styles.noStaffContainer}>
                  <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.noStaffText}>No staff members available</Text>
                  <Text style={styles.noStaffSubtext}>Please contact the shop to add staff members</Text>
                </View>
              )}
            </View>
          )}

          {/* Tabs - moved to bottom for additional information */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'about' && styles.activeTab]}
              onPress={() => setActiveTab('about')}
            >
              <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'hours' && styles.activeTab]}
              onPress={() => setActiveTab('hours')}
            >
              <Text style={[styles.tabText, activeTab === 'hours' && styles.activeTabText]}>Hours</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
              onPress={() => setActiveTab('offers')}
            >
              <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>Offers</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
              onPress={() => setActiveTab('reviews')}
            >
              <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Reviews</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContentContainer}>
            {activeTab === 'about' && <AboutTab service={service} />}
            {activeTab === 'hours' && <HoursTab service={service} />}
            {activeTab === 'offers' && <OffersTab service={service} />}
            {activeTab === 'reviews' && <ReviewsTab service={service} />}
          </View>

          {/* Book Button */}
          <TouchableOpacity 
            style={[
              styles.bookButton, 
              (selectedServicesWithOptions.size === 0 || !selectedStaff || servicesLoading) && styles.bookButtonDisabled
            ]}
            onPress={handleBookNow}
            disabled={selectedServicesWithOptions.size === 0 || !selectedStaff || servicesLoading}
          >
            <View style={styles.bookButtonContent}>
              <Text style={styles.bookButtonText}>
                {servicesLoading 
                  ? 'Loading...' 
                  : (selectedServicesWithOptions.size === 0
                    ? 'Select Services to Continue'
                    : !selectedStaff 
                      ? 'Select Staff to Continue'
                      : `Book Now • ${calculateTotalPrice()} SEK`
                  )
                }
              </Text>
              {selectedServicesWithOptions.size > 0 && selectedStaff && !servicesLoading && (
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF3C7', // Light accent cream honey
  },
  tabContent: {
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#F59E0B', // Primary amber/honey
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280', // Dark gray for inactive tabs
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1F2937', // Dark accent charcoal black
    fontWeight: '600',
  },
  tabContentContainer: {
    minHeight: 150,
    marginBottom: 16,
  },
  optionsContainer: {
    // Remove paddingHorizontal from here since it's already in contentContainer
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  clearAllContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'visible',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
  },
  stepTitleContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  stepCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#F59E0B', // Primary amber/honey
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#F59E0B', // Primary amber/honey
    borderColor: '#F59E0B',
  },
  optionsList: {
    paddingBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D', // Lighter honey border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedOption: {
    borderColor: '#F59E0B', // Primary amber/honey
    backgroundColor: '#FEF3C7', // Light accent cream honey
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937', // Dark accent charcoal black
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280', // Darker gray for better readability
    marginBottom: 4,
    lineHeight: 18,
  },
  optionDuration: {
    fontSize: 12,
    color: '#9CA3AF', // Lighter gray for less important info
    fontWeight: '500',
  },
  optionPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937', // Dark accent charcoal black
    marginRight: 12,
  },
  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#F59E0B', // Primary amber/honey
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: '#1F2937', // Dark accent charcoal black
    fontSize: 14,
    fontWeight: '700',
  },
  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Image Carousel Styles
  imageContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  imageScrollView: {
    flex: 1,
  },
  serviceImage: {
    width: screenWidth,
    height: 300,
  },
  backButton: {
    position: 'absolute',
    top: 44, // Adjusted for status bar height
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  favoriteButton: {
    position: 'absolute',
    top: 44, // Adjusted for status bar height
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  imageCounter: {
    position: 'absolute',
    top: 44, // Adjusted for status bar height
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#F59E0B',
    width: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveDot: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  // Rest of existing styles
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937', // Dark accent charcoal black
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937', // Dark accent charcoal black
    marginLeft: 4,
    marginRight: 8,
  },
  reviewsText: {
    fontSize: 14,
    color: '#6B7280', // Darker gray for better readability
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937', // Dark accent charcoal black
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280', // Darker gray for better readability
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginLeft: 8,
  },
  optionsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  locationText: {
    fontSize: 16,
    color: '#1A2533',
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4A4A4A',
  },
  bookButton: {
    backgroundColor: '#F59E0B', // Primary amber/honey
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bookButtonDisabled: {
    backgroundColor: '#FCD34D', // Lighter honey
    opacity: 0.7,
  },
  bookButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#1F2937', // Dark accent charcoal black
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  // Staff Selection Styles
  staffSection: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  staffScroll: {
    marginTop: 12,
    paddingBottom: 8,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 120,
    minHeight: 160,
    borderWidth: 2,
    borderColor: '#FCD34D',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedStaffCard: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  staffAvatar: {
    position: 'relative',
    marginBottom: 8,
  },
  staffImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
  },
  staffPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffCheckmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  staffName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 2,
    width: '100%',
  },
  selectedStaffName: {
    color: '#F59E0B',
  },
  staffRole: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  staffRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  staffRatingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },
  staffSpecialty: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  noStaffContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noStaffText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 12,
  },
  noStaffSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  // Service Options Styles
  baseServiceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
  },
  baseServiceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  baseServiceDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  baseServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  baseServiceInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  baseServiceInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  selectedPriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
  },
  serviceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedServiceOption: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  optionRadio: {
    marginRight: 16,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#F59E0B',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  optionContent: {
    flex: 1,
  },
  optionMetaRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  optionDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionDuration: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsList: {
    paddingBottom: 16,
  },
  selectedOptionSummary: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#78350F',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350F',
  },
  noOptionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noOptionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  noOptionsSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // New styles for services view
  servicesContainer: {
    padding: 4,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 16,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  serviceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  serviceOptionsDropdown: {
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  noOptionsMessage: {
    alignItems: 'center',
    padding: 16,
  },
  noOptionsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  selectBaseService: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectBaseServiceText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  serviceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  noImageText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // Contact section styles
  contactSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  // Hours tab styles
  hoursContainer: {
    marginTop: 16,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
  },
  hourTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  noHoursContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noHoursText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  timezoneText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  basicHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 8,
  },
  basicHoursText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  basicHoursNote: {
    fontSize: 12,
    color: '#A16207',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Offers tab styles
  offersContainer: {
    marginTop: 16,
  },
  offerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  offerDescription: {
    fontSize: 14,
    color: '#78350F',
    marginTop: 4,
  },
  offerPeriod: {
    fontSize: 12,
    color: '#A16207',
    marginTop: 8,
  },
  offerUsage: {
    fontSize: 12,
    color: '#A16207',
    marginTop: 4,
  },
  noOffersContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noOffersText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  // Reviews placeholder styles
  reviewsPlaceholder: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  reviewsPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  // Shop logo and name styles
  shopInfoSection: {
    flex: 1,
  },
  shopLogoAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shopLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  shopLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  shopNameSection: {
    flex: 1,
  },
});

export default ServiceDetailScreen;