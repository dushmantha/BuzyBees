// TypeScript interfaces for the comprehensive booking system

export interface ShopService {
  id: string;
  shop_id: string;
  provider_id: string;
  
  // Basic Information
  name: string;
  description?: string;
  category?: string;
  
  // Pricing and Duration
  base_price: number;
  currency: string;
  duration_minutes: number;
  
  // Service Type and Location
  service_type: 'appointment' | 'walk_in' | 'both';
  location_type: 'in_house' | 'on_location' | 'both';
  
  // Staff Assignment
  assigned_staff: string[]; // Array of staff UUIDs
  
  // Media
  image_url?: string;
  images?: string[];
  
  // Availability Settings
  is_active: boolean;
  min_advance_booking: number; // Minutes
  max_advance_booking: number; // Minutes
  buffer_time_before: number; // Minutes
  buffer_time_after: number; // Minutes
  
  // Cancellation Policy
  cancellation_window: number; // Minutes
  cancellation_fee: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ServiceOption {
  id: string;
  service_id: string;
  
  // Option Details
  name: string;
  description?: string;
  option_type: 'addon' | 'upgrade' | 'variant' | 'required';
  
  // Pricing
  price_adjustment: number;
  price_type: 'fixed' | 'percentage';
  
  // Duration Impact
  duration_adjustment: number; // Minutes
  
  // Availability
  is_active: boolean;
  is_required: boolean;
  max_quantity: number;
  
  // Display
  sort_order: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ShopBooking {
  id: string;
  booking_reference: string;
  
  // Relationships
  shop_id: string;
  service_id: string;
  provider_id: string;
  assigned_staff_id?: string;
  
  // Customer Information
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  
  // Booking Date and Time
  booking_date: string; // Date string
  start_time: string; // Time string
  end_time: string; // Time string
  timezone: string;
  
  // Service Details
  service_name: string;
  base_duration_minutes: number;
  total_duration_minutes: number;
  
  // Pricing
  base_price: number;
  options_price: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  
  // Booking Type and Status
  booking_type: 'standard' | 'quick' | 'recurring' | 'walk_in';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  
  // Payment Information
  payment_status: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'failed';
  payment_method?: string;
  payment_reference?: string;
  
  // Communication
  notification_sent: boolean;
  reminder_sent: boolean;
  confirmation_sent: boolean;
  
  // Notes
  customer_notes?: string;
  internal_notes?: string;
  cancellation_reason?: string;
  
  // Timestamps
  booked_at: string;
  confirmed_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingServiceOption {
  id: string;
  booking_id: string;
  service_option_id: string;
  
  // Option Details (snapshot)
  option_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  duration_minutes: number;
  
  // Timestamps
  created_at: string;
}

// Request/Response types
export interface CreateBookingRequest {
  shop_id: string;
  service_id: string;
  assigned_staff_id?: string;
  
  // Customer info
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  
  // Date and time
  booking_date: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  
  // Service details
  service_name: string;
  duration_minutes: number;
  service_price: number;
  total_amount: number;
  
  // Options
  selected_options?: {
    option_id: string;
    quantity: number;
  }[];
  
  // Notes
  notes?: string;
}

export interface AvailableTimeSlot {
  time: string;
  available: boolean;
  booking_id?: string;
  staff_id?: string;
}

export interface BookingConflict {
  booking_id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  status: string;
}