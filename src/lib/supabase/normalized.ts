// Normalized Supabase Service - Separate Tables for Staff, Services, Discounts
// This service uses separate tables instead of JSONB arrays for better data integrity

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// ==============================================
// CONFIGURATION
// ==============================================

const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

// ==============================================
// TYPES
// ==============================================

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ShopStaff {
  id?: string;
  shop_id?: string;
  provider_id?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  specialties?: string[];
  bio?: string;
  experience_years?: number;
  avatar_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id?: string;
  booking_id: string;
  provider_id: string;
  shop_id?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  service_title: string;
  service_type?: string;
  service_date: string;
  service_time?: string;
  duration?: string;
  amount: number;
  currency?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  location_type?: 'in_house' | 'on_location';
  location?: string;
  invoice_sent?: boolean;
  invoice_number?: string;
  created_at?: string;
  updated_at?: string;
  paid_at?: string;
}

export interface ShopService {
  id?: string;
  shop_id?: string;
  provider_id?: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  category?: string;
  assigned_staff?: string[];
  location_type?: 'in_house' | 'on_location';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopBusinessHours {
  id?: string;
  shop_id?: string;
  provider_id?: string;
  day: string;
  is_open?: boolean;
  open_time?: string;
  close_time?: string;
  is_always_open?: boolean;
  timezone?: string;
  priority?: number;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopSpecialDay {
  id?: string;
  shop_id?: string;
  provider_id?: string;
  date: string; // ISO date string
  name: string;
  description?: string;
  type: 'holiday' | 'special_hours' | 'closed' | 'event';
  is_open?: boolean;
  open_time?: string;
  close_time?: string;
  is_always_open?: boolean;
  recurring?: 'none' | 'weekly' | 'monthly' | 'yearly';
  recurring_until?: string;
  color?: string;
  priority?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopDiscount {
  id?: string;
  shop_id?: string;
  provider_id?: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  start_date: string;
  end_date: string;
  usage_limit?: number;
  used_count?: number;
  min_amount?: number;
  max_discount?: number;
  applicable_services?: string[];
  conditions?: any;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompleteShopData {
  // Basic shop info
  id?: string;
  provider_id?: string;
  name: string;
  description?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  website_url?: string;
  image_url?: string;
  logo_url?: string;
  images?: string[];
  business_hours_start?: string;
  business_hours_end?: string;
  timezone?: string;
  advance_booking_days?: number;
  slot_duration?: number;
  buffer_time?: number;
  auto_approval?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Related data
  staff?: ShopStaff[];
  services?: ShopService[];
  business_hours?: ShopBusinessHours[];
  special_days?: ShopSpecialDay[];
  discounts?: ShopDiscount[];
}

// ==============================================
// SUPABASE CLIENT
// ==============================================

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'react-native-buzybees-normalized',
    },
  },
});

// ==============================================
// NORMALIZED SHOP SERVICE CLASS
// ==============================================

class NormalizedShopService {
  private client = supabase;

  constructor() {
    console.log('🏪 Normalized Shop Service initialized');
  }

