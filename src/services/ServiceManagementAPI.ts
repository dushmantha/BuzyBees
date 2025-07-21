// services/ServiceManagementAPI.ts
export interface Shop {
    id: string;
    name: string;
    location: string;
    category: string;
    is_active: boolean;
    image?: string;
    description?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface Service {
    id: string;
    shop_id: string;
    name: string;
    description: string;
    price: number;
    duration_minutes: number;
    category: string;
    is_active: boolean;
    available_dates: string[];
    unavailable_dates: string[];
    booking_slots: BookingSlot[];
    created_at: string;
    updated_at: string;
  }
  
  export interface BookingSlot {
    start: string;
    end: string;
  }
  
  export interface QuickBooking {
    service_id: string;
    service_name: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    date: string;
    time: string;
    duration: number;
    price: number;
    notes?: string;
  }
  
  export interface ServiceAvailability {
    business_hours: {
      start: string;
      end: string;
    };
    closed_days: number[];
    special_closures: string[];
    booked_slots: {
      [date: string]: BookingSlot[];
    };
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message: string;
    error?: string;
    errors?: { [key: string]: string[] };
  }
  
  class ServiceManagementAPI {
    private baseUrl = process.env.API_BASE_URL || 'https://api.yourapp.com';
    private authToken: string | null = null;
  
    constructor() {
      // Initialize with stored auth token
      this.loadAuthToken();
    }
  
    private async loadAuthToken(): Promise<void> {
      try {
        // In React Native, you'd use AsyncStorage here
        // this.authToken = await AsyncStorage.getItem('auth_token');
        this.authToken = 'mock_token_123'; // Mock for now
      } catch (error) {
        console.error('Failed to load auth token:', error);
      }
    }
  
    private getHeaders(): HeadersInit {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
        'Accept': 'application/json',
      };
    }
  
