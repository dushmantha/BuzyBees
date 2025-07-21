// services/api.js

const BASE_URL = 'https://your-api-base-url.com/api'; // Replace with your actual API URL
const USE_MOCK_DATA = true; // Set to false when you have real API

// Mock data for development with proper placeholder images
const MOCK_DATA = {
  categories: [
    { 
      id: '1', 
      name: 'Hårklippning', 
      service_count: 45,
      color: '#FFE4E1',
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop',
      description: 'Professionell hårklippning och styling'
    },
    { 
      id: '2', 
      name: 'Massage', 
      service_count: 32,
      color: '#E6F3FF',
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&h=200&fit=crop',
      description: 'Avslappnande massage och terapi'
    },
    { 
      id: '3', 
      name: 'Naglar', 
      service_count: 28,
      color: '#F0E6FF',
      image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=200&fit=crop',
      description: 'Manikyr, pedikyr och nagelkonst'
    },
    { 
      id: '4', 
      name: 'Hudvård', 
      service_count: 38,
      color: '#E6FFE6',
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&h=200&fit=crop',
      description: 'Ansiktsbehandlingar och hudvård'
    },
  ],
  services: [
    {
      id: '1',
      name: 'Klassisk Massage',
      description: 'Avslappnande hel-kropps massage',
      professional_name: 'Anna Svensson',
      salon_name: 'Wellness Spa Center',
      price: 850,
      duration: 60,
      rating: 4.8,
      reviews_count: 124,
      location: 'Stockholm',
      distance: '2.1 km',
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop'
    },
    {
      id: '2',
      name: 'Herrklippning',
      description: 'Modern herrklippning med styling',
      professional_name: 'Erik Johansson',
      salon_name: 'Elite Hair Studio',
      price: 650,
      duration: 45,
      rating: 4.9,
      reviews_count: 89,
      location: 'Göteborg',
      distance: '1.5 km',
      image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop'
    },
    {
      id: '3',
      name: 'Ansiktsbehandling',
      description: 'Djuprengöring med mask',
      professional_name: 'Maria Larsson',
      salon_name: 'Beauty Center',
      price: 750,
      duration: 75,
      rating: 4.7,
      reviews_count: 156,
      location: 'Malmö',
      distance: '3.2 km',
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=300&fit=crop'
    },
    {
      id: '4',
      name: 'Gel Naglar',
      description: 'Professionell gel-manikyr',
      professional_name: 'Sophie Andersson',
      salon_name: 'Nail Art Studio',
      price: 450,
      duration: 90,
      rating: 4.6,
      reviews_count: 78,
      location: 'Stockholm',
      distance: '1.8 km',
      image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop'
    }
  ],
  promotions: [
    {
      id: '1',
      title: 'Första besök',
      description: 'Rabatt på din första behandling',
      discount_percentage: 25,
      code: 'FIRST25',
      expires_at: '2024-12-31',
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=200&fit=crop'
    }
  ]
};

// Helper function to simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to handle API requests
const apiRequest = async (endpoint, options = {}) => {
  try {
    // If using mock data, return mock responses
    if (USE_MOCK_DATA) {
      await delay(300); // Simulate network delay
      
      console.log('Mock API Request:', endpoint);
      
      // Parse endpoint to return appropriate mock data
      if (endpoint.includes('/search/categories') || endpoint.includes('/categories/search')) {
        const urlParams = endpoint.includes('?') ? endpoint.split('?')[1] : '';
        const query = new URLSearchParams(urlParams).get('q')?.toLowerCase() || '';
        
        const filteredCategories = MOCK_DATA.categories.filter(cat => 
          cat.name.toLowerCase().includes(query) ||
          (cat.description && cat.description.toLowerCase().includes(query))
        );
        
        return {
          data: { categories: filteredCategories },
          error: null,
          status: 200
        };
      }
      
      if (endpoint.includes('/services/search')) {
        const urlParams = endpoint.includes('?') ? endpoint.split('?')[1] : '';
        const query = new URLSearchParams(urlParams).get('q')?.toLowerCase() || '';
        
        const filteredServices = MOCK_DATA.services.filter(service => 
          service.name.toLowerCase().includes(query) ||
          service.professional_name.toLowerCase().includes(query) ||
          service.salon_name.toLowerCase().includes(query) ||
          service.description.toLowerCase().includes(query)
        );
        
        return {
          data: { services: filteredServices },
          error: null,
          status: 200
        };
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
      
      if (endpoint.includes('/home')) {
        return {
          data: {
            categories: MOCK_DATA.categories,
            promotions: MOCK_DATA.promotions,
            popularServices: MOCK_DATA.services,
            upcomingBookings: [],
            stats: {
              totalServices: 150,
              totalCategories: 12,
              totalProviders: 85,
              avgRating: 4.8
            }
          },
          error: null,
          status: 200
        };
      }
      
      // Default mock response
      return {
        data: [],
        error: null,
        status: 200
      };
    }

    // Real API implementation
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000,
      ...options,
    };

    console.log(`API Request: ${config.method || 'GET'} ${url}`);
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      data,
      error: null,
      status: response.status,
    };
    
  } catch (error) {
    console.error('API Request Error:', error);
    
    // Return mock data as fallback even when not in mock mode
    if (endpoint.includes('/home')) {
      console.log('Falling back to mock home data');
      return {
        data: {
          categories: MOCK_DATA.categories,
          promotions: MOCK_DATA.promotions,
          popularServices: MOCK_DATA.services,
          upcomingBookings: [],
          stats: {
            totalServices: 150,
            totalCategories: 12,
            totalProviders: 85,
            avgRating: 4.8
          }
        },
        error: null,
        status: 200
      };
    }
    
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
  searchAll: async (query, filters = {}) => {
    const params = new URLSearchParams({
      q: query,
      ...filters,
    });
    
    return apiRequest(`/search?${params}`);
  },

  // Search services specifically
  searchServices: async (query, options = {}) => {
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
  searchCategories: async (query) => {
    const params = new URLSearchParams({ q: query });
    return apiRequest(`/categories/search?${params}`);
  },

  // Search professionals/providers
  searchProfessionals: async (query, options = {}) => {
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
  getSearchSuggestions: async (query) => {
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
  getSearchHistory: async (userId) => {
    return apiRequest(`/users/${userId}/search-history`);
  },

  // Save search query to history
  saveSearchHistory: async (userId, query) => {
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
  getUpcomingBookings: async (userId) => {
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
  getServiceDetails: async (serviceId) => {
    return apiRequest(`/services/${serviceId}`);
  },

  // Get services by category
  getServicesByCategory: async (categoryId, options = {}) => {
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
  getNearbyServices: async (latitude, longitude, radius = 10) => {
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
  createBooking: async (bookingData) => {
    return apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Get user's bookings
  getUserBookings: async (userId, status = 'all') => {
    const params = status !== 'all' ? `?status=${status}` : '';
    return apiRequest(`/users/${userId}/bookings${params}`);
  },

  // Cancel booking
  cancelBooking: async (bookingId) => {
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
  searchLocations: async (query) => {
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