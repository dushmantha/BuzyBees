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
        id: 'beauty-wellness',
        name: 'Beauty & Wellness',
        description: 'Beauty and wellness services including hair, skincare, and spa treatments',
        image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop',
        color: '#F5F5E9',
        service_count: 0,
        is_active: true,
        sort_order: 1
      },
      {
        id: 'hair-salon',
        name: 'Hair Salon',
        description: 'Professional hair cutting, styling, and treatment services',
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=200&fit=crop',
        color: '#E1F5FE',
        service_count: 0,
        is_active: true,
        sort_order: 2
      },
      {
        id: 'spa-wellness',
        name: 'Spa & Wellness',
        description: 'Relaxing spa treatments and wellness services',
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&h=200&fit=crop',
        color: '#F3E5F5',
        service_count: 0,
        is_active: true,
        sort_order: 3
      },
      {
        id: 'nail-care',
        name: 'Nail Care',
        description: 'Manicure, pedicure, and nail art services',
        image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=200&fit=crop',
        color: '#E8F5E8',
        service_count: 0,
        is_active: true,
        sort_order: 4
      },
      {
        id: 'massage-therapy',
        name: 'Massage Therapy',
        description: 'Therapeutic massage and bodywork treatments',
        image: 'https://images.unsplash.com/photo-1559268950-2d7ceb2efa80?w=300&h=200&fit=crop',
        color: '#FFF3E0',
        service_count: 0,
        is_active: true,
        sort_order: 5
      },
      {
        id: 'skincare',
        name: 'Skincare',
        description: 'Facial treatments and skincare services',
        image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=300&h=200&fit=crop',
        color: '#E0F2F1',
        service_count: 0,
        is_active: true,
        sort_order: 6
      },
      {
        id: 'fitness-health',
        name: 'Fitness & Health',
        description: 'Personal training, fitness classes, and health services',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop',
        color: '#FCE4EC',
        service_count: 0,
        is_active: true,
        sort_order: 7
      },
      {
        id: 'home-services',
        name: 'Home Services',
        description: 'Home maintenance, repair, and improvement services',
        image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop',
        color: '#F1F8E9',
        service_count: 0,
        is_active: true,
        sort_order: 8
      },
      {
        id: 'auto-services',
        name: 'Auto Services',
        description: 'Car maintenance, repair, and detailing services',
        image: 'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=300&h=200&fit=crop',
        color: '#EFEBE9',
        service_count: 0,
        is_active: true,
        sort_order: 9
      },
      {
        id: 'pet-care',
        name: 'Pet Care',
        description: 'Pet grooming, veterinary, and care services',
        image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=300&h=200&fit=crop',
        color: '#E8EAF6',
        service_count: 0,
        is_active: true,
        sort_order: 10
      },
      {
        id: 'food-dining',
        name: 'Food & Dining',
        description: 'Restaurant, catering, and food delivery services',
        image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop',
        color: '#FFF8E1',
        service_count: 0,
        is_active: true,
        sort_order: 11
      },
      {
        id: 'education',
        name: 'Education',
        description: 'Tutoring, courses, and educational services',
        image: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=300&h=200&fit=crop',
        color: '#E1F5FE',
        service_count: 0,
        is_active: true,
        sort_order: 12
      },
      {
        id: 'cleaning',
        name: 'Cleaning',
        description: 'Professional cleaning services for homes and offices',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&h=200&fit=crop',
        color: '#F3E5F5',
        service_count: 0,
        is_active: true,
        sort_order: 13
      },
      {
        id: 'other',
        name: 'Other',
        description: 'Other professional services not listed above',
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop',
        color: '#FAFAFA',
        service_count: 0,
        is_active: true,
        sort_order: 14
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
      'Beauty & Wellness': 'beauty-wellness',
      'Hair Salon': 'hair-salon',
      'Spa & Wellness': 'spa-wellness',
      'Nail Care': 'nail-care',
      'Massage Therapy': 'massage-therapy',
      'Skincare': 'skincare',
      'Fitness & Health': 'fitness-health',
      'Home Services': 'home-services',
      'Auto Services': 'auto-services',
      'Automotive': 'auto-services', // Alternative name
      'Pet Care': 'pet-care',
      'Pet Services': 'pet-care', // Alternative name
      'Food & Dining': 'food-dining',
      'Education': 'education',
      'Cleaning': 'cleaning',
      'Other': 'other'
    };

    return mappings[categoryName] || 'other';
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