// Updated updateShop function to use comprehensive CRUD functions
// This replaces the old direct query approach in normalized.ts

import { supabase } from './normalized';

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CompleteShopData {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  phone?: string;
  email?: string;
  website_url?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  image_url?: string;
  images?: string[];
  logo_url?: string;
  business_hours?: any[];
  special_days?: any[];
  business_hours_start?: string;
  business_hours_end?: string;
  timezone?: string;
  advance_booking_days?: number;
  slot_duration?: number;
  buffer_time?: number;
  auto_approval?: boolean;
  first_time_discount_active?: boolean;
  is_active?: boolean;
}

// Updated updateShop function using comprehensive CRUD
export async function updateShopWithCRUD(shopId: string, shopData: CompleteShopData, userId: string): Promise<ServiceResponse<CompleteShopData>> {
  try {
    console.log('🔄 Updating shop with comprehensive CRUD function:', shopId);
    
    // CRITICAL DEBUG: Show what data was received
    console.log('🚨 RECEIVED SHOP DATA:');
    console.log('Shop Name:', shopData.name);
    console.log('Business Hours Received:', shopData.business_hours);
    console.log('Business Hours Count:', shopData.business_hours?.length || 0);
    console.log('Business Hours Sample:', shopData.business_hours?.[0]);
    
    // Use the comprehensive shop update function
    const { data, error } = await supabase.rpc('buzybees_update_complete_shop', {
      p_shop_id: shopId,
      p_provider_id: userId,
      p_name: shopData.name,
      p_description: shopData.description || null,
      p_category: shopData.category || null,
      p_phone: shopData.phone || null,
      p_email: shopData.email || null,
      p_website_url: shopData.website_url || null,
      p_address: shopData.address || null,
      p_city: shopData.city || null,
      p_state: shopData.state || null,
      p_country: shopData.country || null,
      p_image_url: shopData.image_url || null,
      p_images: shopData.images || null,
      p_logo_url: shopData.logo_url || null,
      p_business_hours: shopData.business_hours || null,
      p_special_days: shopData.special_days || null,
      p_timezone: shopData.timezone || null,
      p_advance_booking_days: shopData.advance_booking_days || null,
      p_slot_duration: shopData.slot_duration || null,
      p_buffer_time: shopData.buffer_time || null,
      p_auto_approval: shopData.auto_approval ?? null,
      p_first_time_discount_active: shopData.first_time_discount_active ?? null,
      p_is_active: shopData.is_active ?? null
    });

    if (error) {
      console.error('❌ Shop update error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get the result from the function
    const result = data?.[0];
    if (!result?.success) {
      console.error('❌ Shop update failed:', result?.message);
      return {
        success: false,
        error: result?.message || 'Failed to update shop'
      };
    }

    console.log('✅ Shop updated successfully with CRUD function');
    console.log('📋 Updated fields:', result?.updated_fields);
    
    return {
      success: true,
      data: result?.shop_data || shopData,
      message: result?.message || 'Shop updated successfully'
    };

  } catch (error) {
    console.error('❌ Unexpected shop update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Updated createShop function using comprehensive CRUD
export async function createShopWithCRUD(shopData: CompleteShopData, userId: string): Promise<ServiceResponse<CompleteShopData>> {
  try {
    console.log('🏪 Creating shop with comprehensive CRUD function');
    
    // Use the comprehensive shop create function
    const { data, error } = await supabase.rpc('buzybees_create_complete_shop', {
      p_provider_id: userId,
      p_name: shopData.name,
      p_description: shopData.description || '',
      p_category: shopData.category || 'Beauty & Wellness',
      p_phone: shopData.phone || '',
      p_email: shopData.email || '',
      p_website_url: shopData.website_url || null,
      p_address: shopData.address || '',
      p_city: shopData.city || '',
      p_state: shopData.state || '',
      p_country: shopData.country || 'Sweden',
      p_image_url: shopData.image_url || null,
      p_images: shopData.images || [],
      p_logo_url: shopData.logo_url || null,
      p_business_hours: shopData.business_hours || null,
      p_special_days: shopData.special_days || [],
      p_timezone: shopData.timezone || 'Europe/Stockholm',
      p_advance_booking_days: shopData.advance_booking_days || 30,
      p_slot_duration: shopData.slot_duration || 60,
      p_buffer_time: shopData.buffer_time || 15,
      p_auto_approval: shopData.auto_approval ?? true,
      p_first_time_discount_active: shopData.first_time_discount_active ?? true,
      p_is_active: shopData.is_active ?? true
    });

    if (error) {
      console.error('❌ Shop creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get the result from the function
    const result = data?.[0];
    if (!result?.success) {
      console.error('❌ Shop creation failed:', result?.message);
      return {
        success: false,
        error: result?.message || 'Failed to create shop'
      };
    }

    console.log('✅ Shop created successfully with CRUD function');
    console.log('📋 Staff created:', result?.staff_created);
    console.log('📋 Services created:', result?.services_created);
    console.log('📋 Discounts created:', result?.discounts_created);
    
    return {
      success: true,
      data: result?.shop_data || { ...shopData, id: result?.shop_id },
      message: result?.message || 'Shop created successfully'
    };

  } catch (error) {
    console.error('❌ Unexpected shop creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Function to get complete shop data using CRUD
export async function getCompleteShopData(shopId: string, providerId?: string): Promise<ServiceResponse<any>> {
  try {
    console.log('📋 Getting complete shop data with CRUD function:', shopId);
    
    // Use the comprehensive shop get function
    const { data, error } = await supabase.rpc('buzybees_get_complete_shop_data', {
      p_shop_id: shopId,
      p_provider_id: providerId || null
    });

    if (error) {
      console.error('❌ Get shop data error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    const result = data?.[0];
    if (!result?.shop_data) {
      return {
        success: false,
        error: 'Shop not found or access denied'
      };
    }

    console.log('✅ Shop data retrieved successfully');
    
    return {
      success: true,
      data: {
        shop: result.shop_data,
        staff: result.staff_data || [],
        services: result.services_data || [],
        discounts: result.discounts_data || [],
        service_options: result.service_options_data || []
      },
      message: 'Shop data retrieved successfully'
    };

  } catch (error) {
    console.error('❌ Unexpected get shop data error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}