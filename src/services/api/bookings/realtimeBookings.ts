import { supabase } from '../../../lib/supabase/normalized';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface BookingUpdate {
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  booking_id: string;
  shop_id: string;
  provider_id: string;
  customer_id: string;
  staff_id: string;
  status: string;
  booking_date: string;
  start_time: string;
  timestamp: string;
}

export interface BookingSubscriptionOptions {
  onInsert?: (booking: BookingUpdate) => void;
  onUpdate?: (booking: BookingUpdate) => void;
  onDelete?: (booking: BookingUpdate) => void;
  onError?: (error: Error) => void;
}

class RealtimeBookingService {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to booking updates for a customer
   */
  subscribeToCustomerBookings(
    customerId: string,
    options: BookingSubscriptionOptions
  ): () => void {
    const channelName = `bookings:customer:${customerId}`;
    return this.subscribeToChannel(channelName, options);
  }

  /**
   * Subscribe to booking updates for a provider
   */
  subscribeToProviderBookings(
    providerId: string,
    options: BookingSubscriptionOptions
  ): () => void {
    const channelName = `bookings:provider:${providerId}`;
    return this.subscribeToChannel(channelName, options);
  }

  /**
   * Subscribe to booking updates for a shop
   */
  subscribeToShopBookings(
    shopId: string,
    options: BookingSubscriptionOptions
  ): () => void {
    const channelName = `bookings:shop:${shopId}`;
    return this.subscribeToChannel(channelName, options);
  }

  /**
   * Subscribe to all booking updates (admin only)
   */
  subscribeToAllBookings(
    options: BookingSubscriptionOptions
  ): () => void {
    const channelName = 'bookings:all';
    return this.subscribeToChannel(channelName, options);
  }

  /**
   * Subscribe to database changes directly (alternative method)
   */
  subscribeToBookingTable(
    filter?: { column: string; value: string },
    options?: BookingSubscriptionOptions
  ): () => void {
    const channel = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_bookings',
          filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
        },
        (payload) => {
          console.log('📊 Booking change received:', payload);
          
          if (payload.eventType === 'INSERT' && options?.onInsert) {
            options.onInsert(this.transformPayload(payload));
          } else if (payload.eventType === 'UPDATE' && options?.onUpdate) {
            options.onUpdate(this.transformPayload(payload));
          } else if (payload.eventType === 'DELETE' && options?.onDelete) {
            options.onDelete(this.transformPayload(payload));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to booking table changes');
        } else if (status === 'CHANNEL_ERROR' && options?.onError) {
          options.onError(new Error('Failed to subscribe to booking changes'));
        }
      });

    // Return unsubscribe function
    return () => {
      console.log('🔌 Unsubscribing from booking changes');
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to a specific channel with PostgreSQL NOTIFY
   */
  private subscribeToChannel(
    channelName: string,
    options: BookingSubscriptionOptions
  ): () => void {
    // Check if already subscribed
    if (this.channels.has(channelName)) {
      console.log(`⚠️ Already subscribed to ${channelName}`);
      const existingChannel = this.channels.get(channelName);
      if (existingChannel) {
        supabase.removeChannel(existingChannel);
      }
    }

    console.log(`📡 Subscribing to ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: channelName }, (payload) => {
        console.log(`📨 Received on ${channelName}:`, payload);
        
        const bookingUpdate = payload.payload as BookingUpdate;
        
        if (bookingUpdate.operation === 'INSERT' && options.onInsert) {
          options.onInsert(bookingUpdate);
        } else if (bookingUpdate.operation === 'UPDATE' && options.onUpdate) {
          options.onUpdate(bookingUpdate);
        } else if (bookingUpdate.operation === 'DELETE' && options.onDelete) {
          options.onDelete(bookingUpdate);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Successfully subscribed to ${channelName}`);
          this.channels.set(channelName, channel);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Failed to subscribe to ${channelName}`);
          if (options.onError) {
            options.onError(new Error(`Subscription failed for ${channelName}`));
          }
        }
      });

    // Return unsubscribe function
    return () => {
      console.log(`🔌 Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    };
  }

  /**
   * Transform database payload to BookingUpdate format
   */
  private transformPayload(payload: any): BookingUpdate {
    const record = payload.new || payload.old;
    return {
      operation: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
      booking_id: record.id,
      shop_id: record.shop_id,
      provider_id: record.provider_id,
      customer_id: record.customer_id,
      staff_id: record.staff_id,
      status: record.status,
      booking_date: record.booking_date,
      start_time: record.start_time,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    console.log('🔌 Unsubscribing from all booking channels');
    this.channels.forEach((channel, name) => {
      console.log(`  - Removing ${name}`);
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  /**
   * Get list of active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.channels.keys());
  }
}

// Export singleton instance
export const realtimeBookings = new RealtimeBookingService();

// Export convenience hooks for React components
export const useCustomerBookingUpdates = (
  customerId: string,
  onUpdate: (booking: BookingUpdate) => void
) => {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  
  React.useEffect(() => {
    if (!customerId) return;
    
    const unsubscribe = realtimeBookings.subscribeToCustomerBookings(customerId, {
      onInsert: onUpdate,
      onUpdate: onUpdate,
      onError: (error) => {
        console.error('Subscription error:', error);
        setIsSubscribed(false);
      },
    });
    
    setIsSubscribed(true);
    
    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [customerId]);
  
  return isSubscribed;
};

export const useProviderBookingUpdates = (
  providerId: string,
  onUpdate: (booking: BookingUpdate) => void
) => {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  
  React.useEffect(() => {
    if (!providerId) return;
    
    const unsubscribe = realtimeBookings.subscribeToProviderBookings(providerId, {
      onInsert: onUpdate,
      onUpdate: onUpdate,
      onError: (error) => {
        console.error('Subscription error:', error);
        setIsSubscribed(false);
      },
    });
    
    setIsSubscribed(true);
    
    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [providerId]);
  
  return isSubscribed;
};

export const useShopBookingUpdates = (
  shopId: string,
  onUpdate: (booking: BookingUpdate) => void
) => {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  
  React.useEffect(() => {
    if (!shopId) return;
    
    const unsubscribe = realtimeBookings.subscribeToShopBookings(shopId, {
      onInsert: onUpdate,
      onUpdate: onUpdate,
      onError: (error) => {
        console.error('Subscription error:', error);
        setIsSubscribed(false);
      },
    });
    
    setIsSubscribed(true);
    
    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [shopId]);
  
  return isSubscribed;
};

// Import React for hooks
import React from 'react';