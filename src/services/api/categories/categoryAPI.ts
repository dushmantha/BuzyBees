import { supabaseService } from '../../../lib/supabase/index';
import { shouldUseMockData, mockDelay, logMockUsage } from '../../../config/devConfig';
import { getMockCategories } from '../../../data/mockData';

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
  service_count: number;
  is_active: boolean;
  sort_order: number;
}

export interface CategoryApiResponse {
  data: Category[] | null;
  error: string | null;
  status: number;
}

class CategoryAPI {
  private supabase = supabaseService;

  // Predefined categories with images and colors - always shown
  private getDefaultCategories(): Category[] {
    return [
      {
        id: 'hair-salon',
        name: 'Hair Salon',
        description: 'Haircuts, styling, coloring, and treatments',
        image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=300&h=200&fit=crop',
        color: '#FFE0EC',
        service_count: 0,
        is_active: true,
        sort_order: 1
      },
      {
        id: 'spa-massage',
        name: 'Spa & Massage',
        description: 'Relaxation massages, hot stone therapy, aromatherapy',
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300&h=200&fit=crop',
        color: '#F3E5F5',
        service_count: 0,
        is_active: true,
        sort_order: 2
      },
      {
        id: 'nails-manicure',
        name: 'Nails & Manicure',
        description: 'Manicure, pedicure, nail art, gel polish',
        image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=200&fit=crop',
        color: '#FFE8CC',
        service_count: 0,
        is_active: true,
        sort_order: 3
      },
      {
        id: 'facial-skincare',
        name: 'Facial & Skincare',
        description: 'Deep cleansing, anti-aging treatments, facials',
        image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=300&h=200&fit=crop',
        color: '#E8F5E8',
        service_count: 0,
        is_active: true,
        sort_order: 4
      },
      {
        id: 'fitness-gym',
        name: 'Fitness & Gym',
        description: 'Personal training, group classes, CrossFit',
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=200&fit=crop',
        color: '#FFE5E5',
        service_count: 0,
        is_active: true,
        sort_order: 5
      },
      {
        id: 'yoga-pilates',
        name: 'Yoga & Pilates',
        description: 'Yoga classes, meditation, Pilates sessions',
        image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=300&h=200&fit=crop',
        color: '#E0F7FA',
        service_count: 0,
        is_active: true,
        sort_order: 6
      },
      {
        id: 'barbershop',
        name: 'Barbershop',
        description: 'Men\'s haircuts, beard trimming, hot shaves',
        image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=300&h=200&fit=crop',
        color: '#F5F5E9',
        service_count: 0,
        is_active: true,
        sort_order: 7
      },
      {
        id: 'makeup-lashes',
        name: 'Makeup & Lashes',
        description: 'Professional makeup, lash extensions, eyebrow shaping',
        image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=300&h=200&fit=crop',
        color: '#F8E6FF',
        service_count: 0,
        is_active: true,
        sort_order: 8
      }
    ];
  }

  async getAllCategories(): Promise<CategoryApiResponse> {
    try {
      console.log('📋 Fetching all categories...');
      
      // Check if we should use mock data
      if (shouldUseMockData('MOCK_CATEGORIES')) {
        logMockUsage('Categories API');
        await mockDelay();
        
        const mockCategories = getMockCategories();
        console.log('🎭 Using mock categories:', mockCategories.length);
        
        return {
          data: mockCategories,
          error: null,
          status: 200
        };
      }
      
      // Get default categories (always shown)
      const defaultCategories = this.getDefaultCategories();
      
      // Try to get business categories from database to update service counts
      try {
        const result = await this.supabase.client
          .from('provider_businesses')
          .select('category')
          .eq('is_active', true);

        if (result.data && !result.error) {
          // Count businesses per category
          const categoryCounts: { [key: string]: number } = {};
          result.data.forEach((business: any) => {
            const category = business.category;
            if (category) {
              // Map database categories to our predefined category IDs
              const categoryId = this.mapCategoryNameToId(category);
              categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
            }
          });

          // Update service counts in default categories
          defaultCategories.forEach(category => {
            category.service_count = categoryCounts[category.id] || 0;
          });

          console.log('✅ Successfully updated category counts from database:', categoryCounts);
        } else {
          console.warn('⚠️ Could not fetch business categories from database, using defaults');
        }
      } catch (dbError) {
        console.warn('⚠️ Database unavailable, using default categories:', dbError);
      }

      // Sort by sort_order
      const sortedCategories = defaultCategories.sort((a, b) => a.sort_order - b.sort_order);

      return {
        data: sortedCategories,
        error: null,
        status: 200
      };

    } catch (error) {
      console.error('❌ Unexpected error fetching categories:', error);
      return {
        data: this.getDefaultCategories(), // Always return default categories as fallback
        error: null, // Don't show error to user, just use defaults
        status: 200
      };
    }
  }

  async getCategoriesWithServices(): Promise<CategoryApiResponse> {
    const allCategories = await this.getAllCategories();
    
    if (!allCategories.data) {
      return allCategories;
    }

    // Filter to only show categories that have services
    const categoriesWithServices = allCategories.data.filter(category => category.service_count > 0);

    return {
      data: categoriesWithServices,
      error: allCategories.error,
      status: allCategories.status
    };
  }

  async getCategoryById(categoryId: string): Promise<{ data: Category | null; error: string | null; status: number }> {
    const allCategories = await this.getAllCategories();
    
    if (!allCategories.data) {
      return {
        data: null,
        error: allCategories.error,
        status: allCategories.status
      };
    }

    const category = allCategories.data.find(cat => cat.id === categoryId);

    return {
      data: category || null,
      error: category ? null : 'Category not found',
      status: category ? 200 : 404
    };
  }

  private mapCategoryNameToId(categoryName: string): string {
    const mappings: { [key: string]: string } = {
      'Hair Salon': 'hair-salon',
      'Spa & Massage': 'spa-massage',
      'Nails & Manicure': 'nails-manicure',
      'Facial & Skincare': 'facial-skincare',
      'Fitness & Gym': 'fitness-gym',
      'Yoga & Pilates': 'yoga-pilates',
      'Barbershop': 'barbershop',
      'Makeup & Lashes': 'makeup-lashes',
      // Legacy mappings for compatibility
      'Beauty & Wellness': 'hair-salon',
      'Spa & Wellness': 'spa-massage',
      'Nail Care': 'nails-manicure',
      'Massage Therapy': 'spa-massage',
      'Skincare': 'facial-skincare',
      'Fitness & Health': 'fitness-gym'
    };

    return mappings[categoryName] || 'hair-salon';
  }

  async searchCategories(query: string): Promise<CategoryApiResponse> {
    const allCategories = await this.getAllCategories();
    
    if (!allCategories.data) {
      return allCategories;
    }

    const filteredCategories = allCategories.data.filter(category =>
      category.name.toLowerCase().includes(query.toLowerCase()) ||
      category.description.toLowerCase().includes(query.toLowerCase())
    );

    return {
      data: filteredCategories,
      error: null,
      status: 200
    };
  }
}

export const categoryAPI = new CategoryAPI();
export default categoryAPI;
export type { Category };