    private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
      try {
        const data = await response.json();
        
        if (!response.ok) {
          return {
            success: false,
            message: data.message || 'Request failed',
            error: data.error,
            errors: data.errors,
          };
        }
  
        return {
          success: true,
          data: data.data || data,
          message: data.message || 'Success',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Network error occurred',
          error: error.message,
        };
      }
    }
  
    // Mock data for development
    private getMockShops(): Shop[] {
      return [
        {
          id: '1',
          name: 'Beauty and Me',
          location: 'Lützengatan 1, Stockholm',
          category: 'Nails & Beauty',
          is_active: true,
          image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
          description: 'Premium nail care and beauty treatments',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
        {
          id: '2',
          name: 'Elite Hair Studio',
          location: 'Götgatan 15, Stockholm',
          category: 'Hair Salon',
          is_active: true,
          image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df',
          description: 'Professional hair styling and treatments',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-20T00:00:00Z',
        },
        {
          id: '3',
          name: 'Wellness Spa Center',
          location: 'Södermalm, Stockholm',
          category: 'Spa & Wellness',
          is_active: false,
          image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
          description: 'Luxury spa and wellness treatments',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-10T00:00:00Z',
        },
      ];
    }
  
    private getMockServices(shopId: string): Service[] {
      const servicesByShop: { [key: string]: Service[] } = {
        '1': [
          {
            id: 's1_1',
            shop_id: '1',
            name: 'Classic Manicure',
            description: 'Basic nail care with polish application and cuticle treatment',
            price: 450,
            duration_minutes: 45,
            category: 'Nail Care',
            is_active: true,
            available_dates: ['2025-07-16', '2025-07-17', '2025-07-18', '2025-07-21'],
            unavailable_dates: ['2025-07-19', '2025-07-20'],
            booking_slots: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
          },
          {
            id: 's1_2',
            shop_id: '1',
            name: 'Gel Manicure',
            description: 'Long-lasting gel polish application with base and top coat',
            price: 550,
            duration_minutes: 60,
            category: 'Nail Care',
            is_active: true,
            available_dates: ['2025-07-16', '2025-07-17', '2025-07-18'],
            unavailable_dates: ['2025-07-19'],
            booking_slots: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-10T00:00:00Z',
          },
          {
            id: 's1_3',
            shop_id: '1',
            name: 'Nail Art Design',
            description: 'Custom nail art with detailed designs and embellishments',
            price: 650,
            duration_minutes: 75,
            category: 'Nail Art',
            is_active: false,
            available_dates: ['2025-07-17', '2025-07-18'],
            unavailable_dates: [],
            booking_slots: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-12T00:00:00Z',
          },
        ],
        '2': [
          {
            id: 's2_1',
            shop_id: '2',
            name: 'Haircut & Style',
            description: 'Professional haircut with wash, style, and finishing',
            price: 500,
            duration_minutes: 60,
            category: 'Hair Styling',
            is_active: true,
            available_dates: ['2025-07-16', '2025-07-17', '2025-07-18', '2025-07-21'],
            unavailable_dates: [],
            booking_slots: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-14T00:00:00Z',
          },
          {
            id: 's2_2',
            shop_id: '2',
            name: 'Cut, Color & Style',
            description: 'Complete hair transformation with professional coloring',
            price: 850,
            duration_minutes: 120,
            category: 'Hair Coloring',
            is_active: true,
            available_dates: ['2025-07-17', '2025-07-18', '2025-07-21'],
            unavailable_dates: ['2025-07-19', '2025-07-20'],
            booking_slots: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-13T00:00:00Z',
          },
        ],
        '3': [
          {
            id: 's3_1',
            shop_id: '3',
            name: 'Swedish Massage',
            description: 'Classic relaxing Swedish massage for stress relief',
            price: 750,
            duration_minutes: 60,
            category: 'Massage',
            is_active: true,
            available_dates: ['2025-07-16', '2025-07-17'],
            unavailable_dates: ['2025-07-18', '2025-07-19'],
            booking_slots: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-11T00:00:00Z',
          },
        ],
      };
  
      return servicesByShop[shopId] || [];
    }
  
    // API Methods
    async getShops(providerId: string): Promise<ApiResponse<Shop[]>> {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // In production, use:
        // const response = await fetch(`${this.baseUrl}/providers/${providerId}/shops`, {
        //   method: 'GET',
        //   headers: this.getHeaders(),
        // });
        // return this.handleResponse<Shop[]>(response);
        
        // Mock response
        return {
          success: true,
          data: this.getMockShops(),
          message: 'Shops loaded successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to load shops',
          error: error.message,
        };
      }
    }
  
    async getServicesByShop(shopId: string): Promise<ApiResponse<Service[]>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // In production:
        // const response = await fetch(`${this.baseUrl}/shops/${shopId}/services`, {
        //   method: 'GET',
        //   headers: this.getHeaders(),
        // });
        // return this.handleResponse<Service[]>(response);
        
        return {
          success: true,
          data: this.getMockServices(shopId),
          message: 'Services loaded successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to load services',
          error: error.message,
        };
      }
    }
  
    async createService(shopId: string, serviceData: Partial<Service>): Promise<ApiResponse<Service>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In production:
        // const response = await fetch(`${this.baseUrl}/shops/${shopId}/services`, {
        //   method: 'POST',
        //   headers: this.getHeaders(),
        //   body: JSON.stringify(serviceData),
        // });
        // return this.handleResponse<Service>(response);
        
        const newService: Service = {
          id: `s_${Date.now()}`,
          shop_id: shopId,
          name: serviceData.name || '',
          description: serviceData.description || '',
          price: serviceData.price || 0,
          duration_minutes: serviceData.duration_minutes || 30,
          category: serviceData.category || 'General',
          is_active: serviceData.is_active ?? true,
          available_dates: serviceData.available_dates || [],
          unavailable_dates: serviceData.unavailable_dates || [],
          booking_slots: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
  
        return {
          success: true,
          data: newService,
          message: 'Service created successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to create service',
          error: error.message,
        };
      }
    }
  
    async updateService(serviceId: string, serviceData: Partial<Service>): Promise<ApiResponse<Service>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // In production:
        // const response = await fetch(`${this.baseUrl}/services/${serviceId}`, {
        //   method: 'PUT',
        //   headers: this.getHeaders(),
        //   body: JSON.stringify(serviceData),
        // });
        // return this.handleResponse<Service>(response);
        
        return {
          success: true,
          message: 'Service updated successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to update service',
          error: error.message,
        };
      }
    }
  
    async toggleServiceStatus(serviceId: string, isActive: boolean): Promise<ApiResponse<boolean>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // In production:
        // const response = await fetch(`${this.baseUrl}/services/${serviceId}/toggle-status`, {
        //   method: 'PATCH',
        //   headers: this.getHeaders(),
        //   body: JSON.stringify({ is_active: isActive }),
        // });
        // return this.handleResponse<boolean>(response);
        
        return {
          success: true,
          data: true,
          message: `Service ${isActive ? 'activated' : 'deactivated'} successfully`,
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to update service status',
          error: error.message,
        };
      }
    }
  
    async deleteService(serviceId: string): Promise<ApiResponse<boolean>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // In production:
        // const response = await fetch(`${this.baseUrl}/services/${serviceId}`, {
        //   method: 'DELETE',
        //   headers: this.getHeaders(),
        // });
        // return this.handleResponse<boolean>(response);
        
        return {
          success: true,
          data: true,
          message: 'Service deleted successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to delete service',
          error: error.message,
        };
      }
    }
  
    async updateServiceAvailability(
      serviceId: string, 
      availableDates: string[], 
      unavailableDates: string[]
    ): Promise<ApiResponse<boolean>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In production:
        // const response = await fetch(`${this.baseUrl}/services/${serviceId}/availability`, {
        //   method: 'PUT',
        //   headers: this.getHeaders(),
        //   body: JSON.stringify({ available_dates: availableDates, unavailable_dates: unavailableDates }),
        // });
        // return this.handleResponse<boolean>(response);
        
        return {
          success: true,
          data: true,
          message: 'Service availability updated successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to update service availability',
          error: error.message,
        };
      }
    }
  
    async createQuickBooking(bookingData: QuickBooking): Promise<ApiResponse<any>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Validate required fields
        if (!bookingData.customer_name || !bookingData.customer_phone || !bookingData.date || !bookingData.time) {
          return {
            success: false,
            message: 'Missing required booking information',
            errors: {
              customer_name: bookingData.customer_name ? [] : ['Customer name is required'],
              customer_phone: bookingData.customer_phone ? [] : ['Customer phone is required'],
              date: bookingData.date ? [] : ['Date is required'],
              time: bookingData.time ? [] : ['Time is required'],
            },
          };
        }
        
        // In production:
        // const response = await fetch(`${this.baseUrl}/bookings/quick`, {
        //   method: 'POST',
        //   headers: this.getHeaders(),
        //   body: JSON.stringify(bookingData),
        // });
        // return this.handleResponse<any>(response);
        
        const booking = {
          id: `booking_${Date.now()}`,
          ...bookingData,
          status: 'confirmed',
          created_at: new Date().toISOString(),
        };
  
        return {
          success: true,
          data: booking,
          message: 'Quick booking created successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to create quick booking',
          error: error.message,
        };
      }
    }
  
    async getServiceAvailability(serviceId: string): Promise<ApiResponse<ServiceAvailability>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // In production:
        // const response = await fetch(`${this.baseUrl}/services/${serviceId}/availability`, {
        //   method: 'GET',
        //   headers: this.getHeaders(),
        // });
        // return this.handleResponse<ServiceAvailability>(response);
        
        // Mock availability data
        const mockAvailability: ServiceAvailability = {
          business_hours: { start: "09:00", end: "18:00" },
          closed_days: [0], // Sunday
          special_closures: ["2025-07-19", "2025-07-26"],
          booked_slots: {
            "2025-07-15": [
              { "start": "09:00", "end": "09:45" },
              { "start": "10:30", "end": "11:15" },
              { "start": "13:00", "end": "13:45" },
            ],
            "2025-07-16": [
              { "start": "09:00", "end": "09:45" },
              { "start": "14:30", "end": "15:15" },
            ],
          }
        };
  
        return {
          success: true,
          data: mockAvailability,
          message: 'Service availability loaded successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to load service availability',
          error: error.message,
        };
      }
    }
  
    async getServiceStatistics(shopId?: string): Promise<ApiResponse<any>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // In production:
        // const url = shopId 
        //   ? `${this.baseUrl}/shops/${shopId}/statistics`
        //   : `${this.baseUrl}/services/statistics`;
        // const response = await fetch(url, {
        //   method: 'GET',
        //   headers: this.getHeaders(),
        // });
        // return this.handleResponse<any>(response);
        
        const mockStats = {
          total_services: 8,
          active_services: 6,
          average_price: 587,
          average_duration: 65,
          total_bookings_this_month: 45,
          revenue_this_month: 26415,
          most_popular_service: 'Classic Manicure',
          busiest_day: 'Friday',
        };
  
        return {
          success: true,
          data: mockStats,
          message: 'Statistics loaded successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to load statistics',
          error: error.message,
        };
      }
    }
  }
  
  export default new ServiceManagementAPI();