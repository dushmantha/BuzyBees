import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useServiceOptions, ServiceUtils } from '../services/serviceUtils';
import { ServiceOptionState } from '../types/service';
import type { Service } from '../services/types/service';
import { shopAPI, Shop } from '../services/api/shops/shopAPI';
import { serviceOptionsAPI, ServiceOption } from '../services/api/serviceOptions/serviceOptionsAPI';

const { width: screenWidth } = Dimensions.get('window');

// Transform shop data to service format for backward compatibility
const transformShopToService = (shop: Shop): Service => ({
  id: shop.id,
  name: shop.name,
  description: shop.description,
  price: shop.services && shop.services.length > 0 ? shop.services[0].price : 500,
  duration: shop.services && shop.services.length > 0 ? shop.services[0].duration : 60,
  category_id: shop.category.toLowerCase().replace(/\s+/g, '-'),
  image: shop.images && shop.images.length > 0 ? shop.images[0] : shop.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
  rating: shop.rating || 4.5,
  reviews_count: shop.reviews_count || 0,
  professional_name: shop.staff && shop.staff.length > 0 ? shop.staff[0].name : 'Shop Owner',
  salon_name: shop.name,
  location: `${shop.city}, ${shop.country}`,
  distance: shop.distance || '1.5 km',
  available_times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
  certificate_images: [],
  before_after_images: shop.images && shop.images.length > 1 ? shop.images.slice(1, 3) : [],
  available_time_text: 'Available today',
  welcome_message: `Welcome to ${shop.name}! We provide excellent ${shop.category.toLowerCase()} services.`,
  special_note: shop.description,
  payment_methods: ['Card', 'Cash', 'Mobile Payment'],
  is_favorite: false,
  created_at: shop.created_at
});

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

  // Fallback to service image if no images provided, or use a fallback image
  const imageList = images.length > 0 ? images : [service.image || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop'];

  // Get image type label
  const getImageTypeLabel = (imageUrl: string, index: number) => {
    if (index === 0 && service.image === imageUrl) {
      return 'Main';
    }
    if (service.certificate_images?.includes(imageUrl)) {
      return 'Certificate';
    }
    if (service.before_after_images?.includes(imageUrl)) {
      return 'Before/After';
    }
    return null;
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

  const currentImageLabel = getImageTypeLabel(imageList[currentIndex], currentIndex);

  return (
    <View style={styles.imageContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.imageScrollView}
      >
        {imageList.map((image, index) => (
          <Image
            key={index}
            source={{ uri: image }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
        ))}
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
      >
        <Ionicons 
          name={service.is_favorite ? 'heart' : 'heart-outline'} 
          size={28} 
          color={service.is_favorite ? '#FF3B30' : '#fff'} 
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
          {staff.rating > 0 && (
            <View style={styles.staffRating}>
              <Ionicons name="star" size={12} color="#FFC107" />
              <Text style={styles.staffRatingText}>{staff.rating}</Text>
            </View>
          )}
          {staff.specialties.length > 0 && (
            <Text style={styles.staffSpecialty} numberOfLines={1}>
              {staff.specialties[0]}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// Tab components
const AboutTab: React.FC<ServiceTabProps> = ({ service }) => (
  <View style={styles.tabContent}>
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="information-circle-outline" size={20} color="#666" />
        <Text style={styles.sectionTitle}>Om behandlingen</Text>
      </View>
      <Text style={styles.descriptionText}>
        {service.description || 'No description available for this treatment.'}
      </Text>
    </View>
  </View>
);

const ReviewsTab: React.FC<ServiceTabProps> = ({ service }) => (
  <View style={styles.tabContent}>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reviews</Text>
      <Text style={styles.descriptionText}>
        {service.reviews_count || 0} reviews • {service.rating || 0} ⭐
      </Text>
      {/* Add more review content here */}
    </View>
  </View>
);

const LocationTab: React.FC<ServiceTabProps> = ({ service }) => (
  <View style={styles.tabContent}>
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="location-outline" size={20} color="#666" />
        <Text style={styles.sectionTitle}>Location</Text>
      </View>
      <Text style={styles.locationText}>{service.salon_name || service.location || 'Location not specified'}</Text>
      <Text style={styles.distanceText}>{service.distance || ''} away</Text>
      {/* Add map view here */}
    </View>
  </View>
);

const ServiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<ServiceDetailNavigationProp>();
  const route = useRoute<ServiceDetailScreenRouteProp>();
  
  // Get service data from route params - handle both cases
  const { service: routeService, serviceId: routeServiceId } = route.params;
  
  const [service, setService] = useState<Service | null>(routeService || null);
  const [loading, setLoading] = useState(!routeService);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('services');
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [shopServices, setShopServices] = useState<any[]>([]);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [selectedServicesWithOptions, setSelectedServicesWithOptions] = useState<Map<string, Set<string>>>(new Map());
  const [servicesLoading, setServicesLoading] = useState(false);
  // Removed duplicate service options state - we'll use the useServiceOptions hook instead

  // Load service data if not passed directly
  useEffect(() => {
    const loadService = async () => {
      // If we already have the service data, no need to load
      if (service) return;

      // If we don't have a service ID, show error
      if (!routeServiceId) {
        setError('Service ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching service details for ID:', routeServiceId);
        
        // First try to get all shops to find the one with matching ID
        const shopsResponse = await shopAPI.getAllShops();
        
        if (shopsResponse.error || !shopsResponse.data) {
          throw new Error(shopsResponse.error || 'Failed to fetch shops');
        }
        
        // Find the shop with matching ID
        const shop = shopsResponse.data.find(s => s.id === routeServiceId);
        
        if (!shop) {
          throw new Error('Service not found');
        }
        
        // Transform shop to service format
        const serviceData = transformShopToService(shop);
        setService(serviceData);
        
        // Also load shop services
        if (shop.services && Array.isArray(shop.services)) {
          setShopServices(shop.services);
        }
        
        console.log('✅ Successfully loaded service details:', serviceData.name);
        console.log('✅ Shop services:', shop.services?.length || 0);
      } catch (err) {
        console.error('❌ Error loading service:', err);
        setError(err instanceof Error ? err.message : 'Failed to load service');
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [routeServiceId, service]);

  // Service options are now handled by the useServiceOptions hook below

  // Load real staff members data from Supabase
  useEffect(() => {
    const loadStaffMembers = async () => {
      if (!service || !routeServiceId) return;

      try {
        console.log('🔍 Fetching staff members for service:', routeServiceId);
        
        // Get the shop details again to access staff data
        const shopsResponse = await shopAPI.getAllShops();
        
        if (shopsResponse.error || !shopsResponse.data) {
          console.warn('⚠️ Could not fetch shops for staff data');
          return;
        }
        
        // Find the shop with matching ID
        const shop = shopsResponse.data.find(s => s.id === routeServiceId);
        
        if (!shop || !shop.staff) {
          console.warn('⚠️ No staff data found for shop');
          // Set default "Any Available Staff" option
          setStaffMembers([
            {
              id: 'any',
              name: 'Any Available Staff',
              avatar_url: null,
              specialties: [],
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
            }
          ]);
          return;
        }

        // Transform staff data from Supabase format to expected format
        const transformedStaff = shop.staff.map(staff => ({
          id: staff.id,
          name: staff.name,
          avatar_url: staff.avatar_url,
          specialties: staff.specialties || [],
          experience_years: staff.experience_years || 0,
          rating: staff.rating || 4.5,
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
        }));

        // Always add "Any Available Staff" as an option
        const staffWithAnyOption = [
          ...transformedStaff,
          {
            id: 'any',
            name: 'Any Available Staff',
            avatar_url: null,
            specialties: [],
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
          }
        ];

        setStaffMembers(staffWithAnyOption);
        console.log('✅ Successfully loaded staff members:', staffWithAnyOption.length);
      } catch (err) {
        console.error('❌ Error loading staff members:', err);
        // Fallback to default staff option
        setStaffMembers([
          {
            id: 'any',
            name: 'Any Available Staff',
            avatar_url: null,
            specialties: [],
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
          }
        ]);
      }
    };

    loadStaffMembers();
  }, [service, routeServiceId]);

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
            const { data: options, error } = await serviceOptionsAPI.getServiceOptions(
              service.name,
              routeServiceId || service.shop_id
            );
            
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

    loadServiceOptions();
  }, [shopServices.length, routeServiceId]);

  // Get the service name for the hook (service options are keyed by service name)
  const serviceName = service?.name || 'Hair Cut';

  // Use the custom hook for managing service options
  const {
    options,
    loading: optionsLoading,
    error: optionsError,
    totalPrice,
    hasSelections,
    selectedCount,
    actions
  } = useServiceOptions(serviceName);

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

  // Combine all available images from the service
  const serviceImages = [
    service.image,
    ...(service.certificate_images || []),
    ...(service.before_after_images || [])
  ].filter(Boolean) as string[];

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

  const handleFavoritePress = () => {
    // Implement favorite toggle logic
    console.log('Toggle favorite');
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
          const option = service.options?.find((opt: any) => opt.id === optionId);
          if (option) {
            total += option.price || 0;
          }
        });
      }
    });
    return total;
  };

  const renderOptionItem = ({ item }: { item: ServiceOptionState }) => (
    <TouchableOpacity 
      style={[styles.optionItem, item.selected && styles.selectedOption]}
      onPress={() => actions.toggleOption(item.id)}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.checkbox, item.selected && styles.checkboxSelected]}>
          {item.selected && <Ionicons name="checkmark" size={16} color="white" />}
        </View>
        <View style={styles.optionInfo}>
          <Text style={styles.optionName}>{item.name}</Text>
          <Text style={styles.optionDescription}>{item.description}</Text>
          <Text style={styles.optionDuration}>{item.duration}</Text>
        </View>
      </View>
      <View style={styles.optionPriceContainer}>
        <Text style={styles.optionPrice}>{item.price}</Text>
        {item.selected && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
      </View>
    </TouchableOpacity>
  );

  // Render services with dropdown options
  const renderServicesContent = () => {
    if (servicesLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      );
    }

    if (!shopServices || shopServices.length === 0) {
      return (
        <View style={styles.noOptionsContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#6B7280" />
          <Text style={styles.noOptionsText}>No services available</Text>
          <Text style={styles.noOptionsSubtext}>This shop has not added any services yet</Text>
        </View>
      );
    }

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
                    <Text style={styles.serviceDetailText}>{service.duration || 60} min</Text>
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

  const renderOptionsContent = () => {
    if (optionsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading service options...</Text>
        </View>
      );
    }

    if (optionsError) {
      return (
        <View style={styles.noOptionsContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.noOptionsText}>Error loading service options</Text>
          <Text style={styles.noOptionsSubtext}>{optionsError}</Text>
        </View>
      );
    }

    if (!options || options.length === 0) {
      // If no options, show the base service info
      return (
        <View style={styles.optionsContainer}>
          <View style={styles.baseServiceCard}>
            <Ionicons name="checkmark-circle" size={48} color="#F59E0B" />
            <Text style={styles.baseServiceTitle}>Standard Service</Text>
            <Text style={styles.baseServiceDescription}>
              {service?.description || 'Professional service with standard duration and pricing'}
            </Text>
            <View style={styles.baseServiceInfo}>
              <View style={styles.baseServiceInfoItem}>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
                <Text style={styles.baseServiceInfoText}>{service?.duration || 60} min</Text>
              </View>
              <View style={styles.baseServiceInfoItem}>
                <Ionicons name="cash-outline" size={20} color="#6B7280" />
                <Text style={styles.baseServiceInfoText}>{service?.price || 500} SEK</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.optionsContainer}>
        <Text style={styles.sectionTitle}>Available Options</Text>
        <Text style={styles.sectionSubtitle}>Select the service options that best fit your needs</Text>
        
        <FlatList
          data={options}
          renderItem={renderOptionItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.optionsList}
        />
        
        {hasSelections && (
          <View style={styles.selectedOptionSummary}>
            <Text style={styles.summaryTitle}>Selected Options ({selectedCount})</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Price</Text>
              <Text style={styles.summaryValue}>{totalPrice} SEK</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Image Carousel */}
        <ImageCarousel
          images={serviceImages}
          service={service}
          onBackPress={() => navigation.goBack()}
          onFavoritePress={handleFavoritePress}
        />

        {/* Service Info */}
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.serviceName}>{service.name}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={18} color="#FFC107" />
                <Text style={styles.ratingText}>{service.rating || 0}</Text>
                <Text style={styles.reviewsText}>({service.reviews_count || 0} recensioner)</Text>
              </View>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>From ${service.price || 0}</Text>
              <Text style={styles.timeText}>{service.duration || 30} min</Text>
            </View>
          </View>

          {/* Staff Selection */}
          <StaffSelectionSection 
            staffMembers={staffMembers}
            selectedStaff={selectedStaff}
            onSelectStaff={setSelectedStaff}
          />

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'services' && styles.activeTab]}
              onPress={() => setActiveTab('services')}
            >
              <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
                Services {selectedServicesWithOptions.size > 0 && `(${selectedServicesWithOptions.size})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'about' && styles.activeTab]}
              onPress={() => setActiveTab('about')}
            >
              <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
              onPress={() => setActiveTab('reviews')}
            >
              <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Reviews</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'location' && styles.activeTab]}
              onPress={() => setActiveTab('location')}
            >
              <Text style={[styles.tabText, activeTab === 'location' && styles.activeTabText]}>Location</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContentContainer}>
            {activeTab === 'services' && renderServicesContent()}
            {activeTab === 'about' && <AboutTab service={service} />}
            {activeTab === 'reviews' && <ReviewsTab service={service} />}
            {activeTab === 'location' && <LocationTab service={service} />}
          </View>

          {/* Book Button */}
          <TouchableOpacity 
            style={[
              styles.bookButton, 
              (selectedServicesWithOptions.size === 0 || !selectedStaff || servicesLoading) && styles.bookButtonDisabled
            ]}
            onPress={handleBookNow}
            disabled={(!hasSelections && options.length > 0) || !selectedStaff || optionsLoading}
          >
            <View style={styles.bookButtonContent}>
              <Text style={styles.bookButtonText}>
                {optionsLoading 
                  ? 'Loading...' 
                  : ((!hasSelections && options.length > 0)
                    ? 'Select Options to Continue'
                    : !selectedStaff 
                      ? 'Select Staff to Continue'
                      : `Book Now • ${totalPrice} SEK`
                  )
                }
              </Text>
              {(hasSelections || options.length === 0) && selectedStaff && !optionsLoading && (
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
    marginVertical: 16,
  },
  staffScroll: {
    marginTop: 12,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
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
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  staffPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedStaffName: {
    color: '#F59E0B',
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
    padding: 16,
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
});

export default ServiceDetailScreen;