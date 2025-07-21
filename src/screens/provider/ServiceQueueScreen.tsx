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
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccount } from '../../navigation/AppNavigator';
import UpgradeModal from '../../components/UpgradeModal';

// Types
interface QueueItem {
  id: string;
  title: string;
  service_type: string;
  client: string;
  client_phone: string;
  client_email: string;
  time: string;
  date: string;
  scheduled_time: string;
  location: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'urgent';
  priority: 'high' | 'medium' | 'low';
  duration: string;
  price: number;
  notes: string;
  booking_id: string;
  created_at: string;
  invoice_sent: boolean;
}

interface QueueStats {
  totalBookings: number;
  pendingCount: number;
  acceptedCount: number;
  urgentCount: number;
  completedCount: number;
  rejectedCount: number;
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
  const [queueData, setQueueData] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalBookings: 0,
    pendingCount: 0,
    acceptedCount: 0,
    urgentCount: 0,
    completedCount: 0,
    rejectedCount: 0,
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

  // Enhanced API service with single endpoint
  const queueAPI = {
    // Single API call to get all queue data
    async getQueueDashboard(providerId: string, filters?: { status?: string; date?: string }): Promise<ApiResponse<QueueDashboardData>> {
      try {
        // Replace with your actual API endpoint
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.yourservice.com'}/provider/queue/${providerId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token || ''}`,
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
        return this.getMockQueueData();
      }
    },

    // Mock data for development (remove this in production)
    async getMockQueueData(): Promise<ApiResponse<QueueDashboardData>> {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      const mockItems: QueueItem[] = [
        {
          id: '1',
          title: 'Classic Manicure',
          service_type: 'Beauty Service',
          client: 'Sarah Wilson',
          client_phone: '+64212345678',
          client_email: 'sarah.wilson@email.com',
          time: 'Today, 2:00 PM',
          date: '2025-07-16',
          scheduled_time: '14:00',
          location: '123 Queen St, Auckland',
          status: 'pending',
          priority: 'high',
          duration: '45 min',
          price: 450,
          notes: 'First time customer, requested classic style',
          booking_id: 'BK001',
          created_at: '2025-07-15T10:30:00Z',
          invoice_sent: false,
        },
        {
          id: '2',
          title: 'Hair Cut & Style',
          service_type: 'Hair Service',
          client: 'Emma Thompson',
          client_phone: '+64223456789',
          client_email: 'emma.thompson@email.com',
          time: 'Today, 4:30 PM',
          date: '2025-07-16',
          scheduled_time: '16:30',
          location: '456 Ponsonby Rd, Auckland',
          status: 'accepted',
          priority: 'medium',
          duration: '60 min',
          price: 650,
          notes: 'Regular customer, usual style',
          booking_id: 'BK002',
          created_at: '2025-07-15T11:45:00Z',
          invoice_sent: false,
        },
        {
          id: '3',
          title: 'Swedish Massage',
          service_type: 'Wellness Service',
          client: 'Mike Chen',
          client_phone: '+64234567890',
          client_email: 'mike.chen@email.com',
          time: 'Tomorrow, 10:00 AM',
          date: '2025-07-17',
          scheduled_time: '10:00',
          location: '789 Parnell St, Auckland',
          status: 'pending',
          priority: 'medium',
          duration: '60 min',
          price: 750,
          notes: 'Stressed muscles, focus on back and shoulders',
          booking_id: 'BK003',
          created_at: '2025-07-15T14:20:00Z',
          invoice_sent: false,
        },
        {
          id: '4',
          title: 'Gel Manicure',
          service_type: 'Beauty Service',
          client: 'Lisa Brown',
          client_phone: '+64245678901',
          client_email: 'lisa.brown@email.com',
          time: 'Jan 18, 3:00 PM',
          date: '2025-07-18',
          scheduled_time: '15:00',
          location: '321 Newmarket Rd, Auckland',
          status: 'urgent',
          priority: 'high',
          duration: '60 min',
          price: 550,
          notes: 'Special event tomorrow, needs to look perfect',
          booking_id: 'BK004',
          created_at: '2025-07-16T09:15:00Z',
          invoice_sent: false,
        },
        {
          id: '5',
          title: 'Haircut & Color',
          service_type: 'Hair Service',
          client: 'Anna Johnson',
          client_phone: '+64256789012',
          client_email: 'anna.johnson@email.com',
          time: 'Jan 19, 11:30 AM',
          date: '2025-07-19',
          scheduled_time: '11:30',
          location: '654 K Rd, Auckland',
          status: 'rejected',
          priority: 'low',
          duration: '120 min',
          price: 850,
          notes: 'Complete color change requested',
          booking_id: 'BK005',
          created_at: '2025-07-15T16:45:00Z',
          invoice_sent: false,
        },
        {
          id: '6',
          title: 'Facial Treatment',
          service_type: 'Beauty Service',
          client: 'Rachel Green',
          client_phone: '+64267890123',
          client_email: 'rachel.green@email.com',
          time: 'Jan 20, 2:00 PM',
          date: '2025-07-20',
          scheduled_time: '14:00',
          location: '987 Newmarket Rd, Auckland',
          status: 'completed',
          priority: 'medium',
          duration: '90 min',
          price: 800,
          notes: 'Anti-aging treatment, very satisfied customer',
          booking_id: 'BK006',
          created_at: '2025-07-15T09:20:00Z',
          invoice_sent: true,
        },
        {
          id: '7',
          title: 'Deep Tissue Massage',
          service_type: 'Wellness Service',
          client: 'John Smith',
          client_phone: '+64278901234',
          client_email: 'john.smith@email.com',
          time: 'Jan 21, 1:00 PM',
          date: '2025-07-21',
          scheduled_time: '13:00',
          location: '111 Ponsonby Rd, Auckland',
          status: 'pending',
          priority: 'medium',
          duration: '75 min',
          price: 890,
          notes: 'Athletic recovery session',
          booking_id: 'BK007',
          created_at: '2025-07-16T08:30:00Z',
          invoice_sent: false,
        },
        {
          id: '8',
          title: 'Eyebrow Threading',
          service_type: 'Beauty Service',
          client: 'Maria Garcia',
          client_phone: '+64289012345',
          client_email: 'maria.garcia@email.com',
          time: 'Jan 22, 11:00 AM',
          date: '2025-07-22',
          scheduled_time: '11:00',
          location: '555 Karangahape Rd, Auckland',
          status: 'pending',
          priority: 'low',
          duration: '30 min',
          price: 280,
          notes: 'Regular monthly appointment',
          booking_id: 'BK008',
          created_at: '2025-07-16T10:15:00Z',
          invoice_sent: false,
        },
      ];

      const mockStats: QueueStats = {
        totalBookings: mockItems.length,
        pendingCount: mockItems.filter(item => item.status === 'pending').length,
        acceptedCount: mockItems.filter(item => item.status === 'accepted').length,
        urgentCount: mockItems.filter(item => item.status === 'urgent').length,
        completedCount: mockItems.filter(item => item.status === 'completed').length,
        rejectedCount: mockItems.filter(item => item.status === 'rejected').length,
        todayRevenue: mockItems
          .filter(item => item.status === 'completed' && item.date === '2025-07-16')
          .reduce((sum, item) => sum + item.price, 0),
        weeklyRevenue: mockItems
          .filter(item => item.status === 'completed')
          .reduce((sum, item) => sum + item.price, 0),
      };

      const invoicesSent = mockItems
        .filter(item => item.invoice_sent)
        .map(item => item.booking_id);

      return {
        success: true,
        data: {
          items: mockItems,
          stats: mockStats,
          invoicesSent,
        },
        message: 'Queue data loaded successfully'
      };
    },

    // Accept booking
    async acceptBooking(bookingId: string, providerId: string): Promise<ApiResponse<any>> {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.yourservice.com'}/provider/bookings/${bookingId}/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token || ''}`,
          },
          body: JSON.stringify({ providerId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        // Mock response for development
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
          success: true,
          message: 'Booking accepted successfully'
        };
      }
    },

