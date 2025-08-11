import { supabase } from '../../../lib/supabase/normalized';

// =====================================================================
// TYPES
// =====================================================================

export interface ServiceOption {
  option_id: string;
  option_name: string;
  price: number;
  duration?: number;
  quantity?: number;
}

export interface BookingService {
  service_id: string;
  service_name: string;
  price: number;
  duration: number;
  quantity?: number;
  options?: ServiceOption[];
}

export interface CreateBookingRequest {
  // Customer info
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  
  // Shop & Staff
  shop_id: string;
  provider_id: string;
  staff_id?: string;
  
  // Schedule
  booking_date: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  
  // Services with options
  services: BookingService[];
  
  // Pricing
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  
  // Notes
  notes?: string;
  customer_notes?: string;
}

export interface BookingResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// =====================================================================
// ENHANCED BOOKINGS API
// =====================================================================

class EnhancedBookingsAPI {
  
  /**
   * Create a booking with multiple services and options
   */
  async createBookingWithServices(request: CreateBookingRequest): Promise<BookingResponse> {
    try {
      console.log('🎯 Creating enhanced booking with services:', request);
      
      // Validate request
      if (!request.services || request.services.length === 0) {
        return {
          success: false,
          error: 'At least one service is required'
        };
      }
      
      // Calculate totals if not provided
      let subtotal = request.subtotal || 0;
      let totalDuration = 0;
      
      if (!request.subtotal) {
        request.services.forEach(service => {
          const serviceTotal = service.price * (service.quantity || 1);
          let optionsTotal = 0;
          
          if (service.options) {
            service.options.forEach(option => {
              optionsTotal += option.price * (option.quantity || 1);
            });
          }
          
          subtotal += serviceTotal + optionsTotal;
          totalDuration += service.duration * (service.quantity || 1);
          
          if (service.options) {
            service.options.forEach(option => {
              totalDuration += (option.duration || 0) * (option.quantity || 1);
            });
          }
        });
      }
      
      const taxAmount = request.tax_amount || (subtotal * 0.15); // 15% tax default
      const discountAmount = request.discount_amount || 0;
      const totalAmount = request.total_amount || (subtotal + taxAmount - discountAmount);
      
      // If end_time not provided, calculate it
      let endTime = request.end_time;
      if (!endTime && totalDuration > 0) {
        const [hours, minutes] = request.start_time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + totalDuration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      }
      
      // Prepare booking data
      const bookingData = {
        customer_id: request.customer_id,
        customer_name: request.customer_name,
        customer_email: request.customer_email,
        customer_phone: request.customer_phone,
        shop_id: request.shop_id,
        provider_id: request.provider_id,
        staff_id: request.staff_id,
        booking_date: request.booking_date,
        start_time: request.start_time,
        end_time: endTime || request.end_time,
        timezone: request.timezone || 'UTC',
        status: 'pending',
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        total_duration_minutes: totalDuration,
        notes: request.notes,
        customer_notes: request.customer_notes,
        // For backward compatibility
        service_name: request.services[0].service_name,
        service_id: request.services[0].service_id,
        base_price: request.services[0].price,
        base_duration_minutes: request.services[0].duration
      };
      
      console.log('📝 Creating booking record:', bookingData);
      
      // Start a transaction-like operation
      // 1. Create the main booking
      const { data: booking, error: bookingError } = await supabase
        .from('shop_bookings')
        .insert(bookingData)
        .select()
        .single();
      
      if (bookingError || !booking) {
        console.error('❌ Failed to create booking:', bookingError);
        return {
          success: false,
          error: bookingError?.message || 'Failed to create booking'
        };
      }
      
      console.log('✅ Booking created:', booking.id);
      
      // 2. Insert services
      const serviceRecords = [];
      for (let i = 0; i < request.services.length; i++) {
        const service = request.services[i];
        serviceRecords.push({
          booking_id: booking.id,
          service_id: service.service_id,
          service_name: service.service_name,
          service_price: service.price,
          service_duration: service.duration,
          quantity: service.quantity || 1,
          subtotal: service.price * (service.quantity || 1),
          sort_order: i
        });
      }
      
      const { data: bookingServices, error: servicesError } = await supabase
        .from('booking_services')
        .insert(serviceRecords)
        .select();
      
      if (servicesError) {
        console.error('⚠️ Failed to insert services:', servicesError);
        // Don't fail the whole booking, services are optional in case table doesn't exist
      } else {
        console.log('✅ Services inserted:', bookingServices?.length);
        
        // 3. Insert service options if any
        if (bookingServices) {
          const optionRecords = [];
          
          for (let i = 0; i < request.services.length; i++) {
            const service = request.services[i];
            const bookingService = bookingServices[i];
            
            if (service.options && bookingService) {
              service.options.forEach(option => {
                optionRecords.push({
                  booking_id: booking.id,
                  booking_service_id: bookingService.id,
                  service_option_id: option.option_id,
                  option_name: option.option_name,
                  option_price: option.price,
                  option_duration: option.duration || 0,
                  quantity: option.quantity || 1,
                  subtotal: option.price * (option.quantity || 1)
                });
              });
            }
          }
          
          if (optionRecords.length > 0) {
            const { error: optionsError } = await supabase
              .from('booking_service_options')
              .insert(optionRecords);
            
            if (optionsError) {
              console.error('⚠️ Failed to insert options:', optionsError);
              // Don't fail, options are optional
            } else {
              console.log('✅ Options inserted:', optionRecords.length);
            }
          }
        }
      }
      
      // 4. Update the services JSONB column for backward compatibility
      const servicesJson = request.services.map(s => ({
        id: s.service_id,
        name: s.service_name,
        price: s.price,
        duration: s.duration,
        quantity: s.quantity || 1
      }));
      
      const { error: updateError } = await supabase
        .from('shop_bookings')
        .update({ services: servicesJson })
        .eq('id', booking.id);
      
      if (updateError) {
        console.warn('⚠️ Failed to update services JSONB:', updateError);
      }
      
      console.log('🎉 Booking created successfully with all services and options');
      
      return {
        success: true,
        data: booking
      };
      
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Get booking details with all services and options
   */
  async getBookingDetails(bookingId: string): Promise<BookingResponse> {
    try {
      // Use the view for complete details
      const { data, error } = await supabase
        .from('booking_details_view')
        .select('*')
        .eq('id', bookingId)
        .single();
      
      if (error) {
        console.error('❌ Error fetching booking details:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true,
        data
      };
      
    } catch (error) {
      console.error('❌ Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string, 
    status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show',
    notes?: string
  ): Promise<BookingResponse> {
    try {
      const updateData: any = { status };
      
      // Add timestamp based on status
      if (status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.payment_status = 'pending'; // Ready for payment
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        if (notes) {
          updateData.cancellation_reason = notes;
        }
      }
      
      const { data, error } = await supabase
        .from('shop_bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error updating booking status:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      console.log('✅ Booking status updated to:', status);
      
      return {
        success: true,
        data
      };
      
    } catch (error) {
      console.error('❌ Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get bookings with full service details
   */
  async getBookingsWithServices(
    filter: { customer_id?: string; shop_id?: string; provider_id?: string; date?: string }
  ): Promise<BookingResponse> {
    try {
      let query = supabase
        .from('booking_details_view')
        .select('*');
      
      if (filter.customer_id) {
        query = query.eq('customer_id', filter.customer_id);
      }
      if (filter.shop_id) {
        query = query.eq('shop_id', filter.shop_id);
      }
      if (filter.provider_id) {
        query = query.eq('provider_id', filter.provider_id);
      }
      if (filter.date) {
        query = query.eq('booking_date', filter.date);
      }
      
      query = query.order('booking_date', { ascending: false })
                   .order('start_time', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching bookings:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true,
        data: data || []
      };
      
    } catch (error) {
      console.error('❌ Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const enhancedBookingsAPI = new EnhancedBookingsAPI();