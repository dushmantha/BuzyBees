// Favorites API Service
import { supabase } from '../../../lib/supabase/normalized';

export interface FavoriteShop {
  favorite_id: string;
  shop_id: string;
  shop_name: string;
  shop_category: string;
  shop_image_url: string;
  shop_logo_url: string;
  shop_rating: number;
  shop_city: string;
  shop_country: string;
  created_at: string;
}

export interface FavoritesResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class FavoritesAPI {
  /**
   * Toggle favorite status for a shop
   */
  async toggleFavorite(userId: string, shopId: string): Promise<FavoritesResponse<{ is_favorite: boolean }>> {
    try {
      console.log('🤍 Toggling favorite for user:', userId, 'shop:', shopId);

      // First check if the favorite exists
      console.log('🔍 Checking existing favorite for user:', userId, 'shop:', shopId);
      const { data: existingFavorite, error: checkError } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('shop_id', shopId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error when not found

      if (checkError) {
        console.error('❌ Error checking favorite:', checkError);
        return {
          success: false,
          error: checkError.message,
          data: { is_favorite: false }
        };
      }

      if (existingFavorite) {
        // Remove favorite
        const { error: deleteError } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('shop_id', shopId);

        if (deleteError) {
          console.error('❌ Error removing favorite:', deleteError);
          return {
            success: false,
            error: deleteError.message,
            data: { is_favorite: false }
          };
        }

        console.log('✅ Removed from favorites');
        return {
          success: true,
          data: { is_favorite: false },
          message: 'Removed from favorites'
        };
      } else {
        // Add favorite
        const { error: insertError } = await supabase
          .from('user_favorites')
          .insert({
            user_id: userId,
            shop_id: shopId
          });

        if (insertError) {
          console.error('❌ Error adding favorite:', insertError);
          return {
            success: false,
            error: insertError.message,
            data: { is_favorite: false }
          };
        }

        console.log('✅ Added to favorites');
        return {
          success: true,
          data: { is_favorite: true },
          message: 'Added to favorites'
        };
      }
    } catch (error) {
      console.error('❌ Toggle favorite error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle favorite',
        data: { is_favorite: false }
      };
    }
  }

  /**
   * Check if a shop is favorited by user
   */
  async isFavorite(userId: string, shopId: string): Promise<FavoritesResponse<{ is_favorite: boolean }>> {
    try {
      console.log('🔍 Checking if shop is favorite for user:', userId, 'shop:', shopId);

      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('shop_id', shopId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which means not favorited
        console.error('❌ Error checking favorite status:', error);
        return {
          success: false,
          error: error.message,
          data: { is_favorite: false }
        };
      }

      const isFavorited = !!data;
      console.log('✅ Favorite status:', isFavorited);

      return {
        success: true,
        data: { is_favorite: isFavorited }
      };
    } catch (error) {
      console.error('❌ Check favorite error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check favorite status',
        data: { is_favorite: false }
      };
    }
  }

  /**
   * Get all favorite shops for a user
   */
  async getUserFavorites(userId: string): Promise<FavoritesResponse<FavoriteShop[]>> {
    try {
      console.log('📋 Getting favorites for user:', userId);

      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          id,
          shop_id,
          created_at,
          provider_businesses:shop_id (
            name,
            category,
            image_url,
            logo_url,
            rating,
            city,
            country
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting user favorites:', error);
        return {
          success: false,
          error: error.message,
          data: []
        };
      }

      // Transform the data to match FavoriteShop interface
      const favorites: FavoriteShop[] = data.map((item: any) => ({
        favorite_id: item.id,
        shop_id: item.shop_id,
        shop_name: item.provider_businesses?.name || 'Unknown Shop',
        shop_category: item.provider_businesses?.category || 'Unknown Category',
        shop_image_url: item.provider_businesses?.image_url || '',
        shop_logo_url: item.provider_businesses?.logo_url || '',
        shop_rating: item.provider_businesses?.rating || 0,
        shop_city: item.provider_businesses?.city || '',
        shop_country: item.provider_businesses?.country || '',
        created_at: item.created_at
      }));

      console.log('✅ Got user favorites:', favorites.length);

      return {
        success: true,
        data: favorites
      };
    } catch (error) {
      console.error('❌ Get favorites error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get favorites',
        data: []
      };
    }
  }

  /**
   * Get favorite status for multiple shops (for list views)
   */
  async getFavoriteStatuses(userId: string, shopIds: string[]): Promise<FavoritesResponse<Record<string, boolean>>> {
    try {
      console.log('🔍 Getting favorite statuses for', shopIds.length, 'shops');

      const { data, error } = await supabase
        .from('user_favorites')
        .select('shop_id')
        .eq('user_id', userId)
        .in('shop_id', shopIds);

      if (error) {
        console.error('❌ Error getting favorite statuses:', error);
        return {
          success: false,
          error: error.message,
          data: {}
        };
      }

      // Convert array to object with shop_id as key and true as value
      const favoriteStatuses: Record<string, boolean> = {};
      shopIds.forEach(id => favoriteStatuses[id] = false);
      data.forEach(item => favoriteStatuses[item.shop_id] = true);

      console.log('✅ Got favorite statuses for', Object.keys(favoriteStatuses).length, 'shops');

      return {
        success: true,
        data: favoriteStatuses
      };
    } catch (error) {
      console.error('❌ Get favorite statuses error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get favorite statuses',
        data: {}
      };
    }
  }

  /**
   * Remove favorite (alternative to toggle)
   */
  async removeFavorite(userId: string, shopId: string): Promise<FavoritesResponse<{ removed: boolean }>> {
    try {
      console.log('🗑️ Removing favorite for user:', userId, 'shop:', shopId);

      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('shop_id', shopId);

      if (error) {
        console.error('❌ Error removing favorite:', error);
        return {
          success: false,
          error: error.message,
          data: { removed: false }
        };
      }

      console.log('✅ Favorite removed successfully');

      return {
        success: true,
        data: { removed: true },
        message: 'Removed from favorites'
      };
    } catch (error) {
      console.error('❌ Remove favorite error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove favorite',
        data: { removed: false }
      };
    }
  }

  /**
   * Ensure the user_favorites table exists
   */
  private async ensureTableExists(): Promise<void> {
    try {
      // Try a simple select to check if table exists
      await supabase.from('user_favorites').select('id').limit(1);
      console.log('✅ user_favorites table exists');
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.message?.includes('not found')) {
        console.log('⚠️ user_favorites table does not exist - please create it manually');
        throw new Error('user_favorites table does not exist. Please run the SQL schema.');
      }
      console.log('🛠️ Table check result:', error.message);
    }
  }
}

export const favoritesAPI = new FavoritesAPI();
export default favoritesAPI;