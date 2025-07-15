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
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import mockService from '../services/api/mock/index';
import { useAuth } from '../context/AuthContext';

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
            color={star <= rating ? "#FFD700" : "#D1D5DB"}
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
              <Ionicons name="star" size={14} color="#FFD700" />
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

  const userId = user?.id || '1';

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
      // Here you would submit to your API
      console.log('Submitting review:', {
        bookingId: selectedBookingForReview.id,
        ...reviewData
      });
      
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
              const { error: cancelError } = await mockService.cancelBooking(bookingId);
              
              if (cancelError) {
                throw new Error(cancelError);
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

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!userId) {
      setError('Please log in to view your bookings');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: bookings, error: bookingsError } = await mockService.getBookings(userId);
      
      if (bookingsError) {
        throw new Error(bookingsError);
      }
      
      if (bookings) {
        const processedBookings = bookings.map(processBookingMemoized);
        
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
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            colors={['#1A2533']}
            tintColor="#1A2533"
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
            <ActivityIndicator size="large" color="#1A2533" />
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
                onPress={() => {
                  navigation.navigate('MainTabs', { screen: 'HomeTab' });
                }}
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
  modernTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    padding: 4,
  },
  modernTab: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  modernActiveTab: {
    backgroundColor: '#1A2533',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
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
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#FFFFFF',
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
    color: '#1A202C',
    marginBottom: 4,
  },
  salonName: {
    fontSize: 14,
    color: '#718096',
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
    color: '#718096',
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  currency: {
    fontSize: 12,
    color: '#718096',
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
    color: '#4A5568',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F7FAFC',
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
    backgroundColor: '#FED7D7',
    borderRadius: 8,
    gap: 4,
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
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    gap: 4,
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
  },
  reviewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 8,
  },
  reviewModalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
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
    backgroundColor: '#F7FAFC',
  },
  reviewServiceHeader: {
    alignItems: 'center',
  },
  reviewServiceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
    textAlign: 'center',
  },
  reviewServiceDetails: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 2,
    textAlign: 'center',
  },
  reviewServiceDate: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  reviewSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 16,
  },
  overallRatingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
  detailedRatingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailedRatingLabel: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  reviewTextInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1A202C',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  characterCount: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'right',
    marginTop: 8,
  },
  reviewModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitReviewButton: {
    backgroundColor: '#1A2533',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitReviewButtonDisabled: {
    backgroundColor: '#A0AEC0',
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
    color: '#718096',
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
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
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

export default BookingsScreen;