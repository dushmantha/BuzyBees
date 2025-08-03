import { supabaseService } from '../../../lib/supabase/index';

export interface Shop {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  website_url?: string;
  image_url?: string;
  logo_url?: string;
  images: string[];
  staff: any[];
  services: any[];
  business_hours: any[];
  special_days: any[];
  discounts: any[];
  is_active: boolean;
  is_verified: boolean;
  rating?: number;
  reviews_count?: number;
  distance?: string;
  created_at: string;
  updated_at: string;
}

export interface ShopApiResponse {
  data: Shop[] | null;
  error: string | null;
  status: number;
}

export interface HomeShopData {
  shops: Shop[];
  categories: string[];
  stats: {
    totalShops: number;
    totalCategories: number;
    avgRating: number;
  };
}

class ShopAPI {
  private supabase = supabaseService;

  async getAllShops(): Promise<ShopApiResponse> {
    try {
      console.log('🏪 Fetching all shops from database...');
      
      // Check if user is authenticated (required for RLS)
      const { data: { session }, error: sessionError } = await this.supabase.client.auth.getSession();
      console.log('🔐 Auth session check:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        sessionError: sessionError?.message 
      });
      
      const result = await this.supabase.client
        .from('provider_businesses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (result.error) {
        console.error('❌ Error fetching shops:', result.error);
        return {
          data: null,
          error: result.error.message,
          status: 500
        };
      }

      console.log('✅ Successfully fetched shops:', result.data?.length || 0);
      
      // Transform the data to match our Shop interface
      const shops: Shop[] = (result.data || []).map((shop: any) => ({
        id: shop.id,
        name: shop.name || 'Unnamed Shop',
        description: shop.description || '',
        category: shop.category || 'Beauty & Wellness',
        address: shop.address || '',
        city: shop.city || '',
        state: shop.state || '',
        country: shop.country || '',
        phone: shop.phone || '',
        email: shop.email || '',
        website_url: shop.website_url || null,
        image_url: shop.image_url || '',
        logo_url: shop.logo_url || '',
        images: Array.isArray(shop.images) ? shop.images : [],
        staff: Array.isArray(shop.staff) ? shop.staff : [],
        services: Array.isArray(shop.services) ? shop.services : [],
        business_hours: Array.isArray(shop.business_hours) ? shop.business_hours : [],
        special_days: Array.isArray(shop.special_days) ? shop.special_days : [],
        discounts: Array.isArray(shop.discounts) ? shop.discounts : [],
        is_active: shop.is_active || false,
        is_verified: shop.is_verified || false,
        rating: 4.5, // Default rating for now
        reviews_count: Math.floor(Math.random() * 100) + 10, // Random for now
        distance: `${(Math.random() * 5 + 0.5).toFixed(1)} km`, // Random distance for now
        created_at: shop.created_at,
        updated_at: shop.updated_at
      }));

      return {
        data: shops,
        error: null,
        status: 200
      };

    } catch (error) {
      console.error('❌ Unexpected error fetching shops:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      };
    }
  }

