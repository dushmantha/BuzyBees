import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Text, 
  RefreshControl, 
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  FlatList,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../services/api/home/providerHomeAPI';
import { shopAPI } from '../services/api/shops/shopAPI';
import { categoryAPI } from '../services/api/categories/categoryAPI';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../contexts/PremiumContext';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 3;
const promotionWidth = width - 40;

interface Category {
  id: string;
  name: string;
  image: string;
  service_count: number;
  color: string;
  description?: string;
  icon?: string;
}

interface Shop {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logo_url?: string;
  images: string[];
  rating?: number;
  reviews_count?: number;
  distance?: string;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount_percentage: number;
  code: string;
  expires_at: string;
  image: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  duration: number;
  rating: number;
  reviews_count: number;
  professional_name: string;
  salon_name: string;
  location: string;
  distance: string;
  image: string;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountCode?: string;
  isSpecialOffer?: boolean;
}

interface Booking {
  id: string;
  service_name: string;
  professional_name: string;
  salon_name: string;
  date: string;
  time: string;
  status: string;
}

interface HomeData {
  categories: Category[];
  promotions: Promotion[];
  specialOffers: Service[];
  trendingServices: Service[];
  popularServices: Service[];
  recommendedServices: Service[];
  upcomingBookings: Booking[];
  stats: {
    totalServices: number;
    totalCategories: number;
    totalProviders: number;
    avgRating: number;
  };
}

