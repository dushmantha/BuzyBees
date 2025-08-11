import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../navigation/AppNavigator';
import { realtimeBookings, BookingUpdate } from '../services/api/bookings/realtimeBookings';
import { bookingsAPI } from '../services/api/bookings/bookingsAPI';
import { enhancedBookingsAPI } from '../services/api/bookings/enhancedBookingsAPI';

interface UseBookingRealtimeOptions {
  autoRefresh?: boolean;
  onNewBooking?: (booking: BookingUpdate) => void;
  onBookingUpdate?: (booking: BookingUpdate) => void;
  onBookingDelete?: (booking: BookingUpdate) => void;
}

/**
 * Custom hook for real-time booking management
 * Automatically handles customer vs provider logic based on account type
 */
export const useBookingRealtime = (options: UseBookingRealtimeOptions = {}) => {
  const { user } = useAuth();
  const { accountType } = useAccount();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Fetch bookings based on account type
  const fetchBookings = useCallback(async () => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let response;
      if (accountType === 'provider') {
        // For providers, fetch bookings by provider_id
        response = await bookingsAPI.getProviderBookings(user.id);
      } else {
        // For customers, fetch bookings by customer_id
        response = await bookingsAPI.getCustomerBookings(user.id);
      }

      if (response.success) {
        setBookings(response.data || []);
        console.log(`📅 Loaded ${response.data?.length || 0} bookings for ${accountType}`);
      } else {
        setError(response.error || 'Failed to fetch bookings');
        console.error('❌ Failed to fetch bookings:', response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, accountType]);

  // Handle real-time booking updates
  const handleBookingUpdate = useCallback((bookingUpdate: BookingUpdate) => {
    console.log('🔔 Real-time booking update:', bookingUpdate);

    setBookings(prevBookings => {
      if (bookingUpdate.operation === 'INSERT') {
        // Add new booking
        options.onNewBooking?.(bookingUpdate);
        if (options.autoRefresh !== false) {
          // Optionally refetch to get complete data
          setTimeout(fetchBookings, 1000);
        }
        return prevBookings;
      } else if (bookingUpdate.operation === 'UPDATE') {
        // Update existing booking
        options.onBookingUpdate?.(bookingUpdate);
        return prevBookings.map(booking => 
          booking.id === bookingUpdate.booking_id 
            ? { ...booking, ...bookingUpdate, updated_at: bookingUpdate.timestamp }
            : booking
        );
      } else if (bookingUpdate.operation === 'DELETE') {
        // Remove booking
        options.onBookingDelete?.(bookingUpdate);
        return prevBookings.filter(booking => booking.id !== bookingUpdate.booking_id);
      }
      return prevBookings;
    });
  }, [options, fetchBookings]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) {
      setIsSubscribed(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    if (accountType === 'provider') {
      unsubscribe = realtimeBookings.subscribeToProviderBookings(user.id, {
        onInsert: handleBookingUpdate,
        onUpdate: handleBookingUpdate,
        onDelete: handleBookingUpdate,
        onError: (error) => {
          console.error('❌ Provider booking subscription error:', error);
          setIsSubscribed(false);
        },
      });
    } else {
      unsubscribe = realtimeBookings.subscribeToCustomerBookings(user.id, {
        onInsert: handleBookingUpdate,
        onUpdate: handleBookingUpdate,
        onDelete: handleBookingUpdate,
        onError: (error) => {
          console.error('❌ Customer booking subscription error:', error);
          setIsSubscribed(false);
        },
      });
    }

    setIsSubscribed(true);

    return () => {
      if (unsubscribe) {
        unsubscribe();
        setIsSubscribed(false);
      }
    };
  }, [user?.id, accountType, handleBookingUpdate]);

  // Initial fetch
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Refresh function
  const refresh = useCallback(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Create booking with enhanced API
  const createBooking = useCallback(async (bookingData: any) => {
    try {
      setError(null);
      const response = await enhancedBookingsAPI.createBookingWithServices(bookingData);
      
      if (response.success) {
        console.log('✅ Booking created successfully');
        // Don't refresh immediately, let real-time update handle it
        return response;
      } else {
        setError(response.error || 'Failed to create booking');
        return response;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Update booking status
  const updateBookingStatus = useCallback(async (
    bookingId: string, 
    status: string, 
    notes?: string
  ) => {
    try {
      setError(null);
      const response = await enhancedBookingsAPI.updateBookingStatus(bookingId, status as any, notes);
      
      if (response.success) {
        console.log('✅ Booking status updated successfully');
        // Real-time update will handle the UI update
        return response;
      } else {
        setError(response.error || 'Failed to update booking');
        return response;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    bookings,
    loading,
    error,
    isSubscribed,
    refresh,
    createBooking,
    updateBookingStatus,
    // Computed values
    upcomingBookings: bookings.filter(b => 
      new Date(b.booking_date + ' ' + b.start_time) > new Date() && 
      !['cancelled', 'completed', 'no_show'].includes(b.status)
    ),
    pastBookings: bookings.filter(b => 
      new Date(b.booking_date + ' ' + b.start_time) <= new Date() || 
      ['cancelled', 'completed', 'no_show'].includes(b.status)
    ),
    todayBookings: bookings.filter(b => {
      const today = new Date().toISOString().split('T')[0];
      return b.booking_date === today;
    }),
  };
};

/**
 * Hook specifically for shop-based real-time updates (when you have a shop_id)
 */
export const useShopBookingRealtime = (shopId: string, options: UseBookingRealtimeOptions = {}) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Fetch shop bookings
  const fetchBookings = useCallback(async () => {
    if (!shopId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await bookingsAPI.getProviderBookings(undefined, shopId);

      if (response.success) {
        setBookings(response.data || []);
        console.log(`📅 Loaded ${response.data?.length || 0} bookings for shop ${shopId}`);
      } else {
        setError(response.error || 'Failed to fetch shop bookings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  // Handle real-time updates
  const handleBookingUpdate = useCallback((bookingUpdate: BookingUpdate) => {
    console.log('🔔 Shop booking update:', bookingUpdate);

    setBookings(prevBookings => {
      if (bookingUpdate.operation === 'INSERT') {
        options.onNewBooking?.(bookingUpdate);
        if (options.autoRefresh !== false) {
          setTimeout(fetchBookings, 1000);
        }
        return prevBookings;
      } else if (bookingUpdate.operation === 'UPDATE') {
        options.onBookingUpdate?.(bookingUpdate);
        return prevBookings.map(booking => 
          booking.id === bookingUpdate.booking_id 
            ? { ...booking, ...bookingUpdate, updated_at: bookingUpdate.timestamp }
            : booking
        );
      } else if (bookingUpdate.operation === 'DELETE') {
        options.onBookingDelete?.(bookingUpdate);
        return prevBookings.filter(booking => booking.id !== bookingUpdate.booking_id);
      }
      return prevBookings;
    });
  }, [options, fetchBookings]);

  // Subscribe to shop updates
  useEffect(() => {
    if (!shopId) {
      setIsSubscribed(false);
      return;
    }

    const unsubscribe = realtimeBookings.subscribeToShopBookings(shopId, {
      onInsert: handleBookingUpdate,
      onUpdate: handleBookingUpdate,
      onDelete: handleBookingUpdate,
      onError: (error) => {
        console.error('❌ Shop booking subscription error:', error);
        setIsSubscribed(false);
      },
    });

    setIsSubscribed(true);

    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [shopId, handleBookingUpdate]);

  // Initial fetch
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    error,
    isSubscribed,
    refresh: fetchBookings,
    todayBookings: bookings.filter(b => {
      const today = new Date().toISOString().split('T')[0];
      return b.booking_date === today;
    }),
  };
};