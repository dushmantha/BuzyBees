// Temporary export for now - this auth service is not used in the current implementation
export default {};

// // Track the current auth token
// let authToken: string | null = null;

// // Set to true to use mock data regardless of environment
// const FORCE_MOCK = false;
// const isWeb = Platform.OS === 'web';
// const useMock = FORCE_MOCK || __DEV__ || isWeb;

// // Base API methods
// const apiBase = {
//   // Users
//   async getUsers() {
//     return supabaseService.fetchAll(TABLES.USERS);
//   },

//   async getUserById(id: string) {
//     return supabaseService.fetchById(TABLES.USERS, id);
//   },

//   // Services
//   async getServices() {
//     return supabaseService.fetchAll(TABLES.SERVICES);
//   },

//   async getServiceById(id: string) {
//     return supabaseService.fetchById(TABLES.SERVICES, id);
//   },

//   async getServicesByCategory(categoryId: string) {
//     const { data, error } = await supabaseService.supabase
//       .from(TABLES.SERVICES)
//       .select('*')
//       .eq('category_id', categoryId);
//     return { data, error };
//   },

//   // Categories
//   async getCategories() {
//     return supabaseService.fetchAll(TABLES.CATEGORIES);
//   },

//   // Bookings
//   async getBookings(userId: string) {
//     const { data, error } = await supabaseService.supabase
//       .from(TABLES.BOOKINGS)
//       .select('*')
//       .eq('user_id', userId);
//     return { data, error };
//   },

//   async createBooking(booking: any) {
//     return supabaseService.create(TABLES.BOOKINGS, booking);
//   },

//   // Favorites
//   async getFavorites(userId: string) {
//     const { data, error } = await supabaseService.supabase
//       .from(TABLES.FAVORITES)
//       .select('*, services(*)')
//       .eq('user_id', userId);
//     return { data, error };
//   },

//   async toggleFavorite(userId: string, serviceId: string) {
//     // First check if favorite exists
//     const { data: existing } = await supabaseService.supabase
//       .from(TABLES.FAVORITES)
//       .select('id')
//       .eq('user_id', userId)
//       .eq('service_id', serviceId)
//       .single();

//     if (existing) {
//       // Remove favorite
//       const { error } = await supabaseService.supabase
//         .from(TABLES.FAVORITES)
//         .delete()
//         .eq('id', existing.id);
//       return { data: { isFavorite: false }, error };
//     } else {
//       // Add favorite
//       const { data, error } = await supabaseService.supabase
//         .from(TABLES.FAVORITES)
//         .insert([{ user_id: userId, service_id: serviceId }])
//         .select()
//         .single();
//       return { data: { ...data, isFavorite: true }, error };
//     }
//   },

//   // Reviews
//   async getServiceReviews(serviceId: string) {
//     const { data, error } = await supabaseService.supabase
//       .from(TABLES.REVIEWS)
//       .select('*, users(*)')
//       .eq('service_id', serviceId);
//     return { data, error };
//   },

//   async createReview(review: any) {
//     return supabaseService.create(TABLES.REVIEWS, {
//       ...review,
//       created_at: new Date().toISOString(),
//     });
//   },

//   // Auth
//   async login(email: string, password: string) {
//     try {
//       const result = await supabaseService.auth.signInWithEmail(email, password);
//       if (result.data?.session?.access_token) {
//         authToken = result.data.session.access_token;
//       }
//       return result;
//     } catch (error) {
//       console.error('Login error:', error);
//       throw error;
//     }
//   },

//   async register(email: string, password: string, userData: any) {
//     try {
//       const result = await supabaseService.auth.signUpWithEmail(email, password, userData);
//       if (result.data?.session?.access_token) {
//         authToken = result.data.session.access_token;
//       }
//       return result;
//     } catch (error) {
//       console.error('Register error:', error);
//       throw error;
//     }
//   },

//   // Sign out method
//   async signOut() {
//     try {
//       const { error } = await supabaseService.supabase.auth.signOut();
//       if (error) {
//         console.error('API signOut error:', error);
//       }
//       apiBase.clearAuthToken();
//       return { error };
//     } catch (error) {
//       console.error('Sign out error:', error);
//       // Don't throw the error, just clear the token and return it
//       apiBase.clearAuthToken();
//       return { error };
//     }
//   },

