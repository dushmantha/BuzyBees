// ServiceQueueScreen.tsx - Complete integration with single API call and fixed styling
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccount } from '../../navigation/AppNavigator';
import UpgradeModal from '../../components/UpgradeModal';
import { normalizedShopService } from '../../lib/supabase/normalized';

// Types
interface QueueItem {
  id: string;
  booking_id: string;
  title: string;
  service_type: string;
  client: string;
  client_phone: string;
  client_email: string;
  date: string;
  time: string;
  scheduled_time: string;
  duration: string;
  price: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  priority: 'high' | 'medium' | 'low';
  notes: string;
  location_type: 'in_house' | 'on_location';
  location: string;
  staff_name: string;
  created_at: string;
  invoice_sent: boolean;
}

interface QueueStats {
  totalBookings: number;
  pendingCount: number;
  confirmedCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  todayRevenue: number;
  weeklyRevenue: number;
}

// Combined API response interface
interface QueueDashboardData {
  items: QueueItem[];
  stats: QueueStats;
  invoicesSent: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

const ServiceQueueScreen = ({ navigation }) => {
  const { isPro, user } = useAccount();
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Helper function to format booking ID
  const formatBookingId = (bookingId: string) => {
    // Get last 5 characters and prepend with BKR
    const last5 = bookingId.slice(-5).toUpperCase();
    return `BKR${last5}`;
  };

  // Helper function to format date for display
  const formatBookingDate = (dateString: string) => {
    const bookingDate = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time for accurate comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (bookingDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      // Show day of week and date for other dates
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      };
      return bookingDate.toLocaleDateString('en-US', options);
    }
  };

