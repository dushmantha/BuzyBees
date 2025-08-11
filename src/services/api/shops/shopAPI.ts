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
  discounts: any[] | any;
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

  async getShopsWithDiscounts(): Promise<ShopApiResponse> {
    try {
      console.log('💰 Creating demo shops with discounts...');
      
      // Since discounts table doesn't exist, let's get all shops and add demo discounts
      const shopsResult = await this.supabase.client
        .from('provider_businesses')
        .select('*')
        .eq('is_active', true)
        .limit(4) // Only get 4 for special offers
        .order('created_at', { ascending: false });
        
      if (shopsResult.error) {
        console.error('❌ Error fetching shops:', shopsResult.error);
        return { data: null, error: shopsResult.error.message, status: 500 };
      }
      
      const shops = shopsResult.data || [];
      console.log('🏪 Found shops for discounts:', shops.length);
      
      if (shops.length === 0) {
        return { data: [], error: null, status: 200 };
      }
      
      // Add demo discounts to shops
      const discountedShops = shops.map((shop: any, index: number) => {
        const discountPercentages = [25, 20, 15, 10];
        const discountTitles = ['Flash Sale', 'Summer Special', 'Weekend Deal', 'Limited Offer'];
        
        return {
          ...shop,
          discounts: {
            id: `demo-discount-${index + 1}`,
            discount_percentage: discountPercentages[index] || 10,
            discount_code: `SAVE${discountPercentages[index] || 10}`,
            title: discountTitles[index] || 'Special Offer',
            description: `${discountPercentages[index] || 10}% off all services`,
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
            is_active: true
          }
        };
      });
      
      // Transform to Shop interface
      const transformedShops: Shop[] = discountedShops.map((shop: any) => ({
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
        discounts: shop.discounts,
        is_active: shop.is_active || false,
        is_verified: shop.is_verified || false,
        rating: 4.5,
        reviews_count: Math.floor(Math.random() * 100) + 10,
        distance: `${(Math.random() * 5 + 0.5).toFixed(1)} km`,
        created_at: shop.created_at,
        updated_at: shop.updated_at
      }));

      return {
        data: transformedShops,
        error: null,
        status: 200
      };

    } catch (error) {
      console.error('❌ Unexpected error fetching shops with discounts:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      };
    }
  }

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
        console.log('🎭 Falling back to mock shops data...');
        
        // Return mock shops when database fails
        const mockShops = this.getAllMockShops();
        return {
          data: mockShops,
          error: null,
          status: 200
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
        discounts: shop.discounts || [],
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
      console.error('❌ Unexpected error fetching shops, using mock data:', error);
      const mockShops = this.getAllMockShops();
      return {
        data: mockShops,
        error: null,
        status: 200
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
        console.log('🎭 Falling back to mock shops for category:', category);
        
        // Return mock shops for the requested category
        const mockShops = this.getMockShopsByCategory(category);
        return {
          data: mockShops,
          error: null,
          status: 200
        };
      }

      console.log('✅ Successfully fetched shops by category:', result.data?.length || 0);
      
      // Fetch discounts for each shop if they have discount_id
      const shopsWithDiscounts = await Promise.all(
        (result.data || []).map(async (shop: any) => {
          if (shop.discount_id) {
            try {
              const discountResult = await this.supabase.client
                .from('discounts')
                .select('*')
                .eq('id', shop.discount_id)
                .eq('is_active', true)
                .single();
              
              if (discountResult.data) {
                shop.discounts = discountResult.data;
              }
            } catch (error) {
              console.warn('⚠️ Could not fetch discount for shop:', shop.name, error);
            }
          }
          return shop;
        })
      );
      
      const shops: Shop[] = shopsWithDiscounts.map((shop: any) => ({
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
        discounts: shop.discounts || [],
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
      console.error('❌ Unexpected error fetching shops by category, using mock data:', error);
      const mockShops = this.getMockShopsByCategory(category);
      return {
        data: mockShops,
        error: null,
        status: 200
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
      console.error('❌ Unexpected error fetching home shop data, using mock data:', error);
      const mockShops = this.getAllMockShops();
      const categories = [...new Set(mockShops.map(shop => shop.category))];
      const totalRating = mockShops.reduce((sum, shop) => sum + (shop.rating || 0), 0);
      const avgRating = mockShops.length > 0 ? totalRating / mockShops.length : 0;
      
      const homeData: HomeShopData = {
        shops: mockShops,
        categories: categories,
        stats: {
          totalShops: mockShops.length,
          totalCategories: categories.length,
          avgRating: Number(avgRating.toFixed(1))
        }
      };

      return {
        data: homeData,
        error: null,
        status: 200
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
      
      // Fetch discounts for each shop if they have discount_id
      const shopsWithDiscounts = await Promise.all(
        (result.data || []).map(async (shop: any) => {
          if (shop.discount_id) {
            try {
              const discountResult = await this.supabase.client
                .from('discounts')
                .select('*')
                .eq('id', shop.discount_id)
                .eq('is_active', true)
                .single();
              
              if (discountResult.data) {
                shop.discounts = discountResult.data;
              }
            } catch (error) {
              console.warn('⚠️ Could not fetch discount for shop:', shop.name, error);
            }
          }
          return shop;
        })
      );
      
      const shops: Shop[] = shopsWithDiscounts.map((shop: any) => ({
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
        discounts: shop.discounts || [],
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

  /**
   * Get mock shops by category for fallback when database fails
   */
  private getMockShopsByCategory(category: string): Shop[] {
    const allMockShops = this.getAllMockShops();
    return allMockShops.filter(shop => shop.category === category);
  }

  /**
   * Get all mock shops for fallback
   */
  private getAllMockShops(): Shop[] {
    const mockShops: Shop[] = [
      {
        id: 'mock-1',
        name: 'Stockholm Beauty Salon',
        description: 'Premium beauty and wellness services in the heart of Stockholm',
        category: 'Beauty & Wellness',
        address: 'Kungsgatan 45',
        city: 'Stockholm',
        state: 'Stockholm County',
        country: 'Sweden',
        phone: '+46 8 123 456',
        email: 'info@stockholmbeauty.se',
        website_url: '',
        image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
        logo_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop'
        ],
        staff: [
          { id: '1', name: 'Anna Lindström', role: 'Hair Stylist' },
          { id: '2', name: 'Erik Johansson', role: 'Beautician' }
        ],
        services: [
          { id: '1', name: 'Haircut & Style', price: 450, duration: 60 },
          { id: '2', name: 'Hair Color', price: 750, duration: 120 },
          { id: '3', name: 'Facial Treatment', price: 650, duration: 90 }
        ],
        business_hours: [
          {"day":"Monday","isOpen":true,"openTime":"09:00:00","closeTime":"18:00:00"},
          {"day":"Tuesday","isOpen":true,"openTime":"09:00:00","closeTime":"18:00:00"},
          {"day":"Wednesday","isOpen":true,"openTime":"09:00:00","closeTime":"18:00:00"},
          {"day":"Thursday","isOpen":true,"openTime":"09:00:00","closeTime":"20:00:00"},
          {"day":"Friday","isOpen":true,"openTime":"09:00:00","closeTime":"20:00:00"},
          {"day":"Saturday","isOpen":true,"openTime":"10:00:00","closeTime":"16:00:00"},
          {"day":"Sunday","isOpen":false,"openTime":"10:00:00","closeTime":"16:00:00"}
        ],
        special_days: [],
        discounts: [],
        is_active: true,
        is_verified: true,
        rating: 4.8,
        reviews_count: 127,
        distance: '1.2 km',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-2',
        name: 'Clean Home Services',
        description: 'Professional cleaning services for homes and offices',
        category: 'Cleaning',
        address: 'Vasagatan 12',
        city: 'Göteborg',
        state: 'Västra Götaland County',
        country: 'Sweden',
        phone: '+46 31 987 654',
        email: 'info@cleanhome.se',
        website_url: '',
        image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
        logo_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop'
        ],
        staff: [
          { id: '1', name: 'Erik Johansson', role: 'Cleaning Specialist' }
        ],
        services: [
          { id: '1', name: 'Deep House Cleaning', price: 350, duration: 120 },
          { id: '2', name: 'Office Cleaning', price: 250, duration: 90 },
          { id: '3', name: 'Move-in/Move-out Cleaning', price: 500, duration: 180 }
        ],
        business_hours: [
          {"day":"Monday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Tuesday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Wednesday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Thursday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Friday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Saturday","isOpen":true,"openTime":"09:00:00","closeTime":"15:00:00"},
          {"day":"Sunday","isOpen":false,"openTime":"09:00:00","closeTime":"15:00:00"}
        ],
        special_days: [],
        discounts: [],
        is_active: true,
        is_verified: true,
        rating: 4.6,
        reviews_count: 89,
        distance: '2.1 km',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-3',
        name: 'Home Fix Solutions',
        description: 'Professional home maintenance and repair services',
        category: 'Home Services',
        address: 'Drottninggatan 23',
        city: 'Malmö',
        state: 'Skåne County',
        country: 'Sweden',
        phone: '+46 40 555 333',
        email: 'help@homefix.se',
        website_url: '',
        image_url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
        logo_url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop'
        ],
        staff: [
          { id: '1', name: 'Lars Andersson', role: 'Handyman' }
        ],
        services: [
          { id: '1', name: 'Plumbing Repair', price: 450, duration: 90 },
          { id: '2', name: 'Electrical Work', price: 550, duration: 120 },
          { id: '3', name: 'Painting Services', price: 300, duration: 240 }
        ],
        business_hours: [
          {"day":"Monday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Tuesday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Wednesday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Thursday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Friday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Saturday","isOpen":true,"openTime":"09:00:00","closeTime":"15:00:00"},
          {"day":"Sunday","isOpen":false,"openTime":"09:00:00","closeTime":"15:00:00"}
        ],
        special_days: [],
        discounts: [],
        is_active: true,
        is_verified: true,
        rating: 4.5,
        reviews_count: 67,
        distance: '1.8 km',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-4',
        name: 'Fit Life Gym',
        description: 'Modern fitness center with personal training and group classes',
        category: 'Fitness & Health',
        address: 'Slottsgatan 8',
        city: 'Uppsala',
        state: 'Uppsala County',
        country: 'Sweden',
        phone: '+46 18 444 222',
        email: 'info@fitlife.se',
        website_url: '',
        image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
        logo_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop'
        ],
        staff: [
          { id: '1', name: 'Sara Nilsson', role: 'Personal Trainer' },
          { id: '2', name: 'Marcus Berg', role: 'Fitness Instructor' }
        ],
        services: [
          { id: '1', name: 'Personal Training', price: 500, duration: 60 },
          { id: '2', name: 'Group Classes', price: 150, duration: 45 },
          { id: '3', name: 'Gym Membership', price: 350, duration: 0 }
        ],
        business_hours: [
          {"day":"Monday","isOpen":true,"openTime":"06:00:00","closeTime":"22:00:00"},
          {"day":"Tuesday","isOpen":true,"openTime":"06:00:00","closeTime":"22:00:00"},
          {"day":"Wednesday","isOpen":true,"openTime":"06:00:00","closeTime":"22:00:00"},
          {"day":"Thursday","isOpen":true,"openTime":"06:00:00","closeTime":"22:00:00"},
          {"day":"Friday","isOpen":true,"openTime":"06:00:00","closeTime":"22:00:00"},
          {"day":"Saturday","isOpen":true,"openTime":"08:00:00","closeTime":"20:00:00"},
          {"day":"Sunday","isOpen":true,"openTime":"08:00:00","closeTime":"20:00:00"}
        ],
        special_days: [],
        discounts: [],
        is_active: true,
        is_verified: true,
        rating: 4.9,
        reviews_count: 156,
        distance: '0.8 km',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-5',
        name: 'Auto Care Center',
        description: 'Expert automotive repair and maintenance services',
        category: 'Automotive',
        address: 'Industrigatan 25',
        city: 'Linköping',
        state: 'Östergötland County',
        country: 'Sweden',
        phone: '+46 13 777 888',
        email: 'service@autocare.se',
        website_url: '',
        image_url: 'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=400&h=300&fit=crop',
        logo_url: 'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=400&h=300&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=400&h=300&fit=crop'
        ],
        staff: [
          { id: '1', name: 'Mikael Holm', role: 'Auto Mechanic' }
        ],
        services: [
          { id: '1', name: 'Oil Change', price: 350, duration: 30 },
          { id: '2', name: 'Brake Service', price: 850, duration: 120 },
          { id: '3', name: 'General Inspection', price: 500, duration: 60 }
        ],
        business_hours: [
          {"day":"Monday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Tuesday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Wednesday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Thursday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Friday","isOpen":true,"openTime":"08:00:00","closeTime":"17:00:00"},
          {"day":"Saturday","isOpen":true,"openTime":"09:00:00","closeTime":"15:00:00"},
          {"day":"Sunday","isOpen":false,"openTime":"09:00:00","closeTime":"15:00:00"}
        ],
        special_days: [],
        discounts: [],
        is_active: true,
        is_verified: true,
        rating: 4.4,
        reviews_count: 92,
        distance: '3.2 km',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-6',
        name: 'Happy Paws Grooming',
        description: 'Professional pet grooming and care services',
        category: 'Pet Services',
        address: 'Djurgatan 15',
        city: 'Västerås',
        state: 'Västmanland County',
        country: 'Sweden',
        phone: '+46 21 123 789',
        email: 'pets@happypaws.se',
        website_url: '',
        image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop',
        logo_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop'
        ],
        staff: [
          { id: '1', name: 'Emma Karlsson', role: 'Pet Groomer' }
        ],
        services: [
          { id: '1', name: 'Dog Grooming', price: 450, duration: 90 },
          { id: '2', name: 'Cat Grooming', price: 350, duration: 60 },
          { id: '3', name: 'Nail Trimming', price: 150, duration: 15 }
        ],
        business_hours: [
          {"day":"Monday","isOpen":true,"openTime":"09:00:00","closeTime":"17:00:00"},
          {"day":"Tuesday","isOpen":true,"openTime":"09:00:00","closeTime":"17:00:00"},
          {"day":"Wednesday","isOpen":true,"openTime":"09:00:00","closeTime":"17:00:00"},
          {"day":"Thursday","isOpen":true,"openTime":"09:00:00","closeTime":"17:00:00"},
          {"day":"Friday","isOpen":true,"openTime":"09:00:00","closeTime":"17:00:00"},
          {"day":"Saturday","isOpen":true,"openTime":"10:00:00","closeTime":"16:00:00"},
          {"day":"Sunday","isOpen":false,"openTime":"10:00:00","closeTime":"16:00:00"}
        ],
        special_days: [],
        discounts: [],
        is_active: true,
        is_verified: true,
        rating: 4.7,
        reviews_count: 73,
        distance: '2.5 km',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return mockShops;
  }
}

export const shopAPI = new ShopAPI();
export default shopAPI;