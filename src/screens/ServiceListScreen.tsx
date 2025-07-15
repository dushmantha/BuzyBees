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
  Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import mockService from '../services/api/mock';

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

const ServiceListScreen = () => {
  const navigation = useNavigation<ServiceListScreenNavigationProp>();
  const route = useRoute<ServiceListScreenRouteProp>();
  const category = route.params?.category || 'All Services';
  const categoryId = route.params?.categoryId;

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

  // Load services
  const loadServices = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      let response;
      if (searchQuery.trim()) {
        response = await mockService.searchServices(searchQuery, {
          category_id: categoryId,
          ...filters
        });
      } else if (categoryId) {
        response = await mockService.getServicesByCategory(categoryId, filters);
      } else {
        response = await mockService.getServices(filters);
      }

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      setServices(response.data || []);
      setTotalResults(response.meta?.total || 0);
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, categoryId, filters]);

  // Load filter options
  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await mockService.getFilterOptions();
      if (response.data) {
        setFilterOptions(response.data);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = async (serviceId: string) => {
    try {
      const response = await mockService.toggleFavorite('1', serviceId); // Mock user ID
      
      if (response.error) {
        Alert.alert('Error', response.error);
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
  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search treatment, clinic, location..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Service List */}
      <ScrollView 
        style={styles.serviceList} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No services found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          services.map((service) => (
            <TouchableOpacity 
              key={service.id} 
              style={styles.serviceCard}
              onPress={() => navigation.navigate('ServiceDetail', { service })}
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
                </View>
              )}

              {/* Before/After Images */}
              {service.before_after_images && service.before_after_images.length >= 2 && (
                <View style={styles.beforeAfterSection}>
                  <Image 
                    source={{ uri: service.before_after_images[0] }} 
                    style={styles.beforeAfterImage}
                    resizeMode="cover"
                  />
                  <Image 
                    source={{ uri: service.before_after_images[1] }} 
                    style={styles.beforeAfterImage}
                    resizeMode="cover"
                  />
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
                    <View style={styles.nameAndArrow}>
                      <Text style={styles.serviceName} numberOfLines={1}>
                        {service.salon_name}
                      </Text>
                      <TouchableOpacity 
                        style={styles.favoriteButton}
                        onPress={() => toggleFavorite(service.id)}
                      >
                        <Text style={[
                          styles.favoriteIcon, 
                          { color: service.is_favorite ? '#FF3B30' : '#ccc' }
                        ]}>
                          {service.is_favorite ? '♥' : '♡'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.ratingContainer}>
                      <Text style={styles.rating}>{service.rating}</Text>
                      <Text style={styles.stars}>{renderStars(service.rating)}</Text>
                      <Text style={styles.reviews}>({service.reviews_count})</Text>
                    </View>
                    
                    <Text style={styles.location} numberOfLines={1}>
                      {service.location}
                    </Text>
                    
                    <Text style={styles.availableTime}>
                      {service.available_time_text}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.welcomeMessage} numberOfLines={1}>
                  {service.welcome_message}
                </Text>
                
                <Text style={styles.specialNote} numberOfLines={2}>
                  {service.special_note}
                </Text>
                
                {/* Payment Methods */}
                <View style={styles.paymentMethods}>
                  {service.payment_methods?.slice(0, 3).map((method, index) => (
                    <View key={index} style={styles.paymentTag}>
                      <Text style={styles.paymentText}>{method}</Text>
                    </View>
                  ))}
                </View>

                {/* Bottom Section */}
                <View style={styles.bottomSection}>
                  <View style={styles.priceSection}>
                    <Text style={styles.priceLabel}>From</Text>
                    <Text style={styles.price}>{service.price} SEK</Text>
                    <Text style={styles.duration}>{service.duration} min</Text>
                  </View>
                  
                  <TouchableOpacity style={styles.mapButton}>
                    <Text style={styles.mapIcon}>🗺</Text>
                    <Text style={styles.mapText}>Map</Text>
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
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
    minWidth: 40,
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  closeButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'flex-end',
  },
  closeIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchBar: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    fontSize: 16,
    color: '#000',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  resultsCount: {
    fontSize: 14,
    color: '#6c757d',
  },
  sortLink: {
    fontSize: 14,
    color: '#007bff',
    textDecorationLine: 'underline',
  },
  serviceList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certificateSection: {
    marginBottom: 12,
  },
  certificateImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  beforeAfterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  beforeAfterImage: {
    width: '48%',
    height: 80,
    borderRadius: 8,
  },
  serviceInfo: {
    // Service info styles
  },
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  nameAndArrow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  favoriteButton: {
    padding: 4,
    marginLeft: 8,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 4,
  },
  stars: {
    fontSize: 14,
    color: '#ffc107',
    marginRight: 6,
  },
  reviews: {
    fontSize: 14,
    color: '#6c757d',
  },
  location: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  availableTime: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  welcomeMessage: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
    fontWeight: '500',
  },
  specialNote: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
    lineHeight: 20,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  paymentTag: {
    backgroundColor: '#e7f3ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  paymentText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceSection: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  duration: {
    fontSize: 12,
    color: '#6c757d',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#343a40',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mapIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  mapText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadMoreButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    marginVertical: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ServiceListScreen;