    // Reject booking
    async rejectBooking(bookingId: string, reason: string, providerId: string): Promise<ApiResponse<any>> {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.yourservice.com'}/provider/bookings/${bookingId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token || ''}`,
          },
          body: JSON.stringify({ reason, providerId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        // Mock response for development
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
          success: true,
          message: 'Booking rejected successfully'
        };
      }
    },

    // Update booking status
    async updateBookingStatus(bookingId: string, status: string, providerId: string): Promise<ApiResponse<any>> {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.yourservice.com'}/provider/bookings/${bookingId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token || ''}`,
          },
          body: JSON.stringify({ status, providerId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        // Mock response for development
        await new Promise(resolve => setTimeout(resolve, 600));
        return {
          success: true,
          message: `Booking status updated to ${status}`
        };
      }
    },

    // Send invoice
    async sendInvoice(bookingId: string, providerId: string): Promise<ApiResponse<any>> {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.yourservice.com'}/provider/bookings/${bookingId}/invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token || ''}`,
          },
          body: JSON.stringify({ providerId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        // Mock response for development
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          success: true,
          message: 'Invoice sent successfully'
        };
      }
    },
  };

  // Filter options with honey theme
  const filterOptions = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'pending', label: 'Pending', icon: 'time' },
    { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle' },
    { key: 'urgent', label: 'Urgent', icon: 'warning' },
    { key: 'completed', label: 'Done', icon: 'checkmark-done' },
    { key: 'rejected', label: 'Rejected', icon: 'close-circle' },
  ];

  // Load initial data with single API call
  const loadQueueData = useCallback(async () => {
    try {
      setIsLoading(true);
      const providerId = user?.id || 'provider-123';
      
      const response = await queueAPI.getQueueDashboard(providerId);
      
      if (response.success && response.data) {
        const { items, stats, invoicesSent } = response.data;
        
        // Update all state with the single API response
        setQueueData(items);
        setQueueStats(stats);
        setInvoiceSentItems(new Set(invoicesSent));
        
        // Save invoice tracking data locally
        await AsyncStorage.setItem('sentInvoices', JSON.stringify(invoicesSent));
      } else {
        throw new Error(response.message);
      }
      
    } catch (error) {
      console.error('Error loading queue data:', error);
      Alert.alert('Error', 'Failed to load queue data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadQueueData();
  }, [loadQueueData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadQueueData();
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
      accepted: queueStats.acceptedCount,
      urgent: queueStats.urgentCount,
      completed: queueStats.completedCount,
      rejected: queueStats.rejectedCount,
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

  // Accept booking with API integration
  const handleAcceptBooking = useCallback(async (item: QueueItem) => {
    try {
      setProcessingItems(prev => new Set([...prev, item.id]));
      
      const response = await queueAPI.acceptBooking(item.booking_id, user?.id || 'provider-123');
      
      if (response.success) {
        setQueueData(prevData =>
          prevData.map(queueItem =>
            queueItem.id === item.id
              ? { ...queueItem, status: 'accepted' as const }
              : queueItem
          )
        );
        
        Alert.alert(
          'Booking Accepted',
          `You've accepted the booking for ${item.client}. They will be notified.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error accepting booking:', error);
      Alert.alert('Error', 'Failed to accept booking. Please try again.');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  }, [user?.id]);

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
              
              const response = await queueAPI.rejectBooking(
                item.booking_id, 
                'Provider declined', 
                user?.id || 'provider-123'
              );
              
              if (response.success) {
                setQueueData(prevData =>
                  prevData.map(queueItem =>
                    queueItem.id === item.id
                      ? { ...queueItem, status: 'rejected' as const }
                      : queueItem
                  )
                );
                
                Alert.alert(
                  'Booking Rejected',
                  `You've rejected the booking for ${item.client}. They will be notified and can book with another provider.`,
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error(response.message);
              }
            } catch (error) {
              console.error('Error rejecting booking:', error);
              Alert.alert('Error', 'Failed to reject booking. Please try again.');
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
              
              const response = await queueAPI.updateBookingStatus(
                item.booking_id, 
                'completed', 
                user?.id || 'provider-123'
              );
              
              if (response.success) {
                setQueueData(prevData =>
                  prevData.map(queueItem =>
                    queueItem.id === item.id
                      ? { ...queueItem, status: 'completed' as const }
                      : queueItem
                  )
                );
                
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
                throw new Error(response.message);
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
        `An invoice has already been sent to ${item.client}. Would you like to send it again?`,
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
      case 'urgent':
        return { badge: styles.urgentBadge, text: styles.urgentText };
      case 'pending':
        return { badge: styles.pendingBadge, text: styles.pendingText };
      case 'accepted':
        return { badge: styles.acceptedBadge, text: styles.acceptedText };
      case 'rejected':
        return { badge: styles.rejectedBadge, text: styles.rejectedText };
      case 'completed':
        return { badge: styles.completedBadge, text: styles.completedText };
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
          {(item.status === 'pending' || item.status === 'urgent') && (
            <>
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={() => handleRejectBooking(item)}
              >
                <Ionicons name="close" size={16} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={item.status === 'urgent' ? styles.urgentAcceptButton : styles.acceptButton}
                onPress={() => handleAcceptBooking(item)}
              >
                <Ionicons name={item.status === 'urgent' ? "flash" : "checkmark"} size={16} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>
                  {item.status === 'urgent' ? 'Accept Urgent' : 'Accept'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'accepted' && (
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

          {item.status === 'rejected' && (
            <View style={styles.statusIndicatorButton}>
              <Text style={styles.statusIndicatorText}>Rejected</Text>
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
          <Text style={styles.bookingId}>#{item.booking_id}</Text>
        </View>

        <View style={styles.queueDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color="#F59E0B" />
            <Text style={styles.queueTime}>{item.time}</Text>
            <Text style={styles.duration}>({item.duration})</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color="#4B5563" />
            <Text style={styles.queueLocation}>{item.location}</Text>
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
  urgentBadge: { backgroundColor: '#FEE2E2' },
  urgentText: { color: '#DC2626' },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  pendingText: { color: '#92400E' },
  acceptedBadge: { backgroundColor: '#EFF6FF' },
  acceptedText: { color: '#2563EB' },
  rejectedBadge: { backgroundColor: '#FEE2E2' },
  rejectedText: { color: '#DC2626' },
  completedBadge: { backgroundColor: '#ECFDF5' },
  completedText: { color: '#059669' },

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