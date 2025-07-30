// Normalized Supabase Service - Separate Tables for Staff, Services, Discounts
// This service uses separate tables instead of JSONB arrays for better data integrity

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        discounts: shopData.discounts?.length || 0
      });

      // Use the normalized database function
      const { data: result, error } = await this.client.rpc('create_shop_normalized', {
        p_provider_id: user.id,
        p_shop_data: basicShopData,
        p_staff: shopData.staff || [],
        p_services: shopData.services || [],
        p_discounts: shopData.discounts || []
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

      // Note: For a complete update, we would need to handle staff, services, and discounts
      // individually. For now, we'll just update the basic shop data.
      // You can extend this to update related tables as needed.

      // Fetch the updated complete shop data
      const completeShop = await this.getShopById(shopId);
      
      return {
        success: true,
        data: completeShop.data,
        message: 'Shop updated successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected shop update error:', error);
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
}

// ==============================================
// EXPORTS
// ==============================================

export const normalizedShopService = new NormalizedShopService();
export { supabase };
export default normalizedShopService;