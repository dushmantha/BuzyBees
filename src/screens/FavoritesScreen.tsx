import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import mockService from '../services/api/mock/index';
import {useAuth} from '../context/AuthContext';

// Import Service type from the shared types file
import type { Service } from '../services/types/service';

const { width: screenWidth } = Dimensions.get('window');

interface FavoriteService {
  id: string;
  user_id: string;
  service_id: string;
  created_at: string;
  service: Service;
  [key: string]: any; // Allow additional properties
}

type FavoritesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'FavoritesTab'
>;

interface FavoriteCardProps {
  service: Service;
  serviceId: string; // Add explicit serviceId prop
  onRemove: (id: string) => void;
  onPress: (service: Service, serviceId: string) => void;
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({
  service,
  serviceId,
  onRemove,
  onPress,
}) => {
  const handleRemove = () => {
    Alert.alert(
      'Remove from Favorites',
      `Are you sure you want to remove "${service?.name || 'this service'}" from your favorites?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemove(serviceId),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(service, serviceId)}
      activeOpacity={0.8}
    >
      {/* Service Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: service?.image || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop',
          }}
          style={styles.cardImage}
          onError={() => console.log('Error loading image for service:', service?.name)}
        />
        <TouchableOpacity
          onPress={handleRemove}
          style={styles.heartButton}
        >
          <View style={styles.heartButtonBackground}>
            <Ionicons name="heart" size={20} color="#FF3B30" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.serviceName} numberOfLines={2} ellipsizeMode="tail">
            {service?.name || 'Service Name'}
          </Text>
        </View>

        <View style={styles.providerInfo}>
          <Ionicons name="person-outline" size={14} color="#6B7280" />
          <Text style={styles.professional} numberOfLines={1}>
            {service?.professional_name || 'Professional'}
          </Text>
        </View>

        <View style={styles.locationInfo}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.location} numberOfLines={1}>
            {service?.salon_name || service?.location || 'Location'}
          </Text>
        </View>

        <View style={styles.ratingContainer}>
          <View style={styles.ratingInfo}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>
              {service?.rating ? service.rating.toFixed(1) : '4.5'}
            </Text>
            <Text style={styles.reviewsText}>
              ({service?.reviews_count || 0} reviews)
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              ${service?.price ? service.price : '0'}
            </Text>
            <Text style={styles.currency}>SEK</Text>
          </View>
          <View style={styles.durationContainer}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.duration}>
              {service?.duration || 30} min
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const [favorites, setFavorites] = useState<FavoriteService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const {user} = useAuth();

  // Fallback for development
  const userId = user?.id || '1';

  const loadFavorites = useCallback(async () => {
    if (!userId) {
      setError('Please log in to view your favorites');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await mockService.getFavorites(userId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format');
      }

      // Process and validate favorites data
      const validFavorites = response.data
        .filter((favorite): favorite is FavoriteService => {
          return Boolean(favorite?.service && favorite?.service_id);
        })
        .map(favorite => ({
          id: favorite.id,
          user_id: favorite.user_id,
          service_id: favorite.service_id,
          created_at: favorite.created_at,
          service: {
            ...favorite.service,
            // Ensure all required Service fields have defaults
            id: favorite.service.id || favorite.service_id,
            available_times: favorite.service.available_times || [],
            certificate_images: favorite.service.certificate_images || [],
            before_after_images: favorite.service.before_after_images || [],
            available_time_text: favorite.service.available_time_text || '',
            welcome_message: favorite.service.welcome_message || '',
            special_note: favorite.service.special_note || '',
            payment_methods: favorite.service.payment_methods || [],
            created_at: favorite.service.created_at || new Date().toISOString(),
            is_favorite: true, // Mark as favorite since it's in favorites list
            // Add missing required fields with defaults
            category_id: favorite.service.category_id || '',
            rating: favorite.service.rating || 4.5,
            reviews: favorite.service.reviews || '0',
            time: favorite.service.time || `${favorite.service.duration || 30} min`,
            distance: favorite.service.distance || '',
            price: favorite.service.price?.toString() || '0',
          } as Service,
        }));

      setFavorites(validFavorites);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while loading your favorites. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const removeFromFavorites = async (serviceId: string) => {
    if (!userId || !serviceId) {
      console.error('Missing userId or serviceId for removing favorite');
      return;
    }

    try {
      // Optimistic update - remove from UI immediately
      const previousFavorites = [...favorites];
      setFavorites(prev => prev.filter(item => item.service_id !== serviceId));

      const {error: toggleError} = await mockService.toggleFavorite(userId, serviceId);

      if (toggleError) {
        // Revert optimistic update on error
        setFavorites(previousFavorites);
        throw new Error(toggleError);
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
      Alert.alert('Error', 'Failed to remove from favorites. Please try again.');
    }
  };

  const handleServicePress = useCallback((service: Service, serviceId: string) => {
    if (!serviceId && !service?.id) {
      console.error('Service ID is missing');
      Alert.alert('Error', 'Unable to open service details. Service ID is missing.');
      return;
    }

    try {
      // Pass the full service object to match what ServiceDetailScreen expects
      navigation.navigate('ServiceDetail', { 
        service: service,
        serviceId: serviceId || service.id
      });
    } catch (err) {
      console.error('Navigation error:', err);
      Alert.alert('Error', 'Unable to navigate to service details.');
    }
  }, [navigation]);

  // Load favorites on component mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites().finally(() => setRefreshing(false));
  }, [loadFavorites]);

  // Show login prompt if no user
  if (!userId && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.modernHeader}>
          <Text style={styles.headerTitle}>My Favorites</Text>
        </View>
        <View style={styles.loginPrompt}>
          <View style={styles.loginPromptIcon}>
            <Ionicons name="heart-circle-outline" size={80} color="#E5E7EB" />
          </View>
          <Text style={styles.loginPromptTitle}>Login Required</Text>
          <Text style={styles.loginPromptText}>
            Please log in to view your favorite services
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <Text style={styles.headerSubtitle}>
          {favorites.length > 0 ? `${favorites.length} saved services` : 'Your saved services'}
        </Text>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading your favorites...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="warning" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadFavorites} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#1A2533']}
              tintColor="#1A2533"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.favoritesList}>
            {favorites.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="heart-outline" size={80} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyStateTitle}>No Favorites Yet</Text>
                <Text style={styles.emptyStateText}>
                  Save your favorite services to easily book them again
                </Text>
                <TouchableOpacity 
                  style={styles.exploreButton}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
                >
                  <Ionicons name="search" size={20} color="#FFFFFF" />
                  <Text style={styles.exploreButtonText}>Explore Services</Text>
                </TouchableOpacity>
              </View>
            ) : (
              favorites.map(favorite => {
                // Ensure we have a valid service_id
                const serviceId = favorite.service_id || favorite.service?.id;
                
                if (!serviceId) {
                  console.warn('Favorite item missing service_id:', favorite);
                  return null;
                }

                return (
                  <FavoriteCard
                    key={favorite.id}
                    service={favorite.service}
                    serviceId={serviceId}
                    onRemove={removeFromFavorites}
                    onPress={handleServicePress}
                  />
                );
              }).filter(Boolean) // Remove any null items
            )}
          </View>
          
          {favorites.length > 0 && (
            <View style={styles.bottomSpacing} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modernHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  favoritesList: {
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  heartButtonBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    lineHeight: 24,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  professional: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
    flex: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  location: {
    fontSize: 13,
    color: '#718096',
    flex: 1,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#1A202C',
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 13,
    color: '#718096',
    marginLeft: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  currency: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duration: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginPromptIcon: {
    marginBottom: 20,
  },
  loginPromptTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default FavoritesScreen;