type RootStackParamList = {
  ServiceList: { 
    category: string; 
    categoryId: string;
    showPopular?: boolean;
  };
  ServiceDetail: { serviceId: string };
  Bookings: undefined;
  Search: { query?: string };
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isLoading: authLoading } = useAuth();
  const { isPremium, subscription, isLoading: premiumLoading } = usePremium();
  
  const [homeData, setHomeData] = useState<HomeData>({
    categories: [],
    promotions: [],
    specialOffers: [],
    trendingServices: [],
    popularServices: [],
    recommendedServices: [],
    upcomingBookings: [],
    stats: { totalServices: 0, totalCategories: 0, totalProviders: 0, avgRating: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    categories: [],
    services: [],
    professionals: []
  });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryShops, setCategoryShops] = useState<{[key: string]: Shop[]}>({});
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());

  // Fetch home data
  const fetchHomeData = useCallback(async () => {
    // Don't fetch if auth is still loading
    if (authLoading || premiumLoading) {
      console.log('🔄 Waiting for auth to complete...', { 
        authLoading, 
        premiumLoading
      });
      return;
    }

    try {
      setError(null);
      console.log('📦 Fetching home data:', {
        userId: user?.id || 'anonymous',
        isPremium,
        subscriptionType: subscription?.subscription_type,
        subscriptionStatus: subscription?.subscription_status
      });

      // Fetch categories from our new category API (always shows all categories)
      console.log('📋 Fetching categories from categoryAPI...');
      const categoriesResponse = await categoryAPI.getAllCategories();
      
      if (categoriesResponse.error && !categoriesResponse.data) {
        throw new Error(categoriesResponse.error);
      }

      // Fetch services from shop API
      console.log('⭐ Fetching services from shopAPI...');
      let specialOffers = [];
      let trendingServices = [];
      let popularServices = [];
      let recommendedServices = [];
      
      try {
        // First get shops with discounts for special offers
        const discountShopsResponse = await shopAPI.getShopsWithDiscounts();
        // Then get all shops for other sections
        const shopsResponse = await shopAPI.getAllShops();
        console.log('💰 Shops with discounts:', discountShopsResponse.data?.length || 0);
        console.log('🏪 All shops:', shopsResponse.data?.length || 0);
        
        // Use discount shops for special offers  
        const shopsWithDiscounts = discountShopsResponse.data || [];
        const shopsWithoutDiscounts = shopsResponse.data || [];
        
        console.log('💰 Real shops with discounts found:', shopsWithDiscounts.length);
        console.log('🏪 Regular shops without discounts:', shopsWithoutDiscounts.length);
          
          // Transform shops to services format
          const transformShopToService = (shop: any, isSpecialOffer = false) => {
            // Handle both array format (mock data) and single object format (real DB)
            let hasDiscount = false;
            let discountInfo = null;
            
            if (shop.discounts) {
              if (Array.isArray(shop.discounts) && shop.discounts.length > 0) {
                // Array format - find biggest discount
                const activeDiscounts = shop.discounts.filter((d: any) => d.is_active);
                if (activeDiscounts.length > 0) {
                  discountInfo = activeDiscounts.reduce((max: any, current: any) => 
                    (current.discount_percentage > max.discount_percentage) ? current : max
                  );
                  hasDiscount = true;
                }
              } else if (!Array.isArray(shop.discounts) && shop.discounts.is_active) {
                // Single object format - direct discount from getShopsWithDiscounts
                discountInfo = shop.discounts;
                hasDiscount = true;
              }
            }
            
            let originalPrice = shop.services && shop.services.length > 0 ? shop.services[0].price : 500;
            let finalPrice = originalPrice;
            
            // Apply discount to price if available
            if (discountInfo && discountInfo.discount_percentage) {
              finalPrice = Math.round(originalPrice * (1 - discountInfo.discount_percentage / 100));
            }
            
            const serviceData = {
              id: shop.id,
              name: shop.name,
              description: shop.description,
              professional_name: shop.staff && shop.staff.length > 0 ? shop.staff[0].name : 'Shop Owner',
              salon_name: shop.name,
              price: finalPrice,
              originalPrice: hasDiscount ? originalPrice : null,
              duration: shop.services && shop.services.length > 0 ? shop.services[0].duration : 60,
              rating: shop.rating || 4.5,
              reviews_count: shop.reviews_count || 0,
              location: `${shop.city}, ${shop.country}`,
              distance: shop.distance || '1.5 km',
              image: shop.images && shop.images.length > 0 ? shop.images[0] : shop.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
              hasDiscount: hasDiscount,
              discountPercentage: discountInfo ? discountInfo.discount_percentage : null,
              discountCode: discountInfo ? discountInfo.code : null,
              isSpecialOffer: isSpecialOffer
            };
            
            console.log('🏷️ Transformed service:', serviceData.name, {
              hasDiscount: serviceData.hasDiscount,
              isSpecialOffer: serviceData.isSpecialOffer,
              discountPercentage: serviceData.discountPercentage,
              originalPrice: serviceData.originalPrice,
              finalPrice: serviceData.price
            });
            
            return serviceData;
          };
          
          // Distribute services across 4 sections
          
          // 1. Special Offers - Discounted services (with discount badges)
          specialOffers = shopsWithDiscounts.slice(0, 4).map(shop => transformShopToService(shop, true));
          
          console.log('🔥 Created special offers:', {
            count: specialOffers.length,
            shopsWithDiscounts: shopsWithDiscounts.length,
            offers: specialOffers.map(offer => ({
              name: offer.name,
              hasDiscount: offer.hasDiscount,
              discountPercentage: offer.discountPercentage
            }))
          });
          
          // 2. Trending Services - High rated services (rating >= 4.5)
          const highRatedShops = shopsWithoutDiscounts
            .filter(shop => (shop.rating || 4.5) >= 4.5)
            .sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5))
            .slice(0, 6);
          trendingServices = highRatedShops.map(shop => transformShopToService(shop, false));
          
          // 3. Popular Services - Most reviewed services
          const mostReviewedShops = shopsWithoutDiscounts
            .filter(shop => !highRatedShops.includes(shop)) // Exclude trending ones
            .sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0))
            .slice(0, 6);
          popularServices = mostReviewedShops.map(shop => transformShopToService(shop, false));
          
          // 4. Recommended Services - Remaining services (newest or random)
          const remainingShops = shopsWithoutDiscounts
            .filter(shop => !highRatedShops.includes(shop) && !mostReviewedShops.includes(shop))
            .slice(0, 6);
          recommendedServices = remainingShops.map(shop => transformShopToService(shop, false));
      } catch (shopError) {
        console.warn('⚠️ Could not fetch shops for popular services:', shopError);
      }

      // Calculate stats
      const totalCategories = categoriesResponse.data?.length || 0;
      const totalServices = categoriesResponse.data?.reduce((sum, cat) => sum + cat.service_count, 0) || 0;
      const totalProviders = popularServices.length;
      const avgRating = popularServices.length > 0 
        ? popularServices.reduce((sum, service) => sum + service.rating, 0) / popularServices.length 
        : 4.5;

      const homeData = {
        categories: categoriesResponse.data || [],
        promotions: [], // No promotions for now
        specialOffers: specialOffers,
        trendingServices: trendingServices,
        popularServices: popularServices,
        recommendedServices: recommendedServices,
        upcomingBookings: [],
        stats: {
          totalServices,
          totalCategories,
          totalProviders,
          avgRating: Number(avgRating.toFixed(1))
        }
      };

      console.log('✅ Home data loaded successfully:', {
        categories: homeData.categories.length,
        specialOffers: homeData.specialOffers.length,
        trending: homeData.trendingServices.length,
        popular: homeData.popularServices.length,
        recommended: homeData.recommendedServices.length,
        stats: homeData.stats
      });

      setHomeData(homeData);
      
    } catch (err) {
      console.error('❌ Error loading home data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      
      // Always provide fallback data even on error
      const fallbackData = {
        categories: [],
        promotions: [],
        specialOffers: [],
        trendingServices: [],
        popularServices: [],
        recommendedServices: [],
        upcomingBookings: [],
        stats: {
          totalServices: 0,
          totalCategories: 0,
          totalProviders: 0,
          avgRating: 4.5
        }
      };
      
      // Try to get at least the default categories
      try {
        const categoriesResponse = await categoryAPI.getAllCategories();
        if (categoriesResponse.data) {
          fallbackData.categories = categoriesResponse.data;
          fallbackData.stats.totalCategories = categoriesResponse.data.length;
        }
      } catch (fallbackError) {
        console.error('❌ Could not load even fallback categories:', fallbackError);
      }
      
      setHomeData(fallbackData);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [authLoading, premiumLoading, user?.id, isPremium, subscription]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData();
  }, [fetchHomeData]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // Search through loaded data locally
  const searchLoadedData = useCallback((query) => {
    console.log('🔍 Searching for:', query);
    console.log('📊 Available data:', {
      categories: homeData.categories.length,
      services: homeData.popularServices.length
    });

    if (!query.trim()) {
      return {
        categories: [],
        services: [],
        professionals: []
      };
    }

    const searchTerm = query.toLowerCase().trim();
    console.log('🔍 Search term:', searchTerm);

    // Search categories
    const matchedCategories = homeData.categories.filter(category => {
      const nameMatch = category.name.toLowerCase().includes(searchTerm);
      const descMatch = category.description ? category.description.toLowerCase().includes(searchTerm) : false;
      console.log(`Category ${category.name}: nameMatch=${nameMatch}, descMatch=${descMatch}`);
      return nameMatch || descMatch;
    });

    // Search services
    const matchedServices = homeData.popularServices.filter(service => {
      const nameMatch = service.name.toLowerCase().includes(searchTerm);
      const descMatch = service.description.toLowerCase().includes(searchTerm);
      const profMatch = service.professional_name.toLowerCase().includes(searchTerm);
      const salonMatch = service.salon_name.toLowerCase().includes(searchTerm);
      console.log(`Service ${service.name}: nameMatch=${nameMatch}, descMatch=${descMatch}, profMatch=${profMatch}, salonMatch=${salonMatch}`);
      return nameMatch || descMatch || profMatch || salonMatch;
    });

    // Extract professionals from services
    const professionals = homeData.popularServices.map(service => ({
      id: `${service.professional_name}-${service.salon_name}`,
      name: service.professional_name,
      salon: service.salon_name,
      rating: service.rating,
      location: service.location,
      image: service.image
    }));

    const matchedProfessionals = professionals.filter(professional => {
      const nameMatch = professional.name.toLowerCase().includes(searchTerm);
      const salonMatch = professional.salon.toLowerCase().includes(searchTerm);
      console.log(`Professional ${professional.name}: nameMatch=${nameMatch}, salonMatch=${salonMatch}`);
      return nameMatch || salonMatch;
    });

    const results = {
      categories: matchedCategories,
      services: matchedServices,
      professionals: matchedProfessionals
    };

    console.log('🎯 Search results:', {
      categories: results.categories.length,
      services: results.services.length,
      professionals: results.professionals.length
    });

    return results;
  }, [homeData]);

  // Handle search query changes - SINGLE VERSION ONLY
  const handleSearchQueryChange = useCallback(async (query) => {
    console.log('🔄 Search query changed:', query);
    setSearchQuery(query);
    
    if (!query.trim()) {
      console.log('❌ Empty query, hiding results');
      setShowSearchResults(false);
      setSearchResults({
        categories: [],
        services: [],
        professionals: []
      });
      return;
    }

    console.log('🔍 Performing local search...');
    // First: Search through loaded data for instant results
    const localResults = searchLoadedData(query);
    console.log('📋 Local results:', localResults);
    
    setSearchResults(localResults);
    
    // Show results if we have any matches OR if query is long enough for API call
    const hasLocalResults = localResults.categories.length > 0 || 
                           localResults.services.length > 0 || 
                           localResults.professionals.length > 0;
    
    if (hasLocalResults || query.trim().length >= 2) {
      console.log('✅ Showing search results');
      setShowSearchResults(true);
    }

    // Second: Fetch additional data from API if query is substantial
    if (query.trim().length >= 2) {
      console.log('🌐 Calling API for additional results...');
      setIsSearching(true);
      
      try {
        // Call API for more comprehensive search results
        const [servicesResponse, categoriesResponse] = await Promise.all([
          api.searchServices(query.trim(), {
            limit: 10,
            sortBy: 'relevance'
          }),
          api.searchCategories(query.trim())
        ]);

        console.log('🎯 API responses:', {
          services: servicesResponse.data?.services?.length || 0,
          categories: categoriesResponse.data?.categories?.length || 0
        });

        // Merge API results with local results
        const apiServices = servicesResponse.data?.services || [];
        const apiCategories = categoriesResponse.data?.categories || [];

        // Filter out duplicates and merge
        const mergedServices = [
          ...localResults.services,
          ...apiServices.filter(apiService => 
            !localResults.services.some(localService => localService.id === apiService.id)
          )
        ];

        const mergedCategories = [
          ...localResults.categories,
          ...apiCategories.filter(apiCategory => 
            !localResults.categories.some(localCategory => localCategory.id === apiCategory.id)
          )
        ];

        const finalResults = {
          categories: mergedCategories,
          services: mergedServices,
          professionals: localResults.professionals
        };

        console.log('🎯 Final merged results:', {
          categories: finalResults.categories.length,
          services: finalResults.services.length,
          professionals: finalResults.professionals.length
        });

        setSearchResults(finalResults);

      } catch (error) {
        console.error('❌ Error fetching search results:', error);
        // Keep local results if API fails
      } finally {
        setIsSearching(false);
      }
    }
  }, [searchLoadedData]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      navigation.navigate('Search', { 
        query: searchQuery.trim(),
        initialResults: searchResults
      });
      setShowSearchResults(false);
    }
  }, [searchQuery, searchResults, navigation]);

  // Handle search result item press
  const handleSearchResultPress = useCallback((type, item) => {
    setShowSearchResults(false);
    setSearchQuery('');
    
    switch (type) {
      case 'service':
        handleServicePress(item);
        break;
      case 'category':
        handleCategoryPress(item);
        break;
      case 'professional':
        navigation.navigate('Search', {
          query: item.name,
          filter: 'professional'
        });
        break;
      default:
        break;
    }
  }, [navigation]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults({
      categories: [],
      services: [],
      professionals: []
    });
  }, []);

  // Fetch shops for a specific category
  const fetchCategoryShops = useCallback(async (category: Category) => {
    console.log('🏪 Fetching shops for category:', category.name);
    
    const categoryKey = category.name;
    setLoadingCategories(prev => new Set(prev.add(categoryKey)));
    
    try {
      const result = await shopAPI.getShopsByCategory(category.name);
      
      if (result.error || !result.data) {
        console.error('❌ Error fetching category shops:', result.error);
        return;
      }
      
      setCategoryShops(prev => ({
        ...prev,
        [categoryKey]: result.data || []
      }));
      
      console.log('✅ Successfully fetched shops for category:', {
        category: categoryKey,
        count: result.data?.length || 0
      });
      
    } catch (error) {
      console.error('❌ Unexpected error fetching category shops:', error);
    } finally {
      setLoadingCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryKey);
        return newSet;
      });
    }
  }, []);

  // Handle category expansion/collapse
  const handleCategoryExpand = useCallback(async (category: Category) => {
    const categoryKey = category.name;
    const isExpanded = expandedCategories.has(categoryKey);
    
    if (isExpanded) {
      // Collapse category
      setExpandedCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryKey);
        return newSet;
      });
    } else {
      // Expand category
      setExpandedCategories(prev => new Set(prev.add(categoryKey)));
      
      // Fetch shops if not already fetched
      if (!categoryShops[categoryKey]) {
        await fetchCategoryShops(category);
      }
    }
  }, [expandedCategories, categoryShops, fetchCategoryShops]);

  // Handle category press (navigate to full category view)
  const handleCategoryPress = (category: Category) => {
    console.log('Category pressed:', category.name);
    navigation.navigate('ServiceList', {
      category: category.name,
      categoryId: category.id
    });
  };

  // Handle shop press
  const handleShopPress = useCallback((shop: Shop) => {
    console.log('Shop pressed:', shop.name);
    // Navigate to shop details or service list
    navigation.navigate('ServiceList', {
      category: shop.category,
      categoryId: shop.category.toLowerCase().replace(/\s+/g, '-'),
      shopId: shop.id
    });
  }, [navigation]);

  // Handle service press
  const handleServicePress = (service: Service) => {
    console.log('Service pressed:', service.name);
    navigation.navigate('ServiceDetail', {
      serviceId: service.id
    });
  };

  // Handle view all popular services
  const handleViewAllPopularServices = () => {
    navigation.navigate('ServiceList', {
      category: 'Popular Services',
      categoryId: 'popular',
      showPopular: true
    });
  };

  // Handle promotion press
  const handlePromotionPress = (promotion: Promotion) => {
    Alert.alert(
      promotion.title,
      `${promotion.description}\n\nCode: ${promotion.code}\nDiscount: ${promotion.discount_percentage}%`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Use Code', onPress: () => console.log('Using promo code:', promotion.code) }
      ]
    );
  };

  const renderCategoryCard = ({ item: category }: { item: Category }) => {
    const categoryKey = category.name;
    const isExpanded = expandedCategories.has(categoryKey);
    const shops = categoryShops[categoryKey] || [];
    const isLoading = loadingCategories.has(categoryKey);
    
    return (
      <View style={styles.categoryContainer}>
        <TouchableOpacity
          style={[styles.categoryCard, { backgroundColor: category.color || '#FFFFFF' }]}
          onPress={() => handleCategoryPress(category)}
          activeOpacity={0.8}
        >
          {category.image ? (
            <Image
              source={{ uri: category.image }}
              style={styles.categoryImage}
              resizeMode="cover"
              onError={() => console.log('Image error for:', category.name)}
            />
          ) : (
            <View style={styles.categoryImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#8E8E93" />
            </View>
          )}
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryCount}>{category.service_count}</Text>
        </TouchableOpacity>

      </View>
    );
  };

  const renderPromotionCard = ({ item: promotion }: { item: Promotion }) => (
    <TouchableOpacity
      style={styles.promotionCard}
      onPress={() => handlePromotionPress(promotion)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: promotion.image }}
        style={styles.promotionImage}
        resizeMode="cover"
      />
      <View style={styles.promotionContent}>
        <View style={styles.promotionBadge}>
          <Text style={styles.promotionBadgeText}>{promotion.discount_percentage}% OFF</Text>
        </View>
        <Text style={styles.promotionTitle}>{promotion.title}</Text>
        <Text style={styles.promotionDescription}>{promotion.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderServiceCard = ({ item: service }: { item: Service }) => {
    // Debug: Log service data in the renderer
    console.log('🎨 Rendering service card:', service.name, {
      hasDiscount: service.hasDiscount,
      isSpecialOffer: service.isSpecialOffer,
      discountPercentage: service.discountPercentage
    });
    
    return (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => handleServicePress(service)}
      activeOpacity={0.8}
    >
      {service.image ? (
        <Image
          source={{ uri: service.image }}
          style={styles.serviceImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.serviceImagePlaceholder}>
          <Ionicons name="cut-outline" size={32} color="#8E8E93" />
        </View>
      )}
      
      {/* Badges */}
      <View style={styles.serviceBadgeContainer}>
        {service.isSpecialOffer && (
          <View style={styles.specialOfferBadge}>
            <Text style={styles.specialOfferBadgeText}>SPECIAL OFFER</Text>
          </View>
        )}
        {service.hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{service.discountPercentage}% OFF</Text>
          </View>
        )}
      </View>
      
      <View style={styles.serviceContent}>
        <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
        <Text style={styles.serviceProfessional} numberOfLines={1}>
          {service.professional_name}
        </Text>
        <View style={styles.serviceRating}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.ratingText}>{service.rating}</Text>
          <Text style={styles.reviewsText}>({service.reviews_count})</Text>
        </View>
        <View style={styles.serviceFooter}>
          <View style={styles.servicePriceContainer}>
            {service.hasDiscount && service.originalPrice ? (
              <>
                <Text style={styles.serviceOriginalPrice}>{service.originalPrice} kr</Text>
                <Text style={styles.servicePrice}>{service.price} kr</Text>
              </>
            ) : (
              <Text style={styles.servicePrice}>{service.price} kr</Text>
            )}
          </View>
          <Text style={styles.serviceDuration}>{service.duration} min</Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const renderUpcomingBooking = ({ item: booking }: { item: Booking }) => (
    <TouchableOpacity style={styles.bookingCard} activeOpacity={0.8}>
      <View style={styles.bookingLeft}>
        <View style={styles.bookingIcon}>
          <Ionicons name="calendar" size={20} color="#1A2533" />
        </View>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingService}>{booking.service_name}</Text>
          <Text style={styles.bookingProfessional}>{booking.professional_name}</Text>
          <Text style={styles.bookingTime}>
            {new Date(booking.date).toLocaleDateString('sv-SE')} • {booking.time}
          </Text>
        </View>
      </View>
      <View style={[styles.bookingStatus, 
        booking.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending
      ]}>
        <Text style={[styles.statusText, 
          booking.status === 'confirmed' ? styles.statusConfirmedText : styles.statusPendingText
        ]}>
          {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if ((isLoading || authLoading || premiumLoading) && homeData.categories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1A2533" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error && homeData.categories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchHomeData} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerGreeting}>
            Hello{user ? ` ${user.full_name || user.first_name || user.email?.split('@')[0] || 'there'}` : ''}! 👋
          </Text>
          <Text style={styles.headerTitle}>What would you like to book?</Text>
          {__DEV__ && (
            <Text style={styles.debugText}>
              Debug: Premium={isPremium ? 'Yes' : 'No'} | Type={subscription?.subscription_type || 'None'} | Status={subscription?.subscription_status || 'None'}
            </Text>
          )}
        </View>
        {user && (
          <TouchableOpacity style={styles.profileButton}>
            <Image
              source={{ uri: user.avatar_url || 'https://randomuser.me/api/portraits/men/1.jpg' }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services or categories"
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={handleSearchQueryChange}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Search Results Dropdown */}
          {showSearchResults && (
            <View style={styles.searchResultsContainer}>
              <ScrollView style={styles.searchResultsScroll} keyboardShouldPersistTaps="handled">
                
                {/* Debug info - remove in production */}
                {__DEV__ && (
                  <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                      Debug: Categories({searchResults.categories.length}) 
                      Services({searchResults.services.length}) 
                      Professionals({searchResults.professionals.length})
                    </Text>
                  </View>
                )}
                
                {/* Categories Results */}
                {searchResults.categories.length > 0 && (
                  <View style={styles.searchResultSection}>
                    <Text style={styles.searchResultSectionTitle}>Categories</Text>
                    {searchResults.categories.slice(0, 3).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.searchResultItem}
                        onPress={() => handleSearchResultPress('category', category)}
                      >
                        <View style={styles.searchResultIcon}>
                          <Ionicons name="grid-outline" size={16} color="#F59E0B" />
                        </View>
                        <View style={styles.searchResultContent}>
                          <Text style={styles.searchResultTitle}>{category.name}</Text>
                          <Text style={styles.searchResultSubtitle}>{category.service_count} services</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Services Results */}
                {searchResults.services.length > 0 && (
                  <View style={styles.searchResultSection}>
                    <Text style={styles.searchResultSectionTitle}>Services</Text>
                    {searchResults.services.slice(0, 4).map((service) => (
                      <TouchableOpacity
                        key={service.id}
                        style={styles.searchResultItem}
                        onPress={() => handleSearchResultPress('service', service)}
                      >
                        <View style={styles.searchResultIcon}>
                          <Ionicons name="cut-outline" size={16} color="#F59E0B" />
                        </View>
                        <View style={styles.searchResultContent}>
                          <Text style={styles.searchResultTitle}>{service.name}</Text>
                          <Text style={styles.searchResultSubtitle}>
                            {service.professional_name} • {service.price} kr
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Professionals Results */}
                {searchResults.professionals.length > 0 && (
                  <View style={styles.searchResultSection}>
                    <Text style={styles.searchResultSectionTitle}>Providers</Text>
                    {searchResults.professionals.slice(0, 3).map((professional) => (
                      <TouchableOpacity
                        key={professional.id}
                        style={styles.searchResultItem}
                        onPress={() => handleSearchResultPress('professional', professional)}
                      >
                        <View style={styles.searchResultIcon}>
                          <Ionicons name="person-outline" size={16} color="#F59E0B" />
                        </View>
                        <View style={styles.searchResultContent}>
                          <Text style={styles.searchResultTitle}>{professional.name}</Text>
                          <Text style={styles.searchResultSubtitle}>{professional.salon}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* No results message */}
                {searchResults.categories.length === 0 && 
                 searchResults.services.length === 0 && 
                 searchResults.professionals.length === 0 && 
                 searchQuery.length >= 2 && !isSearching && (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={32} color="#8E8E93" />
                    <Text style={styles.noResultsTitle}>No results</Text>
                    <Text style={styles.noResultsText}>
                      Try different keywords or browse categories
                    </Text>
                  </View>
                )}

                {/* Show More Results Button */}
                {(searchResults.categories.length > 0 || searchResults.services.length > 0 || searchResults.professionals.length > 0) && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={handleSearch}
                  >
                    <Text style={styles.showMoreButtonText}>
                      See all results for "{searchQuery}"
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#F59E0B" />
                  </TouchableOpacity>
                )}

                {/* Loading indicator */}
                {isSearching && (
                  <View style={styles.searchLoadingContainer}>
                    <ActivityIndicator size="small" color="#F59E0B" />
                    <Text style={styles.searchLoadingText}>Searching...</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
          
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#6B7280" style={styles.locationIcon} />
            <Text style={styles.locationText}>All Sweden</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
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
        {/* Special Offers - TOP PRIORITY */}
        {homeData.specialOffers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, styles.specialOfferTitle]}>🔥 Special Offers</Text>
              <TouchableOpacity onPress={() => console.log('View all special offers')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={homeData.specialOffers}
              renderItem={renderServiceCard}
              keyExtractor={(item, index) => `special-offers-${item.id}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
            />
          </View>
        )}

        {/* Upcoming Bookings */}
        {user && homeData.upcomingBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
              <TouchableOpacity onPress={() => console.log('Navigate to Bookings')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={homeData.upcomingBookings}
              renderItem={renderUpcomingBooking}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bookingsList}
            />
          </View>
        )}

        {/* Active Promotions */}
        {homeData.promotions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Offers</Text>
            </View>
            <FlatList
              data={homeData.promotions}
              renderItem={renderPromotionCard}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promotionsList}
            />
          </View>
        )}

        {/* Trending Services */}
        {homeData.trendingServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending</Text>
              <TouchableOpacity onPress={() => console.log('View all trending services')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={homeData.trendingServices}
              renderItem={renderServiceCard}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
            />
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
          </View>
          <View style={styles.categoriesContainer}>
            {homeData.categories.map((category, index) => (
              <View key={category.id} style={styles.categoryWrapper}>
                {renderCategoryCard({ item: category })}
              </View>
            ))}
          </View>
        </View>

        {/* Popular Services */}
        {homeData.popularServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Services</Text>
              <TouchableOpacity onPress={handleViewAllPopularServices}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={homeData.popularServices}
              renderItem={renderServiceCard}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
            />
          </View>
        )}

        {/* Recommended Services */}
        {homeData.recommendedServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommended</Text>
              <TouchableOpacity onPress={() => console.log('View all recommended services')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={homeData.recommendedServices}
              renderItem={renderServiceCard}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
            />
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF3C7', // Light accent cream honey
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FEF3C7', // Light accent cream honey
  },
  headerContent: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 16,
    color: '#1F2937', // Dark accent charcoal black
    marginBottom: 4,
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937', // Dark accent charcoal black
    letterSpacing: -0.5,
  },
  debugText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  // Search Section Styles
  searchSection: {
    backgroundColor: '#FEF3C7',
    paddingBottom: 16,
    zIndex: 1000, // Ensure search section is above other content
    elevation: 10, // For Android
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'relative', // Important for absolute positioning of dropdown
    zIndex: 1000,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#F59E0B', // Primary amber/honey
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
    color: '#F59E0B', // Primary amber/honey
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A2533',
    padding: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  // Search Results Styles
  searchResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 999, // Very high elevation for Android
    zIndex: 9999, // Very high z-index for iOS
  },
  searchResultsScroll: {
    maxHeight: 400,
  },
  searchResultSection: {
    paddingVertical: 8,
  },
  searchResultSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF3C7',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  searchResultSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
    backgroundColor: '#FEF3C7',
  },
  showMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginRight: 8,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  searchLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  // Debug styles - remove in production
  debugInfo: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    margin: 8,
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  // No results styles
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D', // Lighter honey border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  locationIcon: {
    marginRight: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: '#FEF3C7', // Light accent cream honey
    zIndex: 1, // Lower z-index than search
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937', // Dark accent charcoal black
  },
  specialOfferTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#DC2626', // Bright red for emphasis
  },
  seeAllText: {
    fontSize: 14,
    color: '#F59E0B', // Primary amber/honey
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryWrapper: {
    width: cardWidth,
    marginBottom: 16,
  },
  categoryContainer: {
    width: '100%',
  },
  categoryCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D', // Lighter honey border
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  categoryImage: {
    width: '70%',
    height: '50%',
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryImagePlaceholder: {
    width: '70%',
    height: '50%',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937', // Dark accent charcoal black
    textAlign: 'center',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 11,
    color: '#6B7280', // Darker gray for better readability
    fontWeight: '500',
  },
  expandButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopListContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shopLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  shopLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shopImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  shopImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  shopAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  shopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopRatingText: {
    fontSize: 12,
    color: '#1F2937',
    marginLeft: 4,
    fontWeight: '500',
  },
  shopDistance: {
    fontSize: 12,
    color: '#6B7280',
  },
  shopSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
  },
  noShopsContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noShopsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  viewAllShopsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginHorizontal: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  viewAllShopsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginRight: 4,
  },
  promotionsList: {
    paddingHorizontal: 20,
  },
  promotionCard: {
    width: promotionWidth,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#FCD34D', // Lighter honey border
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  promotionImage: {
    width: '40%',
    height: '100%',
  },
  promotionContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  promotionBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  promotionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 8,
  },
  promotionDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  servicesList: {
    paddingHorizontal: 20,
  },
  serviceCard: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  serviceImage: {
    width: '100%',
    height: 120,
  },
  serviceImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceContent: {
    padding: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  serviceProfessional: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#1A2533',
    marginLeft: 4,
    fontWeight: '500',
  },
  reviewsText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceBadgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  specialOfferBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  specialOfferBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  discountBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  servicePriceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  serviceOriginalPrice: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  serviceDuration: {
    fontSize: 12,
    color: '#8E8E93',
  },
  bookingsList: {
    paddingHorizontal: 20,
  },
  bookingCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bookingIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingService: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 2,
  },
  bookingProfessional: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  bookingTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  bookingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E8',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  statusConfirmedText: {
    color: '#4CAF50',
  },
  statusPendingText: {
    color: '#FF9800',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1A2533',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 20,
  },
});

export default HomeScreen;