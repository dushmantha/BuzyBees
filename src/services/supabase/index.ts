import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, TABLES } from '../../constants/supabase';

// Initialize Supabase client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Re-export TABLES for use in other files
export { TABLES };

// Generic type for database operations
export interface DatabaseResponse<T> {
  data: T | null;
  error: any;
}

// Extend the Supabase client with our custom methods
interface SupabaseService {
  fetchAll<T>(table: string): Promise<DatabaseResponse<T[]>>;
  fetchById<T>(table: string, id: string): Promise<DatabaseResponse<T>>;
  create<T>(table: string, item: Omit<T, 'id' | 'created_at'>): Promise<DatabaseResponse<T>>;
  update<T>(table: string, id: string, updates: Partial<T>): Promise<DatabaseResponse<T>>;
  delete(table: string, id: string): Promise<{ error: any }>;
  auth: {
    signInWithEmail(email: string, password: string): Promise<{ data: any; error: any }>;
    signUpWithEmail(email: string, password: string, userData: any): Promise<{ data: any; error: any }>;
    signOut(): Promise<{ error: any }>;
    getCurrentUser(): Promise<{ user: any; error: any }>;
  };
  tables: typeof TABLES;
  supabase: SupabaseClient;
}

export const supabaseService: SupabaseService = {
  // Generic fetch all
  async fetchAll<T>(table: string): Promise<DatabaseResponse<T[]>> {
    const { data, error } = await supabase.from(table).select('*');
    return { data, error };
  },

  // Fetch by ID
  async fetchById<T>(table: string, id: string): Promise<DatabaseResponse<T>> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  // Create new record
  async create<T>(table: string, item: Omit<T, 'id' | 'created_at'>): Promise<DatabaseResponse<T>> {
    const { data, error } = await supabase
      .from(table)
      .insert([item])
      .select()
      .single();
    return { data, error };
  },

  // Update record
  async update<T>(
    table: string,
    id: string,
    updates: Partial<T>
  ): Promise<DatabaseResponse<T>> {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Delete record
  async delete(table: string, id: string): Promise<{ error: any }> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    return { error };
  },

  // Auth methods
  auth: {
    async signInWithEmail(email: string, password: string) {
      return await supabase.auth.signInWithPassword({ email, password });
    },
    
    async signUpWithEmail(email: string, password: string, userData: any) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      return { data, error };
    },
    
    async signOut() {
      return await supabase.auth.signOut();
    },
    
    async getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  },

  // Tables
  tables: TABLES,
  
  // Supabase client instance
  supabase
};
