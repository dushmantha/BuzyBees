// src/services/api/mock/index.ts

import {
  mockUsers,
  mockServices,
  mockCategories,
  mockBookings,
  mockFavorites,
  mockReviews,
  mockPromotions,
  mockServiceOptions,
  mockServiceAvailability, // Add this import
} from './data';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


const mockService = {
  // Users
  async getUsers() {
    await delay(500);
    return { 
      data: mockUsers, 
      error: null,
      meta: { total: mockUsers.length, page: 1, per_page: 20 }
    };
  },

  async getUserById(id: string) {
    await delay(300);
    const user = mockUsers.find(u => u.id === id) || null;
    return { 
      data: user, 
      error: user ? null : 'User not found',
      meta: null
    };
  },

  // Categories
  async getCategories() {
    await delay(400);
    return { 
      data: mockCategories, 
      error: null,
      meta: {
        total: mockCategories.length,
        page: 1,
        per_page: 20,
        total_pages: 1
      }
    };
  },

  async getCategoryById(id: string) {
    await delay(300);
    const category = mockCategories.find(c => c.id === id) || null;
    return {
      data: category,
      error: category ? null : 'Category not found',
      meta: null
    };
  },

  // Services
  async getServices(params?: {
    category_id?: string;
    location?: string;
    price_min?: number;
    price_max?: number;
    rating_min?: number;
    sort_by?: 'price' | 'rating' | 'distance' | 'popularity';
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
  }) {
    await delay(400);
    
    let filteredServices = [...mockServices];
    
    // Apply filters
    if (params?.category_id) {
      filteredServices = filteredServices.filter(s => s.category_id === params.category_id);
    }
    
    if (params?.price_min !== undefined) {
      filteredServices = filteredServices.filter(s => s.price >= params.price_min!);
    }
    
    if (params?.price_max !== undefined) {
      filteredServices = filteredServices.filter(s => s.price <= params.price_max!);
    }
    
    if (params?.rating_min !== undefined) {
      filteredServices = filteredServices.filter(s => s.rating >= params.rating_min!);
    }
    
    // Apply sorting
    if (params?.sort_by) {
      const sortOrder = params.sort_order || 'desc';
      filteredServices.sort((a, b) => {
        let aValue, bValue;
        
        switch (params.sort_by) {
          case 'price':
            aValue = a.price;
            bValue = b.price;
            break;
          case 'rating':
            aValue = a.rating;
            bValue = b.rating;
            break;
          case 'distance':
            aValue = parseFloat(a.distance.replace(' km', ''));
            bValue = parseFloat(b.distance.replace(' km', ''));
            break;
          case 'popularity':
            aValue = a.reviews_count;
            bValue = b.reviews_count;
            break;
          default:
            return 0;
        }
        
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }
    
    // Apply pagination
    const page = params?.page || 1;
    const perPage = params?.per_page || 20;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedServices = filteredServices.slice(startIndex, endIndex);
    
    return { 
      data: paginatedServices, 
      error: null,
      meta: {
        total: filteredServices.length,
        page,
        per_page: perPage,
        total_pages: Math.ceil(filteredServices.length / perPage),
        has_more: endIndex < filteredServices.length
      }
    };
  },

  async getServiceById(id: string) {
    await delay(300);
    const service = mockServices.find(s => s.id === id) || null;
    return { 
      data: service, 
      error: service ? null : 'Service not found',
      meta: null
    };
  },

  // Service Options API methods
  async getServiceOptions(serviceId: string) {
    await delay(400);
    const options = mockServiceOptions.filter(option => option.service_id === serviceId);
    
    if (options.length === 0) {
      return {
        data: [],
        error: null,
        meta: {
          total: 0,
          service_id: serviceId,
          message: 'No options available for this service'
        }
      };
    }
    
    return {
      data: options,
      error: null,
      meta: {
        total: options.length,
        service_id: serviceId,
        page: 1,
        per_page: 20,
        total_pages: 1
      }
    };
  },

  async getServiceOptionById(optionId: string) {
    await delay(300);
    const option = mockServiceOptions.find(opt => opt.id === optionId) || null;
    return {
      data: option,
      error: option ? null : 'Service option not found',
      meta: null
    };
  },

  async getServiceWithOptions(serviceId: string) {
    await delay(500);
    const service = mockServices.find(s => s.id === serviceId);
    
    if (!service) {
      return {
        data: null,
        error: 'Service not found',
        meta: null
      };
    }

    const options = mockServiceOptions.filter(option => option.service_id === serviceId);
    
    return {
      data: {
        ...service,
        options: options
      },
      error: null,
      meta: {
        service_id: serviceId,
        options_count: options.length
      }
    };
  },

  // NEW: Service Availability API methods
  async getAvailableDates(serviceId: string) {
    await delay(400);
    const serviceAvailability = mockServiceAvailability[serviceId];
    
    if (!serviceAvailability) {
      return {
        data: {
          service_id: serviceId,
          available_dates: []
        },
        error: 'No availability data found for this service',
        meta: null
      };
    }
    
    return {
      data: {
        service_id: serviceId,
        available_dates: serviceAvailability.available_dates,
        business_hours: serviceAvailability.business_hours
      },
      error: null,
      meta: {
        total_dates: serviceAvailability.available_dates.length,
        service_id: serviceId
      }
    };
  },

  async getServiceAvailability(serviceId: string, date: string) {
    await delay(400);
    const serviceAvailability = mockServiceAvailability[serviceId];
    
    if (!serviceAvailability) {
      return {
        data: null,
        error: 'Service availability not found',
        meta: null
      };
    }

    if (!serviceAvailability.available_dates.includes(date)) {
      return {
        data: null,
        error: 'Service not available on this date',
        meta: { date, service_id: serviceId }
      };
    }

    const bookedSlots = serviceAvailability.booked_slots[date] || [];
    
    return {
      data: {
        service_id: serviceId,
        date,
        business_hours: serviceAvailability.business_hours,
        booked_slots: bookedSlots,
        is_available: true
      },
      error: null,
      meta: {
        service_id: serviceId,
        date,
        total_booked_slots: bookedSlots.length
      }
    };
  },

  async checkServiceAvailability(serviceId: string, date: string, time: string) {
    await delay(400);
    const serviceAvailability = mockServiceAvailability[serviceId];
    
    if (!serviceAvailability) {
      return {
        data: {
          service_id: serviceId,
          date,
          time,
          is_available: false,
          alternative_times: []
        },
        error: 'Service not found',
        meta: null
      };
    }

    if (!serviceAvailability.available_dates.includes(date)) {
      return {
        data: {
          service_id: serviceId,
          date,
          time,
          is_available: false,
          alternative_times: []
        },
        error: 'Service not available on this date',
        meta: null
      };
    }

    const bookedSlots = serviceAvailability.booked_slots[date] || [];
    
    // Convert time to minutes for comparison
    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const requestedTimeMinutes = timeToMinutes(time);
    const serviceDuration = 60; // Default service duration in minutes
    const requestedEndTime = requestedTimeMinutes + serviceDuration;

    // Check if requested time conflicts with any booked slots
    const isAvailable = !bookedSlots.some(slot => {
      const slotStart = timeToMinutes(slot.start);
      const slotEnd = timeToMinutes(slot.end);
      return (requestedTimeMinutes < slotEnd && requestedEndTime > slotStart);
    });

    // Generate alternative times if not available
    let alternativeTimes = [];
    if (!isAvailable) {
      alternativeTimes = ['10:00', '14:00', '16:00'].filter(altTime => {
        const altTimeMinutes = timeToMinutes(altTime);
        const altEndTime = altTimeMinutes + serviceDuration;
        return !bookedSlots.some(slot => {
          const slotStart = timeToMinutes(slot.start);
          const slotEnd = timeToMinutes(slot.end);
          return (altTimeMinutes < slotEnd && altEndTime > slotStart);
        });
      });
    }
    
    return {
      data: {
        service_id: serviceId,
        date,
        time,
        is_available: isAvailable,
        alternative_times: alternativeTimes
      },
      error: null,
      meta: {
        service_id: serviceId,
        date,
        requested_time: time
      }
    };
  },

  // ... rest of your existing methods remain the same
  async getServicesByCategory(categoryId: string, params?: {
    location?: string;
    price_min?: number;
    price_max?: number;
    rating_min?: number;
    sort_by?: 'price' | 'rating' | 'distance' | 'popularity';
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
  }) {
    await delay(400);
    return this.getServices({ ...params, category_id: categoryId });
  },

  async searchServices(query: string, params?: {
    location?: string;
    category_id?: string;
    price_min?: number;
    price_max?: number;
    rating_min?: number;
    sort_by?: 'price' | 'rating' | 'distance' | 'popularity';
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
  }) {
    await delay(500);
    
    let filteredServices = mockServices.filter(service =>
      service.name.toLowerCase().includes(query.toLowerCase()) ||
      service.description.toLowerCase().includes(query.toLowerCase()) ||
      service.professional_name.toLowerCase().includes(query.toLowerCase()) ||
      service.salon_name.toLowerCase().includes(query.toLowerCase()) ||
      service.location.toLowerCase().includes(query.toLowerCase())
    );
    
    // Apply additional filters
    if (params?.category_id) {
      filteredServices = filteredServices.filter(s => s.category_id === params.category_id);
    }
    
    if (params?.price_min !== undefined) {
      filteredServices = filteredServices.filter(s => s.price >= params.price_min!);
    }
    
    if (params?.price_max !== undefined) {
      filteredServices = filteredServices.filter(s => s.price <= params.price_max!);
    }
    
    if (params?.rating_min !== undefined) {
      filteredServices = filteredServices.filter(s => s.rating >= params.rating_min!);
    }
    
    // Apply sorting
    if (params?.sort_by) {
      const sortOrder = params.sort_order || 'desc';
      filteredServices.sort((a, b) => {
        let aValue, bValue;
        
        switch (params.sort_by) {
          case 'price':
            aValue = a.price;
            bValue = b.price;
            break;
          case 'rating':
            aValue = a.rating;
            bValue = b.rating;
            break;
          case 'distance':
            aValue = parseFloat(a.distance.replace(' km', ''));
            bValue = parseFloat(b.distance.replace(' km', ''));
            break;
          case 'popularity':
            aValue = a.reviews_count;
            bValue = b.reviews_count;
            break;
          default:
            return 0;
        }
        
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }
    
    // Apply pagination
    const page = params?.page || 1;
    const perPage = params?.per_page || 20;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedServices = filteredServices.slice(startIndex, endIndex);
    
    return {
      data: paginatedServices,
      error: null,
      meta: {
        total: filteredServices.length,
        page,
        per_page: perPage,
        total_pages: Math.ceil(filteredServices.length / perPage),
        has_more: endIndex < filteredServices.length,
        query,
        location: params?.location
      }
    };
  },

  // Filter options
  async getFilterOptions() {
    await delay(200);
    
    const priceRange = {
      min: Math.min(...mockServices.map(s => s.price)),
      max: Math.max(...mockServices.map(s => s.price))
    };
    
    const locations = [...new Set(mockServices.map(s => s.location))];
    const durations = [...new Set(mockServices.map(s => s.duration))].sort((a, b) => a - b);
    
    return {
      data: {
        priceRange,
        locations,
        durations,
        categories: mockCategories,
        paymentMethods: ['Gift Card', 'Klarna', 'Industry Organization'],
        sortOptions: [
          { value: 'popularity', label: 'Most Popular' },
          { value: 'rating', label: 'Highest Rated' },
          { value: 'price_asc', label: 'Price: Low to High' },
          { value: 'price_desc', label: 'Price: High to Low' },
          { value: 'distance', label: 'Nearest First' }
        ]
      },
      error: null,
      meta: null
    };
  },

  // Promotions
  async getPromotions() {
    await delay(300);
    return {
      data: mockPromotions,
      error: null,
      meta: {
        total: mockPromotions.length,
        page: 1,
        per_page: 20,
        total_pages: 1
      }
    };
  },

  async getActivePromotions() {
    await delay(300);
    const now = new Date();
    const activePromotions = mockPromotions.filter(promo => 
      new Date(promo.expires_at) > now
    );
    
    return {
      data: activePromotions,
      error: null,
      meta: {
        total: activePromotions.length,
        page: 1,
        per_page: 20,
        total_pages: 1
      }
    };
  },

  // Bookings
  async getBookings(userId: string) {
    await delay(500);
    const bookings = mockBookings.filter(b => b.user_id === userId);
    return { 
      data: bookings, 
      error: null,
      meta: {
        total: bookings.length,
        page: 1,
        per_page: 20,
        total_pages: 1
      }
    };
  },

  async createBooking(booking: any) {
    await delay(500);
    const newBooking = {
      ...booking,
      id: `booking_${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    mockBookings.push(newBooking);
    return { 
      data: newBooking, 
      error: null,
      meta: null
    };
  },

  async updateBooking(id: string, updates: any) {
    await delay(400);
    const bookingIndex = mockBookings.findIndex(b => b.id === id);
    
    if (bookingIndex === -1) {
      return { data: null, error: 'Booking not found', meta: null };
    }
    
    mockBookings[bookingIndex] = { ...mockBookings[bookingIndex], ...updates };
    return { 
      data: mockBookings[bookingIndex], 
      error: null,
      meta: null
    };
  },

  async cancelBooking(id: string) {
    await delay(400);
    return this.updateBooking(id, { status: 'cancelled' });
  },

  // Favorites
  async getFavorites(userId: string) {
    await delay(400);
    const favorites = mockFavorites
      .filter(f => f.user_id === userId)
      .map(f => ({
        ...f,
        service: mockServices.find(s => s.id === f.service_id),
      }));
    return { 
      data: favorites, 
      error: null,
      meta: {
        total: favorites.length,
        page: 1,
        per_page: 20,
        total_pages: 1
      }
    };
  },

  async toggleFavorite(userId: string, serviceId: string) {
    await delay(300);
    const existingIndex = mockFavorites.findIndex(
      f => f.user_id === userId && f.service_id === serviceId
    );

    if (existingIndex >= 0) {
      mockFavorites.splice(existingIndex, 1);
      
      // Update service is_favorite status
      const service = mockServices.find(s => s.id === serviceId);
      if (service) {
        service.is_favorite = false;
      }
      
      return { 
        data: { isFavorite: false }, 
        error: null,
        meta: null
      };
    } else {
      const newFavorite = {
        id: `fav_${Date.now()}`,
        user_id: userId,
        service_id: serviceId,
        created_at: new Date().toISOString(),
      };
      mockFavorites.push(newFavorite);
      
      // Update service is_favorite status
      const service = mockServices.find(s => s.id === serviceId);
      if (service) {
        service.is_favorite = true;
      }
      
      return { 
        data: { ...newFavorite, isFavorite: true }, 
        error: null,
        meta: null
      };
    }
  },

  // Reviews
  async getServiceReviews(serviceId: string) {
    await delay(400);
    const reviews = mockReviews
      .filter(r => r.service_id === serviceId)
      .map(r => ({
        ...r,
        user: mockUsers.find(u => u.id === r.user_id),
      }));
    return { 
      data: reviews, 
      error: null,
      meta: {
        total: reviews.length,
        page: 1,
        per_page: 20,
        total_pages: 1
      }
    };
  },

  async createReview(review: any) {
    await delay(500);
    const newReview = {
      ...review,
      id: `review_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    mockReviews.push(newReview);
    
    // Update service rating and review count
    const service = mockServices.find(s => s.id === review.service_id);
    if (service) {
      const serviceReviews = mockReviews.filter(r => r.service_id === review.service_id);
      const avgRating = serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length;
      service.rating = Math.round(avgRating * 10) / 10;
      service.reviews_count = serviceReviews.length;
    }
    
    return { 
      data: newReview, 
      error: null,
      meta: null
    };
  },

  // Available times
  async getAvailableTimes(serviceId: string, date: string) {
    await delay(300);
    const service = mockServices.find(s => s.id === serviceId);
    const serviceAvailability = mockServiceAvailability[serviceId];
    
    if (!service || !serviceAvailability) {
      return { 
        data: null, 
        error: 'Service not found', 
        meta: null 
      };
    }
    
    if (!serviceAvailability.available_dates.includes(date)) {
      return {
        data: {
          date,
          service_id: serviceId,
          available_times: [],
          duration: service.duration,
          price: service.price,
          business_hours: serviceAvailability.business_hours
        },
        error: 'Service not available on this date',
        meta: null
      };
    }

    // Get base slots from service
    const baseSlots = service.available_times;
    const selectedDate = new Date(date);
    const today = new Date();
    
    // If it's today, filter out past times
    let availableSlots = [...baseSlots];
    if (selectedDate.toDateString() === today.toDateString()) {
      const currentHour = today.getHours();
      availableSlots = baseSlots.filter(time => {
        const [hour] = time.split(':').map(Number);
        return hour > currentHour;
      });
    }
    
    return {
      data: {
        date,
        service_id: serviceId,
        available_times: availableSlots,
        duration: service.duration,
        price: service.price,
        business_hours: serviceAvailability.business_hours,
        booked_slots: serviceAvailability.booked_slots[date] || []
      },
      error: null,
      meta: null
    };
  },

  // Auth
  async login(email: string, password: string) {
    await delay(800);
    const user = mockUsers.find(u => u.email === email);
    if (!user || password !== 'password') {
      return { 
        data: null, 
        error: 'Invalid email or password',
        meta: null
      };
    }
    return {
      data: {
        user,
        session: {
          access_token: `mock_token_${Date.now()}`,
          refresh_token: `mock_refresh_${Date.now()}`,
          expires_in: 3600,
          user,
        },
      },
      error: null,
      meta: null
    };
  },

  async register(email: string, password: string, userData: any) {
    await delay(800);
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      return { 
        data: null, 
        error: 'Email already in use',
        meta: null
      };
    }

    const newUser = {
      id: `user_${Date.now()}`,
      email,
      ...userData,
      created_at: new Date().toISOString(),
    };

    mockUsers.push(newUser);
    
    return {
      data: {
        user: newUser,
        session: {
          access_token: `mock_token_${Date.now()}`,
          refresh_token: `mock_refresh_${Date.now()}`,
          expires_in: 3600,
          user: newUser,
        },
      },
      error: null,
      meta: null
    };
  },

  async logout() {
    await delay(300);
    return {
      data: { success: true },
      error: null,
      meta: null
    };
  },

  // Dashboard/Home data
  async getHomeData(userId?: string) {
    await delay(600);
    
    const [categoriesResult, promotionsResult, popularServicesResult] = await Promise.all([
      this.getCategories(),
      this.getActivePromotions(),
      this.getServices({ sort_by: 'rating', sort_order: 'desc', per_page: 6 })
    ]);

    // Get user's bookings if logged in
    let upcomingBookings = [];
    if (userId) {
      const bookingsResult = await this.getBookings(userId);
      upcomingBookings = bookingsResult.data?.filter(booking => 
        new Date(booking.date) > new Date() && booking.status === 'confirmed'
      ).slice(0, 3) || [];
    }

    // Get recently viewed services (mock data)
    const recentlyViewed = mockServices.slice(0, 3);

    return {
      data: {
        categories: categoriesResult.data || [],
        promotions: promotionsResult.data || [],
        popularServices: popularServicesResult.data || [],
        upcomingBookings,
        recentlyViewed,
        stats: {
          totalServices: mockServices.length,
          totalCategories: mockCategories.length,
          totalProviders: 150,
          avgRating: 4.8
        }
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  },
};

export default mockService;