  async getShopsByCategory(category: string): Promise<ShopApiResponse> {
    try {
      console.log('🏪 Fetching shops by category:', category);
      
      const result = await this.supabase.client
        .from('provider_businesses')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (result.error) {
        console.error('❌ Error fetching shops by category:', result.error);
        return {
          data: null,
          error: result.error.message,
          status: 500
        };
      }

      console.log('✅ Successfully fetched shops by category:', result.data?.length || 0);
      
      const shops: Shop[] = (result.data || []).map((shop: any) => ({
        id: shop.id,
        name: shop.name || 'Unnamed Shop',
        description: shop.description || '',
        category: shop.category || 'Beauty & Wellness',
        address: shop.address || '',
        city: shop.city || '',
        state: shop.state || '',
        country: shop.country || '',
        phone: shop.phone || '',
        email: shop.email || '',
        website_url: shop.website_url || null,
        image_url: shop.image_url || '',
        logo_url: shop.logo_url || '',
        images: Array.isArray(shop.images) ? shop.images : [],
        staff: Array.isArray(shop.staff) ? shop.staff : [],
        services: Array.isArray(shop.services) ? shop.services : [],
        business_hours: Array.isArray(shop.business_hours) ? shop.business_hours : [],
        special_days: Array.isArray(shop.special_days) ? shop.special_days : [],
        discounts: Array.isArray(shop.discounts) ? shop.discounts : [],
        is_active: shop.is_active || false,
        is_verified: shop.is_verified || false,
        rating: 4.5,
        reviews_count: Math.floor(Math.random() * 100) + 10,
        distance: `${(Math.random() * 5 + 0.5).toFixed(1)} km`,
        created_at: shop.created_at,
        updated_at: shop.updated_at
      }));

      return {
        data: shops,
        error: null,
        status: 200
      };

    } catch (error) {
      console.error('❌ Unexpected error fetching shops by category:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      };
    }
  }

  async getHomeShopData(): Promise<{ data: HomeShopData | null; error: string | null; status: number }> {
    try {
      console.log('🏠 Fetching home shop data...');
      
      const shopsResult = await this.getAllShops();
      
      if (shopsResult.error || !shopsResult.data) {
        return {
          data: null,
          error: shopsResult.error || 'Failed to fetch shops',
          status: shopsResult.status
        };
      }

      const shops = shopsResult.data;
      
      // Get unique categories
      const categories = [...new Set(shops.map(shop => shop.category))];
      
      // Calculate stats
      const totalRating = shops.reduce((sum, shop) => sum + (shop.rating || 0), 0);
      const avgRating = shops.length > 0 ? totalRating / shops.length : 0;
      
      const homeData: HomeShopData = {
        shops: shops,
        categories: categories,
        stats: {
          totalShops: shops.length,
          totalCategories: categories.length,
          avgRating: Number(avgRating.toFixed(1))
        }
      };

      console.log('✅ Successfully prepared home shop data:', {
        shops: homeData.shops.length,
        categories: homeData.categories.length,
        stats: homeData.stats
      });

      return {
        data: homeData,
        error: null,
        status: 200
      };

    } catch (error) {
      console.error('❌ Unexpected error fetching home shop data:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      };
    }
  }

  async searchShops(query: string): Promise<ShopApiResponse> {
    try {
      console.log('🔍 Searching shops with query:', query);
      
      const result = await this.supabase.client
        .from('provider_businesses')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%,address.ilike.%${query}%`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (result.error) {
        console.error('❌ Error searching shops:', result.error);
        return {
          data: null,
          error: result.error.message,
          status: 500
        };
      }

      console.log('✅ Successfully searched shops:', result.data?.length || 0);
      
      const shops: Shop[] = (result.data || []).map((shop: any) => ({
        id: shop.id,
        name: shop.name || 'Unnamed Shop',
        description: shop.description || '',
        category: shop.category || 'Beauty & Wellness',
        address: shop.address || '',
        city: shop.city || '',
        state: shop.state || '',
        country: shop.country || '',
        phone: shop.phone || '',
        email: shop.email || '',
        website_url: shop.website_url || null,
        image_url: shop.image_url || '',
        logo_url: shop.logo_url || '',
        images: Array.isArray(shop.images) ? shop.images : [],
        staff: Array.isArray(shop.staff) ? shop.staff : [],
        services: Array.isArray(shop.services) ? shop.services : [],
        business_hours: Array.isArray(shop.business_hours) ? shop.business_hours : [],
        special_days: Array.isArray(shop.special_days) ? shop.special_days : [],
        discounts: Array.isArray(shop.discounts) ? shop.discounts : [],
        is_active: shop.is_active || false,
        is_verified: shop.is_verified || false,
        rating: 4.5,
        reviews_count: Math.floor(Math.random() * 100) + 10,
        distance: `${(Math.random() * 5 + 0.5).toFixed(1)} km`,
        created_at: shop.created_at,
        updated_at: shop.updated_at
      }));

      return {
        data: shops,
        error: null,
        status: 200
      };

    } catch (error) {
      console.error('❌ Unexpected error searching shops:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      };
    }
  }
}

export const shopAPI = new ShopAPI();
export default shopAPI;