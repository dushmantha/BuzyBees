import { normalizedShopService, supabase } from '../../../lib/supabase/normalized';

export interface BookingService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export interface Booking {
  id?: string;
  customer_id: string;
  shop_id: string;
  staff_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  services: BookingService[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BookingCreateRequest {
  customer_id: string;
  shop_id: string;
  staff_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  services: BookingService[];
  notes?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

class BookingsAPI {
  
  /**
   * Create a new booking
   */
  async createBooking(bookingData: BookingCreateRequest): Promise<ApiResponse<Booking>> {
    try {
      console.log('📅 Creating booking:', bookingData);

      // Transform old booking format to new format
      const firstService = bookingData.services?.[0];
      const totalDuration = bookingData.services?.reduce((sum, service) => sum + service.duration, 0) || 60;
      
      console.log('🔍 Booking services array:', bookingData.services);
      console.log('🔍 First service:', firstService);
      console.log('🔍 First service ID:', firstService?.id);
      
      if (!firstService?.id) {
        console.error('❌ No valid service ID found in booking data');
        return {
          data: null,
          error: 'No service selected. Please select a service before booking.',
          success: false
        };
      }
      
      const transformedBookingData = {
        shop_id: bookingData.shop_id,
        service_id: firstService.id, // Use first service as the primary service
        assigned_staff_id: bookingData.staff_id,
        customer_name: 'Customer', // Default name - should come from auth
        customer_phone: 'N/A', // Default phone - should come from user profile
        customer_email: undefined,
        booking_date: bookingData.booking_date,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        duration_minutes: totalDuration,
        service_price: firstService?.price || 0,
        total_amount: bookingData.total_price,
        service_name: firstService?.name || 'Service',
        notes: bookingData.notes,
        timezone: 'UTC'
      };

      // Use the new normalized service method
      const response = await normalizedShopService.createBooking(transformedBookingData);
      
      if (!response.success) {
        console.error('❌ Booking creation error:', response.error);
        return {
          data: null,
          error: response.error,
          success: false
        };
      }

      console.log('✅ Booking created successfully:', response.data);
      return {
        data: response.data,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Booking API error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  /**
   * Get bookings for a customer with shop and staff details
   */
  async getCustomerBookings(customerId: string): Promise<ApiResponse<any[]>> {
    try {
      console.log('📅 Fetching bookings for customer:', customerId);

      // Fetch bookings with shop and staff information
      const { data: bookings, error: bookingsError } = await supabase
        .from('shop_bookings')
        .select(`
          id,
          customer_id,
          shop_id,
          staff_id,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          services,
          notes,
          created_at,
          updated_at
        `)
        .eq('customer_id', customerId)
        .order('booking_date', { ascending: false });

      if (bookingsError) {
        console.error('❌ Error fetching customer bookings:', bookingsError);
        return {
          data: null,
          error: bookingsError.message,
          success: false
        };
      }

      if (!bookings || bookings.length === 0) {
        console.log('📅 No bookings found for customer');
        return {
          data: [],
          error: null,
          success: true
        };
      }

      console.log('📅 Found', bookings.length, 'bookings, fetching additional details...');

      // Get unique shop IDs and staff IDs to fetch their details
      const shopIds = [...new Set(bookings.map(b => b.shop_id))];
      const staffIds = [...new Set(bookings.map(b => b.staff_id))];

      // Fetch shop details
      const { data: shops, error: shopsError } = await supabase
        .from('provider_businesses')
        .select('id, name, image_url, city, country')
        .in('id', shopIds);

      if (shopsError) {
        console.warn('⚠️ Error fetching shop details:', shopsError);
      }

      // Fetch staff details
      const { data: staff, error: staffError } = await supabase
        .from('shop_staff')
        .select('id, name, role, avatar_url')
        .in('id', staffIds);

      if (staffError) {
        console.warn('⚠️ Error fetching staff details:', staffError);
      }

      // Create lookup maps
      const shopMap = new Map();
      shops?.forEach(shop => shopMap.set(shop.id, shop));

      const staffMap = new Map();
      staff?.forEach(staffMember => staffMap.set(staffMember.id, staffMember));

      // Enrich bookings with shop and staff details
      const enrichedBookings = bookings.map(booking => {
        const shop = shopMap.get(booking.shop_id);
        const staffMember = staffMap.get(booking.staff_id);
        
        // Extract service names from the services JSONB array
        const serviceNames = Array.isArray(booking.services) 
          ? booking.services.map(s => s.name).join(', ') 
          : 'Unknown Service';

        const staffNames = staffMember?.name || 'Unknown Staff';
        const duration = Array.isArray(booking.services) 
          ? booking.services.reduce((total, s) => total + (s.duration || 30), 0) 
          : 60;

        return {
          ...booking,
          shop_name: shop?.name || 'Unknown Shop',
          shop_image_url: shop?.image_url || null,
          shop_city: shop?.city || '',
          shop_country: shop?.country || '',
          staff_names: staffNames,
          staff_avatar: staffMember?.avatar_url || null,
          service_names: serviceNames,
          duration: duration,
          // Add computed fields for easier access
          display_date: booking.booking_date,
          display_time: booking.start_time,
          display_status: booking.status,
          display_price: booking.total_price
        };
      });

      console.log('✅ Successfully fetched and enriched', enrichedBookings.length, 'bookings');

      return {
        data: enrichedBookings,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Customer bookings API error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  /**
   * Get bookings for a staff member on a specific date
   */
  async getStaffBookings(staffId: string, date: string): Promise<ApiResponse<Array<{start: string; end: string}>>> {
    try {
      const { data, error } = await supabase
        .from('shop_bookings')
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .eq('booking_date', date)
        .in('status', ['confirmed', 'pending']);

      if (error) {
        console.error('❌ Error fetching staff bookings:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      // Transform to expected format
      const bookings = data?.map(booking => ({
        start: booking.start_time,
        end: booking.end_time
      })) || [];

      return {
        data: bookings,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Staff bookings API error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  /**
   * Check for booking conflicts
   */
  async checkBookingConflict(
    staffId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<ApiResponse<boolean>> {
    try {
      let query = supabase
        .from('shop_bookings')
        .select('id')
        .eq('staff_id', staffId)
        .eq('booking_date', date)
        .in('status', ['confirmed', 'pending']);

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error checking booking conflict:', error);
        return {
          data: false,
          error: error.message,
          success: false
        };
      }

      // Check for time overlaps manually since Supabase doesn't support complex time queries easily
      const hasConflict = data && data.length > 0;

      return {
        data: hasConflict,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Booking conflict check API error:', error);
      return {
        data: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('shop_bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('❌ Booking cancellation error:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      console.log('✅ Booking cancelled successfully:', data);
      return {
        data,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Booking cancellation API error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }
}

export const bookingsAPI = new BookingsAPI();