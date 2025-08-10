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
  Modal,
  TextInput,
  Image,
  Dimensions,
  Animated,
  Alert,
  StatusBar
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import mockService from '../services/api/mock/index';
import { useAuth } from '../context/AuthContext';
import { bookingsAPI } from '../services/api/bookings/bookingsAPI';

const { width: screenWidth } = Dimensions.get('window');

interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  professional_name: string;
  salon_name: string;
  date: string;
  time: string;
  price: number;
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
  notes?: string;
  created_at: string;
  duration?: number;
  service_image?: string;
  rating?: number;
  review?: string;
}

interface ProcessedBooking {
  id: string;
  service: string;
  date: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Pending';
  price: string;
  professional: string;
  salon: string;
  notes?: string;
  created_at: string;
  originalDate: Date;
  duration?: number;
  service_image?: string;
  rating?: number;
  review?: string;
}

interface ReviewData {
  rating: number;
  comment: string;
  serviceQuality: number;
  punctuality: number;
  cleanliness: number;
  valueForMoney: number;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// Star Rating Component
const StarRating = ({ 
  rating, 
  onRatingChange, 
  size = 24, 
  readonly = false 
}: { 
  rating: number; 
  onRatingChange?: (rating: number) => void; 
  size?: number; 
  readonly?: boolean;
}) => {
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onRatingChange && onRatingChange(star)}
          disabled={readonly}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? "#F59E0B" : "#D1D5DB"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Review Modal Component
const ReviewModal = ({ 
  visible, 
  booking, 
  onClose, 
  onSubmit 
}: {
  visible: boolean;
  booking: ProcessedBooking | null;
  onClose: () => void;
  onSubmit: (reviewData: ReviewData) => void;
}) => {
  const [reviewData, setReviewData] = useState<ReviewData>({
    rating: 5,
    comment: '',
    serviceQuality: 5,
    punctuality: 5,
    cleanliness: 5,
    valueForMoney: 5
  });

  const slideAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, slideAnim]);

  const handleSubmit = () => {
    if (reviewData.comment.trim().length < 10) {
      Alert.alert('Review Required', 'Please write at least 10 characters in your review.');
      return;
    }
    onSubmit(reviewData);
    onClose();
  };

  const modalTransform = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth, 0],
  });

  if (!booking) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.reviewModalContent,
            {
              transform: [{ translateX: modalTransform }]
            }
          ]}
        >
          {/* Header */}
          <View style={styles.reviewModalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.reviewModalTitle}>Rate Your Experience</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.reviewModalScroll} showsVerticalScrollIndicator={false}>
            {/* Service Info */}
            <View style={styles.reviewServiceInfo}>
              <View style={styles.reviewServiceHeader}>
                <Text style={styles.reviewServiceName}>{booking.service}</Text>
                <Text style={styles.reviewServiceDetails}>
                  with {booking.professional} at {booking.salon}
                </Text>
                <Text style={styles.reviewServiceDate}>{booking.date}</Text>
              </View>
            </View>

            {/* Overall Rating */}
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Overall Rating</Text>
              <View style={styles.overallRatingContainer}>
                <StarRating 
                  rating={reviewData.rating} 
                  onRatingChange={(rating) => setReviewData({...reviewData, rating})}
                  size={32}
                />
                <Text style={styles.ratingText}>
                  {reviewData.rating === 5 ? 'Excellent' :
                   reviewData.rating === 4 ? 'Very Good' :
                   reviewData.rating === 3 ? 'Good' :
                   reviewData.rating === 2 ? 'Fair' : 'Poor'}
                </Text>
              </View>
            </View>

            {/* Detailed Ratings */}
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Rate Different Aspects</Text>
              
              <View style={styles.detailedRatingItem}>
                <Text style={styles.detailedRatingLabel}>Service Quality</Text>
                <StarRating 
                  rating={reviewData.serviceQuality} 
                  onRatingChange={(rating) => setReviewData({...reviewData, serviceQuality: rating})}
                  size={20}
                />
              </View>

              <View style={styles.detailedRatingItem}>
                <Text style={styles.detailedRatingLabel}>Punctuality</Text>
                <StarRating 
                  rating={reviewData.punctuality} 
                  onRatingChange={(rating) => setReviewData({...reviewData, punctuality: rating})}
                  size={20}
                />
              </View>

              <View style={styles.detailedRatingItem}>
                <Text style={styles.detailedRatingLabel}>Cleanliness</Text>
                <StarRating 
                  rating={reviewData.cleanliness} 
                  onRatingChange={(rating) => setReviewData({...reviewData, cleanliness: rating})}
                  size={20}
                />
              </View>

              <View style={styles.detailedRatingItem}>
                <Text style={styles.detailedRatingLabel}>Value for Money</Text>
                <StarRating 
                  rating={reviewData.valueForMoney} 
                  onRatingChange={(rating) => setReviewData({...reviewData, valueForMoney: rating})}
                  size={20}
                />
              </View>
            </View>

            {/* Written Review */}
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Write Your Review</Text>
              <TextInput
                style={styles.reviewTextInput}
                placeholder="Share your experience with others... (minimum 10 characters)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={reviewData.comment}
                onChangeText={(text) => setReviewData({...reviewData, comment: text})}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {reviewData.comment.length}/500 characters
              </Text>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.reviewModalFooter}>
            <TouchableOpacity 
              style={[
                styles.submitReviewButton,
                reviewData.comment.trim().length < 10 && styles.submitReviewButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={reviewData.comment.trim().length < 10}
            >
              <Text style={styles.submitReviewButtonText}>Submit Review</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Enhanced Booking Card Component
const BookingCard = ({ 
  booking, 
  isPast = false, 
  onCancel,
  onReview
}: { 
  booking: ProcessedBooking; 
  isPast?: boolean;
  onCancel?: (id: string) => void;
  onReview?: (booking: ProcessedBooking) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return '#3B82F6';
      case 'Pending': return '#F59E0B';
      case 'Completed': return '#10B981';
      case 'Cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'checkmark-circle';
      case 'Pending': return 'time';
      case 'Completed': return 'checkmark-done-circle';
      case 'Cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  return (
    <View style={[styles.bookingCard, isPast && styles.pastBookingCard]}>
      {/* Card Header with Service Image */}
      <View style={styles.cardHeader}>
        <View style={styles.serviceImageContainer}>
          {booking.service_image ? (
            <Image source={{ uri: booking.service_image }} style={styles.serviceImage} />
          ) : (
            <View style={[styles.serviceImagePlaceholder, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
              <Ionicons name="cut" size={24} color={getStatusColor(booking.status)} />
            </View>
          )}
        </View>
        
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName} numberOfLines={2}>{booking.service}</Text>
          <Text style={styles.salonName}>{booking.salon}</Text>
          {booking.rating && (
            <View style={styles.existingRatingContainer}>
              <StarRating rating={booking.rating} readonly size={16} />
              <Text style={styles.existingRatingText}>Your rating</Text>
            </View>
          )}
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{booking.price}</Text>
          <Text style={styles.currency}>SEK</Text>
        </View>
      </View>

      {/* Booking Details */}
      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{booking.date}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color="#6B7280" />
          <Text style={styles.detailText}>with {booking.professional}</Text>
        </View>
        
        {booking.duration && (
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{booking.duration} minutes</Text>
          </View>
        )}

        {booking.notes && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text" size={16} color="#6B7280" />
            <Text style={styles.detailText} numberOfLines={2}>{booking.notes}</Text>
          </View>
        )}
      </View>

      {/* Status and Actions */}
      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '15' }]}>
          <Ionicons 
            name={getStatusIcon(booking.status)} 
            size={14} 
            color={getStatusColor(booking.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {booking.status}
          </Text>
        </View>
        
        <View style={styles.actionsContainer}>
          {booking.status === 'Confirmed' && onCancel && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => onCancel(booking.id)}
            >
              <Ionicons name="close" size={14} color="#EF4444" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          {booking.status === 'Completed' && onReview && !booking.rating && (
            <TouchableOpacity 
              style={styles.reviewButton}
              onPress={() => onReview(booking)}
            >
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
          )}
          
          {booking.status === 'Completed' && booking.rating && (
            <TouchableOpacity 
              style={styles.reviewedButton}
              onPress={() => onReview && onReview(booking)}
            >
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.reviewedButtonText}>Reviewed</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const BookingsScreen = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [upcomingBookings, setUpcomingBookings] = useState<ProcessedBooking[]>([]);
  const [pastBookings, setPastBookings] = useState<ProcessedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<ProcessedBooking | null>(null);
  
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Utility function to check if string is valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Generate a valid UUID for demo purposes if no real user ID
  const userId = user?.id && isValidUUID(user.id) ? user.id : '550e8400-e29b-41d4-a716-446655440000';

  // Single API service function for comprehensive booking data
  const apiService = {
    async getBookingsData(userId: string): Promise<ApiResponse<{
      bookings: Booking[];
      upcomingCount: number;
      pastCount: number;
    }>> {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: bookings, error: bookingsError } = await mockService.getBookings(userId);
        
        if (bookingsError) {
          throw new Error(bookingsError);
        }
        
        const now = new Date();
        const upcoming = bookings?.filter(b => new Date(b.date) >= now) || [];
        const past = bookings?.filter(b => new Date(b.date) < now) || [];
        
        return {
          data: {
            bookings: bookings || [],
            upcomingCount: upcoming.length,
            pastCount: past.length
          },
          success: true
        };
      } catch (error) {
        console.error('Bookings API Error:', error);
        return {
          data: {
            bookings: [],
            upcomingCount: 0,
            pastCount: 0
          },
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch bookings'
        };
      }
    },

    async cancelBooking(bookingId: string): Promise<ApiResponse<null>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const { error: cancelError } = await mockService.cancelBooking(bookingId);
        
        if (cancelError) {
          throw new Error(cancelError);
        }
        
        return {
          data: null,
          success: true
        };
      } catch (error) {
        console.error('Cancel booking error:', error);
        return {
          data: null,
          success: false,
          error: 'Failed to cancel booking'
        };
      }
    },

    async submitReview(reviewData: {
      bookingId: string;
      rating: number;
      comment: string;
      serviceQuality: number;
      punctuality: number;
      cleanliness: number;
      valueForMoney: number;
    }): Promise<ApiResponse<{ reviewId: string }>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          data: {
            reviewId: `REV_${Date.now()}`
          },
          success: true
        };
      } catch (error) {
        console.error('Submit review error:', error);
        return {
          data: { reviewId: '' },
          success: false,
          error: 'Failed to submit review'
        };
      }
    }
  };

  // Format date to a readable string
  const formatBookingDate = (dateString: string, timeString: string) => {
    const bookingDate = new Date(dateString);
    const now = new Date();
    const diffTime = bookingDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedTime = timeString || '';

    if (diffDays === 0) {
      return `Today, ${formattedTime}`;
    } else if (diffDays === 1) {
      return `Tomorrow, ${formattedTime}`;
    } else if (diffDays > 0 && diffDays < 7) {
      return `${bookingDate.toLocaleDateString([], { weekday: 'long' })}, ${formattedTime}`;
    }
    
    return `${bookingDate.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    })}, ${formattedTime}`;
  };

  // Process booking data to match UI format
  const processBooking = (booking: Booking): ProcessedBooking => {
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const isPast = bookingDate < now;
    
    let status: ProcessedBooking['status'];
    if (booking.status.toLowerCase() === 'cancelled') {
      status = 'Cancelled';
    } else if (isPast) {
      status = 'Completed';
    } else if (booking.status.toLowerCase() === 'pending') {
      status = 'Pending';
    } else {
      status = 'Confirmed';
    }

    return {
      id: booking.id,
      service: booking.service_name || 'Service',
      date: formatBookingDate(booking.date, booking.time),
      status,
      price: booking.price?.toString() || '0',
      professional: booking.professional_name || 'Professional',
      salon: booking.salon_name || 'Salon',
      notes: booking.notes || '',
      created_at: booking.created_at,
      originalDate: bookingDate,
      duration: booking.duration,
      service_image: booking.service_image,
      rating: booking.rating,
      review: booking.review
    };
  };

  const processBookingMemoized = useCallback(processBooking, []);

  // Handle review submission
  const handleReviewSubmit = async (reviewData: ReviewData) => {
    if (!selectedBookingForReview) return;
    
    try {
      const response = await apiService.submitReview({
        bookingId: selectedBookingForReview.id,
        ...reviewData
      });

      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to submit review');
        return;
      }
      
      // Update local state to show the review was submitted
      const updateBookings = (bookings: ProcessedBooking[]) =>
        bookings.map(booking =>
          booking.id === selectedBookingForReview.id
            ? { ...booking, rating: reviewData.rating, review: reviewData.comment }
            : booking
        );
      
      setUpcomingBookings(updateBookings);
      setPastBookings(updateBookings);
      
      Alert.alert('Review Submitted', 'Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    }
  };

  // Handle review button press
  const handleReviewPress = (booking: ProcessedBooking) => {
    setSelectedBookingForReview(booking);
    setShowReviewModal(true);
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use real bookingsAPI to cancel booking
              const response = await bookingsAPI.cancelBooking(bookingId);
              
              if (!response.success) {
                Alert.alert('Error', response.error || 'Failed to cancel booking');
                return;
              }
              
              fetchBookings();
              Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.');
            } catch (err) {
              console.error('Error cancelling booking:', err);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Handle navigation
  const handleNavigation = () => {
    if (navigation?.navigate) {
      navigation.navigate('MainTabs', { screen: 'HomeTab' });
    } else {
      Alert.alert('Navigation', 'Navigate to home to book services');
    }
  };

  // Fetch bookings with comprehensive data
  const fetchBookings = useCallback(async () => {
    if (!userId) {
      setError('Please log in to view your bookings');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📅 Fetching bookings for user:', userId);
      console.log('🔍 User ID is valid UUID:', isValidUUID(userId));
      console.log('👤 Auth user:', user?.id || 'No user');
      
      // Use real bookingsAPI to fetch from Supabase
      const response = await bookingsAPI.getCustomerBookings(userId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load bookings');
      }
      
      if (response.data && response.data.length > 0) {
        console.log('✅ Found', response.data.length, 'bookings');
        
        // Convert Supabase booking format to component format
        const processedBookings = response.data.map(booking => ({
          id: booking.id,
          service: booking.service_names || 'Service',
          date: new Date(booking.booking_date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short', 
            day: 'numeric'
          }),
          time: booking.start_time,
          professional: booking.staff_names || 'Staff Member',
          salon: booking.shop_name || 'Salon',
          price: booking.total_price,
          status: booking.status === 'confirmed' ? 'Confirmed' : 
                 booking.status === 'completed' ? 'Completed' :
                 booking.status === 'cancelled' ? 'Cancelled' : 'Pending',
          originalDate: new Date(`${booking.booking_date}T${booking.start_time}`),
          duration: booking.duration || 60,
          image: booking.shop_image_url || 'https://via.placeholder.com/150',
          notes: booking.notes || ''
        }));
        
        const now = new Date();
        const upcoming = processedBookings.filter(b => 
          (b.status === 'Confirmed' || b.status === 'Pending') && b.originalDate >= now
        );
        const past = processedBookings.filter(b => 
          b.status === 'Completed' || b.status === 'Cancelled' || b.originalDate < now
        );
        
        upcoming.sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
        past.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
        
        setUpcomingBookings(upcoming);
        setPastBookings(past);
      } else {
        console.log('📅 No bookings found for user');
        setUpcomingBookings([]);
        setPastBookings([]);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bookings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, processBookingMemoized]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  if (!userId && !user) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent={true} />
        <View style={styles.modernHeader}>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
        <View style={styles.loginPrompt}>
          <View style={styles.loginPromptIcon}>
            <Ionicons name="person-circle-outline" size={80} color="#E5E7EB" />
          </View>
          <Text style={styles.loginPromptTitle}>Login Required</Text>
          <Text style={styles.loginPromptText}>
            Please log in to view your bookings
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent={true} />
      
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>Manage your appointments</Text>
      </View>

      {/* Enhanced Tabs */}
      <View style={styles.modernTabContainer}>
        <TouchableOpacity 
          style={[styles.modernTab, activeTab === 'upcoming' && styles.modernActiveTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <View style={styles.tabContent}>
            <Ionicons 
              name="calendar" 
              size={20} 
              color={activeTab === 'upcoming' ? '#FFFFFF' : '#6B7280'} 
            />
            <Text style={[styles.modernTabText, activeTab === 'upcoming' && styles.modernActiveTabText]}>
              Upcoming
            </Text>
            {upcomingBookings.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{upcomingBookings.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modernTab, activeTab === 'history' && styles.modernActiveTab]}
          onPress={() => setActiveTab('history')}
        >
          <View style={styles.tabContent}>
            <Ionicons 
              name="time" 
              size={20} 
              color={activeTab === 'history' ? '#FFFFFF' : '#6B7280'} 
            />
            <Text style={[styles.modernTabText, activeTab === 'history' && styles.modernActiveTabText]}>
              History
            </Text>
            {pastBookings.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pastBookings.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading && (upcomingBookings.length > 0 || pastBookings.length > 0)} 
            onRefresh={fetchBookings}
            colors={['#F59E0B']}
            tintColor="#F59E0B"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="warning" size={48} color="#EF4444" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchBookings}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : isLoading && upcomingBookings.length === 0 && pastBookings.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Loading your bookings...</Text>
          </View>
        ) : activeTab === 'upcoming' ? (
          upcomingBookings.length > 0 ? (
            <>
              {upcomingBookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  onCancel={handleCancelBooking}
                  onReview={handleReviewPress}
                />
              ))}
              <View style={styles.bottomSpacing} />
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="calendar-outline" size={80} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateText}>No upcoming bookings</Text>
              <Text style={styles.emptyStateSubtext}>
                Your upcoming appointments will appear here
              </Text>
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={handleNavigation}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.exploreButtonText}>Book a Service</Text>
              </TouchableOpacity>
            </View>
          )
        ) : pastBookings.length > 0 ? (
          <>
            {pastBookings.map((booking) => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                isPast={true}
                onReview={handleReviewPress}
              />
            ))}
            <View style={styles.bottomSpacing} />
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="time-outline" size={80} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyStateText}>No past bookings</Text>
            <Text style={styles.emptyStateSubtext}>
              Your booking history will appear here
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        booking={selectedBookingForReview}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedBookingForReview(null);
        }}
        onSubmit={handleReviewSubmit}
      />
    </View>
  );
};

