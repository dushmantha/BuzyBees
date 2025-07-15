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

    const selectedServices = ServiceUtils.prepareSelectedServicesForBooking(options);
    
    navigation.navigate('BookingSummary', {
      selectedServices,
      totalPrice
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
              (!hasSelections || optionsLoading) && styles.bookButtonDisabled
            ]}
            onPress={handleBookNow}
            disabled={!hasSelections || optionsLoading}
          >
            <View style={styles.bookButtonContent}>
              <Text style={styles.bookButtonText}>
                {optionsLoading ? 'Loading...' : hasSelections ? `Book Now • ${ServiceUtils.formatPrice(totalPrice)}` : 'Select Options to Continue'}
              </Text>
              {hasSelections && !optionsLoading && (
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
    backgroundColor: '#fff',
  },
  tabContent: {
    paddingTop: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1A2533',
    marginBottom: -1,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1A2533',
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
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  optionsList: {
    paddingBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#F8F9F8',
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A2533',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  optionDuration: {
    fontSize: 12,
    color: '#999',
  },
  optionPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
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
    backgroundColor: '#1A2533',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#1A2533',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginLeft: 4,
    marginRight: 8,
  },
  reviewsText: {
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2533',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#1A2533',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default ServiceDetailScreen;