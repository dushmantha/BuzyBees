import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useServiceOptions, ServiceUtils } from '../services/serviceUtils';
import { ServiceOptionState } from '../types/service';
import type { Service } from '../services/types/service';
import mockService from '../services/api/mock/index';

const { width: screenWidth } = Dimensions.get('window');

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

  // Fallback to placeholder if no images
  const imageList = images.length > 0 ? images : ['https://via.placeholder.com/400x300'];

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
  const [activeTab, setActiveTab] = useState('options');
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);

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
        
        const response = await mockService.getServiceById(routeServiceId);
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        if (!response.data) {
          throw new Error('Service not found');
        }
        
        setService(response.data);
      } catch (err) {
        console.error('Error loading service:', err);
        setError(err instanceof Error ? err.message : 'Failed to load service');
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [routeServiceId, service]);

  // Mock staff members data
  useEffect(() => {
    // Simulate loading staff members for the service
    if (service) {
      setStaffMembers([
        {
          id: 'staff1',
          name: 'Anna Anderson',
          avatar_url: 'https://i.pravatar.cc/150?img=1',
          specialties: ['Manicure', 'Pedicure', 'Nail Art'],
          experience_years: 5,
          rating: 4.8,
          work_schedule: {
            monday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
            tuesday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
            wednesday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
            thursday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
            friday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
            saturday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
            sunday: { isWorking: false, startTime: '09:00', endTime: '17:00' }
          },
          leave_dates: [
            { title: 'Vacation', startDate: '2025-08-15', endDate: '2025-08-20', type: 'leave' }
          ]
        },
        {
          id: 'staff2',
          name: 'Maria Johansson',
          avatar_url: 'https://i.pravatar.cc/150?img=2',
          specialties: ['Gel Nails', 'Nail Extensions'],
          experience_years: 3,
          rating: 4.6,
          work_schedule: {
            monday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
            tuesday: { isWorking: true, startTime: '10:00', endTime: '18:00' },
            wednesday: { isWorking: true, startTime: '10:00', endTime: '18:00' },
            thursday: { isWorking: true, startTime: '10:00', endTime: '18:00' },
            friday: { isWorking: true, startTime: '10:00', endTime: '18:00' },
            saturday: { isWorking: true, startTime: '10:00', endTime: '15:00' },
            sunday: { isWorking: false, startTime: '09:00', endTime: '17:00' }
          },
          leave_dates: []
        },
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
  }, [service]);

  // Get the service ID for the hook - either from the loaded service or the route param
  const serviceId = service?.id || routeServiceId;

  // Use the custom hook for managing service options (only if we have a serviceId)
  const {
    options,
    loading: optionsLoading,
    error: optionsError,
    totalPrice,
    hasSelections,
    selectedCount,
    actions
  } = useServiceOptions(serviceId || '');

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
    if (!hasSelections) {
      Alert.alert('No Selection', 'Please select at least one service option to continue.');
      return;
    }

    if (!selectedStaff) {
      Alert.alert('No Staff Selected', 'Please select a staff member to continue.');
      return;
    }

    const selectedServices = ServiceUtils.prepareSelectedServicesForBooking(options);
    const selectedStaffMember = staffMembers.find(staff => staff.id === selectedStaff);
    
    navigation.navigate('BookingSummary', {
      selectedServices,
      totalPrice,
      selectedStaff: selectedStaffMember
    });
  };

  const handleFavoritePress = () => {
    // Implement favorite toggle logic
    console.log('Toggle favorite');
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
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{optionsError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={actions.refetch}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (options.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>No service options available</Text>
        </View>
      );
    }

    return (
      <View style={styles.optionsContainer}>
        <View style={styles.optionsHeader}>
          <Text style={styles.optionsSectionTitle}>Select service options</Text>
          {selectedCount > 0 && (
            <View style={styles.selectionSummary}>
              <Text style={styles.selectionText}>
                {selectedCount} selected • {ServiceUtils.formatPrice(totalPrice)}
              </Text>
              <TouchableOpacity 
                onPress={actions.clearAllSelections}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <FlatList
          data={options}
          renderItem={renderOptionItem}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.optionsList}
        />
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
              style={[styles.tab, activeTab === 'options' && styles.activeTab]}
              onPress={() => setActiveTab('options')}
            >
              <Text style={[styles.tabText, activeTab === 'options' && styles.activeTabText]}>
                Options {selectedCount > 0 && `(${selectedCount})`}
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
            {activeTab === 'options' && renderOptionsContent()}
            {activeTab === 'about' && <AboutTab service={service} />}
            {activeTab === 'reviews' && <ReviewsTab service={service} />}
            {activeTab === 'location' && <LocationTab service={service} />}
          </View>

          {/* Book Button */}
          <TouchableOpacity 
            style={[
              styles.bookButton, 
              (!hasSelections || !selectedStaff || optionsLoading) && styles.bookButtonDisabled
            ]}
            onPress={handleBookNow}
            disabled={!hasSelections || !selectedStaff || optionsLoading}
          >
            <View style={styles.bookButtonContent}>
              <Text style={styles.bookButtonText}>
                {optionsLoading 
                  ? 'Loading...' 
                  : (!hasSelections 
                    ? 'Select Options to Continue'
                    : !selectedStaff 
                      ? 'Select Staff to Continue'
                      : `Book Now • ${ServiceUtils.formatPrice(totalPrice)}`
                  )
                }
              </Text>
              {hasSelections && selectedStaff && !optionsLoading && (
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
});

export default ServiceDetailScreen;