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

  // Get monthly revenue for each shop
  async getShopMonthlyRevenue(shopId?: string): Promise<ServiceResponse<{ shop_id?: string; monthly_revenue: number }[]>> {
    try {
      console.log('💰 Calculating monthly revenue for shops');

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get current month's date range
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const dateFrom = firstDayOfMonth.toISOString().split('T')[0];
      const dateTo = lastDayOfMonth.toISOString().split('T')[0];

      console.log('📅 Calculating revenue from', dateFrom, 'to', dateTo);

      // Build query for current month's paid payments
      let query = this.client
        .from('payments')
        .select('shop_id, amount')
        .eq('provider_id', user.id)
        .eq('payment_status', 'paid')
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo);

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Get shop revenue error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Group by shop_id and sum amounts
      const revenueByShop = new Map<string, number>();
      
      data?.forEach(payment => {
        const shopId = payment.shop_id || 'unknown';
        const amount = parseFloat(payment.amount) || 0;
        revenueByShop.set(shopId, (revenueByShop.get(shopId) || 0) + amount);
      });

      // Convert to array format
      const result = Array.from(revenueByShop.entries()).map(([shop_id, monthly_revenue]) => ({
        shop_id: shop_id === 'unknown' ? undefined : shop_id,
        monthly_revenue
      }));

      console.log('✅ Monthly revenue calculated:', result);
      return {
        success: true,
        data: result
      };

    } catch (error: any) {
      console.error('❌ Calculate monthly revenue error:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate monthly revenue'
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

  // Get dashboard statistics for provider
  async getDashboardStats(providerId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📊 Fetching dashboard statistics for provider:', providerId);

      const user = await this.getCurrentUser();
      if (!user || user.id !== providerId) {
        return {
          success: false,
          error: 'User not authenticated or unauthorized'
        };
      }

      // Get current date info
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      // Fetch all necessary data in parallel
      const [
        bookingsResult,
        paymentsResult,
        shopsResult,
        thisMonthPaymentsResult,
        lastMonthPaymentsResult,
        ratingStatsResult,
        responseStatsResult
      ] = await Promise.all([
        // All bookings
        this.client
          .from('shop_bookings')
          .select('*')
          .eq('provider_id', providerId),
        
        // All payments
        this.client
          .from('payments')
          .select('*')
          .eq('provider_id', providerId),
        
        // All shops
        this.client
          .from('provider_businesses')
          .select('*')
          .eq('provider_id', providerId),
        
        // This month's payments
        this.client
          .from('payments')
          .select('*')
          .eq('provider_id', providerId)
          .gte('service_date', startOfMonth)
          .lte('service_date', endOfMonth),
        
        // Last month's payments
        this.client
          .from('payments')
          .select('*')
          .eq('provider_id', providerId)
          .gte('service_date', startOfLastMonth)
          .lte('service_date', endOfLastMonth),

        // Rating statistics
        this.client
          .rpc('get_provider_rating_stats', { p_provider_id: providerId }),

        // Response time statistics
        this.client
          .rpc('get_provider_response_stats', { p_provider_id: providerId })
      ]);

      const bookings = bookingsResult.data || [];
      const payments = paymentsResult.data || [];
      const shops = shopsResult.data || [];
      const thisMonthPayments = thisMonthPaymentsResult.data || [];
      const lastMonthPayments = lastMonthPaymentsResult.data || [];
      const ratingStats = ratingStatsResult.data?.[0] || { average_rating: 0, total_reviews: 0 };
      const responseStats = responseStatsResult.data?.[0] || { 
        average_response_minutes: 0, 
        response_rate_percentage: 0 
      };

      // Debug logging
      console.log('📊 Total bookings found:', bookings.length);
      console.log('📊 Bookings by status:', bookings.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));

      // Calculate statistics
      const completedBookings = bookings.filter(b => b.status === 'completed');
      console.log('📊 Completed bookings:', completedBookings.length);
      
      const paidPayments = payments.filter(p => p.payment_status === 'paid');
      const thisMonthPaidPayments = thisMonthPayments.filter(p => p.payment_status === 'paid');
      const lastMonthPaidPayments = lastMonthPayments.filter(p => p.payment_status === 'paid');

      // Calculate unique customers from bookings
      const uniqueCustomers = new Set([
        ...bookings.map(b => b.customer_email || b.customer_phone).filter(Boolean)
      ]);

      // Calculate this month's unique customers
      const thisMonthBookings = bookings.filter(b => {
        const bookingDate = new Date(b.booking_date);
        const startDate = new Date(startOfMonth);
        const endDate = new Date(endOfMonth);
        return bookingDate >= startDate && bookingDate <= endDate;
      });

      console.log('📊 This month date range:', startOfMonth, 'to', endOfMonth);
      console.log('📊 This month bookings:', thisMonthBookings.length);
      console.log('📊 This month bookings by status:', thisMonthBookings.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));

      const thisMonthUniqueCustomers = new Set([
        ...thisMonthBookings.map(b => b.customer_email || b.customer_phone).filter(Boolean)
      ]);

      // Calculate total earnings
      const totalEarnings = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const thisMonthEarnings = thisMonthPaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const lastMonthEarnings = lastMonthPaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Calculate growth percentage
      const monthlyGrowth = lastMonthEarnings > 0 
        ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100
        : thisMonthEarnings > 0 ? 100 : 0;

      // Calculate average job value
      const averageJobValue = completedBookings.length > 0
        ? totalEarnings / completedBookings.length
        : 0;

      // Calculate this month's completed jobs
      const thisMonthCompletedJobs = thisMonthBookings.filter(b => b.status === 'completed').length;
      console.log('📊 This month completed jobs:', thisMonthCompletedJobs);

      // Calculate this month's active bookings (confirmed or in_progress)
      const thisMonthActiveBookings = thisMonthBookings.filter(
        b => b.status === 'confirmed' || b.status === 'in_progress'
      ).length;

      // Use real rating and response stats from database
      const customerRating = parseFloat(ratingStats.average_rating) || 0;
      const responseRate = responseStats.response_rate_percentage || 0;

      const stats = {
        totalEarnings,
        activeJobs: bookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress').length,
        completedJobs: completedBookings.length,
        customerRating, // Real rating from reviews
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        thisMonthEarnings,
        responseRate, // Real response rate from bookings
        totalCustomers: uniqueCustomers.size,
        averageJobValue,
        growthPercentage: monthlyGrowth,
        weeklyBookings: bookings.filter(b => {
          const bookingDate = new Date(b.booking_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return bookingDate >= weekAgo;
        }).length,
        monthlyGrowth,
        // New monthly overview stats
        thisMonthBookings: thisMonthBookings.length,
        thisMonthCompletedJobs,
        thisMonthActiveBookings,
        thisMonthCustomers: thisMonthUniqueCustomers.size,
        thisMonthAverageJobValue: thisMonthCompletedJobs > 0 
          ? thisMonthEarnings / thisMonthCompletedJobs 
          : 0,
        // Rating and response stats
        totalReviews: ratingStats.total_reviews || 0,
        averageResponseTimeMinutes: parseFloat(responseStats.average_response_minutes) || 0,
        averageResponseTime: formatResponseTime(parseFloat(responseStats.average_response_minutes) || 0)
      };

      // Helper function to format response time
      function formatResponseTime(minutes: number): string {
        if (minutes === 0) return 'No data';
        if (minutes < 60) return `${Math.round(minutes)}m`;
        if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
        return `${Math.round(minutes / 1440)}d`;
      }

      console.log('✅ Dashboard stats calculated:', stats);
      return {
        success: true,
        data: stats,
        message: 'Dashboard statistics retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Dashboard stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get activity feed for provider
  async getActivityFeed(providerId: string, limit: number = 20): Promise<ServiceResponse<any[]>> {
    try {
      console.log('📋 Fetching activity feed for provider:', providerId);

      const user = await this.getCurrentUser();
      if (!user || user.id !== providerId) {
        return {
          success: false,
          error: 'User not authenticated or unauthorized'
        };
      }

      // Fetch recent activities from different sources
      const [bookingsResult, paymentsResult, shopsResult] = await Promise.all([
        // Recent bookings
        this.client
          .from('shop_bookings')
          .select('*, shop_services(name)')
          .eq('provider_id', providerId)
          .order('created_at', { ascending: false })
          .limit(limit),
        
        // Recent payments
        this.client
          .from('payments')
          .select('*')
          .eq('provider_id', providerId)
          .order('created_at', { ascending: false })
          .limit(limit),
        
        // Recent shop updates
        this.client
          .from('provider_businesses')
          .select('*')
          .eq('provider_id', providerId)
          .order('updated_at', { ascending: false })
          .limit(5)
      ]);

      const activities: any[] = [];

      // Transform bookings to activities
      if (bookingsResult.data) {
        bookingsResult.data.forEach(booking => {
          if (booking.status === 'pending') {
            activities.push({
              id: `booking-${booking.id}`,
              type: 'new_booking',
              title: 'New Booking Request',
              description: `${booking.customer_name} requested ${booking.shop_services?.name || 'a service'} for ${booking.booking_date}`,
              timestamp: booking.created_at,
              customer: booking.customer_name,
              priority: 'high'
            });
          } else if (booking.status === 'completed') {
            activities.push({
              id: `booking-complete-${booking.id}`,
              type: 'job_completed',
              title: 'Service Completed',
              description: `Completed service for ${booking.customer_name}`,
              timestamp: booking.updated_at,
              amount: booking.total_amount,
              customer: booking.customer_name,
              priority: 'low'
            });
          }
        });
      }

      // Transform payments to activities
      if (paymentsResult.data) {
        paymentsResult.data.forEach(payment => {
          if (payment.payment_status === 'paid') {
            activities.push({
              id: `payment-${payment.id}`,
              type: 'payment_received',
              title: 'Payment Received',
              description: `Payment for ${payment.service_title} from ${payment.client_name}`,
              timestamp: payment.updated_at || payment.created_at,
              amount: payment.amount,
              customer: payment.client_name,
              priority: 'medium'
            });
          }
        });
      }

      // Transform shop updates to activities
      if (shopsResult.data) {
        shopsResult.data.forEach(shop => {
          // Only show if recently updated (within last 24 hours)
          const updateTime = new Date(shop.updated_at);
          const dayAgo = new Date();
          dayAgo.setDate(dayAgo.getDate() - 1);
          
          if (updateTime > dayAgo && shop.updated_at !== shop.created_at) {
            activities.push({
              id: `shop-update-${shop.id}`,
              type: 'schedule_updated',
              title: 'Shop Updated',
              description: `Updated settings for ${shop.name}`,
              timestamp: shop.updated_at,
              priority: 'low'
            });
          }
        });
      }

      // Sort activities by timestamp (most recent first)
      activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Limit to requested number
      const limitedActivities = activities.slice(0, limit);

      console.log('✅ Activity feed retrieved:', limitedActivities.length, 'activities');
      return {
        success: true,
        data: limitedActivities,
        message: 'Activity feed retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Activity feed error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create a review for a completed booking
  async createReview(reviewData: {
    booking_id: string;
    shop_id: string;
    provider_id: string;
    service_id?: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    rating: number;
    title?: string;
    comment?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('⭐ Creating review for booking:', reviewData.booking_id);

      const { data, error } = await this.client
        .from('reviews')
        .insert({
          booking_id: reviewData.booking_id,
          shop_id: reviewData.shop_id,
          provider_id: reviewData.provider_id,
          service_id: reviewData.service_id,
          customer_name: reviewData.customer_name,
          customer_email: reviewData.customer_email,
          customer_phone: reviewData.customer_phone,
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment,
          is_verified: true,
          is_public: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Create review error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Review created successfully');
      return {
        success: true,
        data,
        message: 'Review submitted successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected create review error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get reviews for a shop
  async getShopReviews(shopId: string, limit: number = 20): Promise<ServiceResponse<any[]>> {
    try {
      console.log('⭐ Fetching reviews for shop:', shopId);

      const { data, error } = await this.client
        .from('reviews')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Get shop reviews error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched', data?.length || 0, 'reviews');
      return {
        success: true,
        data: data || [],
        message: 'Reviews retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get reviews error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get shop rating statistics
  async getShopRatingStats(shopId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📊 Fetching rating stats for shop:', shopId);

      const { data, error } = await this.client
        .rpc('get_shop_rating_stats', { p_shop_id: shopId });

      if (error) {
        console.error('❌ Get shop rating stats error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const stats = data?.[0] || { average_rating: 0, total_reviews: 0, rating_distribution: {} };

      console.log('✅ Shop rating stats retrieved:', stats);
      return {
        success: true,
        data: stats,
        message: 'Rating statistics retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get rating stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get provider rating statistics
  async getProviderRatingStats(providerId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📊 Fetching rating stats for provider:', providerId);

      const { data, error } = await this.client
        .rpc('get_provider_rating_stats', { p_provider_id: providerId });

      if (error) {
        console.error('❌ Get provider rating stats error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const stats = data?.[0] || { average_rating: 0, total_reviews: 0, shops_with_reviews: 0 };

      console.log('✅ Provider rating stats retrieved:', stats);
      return {
        success: true,
        data: stats,
        message: 'Provider rating statistics retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get provider rating stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get provider response time statistics
  async getProviderResponseStats(providerId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('⏱️ Fetching response stats for provider:', providerId);

      const { data, error } = await this.client
        .rpc('get_provider_response_stats', { p_provider_id: providerId });

      if (error) {
        console.error('❌ Get provider response stats error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const stats = data?.[0] || { 
        average_response_minutes: 0, 
        response_rate_percentage: 0, 
        total_responded: 0, 
        total_bookings: 0 
      };

      console.log('✅ Provider response stats retrieved:', stats);
      return {
        success: true,
        data: stats,
        message: 'Response statistics retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get response stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Add provider response to a review
  async addProviderResponse(reviewId: string, response: string): Promise<ServiceResponse<any>> {
    try {
      console.log('💬 Adding provider response to review:', reviewId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('reviews')
        .update({
          provider_response: response,
          provider_responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Add provider response error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Provider response added successfully');
      return {
        success: true,
        data,
        message: 'Response added successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected add response error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // PROVIDER SKILLS MANAGEMENT
  // ==============================================

  async addProviderSkill(skillData: {
    skill_name: string;
    experience_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    years_experience?: number;
    is_certified?: boolean;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('🎯 Adding provider skill:', skillData);

      const { data, error } = await supabase.rpc('add_provider_skill', {
        p_skill_name: skillData.skill_name,
        p_experience_level: skillData.experience_level,
        p_years_experience: skillData.years_experience || 0,
        p_is_certified: skillData.is_certified || false
      });

      if (error) {
        console.error('❌ Error adding skill:', error);
        throw error;
      }

      console.log('✅ Skill added successfully:', data);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Error in addProviderSkill:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getProviderSkills(providerId?: string): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🔍 Getting provider skills for:', providerId || 'current user');

      const { data, error } = await supabase.rpc('get_provider_skills', {
        p_provider_id: providerId || null
      });

      if (error) {
        console.error('❌ Error getting skills:', error);
        throw error;
      }

      console.log('✅ Skills retrieved:', data?.length || 0, 'skills');
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('❌ Error in getProviderSkills:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteProviderSkill(skillId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('🗑️ Deleting provider skill:', skillId);

      const { error } = await supabase
        .from('provider_skills')
        .delete()
        .eq('id', skillId);

      if (error) {
        console.error('❌ Error deleting skill:', error);
        throw error;
      }

      console.log('✅ Skill deleted successfully');
      return {
        success: true,
        data: null
      };
    } catch (error) {
      console.error('❌ Error in deleteProviderSkill:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // PROVIDER CERTIFICATIONS MANAGEMENT
  // ==============================================

  async addProviderCertification(certData: {
    certification_name: string;
    issued_by: string;
    issue_date: string;
    expiry_date?: string;
    certificate_number?: string;
    verification_url?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('🏆 Adding provider certification:', certData);

      const { data, error } = await supabase.rpc('add_provider_certification', {
        p_certification_name: certData.certification_name,
        p_issued_by: certData.issued_by,
        p_issue_date: certData.issue_date,
        p_expiry_date: certData.expiry_date || null,
        p_certificate_number: certData.certificate_number || null,
        p_verification_url: certData.verification_url || null
      });

      if (error) {
        console.error('❌ Error adding certification:', error);
        throw error;
      }

      console.log('✅ Certification added successfully:', data);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Error in addProviderCertification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getProviderCertifications(providerId?: string): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🔍 Getting provider certifications for:', providerId || 'current user');

      const { data, error } = await supabase.rpc('get_provider_certifications', {
        p_provider_id: providerId || null
      });

      if (error) {
        console.error('❌ Error getting certifications:', error);
        throw error;
      }

      console.log('✅ Certifications retrieved:', data?.length || 0, 'certifications');
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('❌ Error in getProviderCertifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteProviderCertification(certId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('🗑️ Deleting provider certification:', certId);

      const { error } = await supabase
        .from('provider_certifications')
        .delete()
        .eq('id', certId);

      if (error) {
        console.error('❌ Error deleting certification:', error);
        throw error;
      }

      console.log('✅ Certification deleted successfully');
      return {
        success: true,
        data: null
      };
    } catch (error) {
      console.error('❌ Error in deleteProviderCertification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // USER PROFILE MANAGEMENT
  // ==============================================

  async updateUserProfile(profileData: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    phone?: string;
    address?: string;
    bio?: string;
    avatar_url?: string;
    gender?: string;
    birth_date?: string;
    is_premium?: boolean;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('👤 Updating user profile:', profileData);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('users')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating user profile:', error);
        return {
          success: false,
          error: `Failed to update profile: ${error.message}`
        };
      }

      console.log('✅ User profile updated successfully');
      return {
        success: true,
        data: data,
        message: 'Profile updated successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error updating user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateProviderBusiness(businessData: {
    name?: string;
    description?: string;
    category?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    email?: string;
    website_url?: string;
    women_owned_business?: boolean;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('🏢 Updating provider business:', JSON.stringify(businessData, null, 2));

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      console.log('👤 Current user ID:', user.id);

      // First check if a business profile exists
      const { data: businessList, error: checkError } = await this.client
        .from('provider_businesses')
        .select('id')
        .eq('provider_id', user.id)
        .limit(1);

      if (checkError) {
        console.error('❌ Error checking provider business:', checkError);
        return {
          success: false,
          error: `Failed to check business profile: ${checkError.message}`
        };
      }

      const existingBusiness = businessList && businessList.length > 0 ? businessList[0] : null;

      // If there are multiple business profiles, clean them up (keep only the most recent)
      if (businessList && businessList.length > 1) {
        console.warn('⚠️ Multiple business profiles found for provider, cleaning up duplicates...');
        
        // Get all business profiles to find the most recent one
        const { data: allBusinesses, error: allError } = await this.client
          .from('provider_businesses')
          .select('id, created_at')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });

        if (!allError && allBusinesses && allBusinesses.length > 1) {
          // Keep the first (most recent) and delete the rest
          const idsToDelete = allBusinesses.slice(1).map(b => b.id);
          
          const { error: deleteError } = await this.client
            .from('provider_businesses')
            .delete()
            .in('id', idsToDelete);

          if (deleteError) {
            console.error('❌ Error cleaning up duplicate businesses:', deleteError);
          } else {
            console.log('✅ Cleaned up', idsToDelete.length, 'duplicate business profiles');
          }
        }
      }

      let result;
      if (existingBusiness) {
        // Update existing business - use the ID we found
        const { error: updateError } = await this.client
          .from('provider_businesses')
          .update({
            ...businessData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBusiness.id);

        if (updateError) {
          console.error('❌ Error updating provider business:', updateError);
          return {
            success: false,
            error: `Failed to update business profile: ${updateError.message}`
          };
        }

        // Fetch the updated record
        const { data: updatedData, error: fetchError } = await this.client
          .from('provider_businesses')
          .select('*')
          .eq('id', existingBusiness.id)
          .limit(1);

        if (fetchError || !updatedData || updatedData.length === 0) {
          console.error('❌ Error fetching updated business:', fetchError);
          return {
            success: false,
            error: 'Failed to fetch updated business profile'
          };
        }

        result = updatedData[0];
      } else {
        // Create new business profile
        const { data: insertData, error: insertError } = await this.client
          .from('provider_businesses')
          .insert({
            provider_id: user.id,
            ...businessData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (insertError) {
          console.error('❌ Error creating provider business:', insertError);
          return {
            success: false,
            error: `Failed to create business profile: ${insertError.message}`
          };
        }

        if (!insertData || insertData.length === 0) {
          return {
            success: false,
            error: 'Failed to create business profile - no data returned'
          };
        }

        result = insertData[0];
      }

      console.log('✅ Provider business updated/created successfully');
      return {
        success: true,
        data: result,
        message: existingBusiness ? 'Business profile updated successfully' : 'Business profile created successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error updating provider business:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getUserProfile(userId?: string): Promise<ServiceResponse<any>> {
    try {
      console.log('👤 Getting user profile for:', userId || 'current user');

      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const targetUserId = userId || currentUser.id;

      // Get user data
      const { data: userData, error: userError } = await this.client
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (userError) {
        console.error('❌ Error getting user profile:', userError);
        return {
          success: false,
          error: `Failed to get profile: ${userError.message}`
        };
      }

      // Get provider business separately if user is a provider
      let providerBusiness = null;
      if (userData.account_type === 'provider') {
        const { data: businessList, error: businessError } = await this.client
          .from('provider_businesses')
          .select('*')
          .eq('provider_id', targetUserId)
          .limit(1);

        if (businessError) {
          console.error('⚠️ Error getting provider business:', businessError);
          // Don't fail the whole request if business doesn't exist
        } else if (businessList && businessList.length > 0) {
          providerBusiness = businessList[0];
        }
      }

      // Format the response to match ProfileScreen expectations
      const profile = {
        ...userData,
        provider_business: providerBusiness
      };

      console.log('✅ User profile retrieved successfully');
      return {
        success: true,
        data: profile,
        message: 'Profile retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error getting user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // USER PRIVACY SETTINGS
  // ==============================================

  async getPrivacySettings(): Promise<ServiceResponse<any>> {
    try {
      console.log('🔐 Getting privacy settings');

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get user preferences which contain privacy settings
      const { data, error } = await this.client
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error getting privacy settings:', error);
        return {
          success: false,
          error: `Failed to get privacy settings: ${error.message}`
        };
      }

      // If no preferences exist, return default settings
      const defaultSettings = {
        profile_visibility: 'public',
        location_sharing: false,
        show_online_status: true,
        allow_direct_messages: true,
        allow_data_analytics: true,
        marketing_emails: false,
        two_factor_auth: false,
        visibility_phone: true,
        visibility_email: false,
        visibility_address: false,
        visibility_work_history: true
      };

      console.log('✅ Privacy settings retrieved');
      return {
        success: true,
        data: data || defaultSettings,
        message: 'Privacy settings retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error getting privacy settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updatePrivacySettings(settings: {
    profile_visibility?: string;
    location_sharing?: boolean;
    show_online_status?: boolean;
    allow_direct_messages?: boolean;
    allow_data_analytics?: boolean;
    marketing_emails?: boolean;
    two_factor_auth?: boolean;
    visibility_phone?: boolean;
    visibility_email?: boolean;
    visibility_address?: boolean;
    visibility_work_history?: boolean;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('🔐 Updating privacy settings:', settings);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check if preferences exist
      const { data: existing, error: checkError } = await this.client
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking preferences:', checkError);
        return {
          success: false,
          error: `Failed to check preferences: ${checkError.message}`
        };
      }

      let result;
      if (existing) {
        // Update existing preferences
        const { data, error } = await this.client
          .from('user_preferences')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating privacy settings:', error);
          return {
            success: false,
            error: `Failed to update privacy settings: ${error.message}`
          };
        }
        result = data;
      } else {
        // Create new preferences
        const { data, error } = await this.client
          .from('user_preferences')
          .insert({
            user_id: user.id,
            ...settings,
            // Set default notification preferences
            email_notifications: true,
            push_notifications: true,
            sms_notifications: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating privacy settings:', error);
          return {
            success: false,
            error: `Failed to create privacy settings: ${error.message}`
          };
        }
        result = data;
      }

      console.log('✅ Privacy settings updated successfully');
      return {
        success: true,
        data: result,
        message: 'Privacy settings updated successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error updating privacy settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // SUPPORT TICKET SYSTEM
  // ==============================================

  async createSupportTicket(ticketData: {
    subject: string;
    description: string;
    category: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    user_name?: string;
    user_email?: string;
    user_phone?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('🎫 Creating support ticket:', ticketData.subject);

      const { data, error } = await supabase.rpc('create_support_ticket', {
        p_subject: ticketData.subject,
        p_description: ticketData.description,
        p_category: ticketData.category,
        p_priority: ticketData.priority || 'normal',
        p_user_name: ticketData.user_name || null,
        p_user_email: ticketData.user_email || null,
        p_user_phone: ticketData.user_phone || null
      });

      if (error) {
        console.error('❌ Error creating support ticket:', error);
        return {
          success: false,
          error: `Failed to create support ticket: ${error.message}`
        };
      }

      console.log('✅ Support ticket created successfully:', data);
      return {
        success: true,
        data: data,
        message: 'Support ticket created successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error creating support ticket:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSupportTickets(): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🎫 Getting support tickets');

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('support_tickets')
        .select(`
          *,
          support_ticket_messages (
            id,
            message,
            created_at,
            sender_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting support tickets:', error);
        return {
          success: false,
          error: `Failed to get support tickets: ${error.message}`
        };
      }

      // Count messages for each ticket
      const ticketsWithCount = (data || []).map(ticket => ({
        ...ticket,
        messages_count: ticket.support_ticket_messages?.length || 0
      }));

      console.log('✅ Support tickets retrieved:', ticketsWithCount.length);
      return {
        success: true,
        data: ticketsWithCount,
        message: 'Support tickets retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error getting support tickets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async addTicketMessage(ticketId: string, message: string): Promise<ServiceResponse<any>> {
    try {
      console.log('💬 Adding message to ticket:', ticketId);

      const { data, error } = await supabase.rpc('add_ticket_message', {
        p_ticket_id: ticketId,
        p_message: message,
        p_is_internal: false
      });

      if (error) {
        console.error('❌ Error adding ticket message:', error);
        return {
          success: false,
          error: `Failed to add message: ${error.message}`
        };
      }

      console.log('✅ Message added successfully');
      return {
        success: true,
        data: data,
        message: 'Message added successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error adding ticket message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // PROVIDER VERIFICATION SYSTEM
  // ==============================================

  async submitVerificationRequest(requestData: {
    request_type: 'business' | 'identity' | 'certification' | 'skill';
    documents?: any;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('✅ Submitting verification request:', requestData);

      const { data, error } = await supabase.rpc('submit_verification_request', {
        p_request_type: requestData.request_type,
        p_documents: requestData.documents || null
      });

      if (error) {
        console.error('❌ Error submitting verification request:', error);
        throw error;
      }

      console.log('✅ Verification request submitted successfully:', data);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Error in submitVerificationRequest:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getVerificationRequests(): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🔍 Getting verification requests');

      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting verification requests:', error);
        throw error;
      }

      console.log('✅ Verification requests retrieved:', data?.length || 0, 'requests');
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('❌ Error in getVerificationRequests:', error);
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