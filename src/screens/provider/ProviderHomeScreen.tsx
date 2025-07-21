import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Image,
  FlatList,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAccount } from '../../navigation/AppNavigator';
import UpgradeModal from '../../components/UpgradeModal';

const { width } = Dimensions.get('window');

// Import navigation types
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

// Define navigation types
type RootStackParamList = {
  ShopDetails: {
    shop?: ShopDetails;
    onSave?: (shop: ShopDetails) => void;
  } | undefined;
  Subscription: undefined;
  Notifications: undefined;
  Analytics: undefined;
  Calendar: undefined;
  Earnings: undefined;
  ProviderTabs: {
    screen?: 'ProviderHomeTab' | 'QueueTab' | 'ServicesTab' | 'EarningsTab' | 'ProfileTab';
  } | undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Types for API data
interface DashboardStats {
  totalEarnings: number;
  activeJobs: number;
  completedJobs: number;
  customerRating: number;
  pendingBookings: number;
  thisMonthEarnings: number;
  responseRate: number;
  totalCustomers: number;
  averageJobValue: number;
  growthPercentage: number;
  weeklyBookings: number;
  monthlyGrowth: number;
}

interface ActivityItem {
  id: string;
  type: 'job_completed' | 'new_booking' | 'payment_received' | 'review_received' | 'schedule_updated' | 'customer_message';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  rating?: number;
  customer?: string;
  priority?: 'high' | 'medium' | 'low';
}

// Define the Shop interface
interface Shop {
  id: string;
  name: string;
  description: string;
  image: string;
  location: string;
  category: string;
  rating: number;
  reviews_count: number;
  is_active: boolean;
  total_services: number;
  monthly_revenue: number;
  certificate_images: string[];
  business_hours: {
    start: string;
    end: string;
  };
  contact_info: {
    phone: string;
    email: string;
    website?: string;
  };
  created_at: string;
  address: string;
  isActive: boolean;
  openingHours: string;
  services: string[];
  imageUrl?: string;
  phone: string;
  email: string;
}

interface ShopDetails {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  isActive: boolean;
  openingHours: string;
  services: string[];
  imageUrl?: string;
}

interface Notification {
  id: string;
  type: 'booking' | 'payment' | 'review' | 'system';
  title: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  priority: 'high' | 'medium' | 'low';
}

// Combined API response interface
interface ProviderDashboardData {
  stats: DashboardStats;
  activity: ActivityItem[];
  shops: Shop[];
  notifications: Notification[];
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  backgroundColor: string;
  action: () => void;
}

const ProviderHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isPro, user } = useAccount();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalEarnings: 0,
    activeJobs: 0,
    completedJobs: 0,
    customerRating: 0,
    pendingBookings: 0,
    thisMonthEarnings: 0,
    responseRate: 0,
    totalCustomers: 0,
    averageJobValue: 0,
    growthPercentage: 0,
    weeklyBookings: 0,
    monthlyGrowth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [myShops, setMyShops] = useState<Shop[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Provider API service - Single endpoint for all dashboard data
  const providerAPI = {
    async getDashboardData(providerId: string): Promise<ProviderDashboardData> {
      try {
        // Replace with your actual API endpoint
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.yourservice.com'}/provider/dashboard/${providerId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token || ''}`, // Add your auth token
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('API Error:', error);
        // Fallback to mock data for development/testing
        return this.getMockDashboardData();
      }
    },

    // Mock data for development (remove this in production)
    async getMockDashboardData(): Promise<ProviderDashboardData> {
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay
      
      return {
        stats: {
          totalEarnings: 24850.75,
          activeJobs: 7,
          completedJobs: 342,
          customerRating: 4.9,
          pendingBookings: 12,
          thisMonthEarnings: 5420.50,
          responseRate: 98,
          totalCustomers: 156,
          averageJobValue: 127.80,
          growthPercentage: 23.5,
          weeklyBookings: 8,
          monthlyGrowth: 15.2,
        },
        activity: [
          {
            id: '1',
            type: 'payment_received',
            title: 'Payment Received',
            description: 'Premium hair styling service payment from Sarah Williams',
            timestamp: '2024-01-16T16:45:00Z',
            amount: 185.00,
            customer: 'Sarah Williams',
            priority: 'medium',
          },
          {
            id: '2',
            type: 'new_booking',
            title: 'New VIP Booking',
            description: 'Luxury spa package requested by Emma Thompson for this weekend',
            timestamp: '2024-01-16T15:30:00Z',
            customer: 'Emma Thompson',
            priority: 'high',
          },
          {
            id: '3',
            type: 'review_received',
            title: 'Excellent 5-Star Review',
            description: 'John Miller: "Outstanding service! Professional and exceeded expectations."',
            timestamp: '2024-01-16T14:20:00Z',
            rating: 5,
            customer: 'John Miller',
            priority: 'medium',
          },
          {
            id: '4',
            type: 'job_completed',
            title: 'Premium Service Completed',
            description: 'Executive manicure & pedicure package finished for Lisa Chen',
            timestamp: '2024-01-16T13:15:00Z',
            amount: 145.00,
            customer: 'Lisa Chen',
            priority: 'low',
          },
          {
            id: '5',
            type: 'customer_message',
            title: 'Customer Inquiry',
            description: 'David Brown asking about availability for corporate event services',
            timestamp: '2024-01-16T12:10:00Z',
            customer: 'David Brown',
            priority: 'high',
          },
          {
            id: '6',
            type: 'payment_received',
            title: 'Large Payment Received',
            description: 'Wedding party beauty services payment from Michelle Rodriguez',
            timestamp: '2024-01-16T11:05:00Z',
            amount: 750.00,
            customer: 'Michelle Rodriguez',
            priority: 'medium',
          },
          {
            id: '7',
            type: 'schedule_updated',
            title: 'Appointment Rescheduled',
            description: 'Tom Wilson moved his appointment to next Tuesday afternoon',
            timestamp: '2024-01-16T10:30:00Z',
            customer: 'Tom Wilson',
            priority: 'low',
          },
          {
            id: '8',
            type: 'new_booking',
            title: 'Recurring Client Booking',
            description: 'Monthly beauty maintenance package booked by Jennifer Adams',
            timestamp: '2024-01-16T09:45:00Z',
            customer: 'Jennifer Adams',
            priority: 'medium',
          },
        ],
        shops: [
          {
            id: '1',
            name: 'Elegance Beauty Studio',
            description: 'Premier beauty destination offering luxury nail care, skincare, and wellness treatments',
            image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=250&fit=crop&q=80',
            location: 'Östermalm, Stockholm',
            category: 'Beauty & Wellness',
            rating: 4.8,
            reviews_count: 287,
            is_active: true,
            total_services: 18,
            monthly_revenue: 8450.00,
            certificate_images: [],
            business_hours: { start: '09:00', end: '19:00' },
            contact_info: {
              phone: '+46 8 123 456 78',
              email: 'contact@elegancebeauty.se',
              website: 'www.elegancebeauty.se',
            },
            created_at: '2024-01-01T00:00:00Z',
            address: 'Östermalm, Stockholm',
            phone: '+46 8 123 456 78',
            email: 'contact@elegancebeauty.se',
            isActive: true,
            openingHours: '09:00 - 19:00',
            services: ['Beauty & Wellness'],
            imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=250&fit=crop&q=80'
          },
          {
            id: '2',
            name: 'Metropolitan Hair Lounge',
            description: 'Contemporary hair salon specializing in cutting-edge styles and premium treatments',
            image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=250&fit=crop&q=80',
            location: 'Södermalm, Stockholm',
            category: 'Hair Salon',
            rating: 4.9,
            reviews_count: 194,
            is_active: true,
            total_services: 12,
            monthly_revenue: 12200.00,
            certificate_images: [],
            business_hours: { start: '10:00', end: '20:00' },
            contact_info: {
              phone: '+46 8 987 654 32',
              email: 'info@methairlounge.se',
            },
            created_at: '2024-01-15T00:00:00Z',
            address: 'Södermalm, Stockholm',
            phone: '+46 8 987 654 32',
            email: 'info@methairlounge.se',
            isActive: true,
            openingHours: '10:00 - 20:00',
            services: ['Hair Salon'],
            imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=250&fit=crop&q=80'
          },
          {
            id: '3',
            name: 'Serenity Spa Retreat',
            description: 'Luxury wellness sanctuary offering therapeutic massages and holistic treatments',
            image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=250&fit=crop&q=80',
            location: 'Gamla Stan, Stockholm',
            category: 'Spa & Wellness',
            rating: 4.7,
            reviews_count: 168,
            is_active: false,
            total_services: 9,
            monthly_revenue: 6800.00,
            certificate_images: [],
            business_hours: { start: '09:00', end: '21:00' },
            contact_info: {
              phone: '+46 8 111 222 33',
              email: 'info@serenityspa.se',
              website: 'www.serenityspa.se',
            },
            created_at: '2024-02-01T00:00:00Z',
            address: 'Gamla Stan, Stockholm',
            phone: '+46 8 111 222 33',
            email: 'info@serenityspa.se',
            isActive: false,
            openingHours: '09:00 - 21:00',
            services: ['Spa & Wellness'],
            imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=250&fit=crop&q=80'
          },
        ],
        notifications: [
          {
            id: '1',
            type: 'booking',
            title: 'Premium Booking Request',
            message: 'VIP customer requesting exclusive spa package for tomorrow.',
            timestamp: '2024-01-16T17:30:00Z',
            is_read: false,
            priority: 'high',
          },
          {
            id: '2',
            type: 'payment',
            title: 'Large Payment Received',
            message: 'Payment of $750 received from wedding party services.',
            timestamp: '2024-01-16T15:15:00Z',
            is_read: false,
            priority: 'medium',
          },
          {
            id: '3',
            type: 'review',
            title: 'Outstanding Review',
            message: 'New 5-star review highlighting exceptional customer service.',
            timestamp: '2024-01-16T13:20:00Z',
            is_read: false,
            priority: 'low',
          },
          {
            id: '4',
            type: 'system',
            title: 'Monthly Report Ready',
            message: 'Your comprehensive business analytics report is available.',
            timestamp: '2024-01-16T10:00:00Z',
            is_read: true,
            priority: 'medium',
          },
        ],
      };
    },
  };

  // Updated quick actions configuration with new colors
  const quickActions: QuickAction[] = [
    {
      id: 'calendar',
      title: 'Schedule',
      subtitle: 'Manage bookings',
      icon: 'calendar-outline',
      color: '#3B82F6',
      backgroundColor: '#EFF6FF',
      action: () => {
        navigation.navigate('ProviderTabs', { screen: 'ServicesTab' });
      },
    },
    {
      id: 'analytics',
      title: 'Analytics',
      subtitle: 'View insights',
      icon: 'analytics-outline',
      color: '#10B981',
      backgroundColor: '#ECFDF5',
      action: () => {
        Alert.alert(
          'Analytics Coming Soon',
          'Advanced analytics and reporting features are currently in development. Stay tuned for detailed business insights!',
          [
            {
              text: 'Got it',
              style: 'default',
            },
            {
              text: 'Notify me',
              onPress: () => {
                Alert.alert('Notification Set', 'We\'ll let you know when analytics features are available!');
              },
            },
          ]
        );
      },
    },
    {
      id: 'earnings',
      title: 'Earnings',
      subtitle: 'Track income',
      icon: 'trending-up-outline',
      color: '#F59E0B',
      backgroundColor: '#FEF3C7',
      action: () => {
        navigation.navigate('ProviderTabs', { screen: 'EarningsTab' });
      },
    },
    {
      id: 'customers',
      title: 'Customers',
      subtitle: 'Manage clients',
      icon: 'people-outline',
      color: '#F97316',
      backgroundColor: '#FED7AA',
      action: () => {
        Alert.alert(
          'Customer Management Coming Soon',
          'Customer relationship management features are being developed. Soon you\'ll be able to view customer profiles, booking history, and preferences!',
          [
            {
              text: 'Understood',
              style: 'default',
            },
            {
              text: 'Learn more',
              onPress: () => {
                Alert.alert(
                  'Upcoming Features',
                  '• Customer profiles and contact info\n• Booking history and preferences\n• Loyalty program management\n• Communication tools\n• Customer feedback tracking'
                );
              },
            },
          ]
        );
      },
    },
  ];

  // Fetch dashboard data with single API call
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const providerId = user?.id || 'provider-123'; // Use actual user ID

      const dashboardData = await providerAPI.getDashboardData(providerId);

      // Update all state with the single API response
      setDashboardStats(dashboardData.stats);
      setRecentActivity(dashboardData.activity);
      setMyShops(dashboardData.shops);
      setNotifications(dashboardData.notifications);
      
      const unreadCount = dashboardData.notifications.filter(n => !n.is_read).length;
      setUnreadNotifications(unreadCount);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Utility functions
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      job_completed: { name: 'checkmark-circle', color: '#10B981' },
      new_booking: { name: 'calendar', color: '#3B82F6' },
      payment_received: { name: 'card', color: '#10B981' },
      review_received: { name: 'star', color: '#F59E0B' },
      schedule_updated: { name: 'time', color: '#F97316' },
      customer_message: { name: 'chatbubble', color: '#EF4444' },
    };
    return icons[type] || { name: 'information-circle', color: '#4B5563' };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F97316';
      case 'low': return '#4B5563';
      default: return '#4B5563';
    }
  };

  // Navigation handlers
  const handleNotificationPress = () => navigation.navigate('Notifications');
  const handleUpgradePress = () => {
    setShowUpgradeModal(false);
    navigation.navigate('Subscription');
  };

  // Shop management with updated navigation
  const handleShopPress = (shop: Shop) => {
    navigation.navigate('ShopDetails', { 
      shop: {
        id: shop.id,
        name: shop.name,
        address: shop.location,
        phone: shop.contact_info.phone,
        email: shop.contact_info.email,
        description: shop.description,
        isActive: shop.is_active,
        openingHours: `${shop.business_hours.start} - ${shop.business_hours.end}`,
        services: [shop.category],
        imageUrl: shop.image
      },
    });
  };

  // Updated shop creation handler
  const handleAddNewShop = () => {
    navigation.navigate('ShopDetails', undefined);
  };

  const toggleShopStatus = (shopId: string) => {
    setMyShops(prev => prev.map(shop => 
      shop.id === shopId ? { ...shop, is_active: !shop.is_active, isActive: !shop.is_active } : shop
    ));
  };

  // Pro features for dashboard
  const dashboardFeatures = [
    {
      icon: 'trending-up-outline',
      iconColor: '#10B981',
      title: 'Advanced Analytics Dashboard',
      description: 'Comprehensive business insights with revenue forecasting and customer behavior analysis'
    },
    {
      icon: 'people-outline',
      iconColor: '#3B82F6',
      title: 'Complete Activity History',
      description: 'Unlimited access to all business activities, transactions, and customer interactions'
    },
    {
      icon: 'document-text-outline',
      iconColor: '#F59E0B',
      title: 'Professional Reports & Invoices',
      description: 'Custom branded reports, invoices with digital signatures, and automated billing'
    },
    {
      icon: 'notifications-outline',
      iconColor: '#F97316',
      title: 'Priority Business Alerts',
      description: 'Real-time notifications for VIP customers, large bookings, and important business events'
    }
  ];

  // Render methods
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || 'P'}
          </Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.userName}>{user?.name || 'Provider'}</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress}>
        <Ionicons name="notifications-outline" size={24} color="#1F2937" />
        {unreadNotifications > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationCount}>
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      {/* Primary Earnings Card */}
      <View style={[styles.statCard, styles.primaryStatCard]}>
        <View style={styles.statCardHeader}>
          <Ionicons name="trending-up" size={20} color="#FFFFFF" />
          <Text style={styles.primaryStatLabel}>Total Earnings</Text>
        </View>
        <Text style={styles.primaryStatValue}>
          {formatCurrency(dashboardStats.totalEarnings)}
        </Text>
        <View style={styles.growthContainer}>
          <Ionicons name="arrow-up" size={12} color="#FFFFFF" />
          <Text style={styles.growthText}>
            {formatPercentage(dashboardStats.growthPercentage)} this month
          </Text>
        </View>
      </View>

      {/* Secondary Stats */}
      <View style={styles.secondaryStatsContainer}>
        <View style={[styles.statCard, styles.secondaryStatCard]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="people" size={18} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{dashboardStats.totalCustomers}</Text>
          <Text style={styles.statLabel}>Total Customers</Text>
        </View>
        
        <View style={[styles.statCard, styles.secondaryStatCard]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{dashboardStats.completedJobs}</Text>
          <Text style={styles.statLabel}>Jobs Completed</Text>
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsContainer}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionCard, { backgroundColor: action.backgroundColor }]}
            onPress={action.action}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon as any} size={24} color={action.color} />
            </View>
            <Text style={styles.quickActionTitle}>{action.title}</Text>
            <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBusinessOverview = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Business Overview</Text>
      <View style={styles.overviewGrid}>
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Ionicons name="calendar-outline" size={16} color="#4B5563" />
            <Text style={styles.overviewLabel}>This Month</Text>
          </View>
          <Text style={styles.overviewValue}>
            {formatCurrency(dashboardStats.thisMonthEarnings)}
          </Text>
          <View style={styles.overviewChange}>
            <Ionicons 
              name={dashboardStats.monthlyGrowth > 0 ? "arrow-up" : "arrow-down"} 
              size={12} 
              color={dashboardStats.monthlyGrowth > 0 ? "#10B981" : "#EF4444"} 
            />
            <Text style={[
              styles.overviewChangeText,
              { color: dashboardStats.monthlyGrowth > 0 ? "#10B981" : "#EF4444" }
            ]}>
              {formatPercentage(dashboardStats.monthlyGrowth)}
            </Text>
          </View>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Ionicons name="star-outline" size={16} color="#4B5563" />
            <Text style={styles.overviewLabel}>Rating</Text>
          </View>
          <Text style={styles.overviewValue}>{dashboardStats.customerRating.toFixed(1)}</Text>
          <Text style={styles.overviewSubtext}>Based on reviews</Text>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Ionicons name="cash-outline" size={16} color="#4B5563" />
            <Text style={styles.overviewLabel}>Avg. Job Value</Text>
          </View>
          <Text style={styles.overviewValue}>
            {formatCurrency(dashboardStats.averageJobValue)}
          </Text>
          <Text style={styles.overviewSubtext}>Per booking</Text>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Ionicons name="time-outline" size={16} color="#4B5563" />
            <Text style={styles.overviewLabel}>Response Rate</Text>
          </View>
          <Text style={styles.overviewValue}>{dashboardStats.responseRate}%</Text>
          <Text style={styles.overviewSubtext}>Within 1 hour</Text>
        </View>
      </View>
    </View>
  );

  const renderShopItem = ({ item }: { item: Shop | 'add' }) => {
    if (item === 'add') {
      return (
        <TouchableOpacity style={styles.addShopCard} onPress={handleAddNewShop}>
          <View style={styles.addShopContent}>
            <View style={styles.addShopIcon}>
              <Ionicons name="add-circle-outline" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.addShopText}>Add New Shop</Text>
            <Text style={styles.addShopSubtext}>Expand your business</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={styles.shopCard} onPress={() => handleShopPress(item)}>
        <Image source={{ uri: item.image }} style={styles.shopImage} />
        
        <View style={styles.shopBadgeContainer}>
          <TouchableOpacity
            style={[styles.shopStatusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}
            onPress={() => toggleShopStatus(item.id)}
          >
            <Text style={[styles.shopStatusText, item.is_active ? styles.activeText : styles.inactiveText]}>
              {item.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.shopContent}>
          <Text style={styles.shopName}>{item.name}</Text>
          <Text style={styles.shopCategory}>{item.category}</Text>
          
          <View style={styles.shopMetrics}>
            <View style={styles.shopMetric}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.shopMetricText}>{item.rating}</Text>
            </View>
            <View style={styles.shopMetric}>
              <Ionicons name="people" size={12} color="#4B5563" />
              <Text style={styles.shopMetricText}>{item.reviews_count}</Text>
            </View>
          </View>

          <View style={styles.shopRevenue}>
            <Text style={styles.shopRevenueLabel}>Monthly Revenue</Text>
            <Text style={styles.shopRevenueValue}>{formatCurrency(item.monthly_revenue)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMyShops = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Shops</Text>
        <Text style={styles.shopCount}>{myShops.filter(shop => shop.is_active).length} active</Text>
      </View>
      
      <FlatList
        data={[...myShops, 'add' as const]}
        renderItem={renderShopItem}
        keyExtractor={(item, index) => item === 'add' ? 'add' : item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shopsContainer}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );

  const renderRecentActivity = () => {
    const activitiesToShow = isPro ? recentActivity : recentActivity.slice(0, 3);
    const hiddenActivitiesCount = recentActivity.length - activitiesToShow.length;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {!isPro && hiddenActivitiesCount > 0 && (
            <TouchableOpacity 
              style={styles.proButton}
              onPress={() => setShowUpgradeModal(true)}
            >
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.proButtonText}>PRO</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.activityList}>
          {activitiesToShow.map((activity, index) => {
            const icon = getActivityIcon(activity.type);
            const priorityColor = getPriorityColor(activity.priority || 'low');
            
            return (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityIconContainer, { backgroundColor: `${icon.color}15` }]}>
                  <Ionicons name={icon.name as any} size={18} color={icon.color} />
                </View>
                
                <View style={styles.activityContent}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <View style={styles.activityMeta}>
                      {activity.priority && (
                        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                      )}
                      <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  
                  <View style={styles.activityFooter}>
                    {activity.customer && (
                      <Text style={styles.activityCustomer}>👤 {activity.customer}</Text>
                    )}
                    {activity.amount && (
                      <Text style={styles.activityAmount}>{formatCurrency(activity.amount)}</Text>
                    )}
                    {activity.rating && (
                      <View style={styles.activityRating}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.activityRatingText}>{activity.rating}.0</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Upgrade Prompt for Free Users */}
        {!isPro && hiddenActivitiesCount > 0 && (
          <TouchableOpacity 
            style={styles.upgradePrompt}
            onPress={() => setShowUpgradeModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.upgradePromptContent}>
              <View style={styles.upgradeIconContainer}>
                <Ionicons name="star" size={20} color="#F59E0B" />
              </View>
              <View style={styles.upgradeTextContainer}>
                <Text style={styles.upgradeTitle}>
                  {hiddenActivitiesCount} more activit{hiddenActivitiesCount > 1 ? 'ies' : 'y'} hidden
                </Text>
                <Text style={styles.upgradeDescription}>
                  Upgrade to Pro for complete business insights
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#F59E0B" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FEFCE8" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
            <Text style={styles.loadingSubtext}>Preparing your business insights</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEFCE8" />
      
      {renderHeader()}
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            colors={['#F59E0B']}
            tintColor="#F59E0B"
          />
        }
      >
        {/* Stats Cards */}
        {renderStatsCards()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Business Overview */}
        {renderBusinessOverview()}

        {/* My Shops */}
        {renderMyShops()}

        {/* Recent Activity */}
        {renderRecentActivity()}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgradePress}
        title="Unlock Professional Dashboard"
        subtitle="Get comprehensive business analytics and unlimited access to all your data"
        features={dashboardFeatures}
        hiddenCount={recentActivity.length - 3}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCE8',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FEFCE8', // Changed to match background color
    // Removed border line
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEFCE8', // Changed to match background color
  },
  loadingContent: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
  },

  // Stats Section
  statsContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    padding: 20,
  },
  primaryStatCard: {
    backgroundColor: '#F59E0B',
    marginBottom: 16,
  },
  secondaryStatCard: {
    flex: 1,
    padding: 16,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryStatLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginLeft: 8,
    fontWeight: '500',
  },
  primaryStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginLeft: 4,
    fontWeight: '500',
  },
  secondaryStatsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },

  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  shopCount: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  proButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
  },

  // Business Overview
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    marginLeft: 6,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  overviewSubtext: {
    fontSize: 11,
    color: '#6B7280',
  },
  overviewChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overviewChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Shops Styles
  shopsContainer: {
    paddingVertical: 4,
  },
  shopCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  shopImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E7EB',
  },
  shopBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  shopStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  shopStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activeText: {
    color: '#065F46',
  },
  inactiveText: {
    color: '#991B1B',
  },
  shopContent: {
    padding: 16,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  shopCategory: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 12,
  },
  shopMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  shopMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shopMetricText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  shopRevenue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  shopRevenueLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  shopRevenueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // Add Shop Card
  addShopCard: {
    width: 280,
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FCD34D',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addShopContent: {
    alignItems: 'center',
    padding: 24,
  },
  addShopIcon: {
    marginBottom: 12,
  },
  addShopText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  addShopSubtext: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
  },

  // Activity Styles
  activityList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  activityDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 8,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityCustomer: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  activityRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Upgrade Prompt
  upgradePrompt: {
    marginTop: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: 16,
  },
  upgradePromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  upgradeDescription: {
    fontSize: 12,
    color: '#A16207',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 32,
  },
});

export default ProviderHomeScreen;