  // Helper function to check if booking is upcoming (today or in the future)
  const isUpcoming = (dateString: string) => {
    const bookingDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate.getTime() >= today.getTime();
  };
  const [queueData, setQueueData] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalBookings: 0,
    pendingCount: 0,
    confirmedCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    noShowCount: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingItems, setProcessingItems] = useState(new Set());
  const [invoiceSentItems, setInvoiceSentItems] = useState(new Set());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const FREE_USER_LIMIT = 3;

  // Custom features for the booking queue upgrade modal
  const queueUpgradeFeatures = [
    {
      icon: 'infinite-outline',
      iconColor: '#3B82F6',
      title: 'Unlimited Booking Views',
      description: 'View and manage all your customer bookings without any restrictions or limits'
    },
    {
      icon: 'filter-outline',
      iconColor: '#059669',
      title: 'Advanced Filtering',
      description: 'Filter bookings by status, date, service type, and priority with unlimited results'
    },
    {
      icon: 'analytics-outline',
      iconColor: '#F59E0B',
      title: 'Booking Analytics',
      description: 'Track booking trends, peak times, customer patterns, and service performance'
    },
    {
      icon: 'notifications-outline',
      iconColor: '#8B5CF6',
      title: 'Real-time Notifications',
      description: 'Get instant notifications for new bookings, cancellations, and urgent requests'
    }
  ];


  // Filter options with honey theme
  const filterOptions = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'pending', label: 'Pending', icon: 'time' },
    { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle' },
    { key: 'in_progress', label: 'In Progress', icon: 'play-circle' },
    { key: 'completed', label: 'Done', icon: 'checkmark-done' },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle' },
    { key: 'no_show', label: 'No Show', icon: 'person-remove' },
  ];

  // Load initial data directly from Supabase
  const loadQueueData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      
      // Get user ID from multiple sources for reliability
      let providerId = user?.id;
      
      // If context user is not available, try to get it from Supabase directly
      if (!providerId) {
        console.log('⚠️ User context not available, checking Supabase auth...');
        const currentUser = await normalizedShopService.getCurrentUser();
        providerId = currentUser?.id;
      }
      
      if (!providerId) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      console.log('📋 Loading bookings directly from Supabase for provider:', providerId);
      const response = await normalizedShopService.getBookings(providerId);
      
      if (response.success && response.data) {
        const bookings = response.data;
        console.log('📋 Loaded', bookings.length, 'bookings from Supabase');
        
        // Transform the booking data to match our QueueItem interface
        const queueItems: QueueItem[] = bookings.map(booking => ({
          id: booking.id,
          booking_id: booking.id,
          title: booking.service_name || 'Service',
          service_type: booking.service_category || 'General Service',
          client: booking.customer_name,
          client_phone: booking.customer_phone,
          client_email: booking.customer_email || '',
          date: booking.booking_date,
          time: booking.start_time,
          scheduled_time: `${booking.booking_date} ${booking.start_time}`,
          duration: `${booking.duration_minutes} min`,
          price: booking.total_amount,
          status: booking.status,
          priority: booking.status === 'pending' ? 'high' : 'medium',
          notes: booking.notes || '',
          location_type: booking.service_location_type || 'in_house',
          location: booking.service_location_type === 'on_location' ? 'Client Location' : 'Shop Location',
          staff_name: booking.staff?.name || 'Any Staff',
          created_at: booking.created_at,
          invoice_sent: false // Will be managed separately
        }));
        
        // Update queue data
        setQueueData(queueItems);
        
        // Calculate stats from the booking data
        const stats: QueueStats = {
          totalBookings: queueItems.length,
          pendingCount: queueItems.filter(item => item.status === 'pending').length,
          confirmedCount: queueItems.filter(item => item.status === 'confirmed').length,
          inProgressCount: queueItems.filter(item => item.status === 'in_progress').length,
          completedCount: queueItems.filter(item => item.status === 'completed').length,
          cancelledCount: queueItems.filter(item => item.status === 'cancelled').length,
          noShowCount: queueItems.filter(item => item.status === 'no_show').length,
          todayRevenue: queueItems
            .filter(item => item.status === 'completed' && item.date === new Date().toISOString().split('T')[0])
            .reduce((sum, item) => sum + item.price, 0),
          weeklyRevenue: queueItems
            .filter(item => item.status === 'completed')
            .reduce((sum, item) => sum + item.price, 0),
        };
        
        setQueueStats(stats);
        
        // Load invoice tracking data from local storage (only on initial load)
        if (showLoading) {
          try {
            const savedInvoices = await AsyncStorage.getItem('sentInvoices');
            if (savedInvoices) {
              setInvoiceSentItems(new Set(JSON.parse(savedInvoices)));
            }
          } catch (error) {
            console.log('No saved invoice data found');
          }
        }
        
      } else {
        throw new Error(response.error || 'Failed to load bookings');
      }
      
    } catch (error) {
      console.error('Error loading booking queue:', error);
      
      // Handle authentication errors specifically
      if (error.message?.includes('not authenticated')) {
        Alert.alert(
          'Authentication Required', 
          'Please log in again to access your booking queue.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else if (showLoading) {
        Alert.alert('Error', 'Failed to load booking queue. Please try again.');
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadQueueData(true); // Initial load with loading indicator
    
    // Set up periodic refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing booking queue...');
      loadQueueData(false); // Background refresh without loading indicator
    }, 30000);
    
    // Clean up interval on unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [loadQueueData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📋 Screen focused, refreshing booking queue...');
      loadQueueData(false); // Background refresh without loading indicator
    }, [loadQueueData])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadQueueData(false); // Manual refresh doesn't need loading indicator
    setIsRefreshing(false);
  }, [loadQueueData]);

  // Get filtered data with proper limitations
  const getFilteredData = useCallback(() => {
    const filtered = selectedFilter === 'all' 
      ? queueData 
      : queueData.filter(item => item.status === selectedFilter);
    
    if (!isPro) {
      return filtered.slice(0, FREE_USER_LIMIT);
    }
    
    return filtered;
  }, [queueData, selectedFilter, isPro]);

  // Get counts for each filter using stats from API
  const getFilterCounts = useCallback(() => {
    return {
      all: queueStats.totalBookings,
      pending: queueStats.pendingCount,
      confirmed: queueStats.confirmedCount,
      in_progress: queueStats.inProgressCount,
      completed: queueStats.completedCount,
      cancelled: queueStats.cancelledCount,
      no_show: queueStats.noShowCount,
    };
  }, [queueStats]);

  // Check if there are hidden items
  const getHiddenItemsCount = useCallback(() => {
    if (isPro) return 0;
    
    const allFiltered = selectedFilter === 'all' 
      ? queueData 
      : queueData.filter(item => item.status === selectedFilter);
    
    return Math.max(0, allFiltered.length - FREE_USER_LIMIT);
  }, [queueData, selectedFilter, isPro]);

  const filteredData = getFilteredData();
  const hiddenItemsCount = getHiddenItemsCount();

  // Handle filter selection with premium check
  const handleFilterSelect = useCallback((filterKey: string) => {
    setSelectedFilter(filterKey);
    
    // Show premium modal if user tries to filter and would see limited results
    if (!isPro && filterKey !== 'all') {
      const filteredCount = queueData.filter(item => item.status === filterKey).length;
      if (filteredCount > FREE_USER_LIMIT) {
        setTimeout(() => {
          setShowUpgradeModal(true);
        }, 300);
      }
    }
  }, [isPro, queueData]);

  // Handle premium upgrade
  const handleUpgradeToPremium = useCallback(async () => {
    try {
      setShowUpgradeModal(false);
      setIsLoading(true);
      
      // Navigate to subscription screen
      navigation.navigate('Subscription');
      
    } catch (error) {
      console.error('Error upgrading to premium:', error);
      Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  // Accept booking with direct Supabase integration
  const handleAcceptBooking = useCallback(async (item: QueueItem) => {
    try {
      setProcessingItems(prev => new Set([...prev, item.id]));
      
      console.log('📋 Confirming booking:', item.booking_id);
      const response = await normalizedShopService.updateBookingStatus(
        item.booking_id, 
        'confirmed',
        'Booking confirmed by provider'
      );
      
      if (response.success) {
        // Update local state immediately
        setQueueData(prevData =>
          prevData.map(queueItem =>
            queueItem.id === item.id
              ? { ...queueItem, status: 'confirmed' as const }
              : queueItem
          )
        );
        
        // Update stats
        setQueueStats(prevStats => ({
          ...prevStats,
          pendingCount: prevStats.pendingCount - 1,
          confirmedCount: prevStats.confirmedCount + 1
        }));
        
        Alert.alert(
          'Booking Confirmed',
          `You've confirmed the booking for ${item.client}. They will be notified.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.error || 'Failed to confirm booking');
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      Alert.alert('Error', 'Failed to confirm booking. Please try again.');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  }, []);

  // Reject booking with API integration
  const handleRejectBooking = useCallback(async (item: QueueItem) => {
    Alert.alert(
      'Reject Booking',
      `Are you sure you want to reject the booking for ${item.client}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingItems(prev => new Set([...prev, item.id]));
              
              console.log('📋 Cancelling booking:', item.booking_id);
              const response = await normalizedShopService.updateBookingStatus(
                item.booking_id, 
                'cancelled', 
                'Provider declined booking'
              );
              
              if (response.success) {
                // Update local state immediately
                setQueueData(prevData =>
                  prevData.map(queueItem =>
                    queueItem.id === item.id
                      ? { ...queueItem, status: 'cancelled' as const }
                      : queueItem
                  )
                );
                
                // Update stats
                setQueueStats(prevStats => ({
                  ...prevStats,
                  pendingCount: prevStats.pendingCount - 1,
                  cancelledCount: prevStats.cancelledCount + 1
                }));
                
                Alert.alert(
                  'Booking Cancelled',
                  `You've cancelled the booking for ${item.client}. They will be notified and can book with another provider.`,
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error(response.error || 'Failed to cancel booking');
              }
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            } finally {
              setProcessingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
            }
          }
        }
      ]
    );
  }, [user?.id]);

  // Mark as completed with API integration
  const handleMarkCompleted = useCallback(async (item: QueueItem) => {
    Alert.alert(
      'Mark as Completed',
      `Mark the booking for ${item.client} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setProcessingItems(prev => new Set([...prev, item.id]));
              
              console.log('📋 Completing booking:', item.booking_id);
              const response = await normalizedShopService.updateBookingStatus(
                item.booking_id, 
                'completed', 
                'Service completed successfully'
              );
              
              if (response.success) {
                // Update local state immediately
                setQueueData(prevData =>
                  prevData.map(queueItem =>
                    queueItem.id === item.id
                      ? { ...queueItem, status: 'completed' as const }
                      : queueItem
                  )
                );
                
                // Update stats
                setQueueStats(prevStats => ({
                  ...prevStats,
                  confirmedCount: prevStats.confirmedCount - 1,
                  completedCount: prevStats.completedCount + 1,
                  todayRevenue: prevStats.todayRevenue + item.price,
                  weeklyRevenue: prevStats.weeklyRevenue + item.price
                }));
                
                Alert.alert(
                  'Service Completed!',
                  'Would you like to generate an invoice for this service?',
                  [
                    { text: 'Later', style: 'cancel' },
                    {
                      text: 'Generate Invoice',
                      onPress: () => handleGenerateInvoice(item)
                    }
                  ]
                );
              } else {
                throw new Error(response.error || 'Failed to complete booking');
              }
            } catch (error) {
              console.error('Error completing booking:', error);
              Alert.alert('Error', 'Failed to mark booking as completed');
            } finally {
              setProcessingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
            }
          }
        }
      ]
    );
  }, [user?.id]);

  // Handle invoice generation navigation
  const handleGenerateInvoice = useCallback(async (item: QueueItem) => {
    try {
      await AsyncStorage.setItem('selectedBookingForInvoice', JSON.stringify({
        bookingId: item.booking_id,
        bookingData: item
      }));
      
      navigation.navigate('InvoiceGenerator');
      
    } catch (error) {
      console.error('Error preparing invoice data:', error);
      Alert.alert('Error', 'Failed to prepare invoice data');
    }
  }, [navigation]);

  // Handle invoice sending with API integration
  const handleSendInvoice = useCallback(async (item: QueueItem) => {
    const isInvoiceSent = invoiceSentItems.has(item.booking_id);
    
    if (isInvoiceSent) {
      Alert.alert(
        'Send Invoice Again?',
        `An invoice has already been sent to ${item.client} for booking ${formatBookingId(item.booking_id)}. Would you like to send it again?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Again',
            onPress: async () => {
              await sendInvoiceToClient(item);
            }
          }
        ]
      );
    } else {
      await sendInvoiceToClient(item);
    }
  }, [invoiceSentItems]);

  const sendInvoiceToClient = useCallback(async (item: QueueItem) => {
    try {
      setProcessingItems(prev => new Set([...prev, item.id]));
      
      const response = await queueAPI.sendInvoice(item.booking_id, user?.id || 'provider-123');
      
      if (response.success) {
        const newInvoiceSentItems = new Set([...invoiceSentItems, item.booking_id]);
        setInvoiceSentItems(newInvoiceSentItems);
        
        // Save locally
        await AsyncStorage.setItem('sentInvoices', JSON.stringify([...newInvoiceSentItems]));
        
        setQueueData(prevData =>
          prevData.map(queueItem =>
            queueItem.id === item.id
              ? { ...queueItem, invoice_sent: true }
              : queueItem
          )
        );
        
        Alert.alert(
          'Invoice Sent!',
          `Invoice has been sent to ${item.client} at ${item.client_email}`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      Alert.alert('Error', 'Failed to send invoice. Please try again.');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  }, [user?.id, invoiceSentItems]);

  // Make phone call
  const handleCallClient = useCallback(async (phoneNumber: string, clientName: string) => {
    try {
      const phoneUrl = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(
          'Call Failed',
          'Unable to make phone calls on this device',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert('Error', 'Failed to initiate phone call');
    }
  }, []);

  // Send SMS message
  const handleMessageClient = useCallback(async (phoneNumber: string, clientName: string, serviceName: string) => {
    try {
      const message = `Hi ${clientName}, this is regarding your ${serviceName} booking. How can I help you?`;
      const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(smsUrl);
      
      if (canOpen) {
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert(
          'Message Failed',
          'Unable to send messages on this device',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  }, []);

  // Get status badge style with honey theme
  const getStatusBadgeStyle = useCallback((status: string) => {
    switch (status) {
      case 'pending':
        return { badge: styles.pendingBadge, text: styles.pendingText };
      case 'confirmed':
        return { badge: styles.confirmedBadge, text: styles.confirmedText };
      case 'in_progress':
        return { badge: styles.inProgressBadge, text: styles.inProgressText };
      case 'completed':
        return { badge: styles.completedBadge, text: styles.completedText };
      case 'cancelled':
        return { badge: styles.cancelledBadge, text: styles.cancelledText };
      case 'no_show':
        return { badge: styles.noShowBadge, text: styles.noShowText };
      default:
        return { badge: styles.pendingBadge, text: styles.pendingText };
    }
  }, []);

  // Render action buttons based on status
  const renderActionButtons = useCallback((item: QueueItem) => {
    const isProcessing = processingItems.has(item.id);
    const isInvoiceSent = invoiceSentItems.has(item.booking_id);

    if (isProcessing) {
      return (
        <View style={styles.queueActions}>
          <View style={styles.loadingAction}>
            <ActivityIndicator size="small" color="#F59E0B" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.queueActions}>
        {/* Communication Actions */}
        <View style={styles.communicationActions}>
          <TouchableOpacity 
            style={styles.communicationButton}
            onPress={() => handleCallClient(item.client_phone, item.client)}
          >
            <Ionicons name="call-outline" size={16} color="#10B981" />
            <Text style={styles.communicationButtonText}>Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.communicationButton}
            onPress={() => handleMessageClient(item.client_phone, item.client, item.title)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#3B82F6" />
            <Text style={[styles.communicationButtonText, { color: '#3B82F6' }]}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Status Actions */}
        <View style={styles.statusActions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={() => handleRejectBooking(item)}
              >
                <Ionicons name="close" size={16} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => handleAcceptBooking(item)}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Confirm</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'confirmed' && (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={() => handleMarkCompleted(item)}
            >
              <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          )}

          {item.status === 'completed' && (
            <View style={styles.completedActions}>
              <TouchableOpacity 
                style={styles.invoiceButton}
                onPress={() => handleGenerateInvoice(item)}
              >
                <Ionicons name="document-text" size={16} color="#F59E0B" />
                <Text style={styles.invoiceButtonText}>Generate Invoice</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={isInvoiceSent ? styles.invoiceSentButton : styles.sendInvoiceButton}
                onPress={() => handleSendInvoice(item)}
              >
                <Ionicons 
                  name={isInvoiceSent ? "checkmark-circle" : "send"} 
                  size={16} 
                  color={isInvoiceSent ? "#10B981" : "#FFFFFF"} 
                />
                <Text style={isInvoiceSent ? styles.invoiceSentButtonText : styles.sendInvoiceButtonText}>
                  {isInvoiceSent ? 'Invoice Sent' : 'Send Invoice'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {(item.status === 'cancelled' || item.status === 'no_show') && (
            <View style={styles.statusIndicatorButton}>
              <Text style={styles.statusIndicatorText}>
                {item.status === 'cancelled' ? 'Cancelled' : 'No Show'}
              </Text>
            </View>
          )}
        </View>

        {/* Invoice sent indicator */}
        {isInvoiceSent && item.status === 'completed' && (
          <View style={styles.invoiceSentIndicator}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.invoiceSentIndicatorText}>Invoice has been sent to client</Text>
          </View>
        )}
      </View>
    );
  }, [processingItems, invoiceSentItems, handleCallClient, handleMessageClient, handleRejectBooking, handleAcceptBooking, handleMarkCompleted, handleGenerateInvoice, handleSendInvoice]);

  const renderQueueItem = useCallback(({ item }: { item: QueueItem }) => {
    const statusStyle = getStatusBadgeStyle(item.status);

    return (
      <TouchableOpacity style={styles.queueItem}>
        <View style={styles.queueHeader}>
          <View style={styles.queueTitleContainer}>
            <Text style={styles.queueTitle}>{item.title}</Text>
            <Text style={styles.serviceType}>{item.service_type}</Text>
          </View>
          <View style={[styles.statusBadge, statusStyle.badge]}>
            <Text style={[styles.statusText, statusStyle.text]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.clientInfo}>
          <Text style={styles.queueClient}>{item.client}</Text>
          <Text style={styles.bookingId}>{formatBookingId(item.booking_id)}</Text>
        </View>

        <View style={styles.queueDetails}>
          {/* Date Row - Prominently displayed */}
          <View style={[styles.detailRow, styles.dateRow]}>
            <Ionicons 
              name="calendar-outline" 
              size={16} 
              color={isUpcoming(item.date) ? "#059669" : "#6B7280"} 
            />
            <Text style={[
              styles.queueDate, 
              isUpcoming(item.date) && styles.upcomingDate
            ]}>
              {formatBookingDate(item.date)}
            </Text>
            {isUpcoming(item.date) && (
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingBadgeText}>UPCOMING</Text>
              </View>
            )}
          </View>
          
          {/* Time Row */}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color="#F59E0B" />
            <Text style={styles.queueTime}>{item.time}</Text>
            <Text style={styles.duration}>({item.duration})</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons 
              name={item.location_type === 'on_location' ? "car-outline" : "storefront-outline"} 
              size={14} 
              color="#4B5563" 
            />
            <Text style={styles.queueLocation}>
              {item.location_type === 'on_location' ? 'Client Location' : 'Shop Location'}
            </Text>
            {item.location_type === 'on_location' && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>On-Location</Text>
              </View>
            )}
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={14} color="#F59E0B" />
            <Text style={styles.queuePrice}>${item.price}</Text>
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {renderActionButtons(item)}
      </TouchableOpacity>
    );
  }, [getStatusBadgeStyle, renderActionButtons]);

  // Render filter chips with honey theme
  const renderFilterChips = useCallback(() => {
    const counts = getFilterCounts();
    
    return (
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filterOptions.map((filter) => {
            const count = counts[filter.key];
            const isSelected = selectedFilter === filter.key;
            const isLocked = !isPro && filter.key !== 'all' && count > FREE_USER_LIMIT;
            
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                  isLocked && styles.filterChipLocked,
                ]}
                onPress={() => handleFilterSelect(filter.key)}
              >
                <View style={styles.filterChipContent}>
                  <Ionicons 
                    name={filter.icon} 
                    size={16} 
                    color={isSelected ? '#FFFFFF' : isLocked ? '#9CA3AF' : '#F59E0B'} 
                  />
                  <Text style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                    isLocked && styles.filterChipTextLocked,
                  ]}>
                    {filter.label}
                  </Text>
                  {count > 0 && (
                    <View style={[
                      styles.filterChipBadge,
                      isSelected && styles.filterChipBadgeSelected,
                      isLocked && styles.filterChipBadgeLocked,
                    ]}>
                      <Text style={[
                        styles.filterChipBadgeText,
                        isSelected && styles.filterChipBadgeTextSelected,
                        isLocked && styles.filterChipBadgeTextLocked,
                      ]}>
                        {count}
                      </Text>
                    </View>
                  )}
                  {isLocked && (
                    <Ionicons 
                      name="lock-closed" 
                      size={12} 
                      color="#9CA3AF" 
                      style={styles.lockIcon}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [getFilterCounts, selectedFilter, isPro, handleFilterSelect]);

  // Render premium upgrade prompt
  const renderPremiumPrompt = useCallback(() => {
    if (isPro || hiddenItemsCount === 0) return null;

    return (
      <View style={styles.premiumPrompt}>
        <View style={styles.premiumPromptContent}>
          <Ionicons name="lock-closed" size={20} color="#F59E0B" />
          <Text style={styles.premiumPromptText}>
            {hiddenItemsCount} more booking{hiddenItemsCount !== 1 ? 's' : ''} available
          </Text>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => setShowUpgradeModal(true)}
          >
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [isPro, hiddenItemsCount]);

  // Empty state
  const renderEmptyState = useCallback(() => {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={64} color="#E5E7EB" />
        <Text style={styles.emptyStateTitle}>No bookings found</Text>
        <Text style={styles.emptyStateSubtitle}>
          {selectedFilter === 'all' 
            ? "You don't have any bookings yet" 
            : `No ${selectedFilter} bookings found`
          }
        </Text>
      </View>
    );
  }, [selectedFilter]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEFCE8" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Queue</Text>
        <View style={styles.headerRight}>
          {isPro && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh" size={24} color="#F59E0B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      {renderFilterChips()}

      {/* Premium Prompt */}
      {renderPremiumPrompt()}

      {/* Queue List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderQueueItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.queueList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#F59E0B']}
              tintColor="#F59E0B"
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* UpgradeModal Integration */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgradeToPremium}
        title="Unlock All Your Bookings"
        subtitle="Get unlimited access to all your customer bookings and premium queue management features"
        features={queueUpgradeFeatures}
        hiddenCount={hiddenItemsCount}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCE8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FEFCE8', // Changed to match background color
    // Removed border line
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  
  // Filter Styles
  filterContainer: {
    backgroundColor: '#FEFCE8', // Changed to match background color
    paddingVertical: 12,
    // Removed border line
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  filterChipSelected: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  filterChipLocked: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.7,
  },
  filterChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  filterChipTextLocked: {
    color: '#9CA3AF',
  },
  filterChipBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterChipBadgeSelected: {
    backgroundColor: '#FFFFFF',
  },
  filterChipBadgeLocked: {
    backgroundColor: '#E5E7EB',
  },
  filterChipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterChipBadgeTextSelected: {
    color: '#F59E0B',
  },
  filterChipBadgeTextLocked: {
    color: '#9CA3AF',
  },
  lockIcon: {
    marginLeft: 4,
  },

  // Premium Prompt
  premiumPrompt: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  premiumPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumPromptText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
  upgradeButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Queue List
  queueList: {
    padding: 16,
  },
  queueItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  queueTitleContainer: {
    flex: 1,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceType: {
    fontSize: 14,
    color: '#4B5563',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Status Badge Styles with Honey Theme
  pendingBadge: { backgroundColor: '#FEF3C7' },
  pendingText: { color: '#92400E' },
  confirmedBadge: { backgroundColor: '#EFF6FF' },
  confirmedText: { color: '#2563EB' },
  inProgressBadge: { backgroundColor: '#F3E8FF' },
  inProgressText: { color: '#7C3AED' },
  completedBadge: { backgroundColor: '#ECFDF5' },
  completedText: { color: '#059669' },
  cancelledBadge: { backgroundColor: '#FEE2E2' },
  cancelledText: { color: '#DC2626' },
  noShowBadge: { backgroundColor: '#F3F4F6' },
  noShowText: { color: '#4B5563' },

  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  bookingId: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  queueDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateRow: {
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  queueDate: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
    marginLeft: 6,
  },
  upcomingDate: {
    color: '#059669',
    fontWeight: '700',
  },
  upcomingBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },
  queueTime: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  duration: {
    fontSize: 12,
    color: '#4B5563',
  },
  queueLocation: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  locationBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  queuePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  notesContainer: {
    backgroundColor: '#FEFCE8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },

  // Action Buttons with Honey Theme
  queueActions: {
    gap: 12,
  },
  communicationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  communicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  communicationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DC2626',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  urgentAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  completedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  invoiceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  sendInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  sendInvoiceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  invoiceSentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  invoiceSentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  statusIndicatorButton: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  statusIndicatorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  loadingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#F59E0B',
  },
  invoiceSentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  invoiceSentIndicatorText: {
    fontSize: 12,
    color: '#10B981',
  },

  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ServiceQueueScreen;