// Updated styles with consistent color palette
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCE8', // Consistent app background
  },
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 50, // Account for transparent status bar
    paddingBottom: 24,
    backgroundColor: 'transparent', // Transparent header
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  modernTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernTab: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  modernActiveTab: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modernTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modernActiveTabText: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  pastBookingCard: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  serviceImageContainer: {
    marginRight: 12,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  serviceImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  salonName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  existingRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  existingRatingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F59E0B',
  },
  currency: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  bookingDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF3C7',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FCD34D',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  reviewButtonText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  reviewedButtonText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  starContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reviewModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 34,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  closeButton: {
    padding: 8,
  },
  reviewModalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  reviewModalScroll: {
    flex: 1,
  },
  reviewServiceInfo: {
    padding: 20,
    backgroundColor: '#FEF3C7',
  },
  reviewServiceHeader: {
    alignItems: 'center',
  },
  reviewServiceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  reviewServiceDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
    textAlign: 'center',
  },
  reviewServiceDate: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  reviewSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  overallRatingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  detailedRatingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailedRatingLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  reviewTextInput: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 8,
  },
  reviewModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#FCD34D',
  },
  submitReviewButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitReviewButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  submitReviewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
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
    color: '#1F2937',
    marginBottom: 8,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default BookingsScreen;