// Real API service using Supabase data
import { shopAPI, Shop } from '../shops/shopAPI';

// Helper function to simulate API delay for consistency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to handle API requests
const apiRequest = async (endpoint: string, options = {}) => {
  try {
    console.log('API Request:', endpoint);
    
    // Add realistic delay
    await delay(300);
    
    if (endpoint.includes('/home')) {
      // Fetch real shop data from Supabase
      try {
        const homeShopData = await shopAPI.getHomeShopData();
        
        if (!homeShopData.data) {
          throw new Error(homeShopData.error || 'Failed to fetch shops');
        }

        const shops = homeShopData.data.shops;
        
        // Transform shops to services format for backward compatibility
        const services = shops.map(shop => ({
          id: shop.id,
          name: shop.name,
          description: shop.description,
          professional_name: 'Shop Owner', // Default since we don't have individual staff yet
          salon_name: shop.name,
          price: 500, // Default price
          duration: 60, // Default duration
          rating: shop.rating || 4.5,
          reviews_count: shop.reviews_count || 0,
          location: `${shop.city}, ${shop.country}`,
          distance: shop.distance || '1.5 km',
          // Use first image from shop images array, or fallback to logo_url, or placeholder
          image: shop.images && shop.images.length > 0 
            ? shop.images[0] 
            : shop.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop'
        }));

        // Generate categories from shop data
        const categoryMap = new Map();
        shops.forEach(shop => {
          if (!categoryMap.has(shop.category)) {
            categoryMap.set(shop.category, {
              id: shop.category.toLowerCase().replace(/\s+/g, '-'),
              name: shop.category,
              service_count: 0,
              color: '#FFE4E1', // Default color
              image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop',
              description: `${shop.category} services`
            });
          }
          categoryMap.get(shop.category).service_count++;
        });

        const categories = Array.from(categoryMap.values());

        return {
          data: {
            categories: categories,
            promotions: [], // No promotions for now
            popularServices: services,
            upcomingBookings: [],
            stats: {
              totalServices: services.length,
              totalCategories: categories.length,
              totalProviders: shops.length,
              avgRating: homeShopData.data.stats.avgRating
            }
          },
          error: null,
          status: 200
        };
      } catch (error) {
        console.error('❌ Error fetching real shop data:', error);
        // Return empty data instead of mock data
        return {
          data: {
            categories: [],
            promotions: [],
            popularServices: [],
            upcomingBookings: [],
            stats: {
              totalServices: 0,
              totalCategories: 0,
              totalProviders: 0,
              avgRating: 0
            }
          },
          error: null,
          status: 200
        };
      }
    }

    if (endpoint.includes('/search/categories') || endpoint.includes('/categories/search')) {
      const urlParams = endpoint.includes('?') ? endpoint.split('?')[1] : '';
      const query = new URLSearchParams(urlParams).get('q')?.toLowerCase() || '';
      
      try {
        const homeShopData = await shopAPI.getHomeShopData();
        const categories = homeShopData.data?.categories || [];
        
        const filteredCategories = categories.filter(category => 
          category.toLowerCase().includes(query)
        ).map(category => ({
          id: category.toLowerCase().replace(/\s+/g, '-'),
          name: category,
          service_count: 1,
          color: '#FFE4E1',
          image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop',
          description: `${category} services`
        }));
        
        return {
          data: { categories: filteredCategories },
          error: null,
          status: 200
        };
      } catch (error) {
        console.error('❌ Error searching categories:', error);
        return {
          data: { categories: [] },
          error: null,
          status: 200
        };
      }
    }
    
    if (endpoint.includes('/services/search')) {
      const urlParams = endpoint.includes('?') ? endpoint.split('?')[1] : '';
      const query = new URLSearchParams(urlParams).get('q')?.toLowerCase() || '';
      
      try {
        const searchResults = await shopAPI.searchShops(query);
        
        if (!searchResults.data) {
          throw new Error(searchResults.error || 'Search failed');
        }
        
        const services = searchResults.data.map(shop => ({
          id: shop.id,
          name: shop.name,
          description: shop.description,
          professional_name: 'Shop Owner',
          salon_name: shop.name,
          price: 500,
          duration: 60,
          rating: shop.rating || 4.5,
          reviews_count: shop.reviews_count || 0,
          location: `${shop.city}, ${shop.country}`,
          distance: shop.distance || '1.5 km',
          image: shop.images && shop.images.length > 0 
            ? shop.images[0] 
            : shop.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop'
        }));
        
        return {
          data: { services: services },
          error: null,
          status: 200
        };
      } catch (error) {
        console.error('❌ Error searching services:', error);
        return {
          data: { services: [] },
          error: null,
          status: 200
        };
      }
    }
    
    if (endpoint.includes('/search/suggestions')) {
      const urlParams = endpoint.includes('?') ? endpoint.split('?')[1] : '';
      const query = new URLSearchParams(urlParams).get('q')?.toLowerCase() || '';
      
      const suggestions = [
        `${query} massage`,
        `${query} hårklippning`,
        `${query} naglar`,
        `${query} ansiktsbehandling`
      ].filter(suggestion => suggestion !== `${query} `);
      
      return {
        data: suggestions.slice(0, 5),
        error: null,
        status: 200
      };
    }
    
    // Default response for unhandled endpoints
    return {
      data: [],
      error: null,
      status: 200
    };
    
  } catch (error: any) {
    console.error('API Request Error:', error);
    
    return {
      data: null,
      error: error.message || 'Network request failed',
      status: error.status || 500,
    };
  }
};

