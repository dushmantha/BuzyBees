import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Image, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import mockService from '../services/api/mock';
import Ionicons from 'react-native-vector-icons/Ionicons';

type ServiceListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ServiceList'>;
type ServiceListScreenRouteProp = RouteProp<RootStackParamList, 'ServiceList'>;

interface Service {
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
  salon_name: string;
  location: string;
  distance: string;
  available_times: string[];
  certificate_images: string[];
  before_after_images: string[];
  available_time_text: string;
  welcome_message: string;
  special_note: string;
  payment_methods: string[];
  is_favorite: boolean;
  created_at: string;
}

interface FilterOptions {
  priceRange: { min: number; max: number };
  locations: string[];
  durations: number[];
  categories: any[];
  paymentMethods: string[];
  sortOptions: { value: string; label: string }[];
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  total_count?: number;
  has_more?: boolean;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

const ServiceListScreen = () => {
  const navigation = useNavigation<ServiceListScreenNavigationProp>();
  const route = useRoute<ServiceListScreenRouteProp>();
  const category = route.params?.category || 'All Services';
  const categoryId = route.params?.categoryId;
  const showPopular = route.params?.showPopular || false;

  // State management
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    price_min: undefined as number | undefined,
    price_max: undefined as number | undefined,
    rating_min: undefined as number | undefined,
    location: undefined as string | undefined,
    sort_by: 'popularity' as 'price' | 'rating' | 'distance' | 'popularity',
    sort_order: 'desc' as 'asc' | 'desc'
  });

  // Single API service function for comprehensive data fetching
  const apiService = {
    async getServiceListData(params?: {
      searchQuery?: string;
      categoryId?: string;
      showPopular?: boolean;
      filters?: any;
    }): Promise<ApiResponse<{
      services: Service[];
      totalResults: number;
      filterOptions: FilterOptions;
    }>> {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        let serviceResponse;
        
        // Handle popular services specifically
        if (params?.showPopular) {
          serviceResponse = await mockService.getPopularServices(params.filters);
        } else if (params?.searchQuery?.trim()) {
          serviceResponse = await mockService.searchServices(params.searchQuery, {
            category_id: params.categoryId,
            ...params.filters
          });
        } else if (params?.categoryId && params.categoryId !== 'popular') {
          serviceResponse = await mockService.getServicesByCategory(params.categoryId, params.filters);
        } else {
          serviceResponse = await mockService.getServices(params?.filters);
        }

        const filterResponse = await mockService.getFilterOptions();

        if (serviceResponse.error) {
          throw new Error(serviceResponse.error);
        }

        return {
          data: {
            services: serviceResponse.data || [],
            totalResults: serviceResponse.meta?.total || 0,
            filterOptions: filterResponse.data || {
              priceRange: { min: 0, max: 1000 },
              locations: [],
              durations: [],
              categories: [],
              paymentMethods: [],
              sortOptions: []
            }
          },
          success: true
        };
      } catch (error) {
        console.error('API Error:', error);
        return {
          data: {
            services: [],
            totalResults: 0,
            filterOptions: {
              priceRange: { min: 0, max: 1000 },
              locations: [],
              durations: [],
              categories: [],
              paymentMethods: [],
              sortOptions: []
            }
          },
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch service data'
        };
      }
    },

    async toggleFavorite(userId: string, serviceId: string): Promise<ApiResponse<{ isFavorite: boolean }>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await mockService.toggleFavorite(userId, serviceId);
        return response;
      } catch (error) {
        console.error('Toggle favorite error:', error);
        return {
          data: { isFavorite: false },
          success: false,
          error: 'Failed to update favorite'
        };
      }
    }
  };

  // Load services with comprehensive data
  const loadServices = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const response = await apiService.getServiceListData({
        searchQuery,
        categoryId,
        showPopular,
        filters
      });

      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to load services');
        return;
      }

      setServices(response.data.services);
      setTotalResults(response.data.totalResults);
      setFilterOptions(response.data.filterOptions);
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, categoryId, showPopular, filters]);

  // Toggle favorite
  const toggleFavorite = async (serviceId: string) => {
    try {
      const response = await apiService.toggleFavorite('1', serviceId); // Mock user ID
      
      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to update favorite');
        return;
      }

      // Update local state
      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { ...service, is_favorite: response.data?.isFavorite || false }
          : service
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadServices(false);
  }, [loadServices]);

  // Handle search
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle sort change
  const handleSortChange = (sortBy: string) => {
    const [sort_by, sort_order] = sortBy.includes('_') 
      ? sortBy.split('_') 
      : [sortBy, 'desc'];
    
    setFilters(prev => ({
      ...prev,
      sort_by: sort_by as any,
      sort_order: sort_order as 'asc' | 'desc'
    }));
  };

  // Handle navigation back
  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    } else {
      Alert.alert('Navigation', 'Go back to previous screen');
    }
  };

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('☆');
    }
    while (stars.length < 5) {
      stars.push('☆');
    }
    
    return stars.join('');
  };

  // Effects
  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, [loadServices])
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadServices();
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filters]);

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
        {/* Main Header - Only one navigation bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{category}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.resultsCount}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FEFCE8" barStyle="dark-content" />
      
      {/* Main Header - Only one navigation bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{category}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.resultsCount}>{totalResults} services</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search treatment, clinic, location..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Service List */}
      <ScrollView 
        style={styles.serviceList} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#F59E0B"
            colors={['#F59E0B']}
          />
        }
      >
        {services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No services found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>Clear search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          services.map((service) => (
            <TouchableOpacity 
              key={service.id} 
              style={styles.serviceCard}
              onPress={() => {
                if (navigation?.navigate) {
                  navigation.navigate('ServiceDetail', { service });
                } else {
                  Alert.alert('Navigation', 'Navigate to service detail');
                }
              }}
              activeOpacity={0.8}
            >
              {/* Certificate Images */}
              {service.certificate_images && service.certificate_images.length > 0 && (
                <View style={styles.certificateSection}>
                  <Image 
                    source={{ uri: service.certificate_images[0] }} 
                    style={styles.certificateImage}
                    resizeMode="cover"
                  />
                  <View style={styles.certificateBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                    <Text style={styles.certificateText}>Certified</Text>
                  </View>
                </View>
              )}

              {/* Before/After Images */}
              {service.before_after_images && service.before_after_images.length >= 2 && (
                <View style={styles.beforeAfterSection}>
                  <View style={styles.beforeAfterContainer}>
                    <Image 
                      source={{ uri: service.before_after_images[0] }} 
                      style={styles.beforeAfterImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.beforeAfterLabel}>Before</Text>
                  </View>
                  <View style={styles.beforeAfterContainer}>
                    <Image 
                      source={{ uri: service.before_after_images[1] }} 
                      style={styles.beforeAfterImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.beforeAfterLabel}>After</Text>
                  </View>
                </View>
              )}
              
              {/* Service Info */}
              <View style={styles.serviceInfo}>
                <View style={styles.serviceHeader}>
                  <Image 
                    source={{ uri: service.image }} 
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                  <View style={styles.serviceDetails}>
                    <View style={styles.nameAndFavorite}>
                      <Text style={styles.serviceName} numberOfLines={1}>
                        {service.salon_name}
                      </Text>
                      <TouchableOpacity 
                        style={styles.favoriteButton}
                        onPress={() => toggleFavorite(service.id)}
                      >
                        <Ionicons 
                          name={service.is_favorite ? "heart" : "heart-outline"} 
                          size={24} 
                          color={service.is_favorite ? "#EF4444" : "#9CA3AF"} 
                        />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.ratingContainer}>
                      <Text style={styles.rating}>{service.rating.toFixed(1)}</Text>
                      <Text style={styles.stars}>{renderStars(service.rating)}</Text>
                      <Text style={styles.reviews}>({service.reviews_count})</Text>
                    </View>
                    
                    <View style={styles.locationContainer}>
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <Text style={styles.location} numberOfLines={1}>
                        {service.location}
                      </Text>
                    </View>
                    
                    <View style={styles.availabilityContainer}>
                      <Ionicons name="time-outline" size={14} color="#10B981" />
                      <Text style={styles.availableTime}>
                        {service.available_time_text}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.welcomeMessage} numberOfLines={2}>
                  {service.welcome_message}
                </Text>
                
                <Text style={styles.specialNote} numberOfLines={2}>
                  {service.special_note}
                </Text>
                
                {/* Payment Methods */}
                {service.payment_methods && service.payment_methods.length > 0 && (
                  <View style={styles.paymentMethods}>
                    <Ionicons name="card-outline" size={14} color="#6B7280" style={styles.paymentIcon} />
                    {service.payment_methods.slice(0, 3).map((method, index) => (
                      <View key={index} style={styles.paymentTag}>
                        <Text style={styles.paymentText}>{method}</Text>
                      </View>
                    ))}
                    {service.payment_methods.length > 3 && (
                      <Text style={styles.morePayments}>
                        +{service.payment_methods.length - 3} more
                      </Text>
                    )}
                  </View>
                )}

                {/* Bottom Section */}
                <View style={styles.bottomSection}>
                  <View style={styles.priceSection}>
                    <Text style={styles.priceLabel}>From</Text>
                    <Text style={styles.price}>{service.price} SEK</Text>
                    <View style={styles.durationContainer}>
                      <Ionicons name="time" size={12} color="#6B7280" />
                      <Text style={styles.duration}>{service.duration} min</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View Details</Text>
                    <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        
        {/* Load More Button */}
        {services.length > 0 && services.length < totalResults && (
          <TouchableOpacity 
            style={styles.loadMoreButton}
            onPress={() => loadServices()}
          >
            <Text style={styles.loadMoreText}>Load More Services</Text>
            <Ionicons name="chevron-down" size={20} color="#1F2937" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCE8', // Consistent app background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // Add top padding to account for status bar
    backgroundColor: '#FEFCE8', // Consistent with app background
    // Removed borderBottomWidth for seamless design
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  resultsCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
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
    color: '#4B5563',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEFCE8', // Consistent background
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    padding: 4,
  },
  serviceList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearSearchButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  certificateSection: {
    position: 'relative',
    marginBottom: 12,
  },
  certificateImage: {
    width: '100%',
    height: 120,
  },
  certificateBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  certificateText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  beforeAfterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  beforeAfterContainer: {
    width: '48%',
    position: 'relative',
  },
  beforeAfterImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  beforeAfterLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serviceInfo: {
    padding: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  serviceDetails: {
    flex: 1,
    marginLeft: 12,
  },
  nameAndFavorite: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rating: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 4,
  },
  stars: {
    color: '#F59E0B',
    fontSize: 14,
    marginRight: 4,
  },
  reviews: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
    flex: 1,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableTime: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  welcomeMessage: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
  },
  specialNote: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  paymentMethods: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  paymentIcon: {
    marginRight: 8,
  },
  paymentTag: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  paymentText: {
    fontSize: 11,
    color: '#1F2937',
    fontWeight: '500',
  },
  morePayments: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
    fontWeight: '500',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 2,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  viewButtonText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
    marginRight: 4,
  },
  loadMoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
    marginRight: 8,
  },
});

export default ServiceListScreen;