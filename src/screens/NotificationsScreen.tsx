import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAccount, useNotifications } from '../navigation/AppNavigator';
import UpgradeModal from '../components/UpgradeModal'; // Import the separate component

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking_request' | 'booking_confirmed' | 'payment' | 'review' | 'reminder' | 'promotion' | 'system';
  is_read: boolean;
  created_at: string;
  action_data?: any;
  full_details?: {
    description: string;
    additional_info?: string[];
    action_required?: boolean;
    action_text?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    related_items?: any[];
  };
}

interface NotificationsResponse {
  data: Notification[];
  unread_count: number;
}

const NotificationsScreen = ({ navigation }: { navigation: any }) => {
  const { accountType, isPro } = useAccount();
  const { refreshNotifications, setNotificationCount } = useNotifications();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Mock API service for notifications with full details
  const mockNotificationAPI = {
    async getNotifications(userId: string, accountType: 'provider' | 'consumer'): Promise<NotificationsResponse> {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (accountType === 'provider') {
        return {
          data: [
            {
              id: '1',
              title: 'New Booking Request',
              message: 'Sarah Wilson requested a manicure service for tomorrow at 2:00 PM',
              type: 'booking_request',
              is_read: false,
              created_at: '2025-07-17T10:30:00Z',
              action_data: { booking_id: 'book_123' },
              full_details: {
                description: 'A new booking request has been received for your manicure service. The customer is looking for a professional gel manicure with nail art.',
                additional_info: [
                  'Customer: Sarah Wilson',
                  'Service: Gel Manicure with Nail Art',
                  'Preferred Date: July 18, 2025',
                  'Preferred Time: 2:00 PM - 3:30 PM',
                  'Location: Your salon',
                  'Special Requests: French tips with glitter accent',
                  'Customer Notes: First time customer, prefers natural colors'
                ],
                action_required: true,
                action_text: 'Accept or Decline Booking',
                priority: 'high',
                related_items: [
                  { type: 'customer_profile', id: 'cust_456' },
                  { type: 'service_details', id: 'serv_789' }
                ]
              }
            },
            {
              id: '2',
              title: 'Payment Received',
              message: 'Payment of $450 received from John Doe for electrical installation',
              type: 'payment',
              is_read: false,
              created_at: '2025-07-17T09:15:00Z',
              action_data: { payment_id: 'pay_456' },
              full_details: {
                description: 'Payment has been successfully processed and deposited into your account.',
                additional_info: [
                  'Amount: $450.00',
                  'Customer: John Doe',
                  'Service: Electrical Installation',
                  'Your Earnings: $382.50'
                ],
                action_required: false,
                priority: 'normal'
              }
            },
            {
              id: '3',
              title: 'Review Posted',
              message: 'Emma Thompson left a 5-star review: "Excellent service, very professional!"',
              type: 'review',
              is_read: true,
              created_at: '2025-07-16T16:45:00Z',
              action_data: { review_id: 'rev_789' },
              full_details: {
                description: 'You received a new 5-star review from a satisfied customer.',
                additional_info: [
                  'Rating: ⭐⭐⭐⭐⭐ (5/5)',
                  'Customer: Emma Thompson',
                  'Service: Deep House Cleaning',
                  'Review: "Excellent service, very professional!"'
                ],
                action_required: false,
                priority: 'normal'
              }
            },
            {
              id: '4',
              title: 'Booking Cancelled',
              message: 'Mike Chen cancelled his plumbing appointment scheduled for today',
              type: 'system',
              is_read: true,
              created_at: '2025-07-16T14:20:00Z',
              action_data: { booking_id: 'book_101' }
            },
            {
              id: '5',
              title: 'New Message',
              message: 'You have a new message from Lisa Brown regarding carpet cleaning',
              type: 'system',
              is_read: false,
              created_at: '2025-07-16T11:30:00Z',
              action_data: { message_id: 'msg_202' }
            },
            {
              id: '6',
              title: 'Weekly Report Ready',
              message: 'Your weekly performance report is now available for review',
              type: 'system',
              is_read: false,
              created_at: '2025-07-15T08:00:00Z',
              action_data: { report_id: 'rep_101' }
            },
            {
              id: '7',
              title: 'Profile Update Required',
              message: 'Please update your business hours for the holiday season',
              type: 'system',
              is_read: false,
              created_at: '2025-07-14T15:30:00Z',
              action_data: { profile_section: 'hours' }
            },
          ],
          unread_count: 5,
        };
      } else {
        return {
          data: [
            {
              id: '1',
              title: 'Booking Confirmed',
              message: 'Your hair appointment with Style Studio is confirmed for tomorrow at 3:00 PM',
              type: 'booking_confirmed',
              is_read: false,
              created_at: '2025-07-17T10:30:00Z',
              action_data: { booking_id: 'book_567' },
              full_details: {
                description: 'Your appointment has been confirmed!',
                additional_info: [
                  'Service: Haircut & Styling',
                  'Date: July 18, 2025 (Tomorrow)',
                  'Time: 3:00 PM - 4:30 PM',
                  'Provider: Style Studio',
                  'Total Cost: $85.00'
                ],
                action_required: false,
                priority: 'normal'
              }
            },
            {
              id: '2',
              title: 'Service Reminder',
              message: 'Your manicure appointment is in 2 hours. Address: 123 Beauty St, Auckland',
              type: 'reminder',
              is_read: false,
              created_at: '2025-07-17T09:15:00Z',
              action_data: { booking_id: 'book_568' },
              full_details: {
                description: 'This is a friendly reminder about your upcoming appointment.',
                additional_info: [
                  'Service: Gel Manicure',
                  'Time: 11:15 AM (in 2 hours)',
                  'Provider: Beauty and Me',
                  'Address: 123 Beauty St, Auckland'
                ],
                action_required: false,
                priority: 'high'
              }
            },
            {
              id: '3',
              title: 'New Service Available',
              message: 'Check out our new spa treatments! Get 20% off your first spa session.',
              type: 'promotion',
              is_read: false,
              created_at: '2025-07-16T16:45:00Z',
              action_data: { promo_id: 'promo_123' }
            },
            {
              id: '4',
              title: 'Payment Receipt',
              message: 'Payment of $85 for cleaning service has been processed successfully',
              type: 'payment',
              is_read: true,
              created_at: '2025-07-16T14:20:00Z',
              action_data: { payment_id: 'pay_789' }
            },
            {
              id: '5',
              title: 'Booking Reminder',
              message: 'Don\'t forget your garden maintenance appointment tomorrow at 10:00 AM',
              type: 'reminder',
              is_read: true,
              created_at: '2025-07-15T18:00:00Z',
              action_data: { booking_id: 'book_569' }
            },
            {
              id: '6',
              title: 'Special Offer',
              message: 'Limited time: 30% off all home cleaning services this weekend',
              type: 'promotion',
              is_read: false,
              created_at: '2025-07-15T10:00:00Z',
              action_data: { promo_id: 'promo_124' }
            },
          ],
          unread_count: 4,
        };
      }
    },

    async markAsRead(notificationId: string): Promise<{ success: boolean }> {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    },

    async markAllAsRead(userId: string): Promise<{ success: boolean }> {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },

    async deleteNotification(notificationId: string): Promise<{ success: boolean }> {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    },
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await mockNotificationAPI.getNotifications('user-123', accountType);
      setNotifications(response.data);
      setNotificationCount(response.unread_count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    }
  }, [accountType, setNotificationCount]);

  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      await fetchNotifications();
      setIsLoading(false);
    };
    
    loadNotifications();
  }, [fetchNotifications]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    await refreshNotifications();
    setIsRefreshing(false);
  }, [fetchNotifications, refreshNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await mockNotificationAPI.markAsRead(notificationId);
      if (response.success) {
        setNotifications(prev => prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        ));
        
        const unreadCount = notifications.filter(n => !n.is_read && n.id !== notificationId).length;
        setNotificationCount(unreadCount);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await mockNotificationAPI.markAllAsRead('user-123');
      if (response.success) {
        setNotifications(prev => prev.map(notification => ({ ...notification, is_read: true })));
        setNotificationCount(0);
        Alert.alert('Success', 'All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const response = await mockNotificationAPI.deleteNotification(notificationId);
      if (response.success) {
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
        
        if (deletedNotification && !deletedNotification.is_read) {
          setNotificationCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const toggleExpanded = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleNotificationPress = (notification: Notification, index: number) => {
    // Check if user is trying to access beyond the 3 notification limit
    if (!isPro && index >= 3) {
      setShowUpgradeModal(true);
      return;
    }

    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Show detailed modal
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  const handleQuickExpand = (notification: Notification, event: any, index: number) => {
    event.stopPropagation();
    
    // Check if user is trying to access beyond the 3 notification limit
    if (!isPro && index >= 3) {
      setShowUpgradeModal(true);
      return;
    }

    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    toggleExpanded(notification.id);
  };

  const handleActionPress = (notification: Notification) => {
    setShowDetailModal(false);
    
    // Handle different notification types
    switch (notification.type) {
      case 'booking_request':
      case 'booking_confirmed':
        navigation.navigate(accountType === 'provider' ? 'ServiceQueue' : 'Bookings');
        break;
      case 'payment':
        navigation.navigate('Profile', { activeTab: 'invoices' });
        break;
      case 'review':
        Alert.alert('Navigate to Reviews', 'This would open the reviews section');
        break;
      case 'promotion':
        Alert.alert('View Promotion', 'This would open the promotion or service booking');
        break;
      default:
        break;
    }
  };

  const handleUpgradePress = () => {
    setShowUpgradeModal(false);
    // Navigate to upgrade/subscription screen
    navigation.navigate('Subscription');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
      case 'booking_confirmed':
        return 'calendar-outline';
      case 'payment':
        return 'card-outline';
      case 'review':
        return 'star-outline';
      case 'reminder':
        return 'alarm-outline';
      case 'promotion':
        return 'gift-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'booking_request':
      case 'booking_confirmed':
        return '#3B82F6';
      case 'payment':
        return '#059669';
      case 'review':
        return '#F59E0B';
      case 'reminder':
        return '#EF4444';
      case 'promotion':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F97316';
      case 'normal':
        return '#3B82F6';
      case 'low':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDetailedTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-NZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || !notification.is_read
  );

  // Limit notifications for free users
  const displayedNotifications = isPro ? filteredNotifications : filteredNotifications.slice(0, 3);
  const hiddenNotificationsCount = filteredNotifications.length - displayedNotifications.length;

  // Custom features for notifications upgrade modal
  const notificationFeatures = [
    {
      icon: 'notifications',
      iconColor: '#3B82F6',
      title: 'Unlimited Notifications',
      description: 'View all your notifications without any limits'
    },
    {
      icon: 'filter-outline',
      iconColor: '#059669',
      title: 'Advanced Filtering',
      description: 'Filter notifications by type, priority, and date'
    },
    {
      icon: 'alarm-outline',
      iconColor: '#F59E0B',
      title: 'Smart Reminders',
      description: 'Get intelligent reminders based on your schedule'
    },
    {
      icon: 'analytics-outline',
      iconColor: '#8B5CF6',
      title: 'Notification Analytics',
      description: 'Track your notification patterns and response times'
    }
  ];

  const renderNotificationItem = ({ item, index }: { item: Notification; index: number }) => {
    const isExpanded = expandedNotifications.has(item.id);
    const isLocked = !isPro && index >= 3;
    
    return (
      <View style={[
        styles.notificationItem, 
        !item.is_read && styles.unreadNotification,
        isLocked && styles.lockedNotification
      ]}>
        <TouchableOpacity
          style={[styles.notificationContent, isLocked && styles.lockedContent]}
          onPress={() => handleNotificationPress(item, index)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + '20' }]}>
            <Ionicons 
              name={isLocked ? 'lock-closed' : getNotificationIcon(item.type)} 
              size={24} 
              color={isLocked ? '#9CA3AF' : getNotificationColor(item.type)} 
            />
          </View>
          
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={[
                styles.title, 
                !item.is_read && styles.unreadTitle,
                isLocked && styles.lockedText
              ]}>
                {item.title}
              </Text>
              <Text style={[styles.time, isLocked && styles.lockedText]}>
                {formatTime(item.created_at)}
              </Text>
            </View>
            <Text style={[
              styles.message, 
              isLocked && styles.lockedText
            ]} numberOfLines={isExpanded ? undefined : 2}>
              {isLocked ? 'Upgrade to Pro to view this notification' : item.message}
            </Text>
            
            {!isLocked && item.full_details?.priority && (
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.full_details.priority) + '20' }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(item.full_details.priority) }]}>
                  {item.full_details.priority.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.actionButtons}>
            {!isLocked && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={(e) => handleQuickExpand(item, e, index)}
              >
                <Ionicons 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            )}
            
            {!isLocked && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  Alert.alert(
                    'Delete Notification',
                    'Are you sure you want to delete this notification?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteNotification(item.id) }
                    ]
                  );
                }}
              >
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && item.full_details && !isLocked && (
          <View style={styles.expandedContent}>
            <Text style={styles.expandedDescription}>
              {item.full_details.description}
            </Text>
            
            {item.full_details.additional_info && (
              <View style={styles.additionalInfo}>
                <Text style={styles.additionalInfoTitle}>Details:</Text>
                {item.full_details.additional_info.map((info, index) => (
                  <Text key={index} style={styles.additionalInfoItem}>
                    • {info}
                  </Text>
                ))}
              </View>
            )}
            
            {item.full_details.action_required && item.full_details.action_text && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleActionPress(item)}
              >
                <Text style={styles.actionButtonText}>{item.full_details.action_text}</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {!item.is_read && !isLocked && <View style={styles.unreadIndicator} />}
      </View>
    );
  };

  const renderUpgradePrompt = () => {
    if (isPro || hiddenNotificationsCount <= 0) return null;

    return (
      <TouchableOpacity 
        style={styles.upgradePrompt}
        onPress={() => setShowUpgradeModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.upgradeContent}>
          <View style={styles.upgradeIconContainer}>
            <Ionicons name="star" size={24} color="#F59E0B" />
          </View>
          <View style={styles.upgradeTextContainer}>
            <Text style={styles.upgradeTitle}>
              {hiddenNotificationsCount} more notification{hiddenNotificationsCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.upgradeDescription}>
              Upgrade to Pro to view all your notifications
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Notification Details</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDetailModal(false)}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        {selectedNotification && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalNotificationHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: getNotificationColor(selectedNotification.type) + '20' }]}>
                <Ionicons 
                  name={getNotificationIcon(selectedNotification.type)} 
                  size={32} 
                  color={getNotificationColor(selectedNotification.type)} 
                />
              </View>
              <View style={styles.modalNotificationInfo}>
                <Text style={styles.modalNotificationTitle}>{selectedNotification.title}</Text>
                <Text style={styles.modalNotificationTime}>
                  {formatDetailedTime(selectedNotification.created_at)}
                </Text>
                {selectedNotification.full_details?.priority && (
                  <View style={[styles.modalPriorityBadge, { backgroundColor: getPriorityColor(selectedNotification.full_details.priority) + '20' }]}>
                    <Text style={[styles.modalPriorityText, { color: getPriorityColor(selectedNotification.full_details.priority) }]}>
                      {selectedNotification.full_details.priority.toUpperCase()} PRIORITY
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Message</Text>
              <Text style={styles.modalSectionContent}>{selectedNotification.message}</Text>
            </View>
            
            {selectedNotification.full_details && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Description</Text>
                  <Text style={styles.modalSectionContent}>
                    {selectedNotification.full_details.description}
                  </Text>
                </View>
                
                {selectedNotification.full_details.additional_info && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Additional Information</Text>
                    <View style={styles.modalInfoList}>
                      {selectedNotification.full_details.additional_info.map((info, index) => (
                        <View key={index} style={styles.modalInfoItem}>
                          <Ionicons name="ellipse" size={6} color="#6B7280" />
                          <Text style={styles.modalInfoText}>{info}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {selectedNotification.full_details.action_required && selectedNotification.full_details.action_text && (
                  <View style={styles.modalSection}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleActionPress(selectedNotification)}
                    >
                      <Text style={styles.actionButtonText}>{selectedNotification.full_details.action_text}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
        
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowDetailModal(false)}
          >
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptyDescription}>
        {filter === 'unread' 
          ? "You don't have any unread notifications"
          : "You'll see your notifications here when you receive them"
        }
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter and Actions Header */}
      <View style={styles.header}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unread' && styles.activeFilter]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
        
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={displayedNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          displayedNotifications.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[accountType === 'provider' ? '#059669' : '#1A2533']}
            tintColor={accountType === 'provider' ? '#059669' : '#1A2533'}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderUpgradePrompt}
      />

      {/* Notification Detail Modal */}
      {renderDetailModal()}

      {/* Upgrade Modal - Using the separate component */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgradePress}
        title="Unlock All Notifications"
        subtitle="Get unlimited access to all your notifications and advanced features"
        features={notificationFeatures}
        hiddenCount={hiddenNotificationsCount}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF3C7', // Light accent cream honey
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF3C7', // Light accent cream honey
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D', // Lighter honey for borders
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FCD34D', // Lighter honey background
    borderRadius: 8,
    padding: 2,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeFilter: {
    backgroundColor: '#F59E0B', // Primary amber/honey
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    color: '#1F2937', // Dark accent charcoal black
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF', // White text for active filter
    fontWeight: '600',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    color: '#F59E0B', // Primary amber/honey
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FCD34D', // Lighter honey border
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B', // Primary amber/honey
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    color: '#1F2937', // Dark accent charcoal black
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: '#6B7280', // Slightly darker gray for better contrast
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  expandButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expandedDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  additionalInfo: {
    marginBottom: 16,
  },
  additionalInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  additionalInfoItem: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 4,
    marginLeft: 8,
  },
  actionButton: {
    backgroundColor: '#F59E0B', // Primary amber/honey
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'transparent',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937', // Dark accent charcoal black
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Upgrade Prompt Styles
  upgradePrompt: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FCD34D', // Lighter honey border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#FEF3C7',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937', // Dark accent charcoal black
    marginBottom: 4,
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#4B5563', // Slightly darker gray for better readability
  },
  // Locked notification styles
  lockedNotification: {
    opacity: 0.6,
  },
  lockedContent: {
    opacity: 0.8,
  },
  lockedText: {
    color: '#9CA3AF',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FEF3C7', // Light accent cream honey
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D', // Lighter honey border
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937', // Dark accent charcoal black
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalNotificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D', // Lighter honey border
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalNotificationInfo: {
    flex: 1,
  },
  modalNotificationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937', // Dark accent charcoal black
    marginBottom: 4,
  },
  modalNotificationTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  modalPriorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalPriorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 24,
    backgroundColor: '#FFF9E6', // Very light honey background
    borderRadius: 8,
    padding: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937', // Dark accent charcoal black
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D', // Lighter honey border
  },
  modalSectionContent: {
    fontSize: 14,
    color: '#374151', // Darker gray for better readability
    lineHeight: 22,
  },
  modalInfoList: {
    gap: 8,
  },
  modalInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#FCD34D', // Lighter honey border
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  modalCloseButton: {
    backgroundColor: '#FCD34D', // Lighter honey background
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalCloseButtonText: {
    color: '#1F2937', // Dark accent charcoal black
    fontSize: 16,
    fontWeight: '600',
  }
});

export default NotificationsScreen;