//   // Password reset methods
//   async sendPasswordResetEmail(email: string) {
//     try {
//       // Validate email format first
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(email)) {
//         return { 
//           error: { 
//             message: 'Please enter a valid email address' 
//           } 
//         };
//       }

//       const { error } = await supabaseService.supabase.auth.resetPasswordForEmail(email, {
//         redirectTo: 'yourapp://reset-password', // Configure this with your app's deep link scheme
//       });
      
//       // Supabase doesn't return an error even if the email doesn't exist (for security)
//       // So we'll always return success unless there's a network error
//       return { error };
//     } catch (error) {
//       console.error('Send password reset email error:', error);
//       return { 
//         error: { 
//           message: 'Failed to send password reset email. Please check your internet connection and try again.' 
//         } 
//       };
//     }
//   },

//   async updatePassword(newPassword: string, accessToken?: string) {
//     try {
//       // Validate password strength
//       if (!newPassword || newPassword.length < 6) {
//         return { 
//           error: { 
//             message: 'Password must be at least 6 characters long' 
//           } 
//         };
//       }

//       const updateData = { password: newPassword };
//       const options = accessToken ? { accessToken } : undefined;
      
//       const { error } = await supabaseService.supabase.auth.updateUser(updateData, options);
//       return { error };
//     } catch (error) {
//       console.error('Update password error:', error);
//       return { 
//         error: { 
//           message: 'Failed to update password. Please try again.' 
//         } 
//       };
//     }
//   },

//   // Token management
//   setAuthToken: (token: string | null) => {
//     authToken = token;
//     // Supabase handles auth tokens internally
//     if (token) {
//       console.log('Auth token set');
//     }
//   },

//   clearAuthToken: () => {
//     authToken = null;
//     console.log('Auth token cleared');
//   },

//   getAuthToken: () => authToken,

//   // Check if user is authenticated
//   isAuthenticated: () => !!authToken,

//   // Refresh token
//   refreshToken: async () => {
//     try {
//       const { data, error } = await supabaseService.supabase.auth.refreshSession();
//       if (error) {
//         console.error('Failed to refresh token:', error);
//         return false;
//       }
//       if (data.session?.access_token) {
//         authToken = data.session.access_token;
//         return true;
//       }
//       return false;
//     } catch (error) {
//       console.error('Failed to refresh token:', error);
//       return false;
//     }
//   }
// };

// // Enhanced Mock auth methods for development
// const mockAuthMethods = {
//   async signOut() {
//     try {
//       // Simulate API delay
//       await new Promise(resolve => setTimeout(resolve, 500));
//       authToken = null;
//       return { error: null };
//     } catch (error) {
//       console.error('Mock signOut error:', error);
//       return { error: { message: 'Sign out failed' } };
//     }
//   },
  
//   async sendPasswordResetEmail(email: string) {
//     try {
//       // Validate email format
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(email)) {
//         return { 
//           error: { 
//             message: 'Please enter a valid email address' 
//           } 
//         };
//       }

//       // Simulate API delay
//       await new Promise(resolve => setTimeout(resolve, 1000));
      
//       // Mock implementation - simulate success for any valid email
//       console.log(`Mock: Password reset email sent to ${email}`);
//       return { error: null };
//     } catch (error) {
//       console.error('Mock sendPasswordResetEmail error:', error);
//       return { 
//         error: { 
//           message: 'Failed to send password reset email. Please try again.' 
//         } 
//       };
//     }
//   },
  
//   async updatePassword(newPassword: string, accessToken?: string) {
//     try {
//       // Validate password strength
//       if (!newPassword || newPassword.length < 6) {
//         return { 
//           error: { 
//             message: 'Password must be at least 6 characters long' 
//           } 
//         };
//       }

//       // Simulate API delay
//       await new Promise(resolve => setTimeout(resolve, 1000));
      
//       // Mock implementation - simulate success
//       console.log('Mock: Password updated successfully');
//       return { error: null };
//     } catch (error) {
//       console.error('Mock updatePassword error:', error);
//       return { 
//         error: { 
//           message: 'Failed to update password. Please try again.' 
//         } 
//       };
//     }
//   },

//   async login(email: string, password: string) {
//     try {
//       // Simulate API delay
//       await new Promise(resolve => setTimeout(resolve, 1000));
      
//       // Mock successful login
//       const mockToken = 'mock-jwt-token-' + Date.now();
//       authToken = mockToken;
      
//       return {
//         data: {
//           user: {
//             id: 'mock-user-id',
//             email: email,
//             full_name: 'Mock User',
//             phone: '',
//             avatar_url: '',
//             created_at: new Date().toISOString(),
//           },
//           session: {
//             access_token: mockToken,
//             refresh_token: 'mock-refresh-token',
//           }
//         },
//         error: null
//       };
//     } catch (error) {
//       console.error('Mock login error:', error);
//       return { 
//         data: null,
//         error: { message: 'Login failed' } 
//       };
//     }
//   },

//   async register(email: string, password: string, userData: any) {
//     try {
//       // Simulate API delay
//       await new Promise(resolve => setTimeout(resolve, 1000));
      
//       // Mock successful registration
//       const mockToken = 'mock-jwt-token-' + Date.now();
//       authToken = mockToken;
      
//       return {
//         data: {
//           user: {
//             id: 'mock-user-id-' + Date.now(),
//             email: email,
//             ...userData,
//             avatar_url: '',
//             created_at: new Date().toISOString(),
//           },
//           session: {
//             access_token: mockToken,
//             refresh_token: 'mock-refresh-token',
//           }
//         },
//         error: null
//       };
//     } catch (error) {
//       console.error('Mock register error:', error);
//       return { 
//         data: null,
//         error: { message: 'Registration failed' } 
//       };
//     }
//   }
// };

// // Use mock service or real API based on environment
// const api = useMock ? {
//   ...mockService,
//   ...mockAuthMethods,
//   setAuthToken: (token: string | null) => {
//     authToken = token;
//   },
//   clearAuthToken: () => {
//     authToken = null;
//   },
//   getAuthToken: () => authToken,
//   isAuthenticated: () => !!authToken,
//   refreshToken: async () => {
//     // Mock refresh token
//     if (authToken) {
//       // Simulate token refresh
//       authToken = 'mock-refreshed-token-' + Date.now();
//       return true;
//     }
//     return false;
//   }
// } : apiBase;

// export const isUsingMock = useMock;
// export default api;