  // ==============================================
  // AUTHENTICATION
  // ==============================================

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      if (error) {
        console.error('❌ Get current user error:', error);
        return null;
      }
      return user;
    } catch (error) {
      console.error('❌ Get current user error:', error);
      return null;
    }
  }

  // ==============================================
  // SHOP MANAGEMENT
  // ==============================================

  async createShop(shopData: CompleteShopData): Promise<ServiceResponse<CompleteShopData>> {
    try {
      console.log('🏪 Creating shop with normalized tables...');
      
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Prepare shop data (basic fields only)
      const basicShopData = {
        name: shopData.name,
        description: shopData.description || '',
        category: shopData.category || 'Beauty & Wellness',
        address: shopData.address || '',
        city: shopData.city || '',
        state: shopData.state || '',
        country: shopData.country || 'Sweden',
        phone: shopData.phone || '',
        email: shopData.email || '',
        website_url: shopData.website_url,
        image_url: shopData.image_url || '',
        logo_url: shopData.logo_url || '',
        images: shopData.images || [],
        business_hours_start: shopData.business_hours_start || '09:00',
        business_hours_end: shopData.business_hours_end || '17:00',
        timezone: shopData.timezone || 'Europe/Stockholm',
        advance_booking_days: shopData.advance_booking_days || 30,
        slot_duration: shopData.slot_duration || 60,
        buffer_time: shopData.buffer_time || 15,
        auto_approval: shopData.auto_approval ?? true,
        is_active: shopData.is_active ?? true
      };

      console.log('🏪 Calling create_shop_normalized function...');
      console.log('📊 Data counts:', {
        staff: shopData.staff?.length || 0,
        services: shopData.services?.length || 0,
        business_hours: shopData.business_hours?.length || 0,
        discounts: shopData.discounts?.length || 0
      });

      // Prepare schedule data from shop data
      const scheduleData = {
        name: `${shopData.name} Schedule`,
        description: `Business schedule for ${shopData.name}`,
        default_start_time: shopData.business_hours_start || '09:00',
        default_end_time: shopData.business_hours_end || '17:00',
        timezone: shopData.timezone || 'Europe/Stockholm',
        advance_booking_days: shopData.advance_booking_days || 30,
        slot_duration: shopData.slot_duration || 60,
        buffer_time: shopData.buffer_time || 15,
        auto_approval: shopData.auto_approval ?? true,
        cancellation_hours: 24,
        enable_breaks: false,
        observe_public_holidays: true
      };

      console.log('🗓️ Schedule data:', scheduleData);

      // Use the normalized database function
      const { data: result, error } = await this.client.rpc('create_shop_normalized', {
        p_provider_id: user.id,
        p_shop_data: basicShopData,
        p_staff: shopData.staff || [],
        p_services: shopData.services || [],
        p_business_hours: shopData.business_hours || [],
        p_discounts: shopData.discounts || [],
        p_schedule_data: scheduleData
      });

      if (error) {
        console.error('❌ Shop creation RPC error:', error);
        return {
          success: false,
          error: `Failed to create shop: ${error.message}`
        };
      }

      if (!result || !result.success) {
        console.error('❌ Shop creation failed:', result);
        return {
          success: false,
          error: result?.error || 'Shop creation failed'
        };
      }

      console.log('✅ Shop created successfully with normalized tables');
      
      // Fetch the complete shop data
      const completeShop = await this.getShopById(result.shop_id);
      
      return {
        success: true,
        data: completeShop.data,
        message: 'Shop created successfully with normalized data'
      };

    } catch (error) {
      console.error('❌ Unexpected shop creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getShopById(shopId: string): Promise<ServiceResponse<CompleteShopData>> {
    try {
      console.log('🔍 Fetching shop with normalized data:', shopId);

      // Use the shop_complete view for easy querying
      const { data, error } = await this.client
        .from('shop_complete')
        .select('*')
        .eq('id', shopId)
        .single();

      if (error) {
        console.error('❌ Get shop error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched complete shop data');
      console.log('🚨 DATABASE RETURNED:', {
        shopName: data.name,
        businessHoursCount: data.business_hours?.length || 0,
        businessHoursData: data.business_hours
      });
      
      
      return {
        success: true,
        data: data as CompleteShopData
      };

    } catch (error) {
      console.error('❌ Get shop error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateShop(shopId: string, shopData: CompleteShopData): Promise<ServiceResponse<CompleteShopData>> {
    try {
      console.log('🔄 Updating shop with normalized tables:', shopId);
      
      // CRITICAL DEBUG: Show what data was received
      console.log('🚨 RECEIVED SHOP DATA:');
      console.log('Shop Name:', shopData.name);
      console.log('Business Hours Received:', shopData.business_hours);
      console.log('Business Hours Count:', shopData.business_hours?.length || 0);
      console.log('Business Hours Sample:', shopData.business_hours?.[0]);
      

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Update basic shop data
      const basicShopData = {
        name: shopData.name,
        description: shopData.description || '',
        category: shopData.category || 'Beauty & Wellness',
        address: shopData.address || '',
        city: shopData.city || '',
        state: shopData.state || '',
        country: shopData.country || 'Sweden',
        phone: shopData.phone || '',
        email: shopData.email || '',
        website_url: shopData.website_url,
        image_url: shopData.image_url || '',
        logo_url: shopData.logo_url || '',
        images: shopData.images || [],
        business_hours_start: shopData.business_hours_start || '09:00',
        business_hours_end: shopData.business_hours_end || '17:00',
        timezone: shopData.timezone || 'Europe/Stockholm',
        advance_booking_days: shopData.advance_booking_days || 30,
        slot_duration: shopData.slot_duration || 60,
        buffer_time: shopData.buffer_time || 15,
        auto_approval: shopData.auto_approval ?? true,
        is_active: shopData.is_active ?? true,
        updated_at: new Date().toISOString()
      };

      const { error: shopError } = await this.client
        .from('provider_businesses')
        .update(basicShopData)
        .eq('id', shopId)
        .eq('provider_id', user.id);

      if (shopError) {
        console.error('❌ Shop update error:', shopError);
        return {
          success: false,
          error: `Failed to update shop: ${shopError.message}`
        };
      }

      console.log('✅ Shop basic data updated successfully');

      // Update schedule data if shop has a schedule_id
      const { data: existingShop } = await this.client
        .from('provider_businesses')
        .select('schedule_id')
        .eq('id', shopId)
        .single();

      if (existingShop?.schedule_id) {
        console.log('🗓️ Updating schedule data for schedule_id:', existingShop.schedule_id);
        
        const scheduleUpdateData = {
          default_start_time: shopData.business_hours_start || '09:00',
          default_end_time: shopData.business_hours_end || '17:00',
          timezone: shopData.timezone || 'Europe/Stockholm',
          advance_booking_days: shopData.advance_booking_days || 30,
          slot_duration: shopData.slot_duration || 60,
          buffer_time: shopData.buffer_time || 15,
          auto_approval: shopData.auto_approval ?? true,
          updated_at: new Date().toISOString()
        };

        const { error: scheduleError } = await this.client
          .from('shop_schedules')
          .update(scheduleUpdateData)
          .eq('id', existingShop.schedule_id)
          .eq('provider_id', user.id);

        if (scheduleError) {
          console.error('❌ Schedule update error:', scheduleError);
          // Don't fail the entire operation, just log the error
          console.log('⚠️ Schedule update failed, but shop update succeeded');
        } else {
          console.log('✅ Schedule updated successfully');
        }
      }

      // Update business hours if provided
      if (shopData.business_hours && shopData.business_hours.length > 0) {
        console.log('🕐 Updating business hours, count:', shopData.business_hours.length);
        
        // Delete existing business hours for this shop
        await this.client
          .from('shop_business_hours')
          .delete()
          .eq('shop_id', shopId)
          .eq('provider_id', user.id);

        // Insert new business hours - handle both frontend and database formats
        const businessHoursToInsert = shopData.business_hours.map(hour => ({
          shop_id: shopId,
          provider_id: user.id,
          day: hour.day,
          // Handle frontend format (isOpen, openTime, closeTime) and database format (is_open, open_time, close_time)
          is_open: (hour as any).isOpen !== undefined ? (hour as any).isOpen : (hour.is_open ?? true),
          open_time: (hour as any).openTime || hour.open_time || '09:00',
          close_time: (hour as any).closeTime || hour.close_time || '17:00',
          is_always_open: (hour as any).isAlwaysOpen || hour.is_always_open || false,
          timezone: shopData.timezone || 'Europe/Stockholm',
          priority: (hour as any).priority || 0,
          description: (hour as any).description || '',
          is_active: true
        }));

        // CRITICAL DEBUG: Show exactly what will be saved to database
        console.log('🚨 ABOUT TO SAVE TO DATABASE:');
        console.log('Shop ID:', shopId);
        console.log('User ID:', user.id);
        console.log('Business Hours Data:', JSON.stringify(businessHoursToInsert, null, 2));
        

        const { data: insertResult, error: businessHoursError } = await this.client
          .from('shop_business_hours')
          .insert(businessHoursToInsert)
          .select();

        console.log('🚨 DATABASE RESPONSE:');
        console.log('Insert Result:', insertResult);
        console.log('Error:', businessHoursError);

        if (businessHoursError) {
          console.error('❌ Business hours update error:', businessHoursError);
          
          // Show error alert
          Alert.alert(
            'DATABASE ERROR',
            `${businessHoursError.message}\n\nCode: ${businessHoursError.code}`,
            [{ text: 'OK' }]
          );
          
          // Check if it's a table not found error
          if (businessHoursError.code === 'PGRST116' || businessHoursError.message.includes('does not exist')) {
            return {
              success: false,
              error: 'Business hours table missing. Please run the migration script first.'
            };
          }
        } else {
          console.log('✅ Business hours updated successfully');
          console.log('✅ Inserted records:', insertResult?.length || 0);
          
        }
      } else {
        console.log('🚨 NO BUSINESS HOURS PROVIDED');
        console.log('shopData.business_hours:', shopData.business_hours);
        
      }

      // Update special days if provided
      if (shopData.special_days && shopData.special_days.length > 0) {
        console.log('📅 Updating special days, count:', shopData.special_days.length);
        
        // Delete existing special days for this shop
        await this.client
          .from('shop_special_days')
          .delete()
          .eq('shop_id', shopId)
          .eq('provider_id', user.id);

        // Insert new special days
        const specialDaysToInsert = shopData.special_days.map(day => ({
          shop_id: shopId,
          provider_id: user.id,
          date: day.date,
          name: day.name,
          description: day.description || '',
          type: day.type || 'holiday',
          is_open: day.is_open ?? false,
          open_time: day.open_time,
          close_time: day.close_time,
          is_always_open: day.is_always_open ?? false,
          recurring: day.recurring || 'none',
          recurring_until: day.recurring_until,
          color: day.color || '#FF6B6B',
          priority: day.priority || 0,
          is_active: day.is_active ?? true
        }));

        console.log('🚨 SPECIAL DAYS TO SAVE:', JSON.stringify(specialDaysToInsert, null, 2));

        const { data: specialResult, error: specialError } = await this.client
          .from('shop_special_days')
          .insert(specialDaysToInsert)
          .select();

        if (specialError) {
          console.error('❌ Special days update error:', specialError);
          // Don't fail the entire operation, just log the error
          Alert.alert(
            'Special Days Warning',
            `Special days could not be saved: ${specialError.message}`,
            [{ text: 'OK' }]
          );
        } else {
          console.log('✅ Special days updated successfully');
          console.log('✅ Inserted special days:', specialResult?.length || 0);
        }
      } else {
        console.log('🚨 NO SPECIAL DAYS PROVIDED');
      }

      // Fetch the updated complete shop data
      const completeShop = await this.getShopById(shopId);
      
      return {
        success: true,
        data: completeShop.data,
        message: 'Shop and schedule updated successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected shop update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateShopSchedule(shopId: string, scheduleData: {
    business_hours_start?: string;
    business_hours_end?: string;
    timezone?: string;
    advance_booking_days?: number;
    slot_duration?: number;
    buffer_time?: number;
    auto_approval?: boolean;
    business_hours?: ShopBusinessHours[];
  }): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🗓️ Updating shop schedule only:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get the shop's schedule_id
      const { data: existingShop } = await this.client
        .from('provider_businesses')
        .select('schedule_id')
        .eq('id', shopId)
        .eq('provider_id', user.id)
        .single();

      if (!existingShop?.schedule_id) {
        return {
          success: false,
          error: 'Shop does not have a schedule. Please run the migration script first.'
        };
      }

      // Update schedule table
      const scheduleUpdateData = {
        default_start_time: scheduleData.business_hours_start || '09:00',
        default_end_time: scheduleData.business_hours_end || '17:00',
        timezone: scheduleData.timezone || 'Europe/Stockholm',
        advance_booking_days: scheduleData.advance_booking_days || 30,
        slot_duration: scheduleData.slot_duration || 60,
        buffer_time: scheduleData.buffer_time || 15,
        auto_approval: scheduleData.auto_approval ?? true,
        updated_at: new Date().toISOString()
      };

      const { error: scheduleError } = await this.client
        .from('shop_schedules')
        .update(scheduleUpdateData)
        .eq('id', existingShop.schedule_id)
        .eq('provider_id', user.id);

      if (scheduleError) {
        console.error('❌ Schedule update error:', scheduleError);
        return {
          success: false,
          error: `Failed to update schedule: ${scheduleError.message}`
        };
      }

      // Update business hours if provided
      if (scheduleData.business_hours && scheduleData.business_hours.length > 0) {
        console.log('🕐 Updating business hours for schedule');
        
        // Delete existing business hours for this shop
        await this.client
          .from('shop_business_hours')
          .delete()
          .eq('shop_id', shopId)
          .eq('provider_id', user.id);

        // Insert new business hours - handle both frontend and database formats
        const businessHoursToInsert = scheduleData.business_hours.map(hour => ({
          shop_id: shopId,
          provider_id: user.id,
          day: hour.day,
          // Handle frontend format (isOpen, openTime, closeTime) and database format (is_open, open_time, close_time)
          is_open: (hour as any).isOpen !== undefined ? (hour as any).isOpen : (hour.is_open ?? true),
          open_time: (hour as any).openTime || hour.open_time || '09:00',
          close_time: (hour as any).closeTime || hour.close_time || '17:00',
          is_always_open: (hour as any).isAlwaysOpen || hour.is_always_open || false,
          is_active: true
        }));

        const { error: businessHoursError } = await this.client
          .from('shop_business_hours')
          .insert(businessHoursToInsert);

        if (businessHoursError) {
          console.error('❌ Business hours update error:', businessHoursError);
          return {
            success: false,
            error: `Failed to update business hours: ${businessHoursError.message}`
          };
        }
      }

      console.log('✅ Schedule and business hours updated successfully');
      return {
        success: true,
        data: true,
        message: 'Schedule updated successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected schedule update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Convenient method to just update business hours
  async syncBusinessHours(shopId: string, businessHours: ShopBusinessHours[]): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🕐 Syncing business hours for shop:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      if (!businessHours || businessHours.length === 0) {
        return {
          success: false,
          error: 'No business hours provided'
        };
      }

      // Delete existing business hours for this shop
      await this.client
        .from('shop_business_hours')
        .delete()
        .eq('shop_id', shopId)
        .eq('provider_id', user.id);

      // Insert new business hours - handle both frontend and database formats
      const businessHoursToInsert = businessHours.map(hour => ({
        shop_id: shopId,
        provider_id: user.id,
        day: hour.day,
        // Handle frontend format (isOpen, openTime, closeTime) and database format (is_open, open_time, close_time)
        is_open: (hour as any).isOpen !== undefined ? (hour as any).isOpen : (hour.is_open ?? true),
        open_time: (hour as any).openTime || hour.open_time || '09:00',
        close_time: (hour as any).closeTime || hour.close_time || '17:00',
        is_always_open: (hour as any).isAlwaysOpen || hour.is_always_open || false,
        is_active: true
      }));

      const { error: businessHoursError } = await this.client
        .from('shop_business_hours')
        .insert(businessHoursToInsert);

      if (businessHoursError) {
        console.error('❌ Business hours sync error:', businessHoursError);
        return {
          success: false,
          error: `Failed to sync business hours: ${businessHoursError.message}`
        };
      }

      console.log('✅ Business hours synced successfully');
      return {
        success: true,
        data: true,
        message: 'Business hours synced successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected business hours sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // STAFF MANAGEMENT
  // ==============================================

  async createStaff(shopId: string, staffData: ShopStaff): Promise<ServiceResponse<ShopStaff>> {
    try {
      console.log('👤 Creating staff member for shop:', shopId);
      console.log('👤 Staff data received:', JSON.stringify(staffData, null, 2));

      const user = await this.getCurrentUser();
      if (!user) {
        console.error('❌ User not authenticated');
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      console.log('👤 User authenticated:', user.id);

      // Validate required data
      if (!shopId || !staffData.name || !staffData.email) {
        console.error('❌ Missing required staff data');
        console.error('  - shopId:', shopId);
        console.error('  - name:', staffData.name);
        console.error('  - email:', staffData.email);
        return {
          success: false,
          error: 'Missing required staff data (shopId, name, or email)'
        };
      }

      const insertData = {
        shop_id: shopId,
        provider_id: user.id,
        name: staffData.name,
        email: staffData.email,
        phone: staffData.phone || '',
        role: staffData.role || '',
        specialties: staffData.specialties || [],
        bio: staffData.bio || '',
        experience_years: staffData.experience_years || 0,
        avatar_url: staffData.avatar_url,
        is_active: staffData.is_active ?? true
      };

      console.log('👤 Inserting staff data:', JSON.stringify(insertData, null, 2));

      const { data, error } = await this.client
        .from('shop_staff')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Staff creation error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        
        // Check if it's a table not found error
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          return {
            success: false,
            error: 'Database table "shop_staff" does not exist. Please run the normalized schema SQL first.'
          };
        }
        
        return {
          success: false,
          error: `Failed to create staff: ${error.message}`
        };
      }

      console.log('✅ Staff created successfully:', data?.name);
      return {
        success: true,
        data: data as ShopStaff
      };

    } catch (error) {
      console.error('❌ Unexpected staff creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateStaff(staffId: string, staffData: Partial<ShopStaff>): Promise<ServiceResponse<ShopStaff>> {
    try {
      console.log('👤 Updating staff member:', staffId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_staff')
        .update({
          ...staffData,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Staff update error:', error);
        return {
          success: false,
          error: `Failed to update staff: ${error.message}`
        };
      }

      console.log('✅ Staff updated successfully');
      return {
        success: true,
        data: data as ShopStaff
      };

    } catch (error) {
      console.error('❌ Unexpected staff update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteStaff(staffId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('👤 Deleting staff member:', staffId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { error } = await this.client
        .from('shop_staff')
        .delete()
        .eq('id', staffId)
        .eq('provider_id', user.id);

      if (error) {
        console.error('❌ Staff deletion error:', error);
        return {
          success: false,
          error: `Failed to delete staff: ${error.message}`
        };
      }

      console.log('✅ Staff deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected staff deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // SERVICE MANAGEMENT
  // ==============================================

  async createService(shopId: string, serviceData: ShopService): Promise<ServiceResponse<ShopService>> {
    try {
      console.log('🛠️ Creating service for shop:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_services')
        .insert({
          shop_id: shopId,
          provider_id: user.id,
          name: serviceData.name,
          description: serviceData.description || '',
          price: serviceData.price,
          duration: serviceData.duration || 60,
          category: serviceData.category || '',
          assigned_staff: serviceData.assigned_staff || [],
          location_type: serviceData.location_type || 'in_house',
          is_active: serviceData.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Service creation error:', error);
        return {
          success: false,
          error: `Failed to create service: ${error.message}`
        };
      }

      console.log('✅ Service created successfully:', data.name);
      return {
        success: true,
        data: data as ShopService
      };

    } catch (error) {
      console.error('❌ Unexpected service creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateService(serviceId: string, serviceData: Partial<ShopService>): Promise<ServiceResponse<ShopService>> {
    try {
      console.log('🛠️ Updating service:', serviceId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_services')
        .update({
          ...serviceData,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Service update error:', error);
        return {
          success: false,
          error: `Failed to update service: ${error.message}`
        };
      }

      console.log('✅ Service updated successfully');
      return {
        success: true,
        data: data as ShopService
      };

    } catch (error) {
      console.error('❌ Unexpected service update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteService(serviceId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🛠️ Deleting service:', serviceId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { error } = await this.client
        .from('shop_services')
        .delete()
        .eq('id', serviceId)
        .eq('provider_id', user.id);

      if (error) {
        console.error('❌ Service deletion error:', error);
        return {
          success: false,
          error: `Failed to delete service: ${error.message}`
        };
      }

      console.log('✅ Service deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected service deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // BUSINESS HOURS MANAGEMENT
  // ==============================================

  async createBusinessHours(shopId: string, businessHoursData: ShopBusinessHours): Promise<ServiceResponse<ShopBusinessHours>> {
    try {
      console.log('🕐 Creating business hours for shop:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_business_hours')
        .insert({
          shop_id: shopId,
          provider_id: user.id,
          day: businessHoursData.day,
          is_open: businessHoursData.is_open ?? true,
          open_time: businessHoursData.open_time || '09:00',
          close_time: businessHoursData.close_time || '17:00',
          is_always_open: businessHoursData.is_always_open ?? false,
          is_active: businessHoursData.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Business hours creation error:', error);
        return {
          success: false,
          error: `Failed to create business hours: ${error.message}`
        };
      }

      console.log('✅ Business hours created successfully for:', data.day);
      return {
        success: true,
        data: data as ShopBusinessHours
      };

    } catch (error) {
      console.error('❌ Unexpected business hours creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateBusinessHours(businessHoursId: string, businessHoursData: Partial<ShopBusinessHours>): Promise<ServiceResponse<ShopBusinessHours>> {
    try {
      console.log('🕐 Updating business hours:', businessHoursId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_business_hours')
        .update({
          ...businessHoursData,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessHoursId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Business hours update error:', error);
        return {
          success: false,
          error: `Failed to update business hours: ${error.message}`
        };
      }

      console.log('✅ Business hours updated successfully');
      return {
        success: true,
        data: data as ShopBusinessHours
      };

    } catch (error) {
      console.error('❌ Unexpected business hours update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteBusinessHours(businessHoursId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🕐 Deleting business hours:', businessHoursId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { error } = await this.client
        .from('shop_business_hours')
        .delete()
        .eq('id', businessHoursId)
        .eq('provider_id', user.id);

      if (error) {
        console.error('❌ Business hours deletion error:', error);
        return {
          success: false,
          error: `Failed to delete business hours: ${error.message}`
        };
      }

      console.log('✅ Business hours deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected business hours deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBusinessHours(shopId: string): Promise<ServiceResponse<ShopBusinessHours[]>> {
    try {
      console.log('🕐 Fetching business hours for shop:', shopId);

      const { data, error } = await this.client
        .from('shop_business_hours')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('day');

      if (error) {
        console.error('❌ Get business hours error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched business hours:', data?.length || 0);
      return {
        success: true,
        data: data as ShopBusinessHours[] || []
      };

    } catch (error) {
      console.error('❌ Get business hours error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // SPECIAL DAYS MANAGEMENT
  // ==============================================

  async createSpecialDay(shopId: string, specialDayData: ShopSpecialDay): Promise<ServiceResponse<ShopSpecialDay>> {
    try {
      console.log('📅 Creating special day for shop:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_special_days')
        .insert({
          shop_id: shopId,
          provider_id: user.id,
          date: specialDayData.date,
          name: specialDayData.name,
          description: specialDayData.description || '',
          type: specialDayData.type || 'holiday',
          is_open: specialDayData.is_open ?? false,
          open_time: specialDayData.open_time,
          close_time: specialDayData.close_time,
          is_always_open: specialDayData.is_always_open ?? false,
          recurring: specialDayData.recurring || 'none',
          recurring_until: specialDayData.recurring_until,
          color: specialDayData.color || '#FF6B6B',
          priority: specialDayData.priority || 0,
          is_active: specialDayData.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Special day creation error:', error);
        return {
          success: false,
          error: `Failed to create special day: ${error.message}`
        };
      }

      console.log('✅ Special day created successfully:', data.name);
      return {
        success: true,
        data: data as ShopSpecialDay
      };

    } catch (error) {
      console.error('❌ Unexpected special day creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateSpecialDay(specialDayId: string, specialDayData: Partial<ShopSpecialDay>): Promise<ServiceResponse<ShopSpecialDay>> {
    try {
      console.log('📅 Updating special day:', specialDayId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_special_days')
        .update({
          ...specialDayData,
          updated_at: new Date().toISOString()
        })
        .eq('id', specialDayId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Special day update error:', error);
        return {
          success: false,
          error: `Failed to update special day: ${error.message}`
        };
      }

      console.log('✅ Special day updated successfully');
      return {
        success: true,
        data: data as ShopSpecialDay
      };

    } catch (error) {
      console.error('❌ Unexpected special day update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteSpecialDay(specialDayId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('📅 Deleting special day:', specialDayId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { error } = await this.client
        .from('shop_special_days')
        .delete()
        .eq('id', specialDayId)
        .eq('provider_id', user.id);

      if (error) {
        console.error('❌ Special day deletion error:', error);
        return {
          success: false,
          error: `Failed to delete special day: ${error.message}`
        };
      }

      console.log('✅ Special day deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected special day deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSpecialDays(shopId: string, startDate?: string, endDate?: string): Promise<ServiceResponse<ShopSpecialDay[]>> {
    try {
      console.log('📅 Fetching special days for shop:', shopId);

      let query = this.client
        .from('shop_special_days')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('date');

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Get special days error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched special days:', data?.length || 0);
      return {
        success: true,
        data: data as ShopSpecialDay[] || []
      };

    } catch (error) {
      console.error('❌ Get special days error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get effective hours for a specific date (considering special days)
  async getEffectiveHours(shopId: string, date: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📅 Getting effective hours for shop:', shopId, 'date:', date);

      const { data, error } = await this.client.rpc('get_effective_hours_for_date', {
        p_shop_id: shopId,
        p_date: date
      });

      if (error) {
        console.error('❌ Get effective hours error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched effective hours');
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('❌ Get effective hours error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // BOOKING MANAGEMENT
  
  async createBooking(bookingData: {
    shop_id: string;
    service_id: string;
    assigned_staff_id?: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    service_price: number;
    total_amount: number;
    notes?: string;
    timezone?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('📅 Creating booking:', bookingData);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check for booking conflicts before creating
      const { data: conflictCheck, error: conflictError } = await this.client
        .rpc('check_booking_conflict', {
          p_shop_id: bookingData.shop_id,
          p_staff_id: bookingData.assigned_staff_id || null,
          p_booking_date: bookingData.booking_date,
          p_start_time: bookingData.start_time,
          p_end_time: bookingData.end_time
        });

      if (conflictError) {
        console.error('❌ Error checking booking conflict:', conflictError);
        return {
          success: false,
          error: `Failed to check availability: ${conflictError.message}`
        };
      }

      if (conflictCheck) {
        return {
          success: false,
          error: 'This time slot is already booked'
        };
      }

      const { data, error } = await this.client
        .from('shop_bookings')
        .insert({
          shop_id: bookingData.shop_id,
          service_id: bookingData.service_id,
          provider_id: user.id,
          assigned_staff_id: bookingData.assigned_staff_id || null,
          customer_name: bookingData.customer_name,
          customer_phone: bookingData.customer_phone,
          customer_email: bookingData.customer_email || null,
          booking_date: bookingData.booking_date,
          start_time: bookingData.start_time,
          end_time: bookingData.end_time,
          duration_minutes: bookingData.duration_minutes,
          service_price: bookingData.service_price,
          total_amount: bookingData.total_amount,
          notes: bookingData.notes || null,
          timezone: bookingData.timezone || 'Europe/Stockholm',
          status: 'confirmed', // Quick booking is immediately confirmed/booked
          booking_type: 'quick',
          internal_notes: 'Quick booking created by owner'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Booking creation error:', error);
        return {
          success: false,
          error: `Failed to create booking: ${error.message}`
        };
      }

      console.log('✅ Booking created successfully');
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('❌ Unexpected booking creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAvailableTimeSlots(
    shopId: string,
    serviceId: string,
    date: string,
    staffId?: string
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🕐 Getting available time slots:', { shopId, serviceId, date, staffId });

      const { data, error } = await this.client
        .rpc('get_available_slots', {
          p_shop_id: shopId,
          p_service_id: serviceId,
          p_date: date,
          p_staff_id: staffId || null
        });

      if (error) {
        console.error('❌ Error getting available slots:', error);
        return {
          success: false,
          error: `Failed to get available slots: ${error.message}`
        };
      }

      console.log('✅ Available slots retrieved:', data?.length || 0, 'slots');
      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      console.error('❌ Unexpected error getting available slots:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBookings(
    shopId?: string,
    date?: string,
    status?: string
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log('📅 Getting bookings:', { shopId, date, status });

      let query = this.client
        .from('shop_bookings')
        .select(`
          *,
          shop_services(name, duration, price),
          shop_staff(name, email)
        `)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }

      if (date) {
        query = query.eq('booking_date', date);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error getting bookings:', error);
        return {
          success: false,
          error: `Failed to get bookings: ${error.message}`
        };
      }

      console.log('✅ Bookings retrieved:', data?.length || 0, 'bookings');
      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      console.error('❌ Unexpected error getting bookings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateBooking(
    bookingId: string,
    updateData: {
      status?: string;
      assigned_staff_id?: string;
      notes?: string;
      internal_notes?: string;
    }
  ): Promise<ServiceResponse<any>> {
    try {
      console.log('📅 Updating booking:', bookingId, updateData);

      const { data, error } = await this.client
        .from('shop_bookings')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('❌ Booking update error:', error);
        return {
          success: false,
          error: `Failed to update booking: ${error.message}`
        };
      }

      console.log('✅ Booking updated successfully');
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('❌ Unexpected booking update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get bookings for a provider
  async getBookings(
    providerId: string,
    filters?: { status?: string; date?: string; shopId?: string }
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log('📋 Getting bookings for provider:', providerId, 'with filters:', filters);

      let query = this.client
        .from('shop_bookings')
        .select(`
          *,
          shop_services!inner(name, location_type, category),
          shop_staff(name, email, phone),
          provider_businesses!inner(name, address, city)
        `)
        .eq('provider_id', providerId)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Apply filters if provided
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.date) {
        query = query.eq('booking_date', filters.date);
      }

      if (filters?.shopId) {
        query = query.eq('shop_id', filters.shopId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Get bookings error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Transform the data to include joined information
      const transformedBookings = data?.map(booking => ({
        ...booking,
        service_name: booking.shop_services?.name,
        service_location_type: booking.shop_services?.location_type,
        service_category: booking.shop_services?.category,
        staff: booking.shop_staff ? {
          name: booking.shop_staff.name,
          email: booking.shop_staff.email,
          phone: booking.shop_staff.phone
        } : null,
        shop: booking.provider_businesses ? {
          name: booking.provider_businesses.name,
          address: booking.provider_businesses.address,
          city: booking.provider_businesses.city
        } : null
      })) || [];

      console.log('✅ Successfully fetched', transformedBookings.length, 'bookings');
      return {
        success: true,
        data: transformedBookings,
        message: 'Bookings retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get bookings error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update booking status specifically
  async updateBookingStatus(
    bookingId: string,
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show',
    internalNotes?: string
  ): Promise<ServiceResponse<any>> {
    try {
      console.log('📅 Updating booking status:', bookingId, 'to', status);

      // First try direct update to avoid function ambiguity issues
      const { data: bookingData, error: fetchError } = await this.client
        .from('shop_bookings')
        .select('provider_id')
        .eq('id', bookingId)
        .single();

      if (fetchError || !bookingData) {
        console.error('❌ Booking not found:', fetchError);
        return {
          success: false,
          error: 'Booking not found'
        };
      }

      // Verify the user owns this booking
      const currentUser = await this.getCurrentUser();
      if (!currentUser || bookingData.provider_id !== currentUser.id) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Update the booking directly
      const { data, error } = await this.client
        .from('shop_bookings')
        .update({
          status: status,
          internal_notes: internalNotes || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('❌ Update booking status error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Failed to update booking status'
        };
      }

      console.log('✅ Booking status updated successfully');
      return {
        success: true,
        data: { updated: true },
        message: `Booking status updated to ${status}`
      };

    } catch (error) {
      console.error('❌ Unexpected booking status update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get booking status counts for dashboard
  async getBookingStatusCounts(
    shopId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ServiceResponse<any>> {
    try {
      console.log('📊 Getting booking status counts for shop:', shopId);

      const { data, error } = await this.client
        .rpc('get_booking_status_counts', {
          p_shop_id: shopId,
          p_date_from: dateFrom || new Date().toISOString().split('T')[0],
          p_date_to: dateTo || new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error('❌ Get booking status counts error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Booking status counts retrieved');
      return {
        success: true,
        data: data || {},
        message: 'Booking status counts retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get booking status counts error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // DISCOUNT MANAGEMENT  
  // ==============================================

  async createDiscount(shopId: string, discountData: ShopDiscount): Promise<ServiceResponse<ShopDiscount>> {
    try {
      console.log('🎯 Creating discount for shop:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_discounts')
        .insert({
          shop_id: shopId,
          provider_id: user.id,
          type: discountData.type,
          value: discountData.value,
          description: discountData.description,
          start_date: discountData.start_date,
          end_date: discountData.end_date,
          usage_limit: discountData.usage_limit,
          min_amount: discountData.min_amount,
          max_discount: discountData.max_discount,
          applicable_services: discountData.applicable_services || [],
          conditions: discountData.conditions || {},
          is_active: discountData.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Discount creation error:', error);
        return {
          success: false,
          error: `Failed to create discount: ${error.message}`
        };
      }

      console.log('✅ Discount created successfully');
      return {
        success: true,
        data: data as ShopDiscount
      };

    } catch (error) {
      console.error('❌ Unexpected discount creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateDiscount(discountId: string, discountData: Partial<ShopDiscount>): Promise<ServiceResponse<ShopDiscount>> {
    try {
      console.log('🎯 Updating discount:', discountId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_discounts')
        .update({
          ...discountData,
          updated_at: new Date().toISOString()
        })
        .eq('id', discountId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Discount update error:', error);
        return {
          success: false,
          error: `Failed to update discount: ${error.message}`
        };
      }

      console.log('✅ Discount updated successfully');
      return {
        success: true,
        data: data as ShopDiscount
      };

    } catch (error) {
      console.error('❌ Unexpected discount update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteDiscount(discountId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🎯 Deleting discount:', discountId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { error } = await this.client
        .from('shop_discounts')
        .delete()
        .eq('id', discountId)
        .eq('provider_id', user.id);

      if (error) {
        console.error('❌ Discount deletion error:', error);
        return {
          success: false,
          error: `Failed to delete discount: ${error.message}`
        };
      }

      console.log('✅ Discount deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected discount deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // MIGRATION AND UTILITIES
  // ==============================================

  async fixExistingShopsSchedule(): Promise<ServiceResponse<any>> {
    try {
      console.log('🔧 Fixing existing shops without schedule...');

      const { data: result, error } = await this.client.rpc('fix_existing_shops_schedule');

      if (error) {
        console.error('❌ Fix existing shops error:', error);
        return {
          success: false,
          error: `Failed to fix existing shops: ${error.message}`
        };
      }

      console.log('✅ Fix existing shops completed:', result);
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('❌ Unexpected fix existing shops error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkShopScheduleStatus(): Promise<ServiceResponse<any>> {
    try {
      console.log('📊 Checking shop schedule status...');

      const { data: result, error } = await this.client.rpc('check_shop_schedule_status');

      if (error) {
        console.error('❌ Check status error:', error);
        return {
          success: false,
          error: `Failed to check status: ${error.message}`
        };
      }

      console.log('✅ Status check completed:', result);
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('❌ Unexpected status check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // QUERYING
  // ==============================================

  async getShops(providerId?: string): Promise<ServiceResponse<CompleteShopData[]>> {
    try {
      console.log('🏪 Fetching shops with normalized data...');

      let query = this.client
        .from('shop_complete')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Get shops error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched shops:', data?.length || 0);
      return {
        success: true,
        data: data as CompleteShopData[] || []
      };

    } catch (error) {
      console.error('❌ Get shops error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // PAYMENT METHODS
  // ==============================================

  // Create payment record when booking is completed
  async createPaymentRecord(bookingData: {
    booking_id: string;
    shop_id?: string;
    client_name: string;
    client_email?: string;
    client_phone?: string;
    service_title: string;
    service_type?: string;
    service_date: string;
    service_time?: string;
    duration?: string;
    amount: number;
    notes?: string;
    location_type?: 'in_house' | 'on_location';
    location?: string;
    invoice_number?: string;
  }): Promise<ServiceResponse<Payment>> {
    try {
      console.log('💰 Creating payment record for booking:', bookingData.booking_id);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('payments')
        .insert({
          booking_id: bookingData.booking_id,
          provider_id: user.id,
          shop_id: bookingData.shop_id,
          client_name: bookingData.client_name,
          client_email: bookingData.client_email,
          client_phone: bookingData.client_phone,
          service_title: bookingData.service_title,
          service_type: bookingData.service_type,
          service_date: bookingData.service_date,
          service_time: bookingData.service_time,
          duration: bookingData.duration,
          amount: bookingData.amount,
          currency: 'NZD',
          payment_status: 'pending',
          notes: bookingData.notes,
          location_type: bookingData.location_type,
          location: bookingData.location,
          invoice_number: bookingData.invoice_number,
          invoice_sent: false
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Payment creation error:', error);
        return {
          success: false,
          error: `Failed to create payment record: ${error.message}`
        };
      }

      console.log('✅ Payment record created successfully');
      return {
        success: true,
        data: data as Payment,
        message: 'Payment record created successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected payment creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update payment status
  async updatePaymentStatus(
    paymentId: string,
    status: 'pending' | 'paid' | 'failed' | 'refunded',
    paymentMethod?: string,
    paymentReference?: string
  ): Promise<ServiceResponse<Payment>> {
    try {
      console.log('💰 Updating payment status:', paymentId, 'to', status);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const updateData: any = {
        payment_status: status,
        updated_at: new Date().toISOString()
      };

      if (paymentMethod) updateData.payment_method = paymentMethod;
      if (paymentReference) updateData.payment_reference = paymentReference;

      const { data, error } = await this.client
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Payment status update error:', error);
        return {
          success: false,
          error: `Failed to update payment status: ${error.message}`
        };
      }

      console.log('✅ Payment status updated successfully');
      return {
        success: true,
        data: data as Payment,
        message: `Payment status updated to ${status}`
      };

    } catch (error) {
      console.error('❌ Unexpected payment update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get payments for provider
  async getPayments(
    shopId?: string,
    status?: 'pending' | 'paid' | 'failed' | 'refunded',
    dateFrom?: string,
    dateTo?: string
  ): Promise<ServiceResponse<Payment[]>> {
    try {
      console.log('💰 Fetching payments for provider');

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      let query = this.client
        .from('payments')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }
      if (status) {
        query = query.eq('payment_status', status);
      }
      if (dateFrom) {
        query = query.gte('service_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('service_date', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Get payments error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched', data?.length || 0, 'payments');
      return {
        success: true,
        data: data as Payment[] || [],
        message: 'Payments retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get payments error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// ==============================================
// EXPORTS
// ==============================================

export const normalizedShopService = new NormalizedShopService();
export { supabase };
export default normalizedShopService;