import { Platform } from 'react-native';
import mockService from './mock';
import { supabaseService, TABLES } from '../supabase';

// Track the current auth token
let authToken: string | null = null;

// Set to true to use mock data regardless of environment
const FORCE_MOCK = false;
const isWeb = Platform.OS === 'web';
const useMock = FORCE_MOCK || __DEV__ || isWeb;

// Base API methods
const apiBase = {
  // Users
  async getUsers() {
    return supabaseService.fetchAll(TABLES.USERS);
  },

  async getUserById(id: string) {
    return supabaseService.fetchById(TABLES.USERS, id);
  },

  // Services
  async getServices() {
    return supabaseService.fetchAll(TABLES.SERVICES);
  },

  async getServiceById(id: string) {
    return supabaseService.fetchById(TABLES.SERVICES, id);
  },

  async getServicesByCategory(categoryId: string) {
    const { data, error } = await supabaseService.supabase
      .from(TABLES.SERVICES)
      .select('*')
      .eq('category_id', categoryId);
    return { data, error };
  },

  // Categories
  async getCategories() {
    return supabaseService.fetchAll(TABLES.CATEGORIES);
  },

  // Bookings
  async getBookings(userId: string) {
    const { data, error } = await supabaseService.supabase
      .from(TABLES.BOOKINGS)
      .select('*')
      .eq('user_id', userId);
    return { data, error };
  },

  async createBooking(booking: any) {
    return supabaseService.create(TABLES.BOOKINGS, booking);
  },

  // Favorites
  async getFavorites(userId: string) {
    const { data, error } = await supabaseService.supabase
      .from(TABLES.FAVORITES)
      .select('*, services(*)')
      .eq('user_id', userId);
    return { data, error };
  },

  async toggleFavorite(userId: string, serviceId: string) {
    // First check if favorite exists
    const { data: existing } = await supabaseService.supabase
      .from(TABLES.FAVORITES)
      .select('id')
      .eq('user_id', userId)
      .eq('service_id', serviceId)
      .single();

    if (existing) {
      // Remove favorite
      const { error } = await supabaseService.supabase
        .from(TABLES.FAVORITES)
        .delete()
        .eq('id', existing.id);
      return { data: { isFavorite: false }, error };
    } else {
      // Add favorite
      const { data, error } = await supabaseService.supabase
        .from(TABLES.FAVORITES)
        .insert([{ user_id: userId, service_id: serviceId }])
        .select()
        .single();
      return { data: { ...data, isFavorite: true }, error };
    }
  },

  // Reviews
  async getServiceReviews(serviceId: string) {
    const { data, error } = await supabaseService.supabase
      .from(TABLES.REVIEWS)
      .select('*, users(*)')
      .eq('service_id', serviceId);
    return { data, error };
  },

  async createReview(review: any) {
    return supabaseService.create(TABLES.REVIEWS, {
      ...review,
      created_at: new Date().toISOString(),
    });
  },

  // Auth
  async login(email: string, password: string) {
    return supabaseService.auth.signInWithEmail(email, password);
  },

  async register(email: string, password: string, userData: any) {
    return supabaseService.auth.signUpWithEmail(email, password, userData);
  },

  // Token management
  setAuthToken: (token: string | null) => {
    authToken = token;
    // Add the token to all outgoing requests if it exists
    if (token) {
      supabaseService.supabase.auth.setAuth(token);
    } else {
      supabaseService.supabase.auth.setAuth(null);
    }
  },

  clearAuthToken: () => {
    authToken = null;
    supabaseService.supabase.auth.setAuth(null);
  },

  getAuthToken: () => authToken,

  // Check if user is authenticated
  isAuthenticated: () => !!authToken,

  // Refresh token
  refreshToken: async () => {
    if (!authToken) return false;
    
    try {
      // Here you would typically call your refresh token endpoint
      // For now, we'll just return true if we have a token
      return !!authToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }
};

// Use mock service or real API based on environment
const api = useMock ? {
  ...mockService,
  setAuthToken: (token: string | null) => {
    authToken = token;
  },
  clearAuthToken: () => {
    authToken = null;
  },
  getAuthToken: () => authToken,
  isAuthenticated: () => !!authToken,
  refreshToken: async () => !!authToken
} : apiBase;

export const isUsingMock = useMock;
export default api;