// Search API Functions
export const searchAPI = {
  // General search across all content
  searchAll: async (query: string, filters = {}) => {
    const params = new URLSearchParams({
      q: query,
      ...filters,
    });
    
    return apiRequest(`/search?${params}`);
  },

  // Search services specifically
  searchServices: async (query: string, options = {}) => {
    const {
      category = '',
      location = '',
      minPrice = '',
      maxPrice = '',
      rating = '',
      sortBy = 'relevance', // relevance, price, rating, distance
      page = 1,
      limit = 20,
    } = options;

    const params = new URLSearchParams({
      q: query,
      ...(category && { category }),
      ...(location && { location }),
      ...(minPrice && { min_price: minPrice }),
      ...(maxPrice && { max_price: maxPrice }),
      ...(rating && { min_rating: rating }),
      sort_by: sortBy,
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiRequest(`/services/search?${params}`);
  },

  // Search categories
  searchCategories: async (query: string) => {
    const params = new URLSearchParams({ q: query });
    return apiRequest(`/categories/search?${params}`);
  },

  // Search professionals/providers
  searchProfessionals: async (query: string, options = {}) => {
    const {
      location = '',
      rating = '',
      page = 1,
      limit = 20,
    } = options;

    const params = new URLSearchParams({
      q: query,
      ...(location && { location }),
      ...(rating && { min_rating: rating }),
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiRequest(`/professionals/search?${params}`);
  },

  // Get search suggestions/autocomplete
  getSearchSuggestions: async (query: string) => {
    if (query.length < 2) {
      return { data: [], error: null };
    }
    
    const params = new URLSearchParams({ q: query });
    return apiRequest(`/search/suggestions?${params}`);
  },

  // Get popular/trending searches
  getPopularSearches: async () => {
    return apiRequest('/search/popular');
  },

  // Get recent search history (when user auth is ready)
  getSearchHistory: async (userId: string) => {
    return apiRequest(`/users/${userId}/search-history`);
  },

  // Save search query to history
  saveSearchHistory: async (userId: string, query: string) => {
    return apiRequest(`/users/${userId}/search-history`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },
};

// Home Data API Functions
export const homeAPI = {
  // Get all home screen data
  getHomeData: async (userId = null) => {
    const endpoint = userId ? `/home?user_id=${userId}` : '/home';
    return apiRequest(endpoint);
  },

  // Get categories
  getCategories: async () => {
    return apiRequest('/categories');
  },

  // Get promotions
  getPromotions: async () => {
    return apiRequest('/promotions/active');
  },

  // Get popular services
  getPopularServices: async (limit = 10) => {
    return apiRequest(`/services/popular?limit=${limit}`);
  },

  // Get user's upcoming bookings
  getUpcomingBookings: async (userId: string) => {
    return apiRequest(`/users/${userId}/bookings/upcoming`);
  },

  // Get platform stats
  getStats: async () => {
    return apiRequest('/stats');
  },
};

// Service API Functions
export const serviceAPI = {
  // Get service details
  getServiceDetails: async (serviceId: string) => {
    return apiRequest(`/services/${serviceId}`);
  },

  // Get services by category
  getServicesByCategory: async (categoryId: string, options = {}) => {
    const {
      location = '',
      sortBy = 'popular',
      page = 1,
      limit = 20,
    } = options;

    const params = new URLSearchParams({
      category_id: categoryId,
      ...(location && { location }),
      sort_by: sortBy,
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiRequest(`/services?${params}`);
  },

  // Get nearby services
  getNearbyServices: async (latitude: number, longitude: number, radius = 10) => {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      radius: radius.toString(),
    });

    return apiRequest(`/services/nearby?${params}`);
  },
};

// Booking API Functions
export const bookingAPI = {
  // Create a new booking
  createBooking: async (bookingData: any) => {
    return apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Get user's bookings
  getUserBookings: async (userId: string, status = 'all') => {
    const params = status !== 'all' ? `?status=${status}` : '';
    return apiRequest(`/users/${userId}/bookings${params}`);
  },

  // Cancel booking
  cancelBooking: async (bookingId: string) => {
    return apiRequest(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
    });
  },
};

// Location API Functions
export const locationAPI = {
  // Get available locations/cities
  getLocations: async () => {
    return apiRequest('/locations');
  },

  // Search locations
  searchLocations: async (query: string) => {
    const params = new URLSearchParams({ q: query });
    return apiRequest(`/locations/search?${params}`);
  },
};

// Main API object (keeping backward compatibility)
const providerHomeAPI = {
  // Home data
  getHomeData: homeAPI.getHomeData,
  
  // Search functions
  searchAll: searchAPI.searchAll,
  searchServices: searchAPI.searchServices,
  searchCategories: searchAPI.searchCategories,
  searchProfessionals: searchAPI.searchProfessionals,
  getSearchSuggestions: searchAPI.getSearchSuggestions,
  getPopularSearches: searchAPI.getPopularSearches,
  
  // Services
  getServiceDetails: serviceAPI.getServiceDetails,
  getServicesByCategory: serviceAPI.getServicesByCategory,
  getNearbyServices: serviceAPI.getNearbyServices,
  
  // Bookings
  createBooking: bookingAPI.createBooking,
  getUserBookings: bookingAPI.getUserBookings,
  cancelBooking: bookingAPI.cancelBooking,
  
  // Categories
  getCategories: homeAPI.getCategories,
  
  // Locations
  getLocations: locationAPI.getLocations,
  searchLocations: locationAPI.searchLocations,
};

export default providerHomeAPI;