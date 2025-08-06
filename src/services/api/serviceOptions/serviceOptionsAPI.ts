import { supabaseService } from '../../../lib/supabase/index';

export interface ServiceOption {
  id?: string;
  service_name: string; // Primary identifier - service name (required)
  shop_id: string;
  option_name: string;
  option_description?: string;
  price: number;
  duration: number; // in minutes
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceWithOptions {
  id: string;
  name: string;
  description?: string;
  has_options: boolean;
  base_price?: number;
  base_duration?: number;
  options: ServiceOption[];
}

class ServiceOptionsAPI {
  private supabase = supabaseService;

  // Get all service options for a specific service by service name
  async getServiceOptions(serviceName: string, shopId: string) {
    try {
      console.log('🔍 Fetching service options for:', { serviceName, shopId });
      
      const { data, error } = await this.supabase.client
        .from('service_options')
        .select('*')
        .eq('service_name', serviceName)
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('❌ Error fetching service options:', error);
        return { data: null, error: error.message };
      }

      console.log('✅ Service options fetched:', data?.length || 0);
      return { data, error: null };
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      return { data: null, error: 'Failed to fetch service options' };
    }
  }

  // Get service options for consumer view (active only) by service name
  async getServiceOptionsForConsumer(serviceName: string, shopId?: string) {
    try {
      console.log('🔍 Fetching service options for consumer:', serviceName, shopId);
      
      // Build query
      let query = this.supabase.client
        .from('service_options')
        .select('*')
        .eq('service_name', serviceName)
        .eq('is_active', true);
      
      // If shopId provided, filter by shop
      if (shopId) {
        query = query.eq('shop_id', shopId);
      }
      
      const { data, error } = await query.order('sort_order', { ascending: true });

      if (error) {
        console.error('❌ Error fetching service options:', error);
        return { data: null, error: error.message };
      }

      // If no options found, return empty array (no mock data)
      if (!data || data.length === 0) {
        console.log('📋 No options found in database');
        return { data: [], error: null };
      }

      console.log('✅ Service options fetched for consumer:', data.length);
      return { data, error: null };
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      return { data: null, error: 'Failed to fetch service options' };
    }
  }

  // Create a new service option
  async createServiceOption(option: Omit<ServiceOption, 'id' | 'created_at' | 'updated_at'>) {
    try {
      console.log('➕ Creating service option:', option);
      
      const { data, error } = await this.supabase.client
        .from('service_options')
        .insert([option])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating service option:', error);
        return { data: null, error: error.message };
      }

      console.log('✅ Service option created:', data);
      return { data, error: null };
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      return { data: null, error: 'Failed to create service option' };
    }
  }

  // Update a service option
  async updateServiceOption(optionId: string, updates: Partial<ServiceOption>) {
    try {
      console.log('✏️ Updating service option:', optionId, updates);
      
      const { data, error } = await this.supabase.client
        .from('service_options')
        .update(updates)
        .eq('id', optionId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating service option:', error);
        return { data: null, error: error.message };
      }

      console.log('✅ Service option updated:', data);
      return { data, error: null };
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      return { data: null, error: 'Failed to update service option' };
    }
  }

  // Delete a service option (soft delete by setting is_active to false)
  async deleteServiceOption(optionId: string) {
    try {
      console.log('🗑️ Deleting service option:', optionId);
      
      const { data, error } = await this.supabase.client
        .from('service_options')
        .update({ is_active: false })
        .eq('id', optionId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error deleting service option:', error);
        return { data: null, error: error.message };
      }

      console.log('✅ Service option deleted:', data);
      return { data, error: null };
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      return { data: null, error: 'Failed to delete service option' };
    }
  }

  // Bulk create/update service options
  async upsertServiceOptions(shopId: string, serviceName: string, options: Omit<ServiceOption, 'id' | 'created_at' | 'updated_at' | 'shop_id' | 'service_name'>[]) {
    try {
      console.log('🔄 Upserting service options:', { shopId, serviceName, count: options.length });
      
      // Prepare options with shop_id and service_name
      const optionsToUpsert = options.map((opt, index) => ({
        ...opt,
        shop_id: shopId,
        service_name: serviceName,
        sort_order: opt.sort_order || index
      }));

      const { data, error } = await this.supabase.client
        .from('service_options')
        .upsert(optionsToUpsert, {
          onConflict: 'shop_id,service_name,option_name'
        })
        .select();

      if (error) {
        console.error('❌ Error upserting service options:', error);
        return { data: null, error: error.message };
      }

      console.log('✅ Service options upserted:', data?.length || 0);
      return { data, error: null };
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      return { data: null, error: 'Failed to upsert service options' };
    }
  }

  // Mock data removed - service options now come only from Supabase database
}

export const serviceOptionsAPI = new ServiceOptionsAPI();
export default serviceOptionsAPI;