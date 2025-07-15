
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
import api from '../services/api';
// import { useAuth } from '../context/AuthContext'; // Uncomment when auth is ready

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
  duration: number;
  rating: number;
  reviews_count: number;
  professional_name: string;
  salon_name: string;
  location: string;
  distance: string;
  image: string;
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
  popularServices: Service[];
  upcomingBookings: Booking[];
  stats: {
    totalServices: number;
    totalCategories: number;
    totalProviders: number;
    avgRating: number;
  };
}

type RootStackParamList = {
  ServiceList: { category: string; categoryId: string };
  ServiceDetail: { serviceId: string };
  Bookings: undefined;
  Search: { query?: string };
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const user = null; // Temporary - replace with useAuth when ready
  
  const [homeData, setHomeData] = useState<HomeData>({
    categories: [],
    promotions: [],
    popularServices: [],
    upcomingBookings: [],
    stats: { totalServices: 0, totalCategories: 0, totalProviders: 0, avgRating: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHomeData = useCallback(async () => {
    try {
      setError(null);
      
      const { data, error: fetchError } = await api.getHomeData(user?.id);
      
      if (fetchError) {
        throw new Error(fetchError);
      }
      
      if (data) {
        setHomeData(data);
      }
      
    } catch (err) {
      console.error('Error fetching home data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData();
  }, [fetchHomeData]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const handleCategoryPress = (category: Category) => {
    console.log('Category pressed:', category.name);
    navigation.navigate('ServiceList', {
      category: category.name,
      categoryId: category.id
    });
  };

  const handleServicePress = (service: Service) => {
    console.log('Service pressed:', service.name);
    navigation.navigate('ServiceDetail', {
      serviceId: service.id
    });
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      console.log('Search:', searchQuery.trim());
      navigation.navigate('Search', { query: searchQuery.trim() });
    }
  };

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

  const renderCategoryCard = ({ item: category }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: category.color }]}
      onPress={() => handleCategoryPress(category)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: category.image }}
        style={styles.categoryImage}
        resizeMode="cover"
        onError={() => console.log('Image error for:', category.name)}
      />
      <Text style={styles.categoryName}>{category.name}</Text>
      <Text style={styles.categoryCount}>{category.service_count}</Text>
    </TouchableOpacity>
  );

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

  const renderServiceCard = ({ item: service }: { item: Service }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => handleServicePress(service)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: service.image }}
        style={styles.serviceImage}
        resizeMode="cover"
      />
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
          <Text style={styles.servicePrice}>{service.price} kr</Text>
          <Text style={styles.serviceDuration}>{service.duration} min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          {booking.status === 'confirmed' ? 'Bekräftad' : 'Väntande'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && homeData.categories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1A2533" />
        <Text style={styles.loadingText}>Laddar...</Text>
      </SafeAreaView>
    );
  }

  if (error && homeData.categories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchHomeData} style={styles.retryButton}>
          <Text style={styles.retryText}>Försök igen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Hej{user ? ` ${user.full_name}` : ''}! 👋</Text>
          <Text style={styles.headerTitle}>Vad vill du boka?</Text>
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Sök tjänst eller kategori"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.searchSubtext}>Hela Sverige</Text>
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
        {/* Upcoming Bookings */}
        {user && homeData.upcomingBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Kommande bokningar</Text>
              <TouchableOpacity onPress={() => console.log('Navigate to Bookings')}>
                <Text style={styles.seeAllText}>Se alla</Text>
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
              <Text style={styles.sectionTitle}>Aktuella erbjudanden</Text>
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

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kategorier</Text>
          </View>
          <FlatList
            data={homeData.categories}
            renderItem={renderCategoryCard}
            keyExtractor={item => item.id}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.categoriesGrid}
            columnWrapperStyle={styles.categoryRow}
          />
        </View>

        {/* Popular Services */}
        {homeData.popularServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Populära tjänster</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Se alla</Text>
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

        {/* Stats */}
        <View style={styles.section}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{homeData.stats.totalServices}</Text>
              <Text style={styles.statLabel}>Tjänster</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{homeData.stats.totalProviders}</Text>
              <Text style={styles.statLabel}>Leverantörer</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{homeData.stats.avgRating}</Text>
              <Text style={styles.statLabel}>Snitt betyg</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{homeData.stats.totalCategories}</Text>
              <Text style={styles.statLabel}>Kategorier</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  headerGreeting: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A2533',
    letterSpacing: -0.5,
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A2533',
    padding: 0,
  },
  searchSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 16,
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#1A2533',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  categoriesGrid: {
    paddingHorizontal: 20,
  },
  categoryRow: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: cardWidth,
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryImage: {
    width: '70%',
    height: '50%',
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A2533',
    textAlign: 'center',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400',
  },
  promotionsList: {
    paddingHorizontal: 20,
  },
  promotionCard: {
    width: promotionWidth,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 16,
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
  },
  serviceImage: {
    width: '100%',
    height: 120,
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
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 20,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  tabIconContainer: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
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