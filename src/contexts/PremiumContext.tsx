import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { premiumService, UserSubscription, PremiumFeature } from '../lib/premium/premiumService';
import { supabase } from '../lib/supabase/index';

interface PremiumContextType {
  subscription: UserSubscription | null;
  isPremium: boolean;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  canAccessFeature: (feature: PremiumFeature) => boolean;
  formatSubscription: () => ReturnType<typeof premiumService.formatSubscription> | null;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Load subscription data on mount and set up token refresh
  useEffect(() => {
    loadSubscription();
    
    // Set up periodic token refresh to prevent expiry during real-time subscriptions
    // Refresh token every 45 minutes (tokens typically expire after 1 hour)
    const setupTokenRefresh = () => {
      tokenRefreshInterval.current = setInterval(async () => {
        try {
          console.log('🔄 Periodic token refresh started');
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('❌ Periodic token refresh failed:', error);
          } else {
            console.log('✅ Periodic token refresh successful');
          }
        } catch (error) {
          console.error('❌ Error during periodic token refresh:', error);
        }
      }, 45 * 60 * 1000); // 45 minutes
    };
    
    setupTokenRefresh();
    
    return () => {
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current);
        tokenRefreshInterval.current = null;
      }
    };
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = premiumService.subscribeToChanges(async (newSubscription) => {
      console.log('🔄 Premium context updated via real-time');
      console.log('🔄 New subscription data:', newSubscription);
      
      try {
        // Update subscription data
        setSubscription(newSubscription);
        
        // Use the premium service to determine if user has premium access
        // This handles both active and cancelled (but not expired) subscriptions
        const hasPremiumAccess = await premiumService.isPremium(true);
        setIsPremium(hasPremiumAccess);
        
        console.log('🔄 Real-time premium status updated:', {
          subscription_status: newSubscription?.subscription_status,
          is_premium: newSubscription?.is_premium,
          calculated_premium_access: hasPremiumAccess,
          subscription_end_date: newSubscription?.subscription_end_date
        });
        
        console.log('✅ Premium context state fully updated via real-time');
        
      } catch (error) {
        console.error('❌ Error updating premium context via real-time:', error);
      }
    });

    return unsubscribe;
  }, []);

  const loadSubscription = async () => {
    try {
      setIsLoading(true);
      console.log('📦 Loading subscription in context...');
      
      const sub = await premiumService.getUserSubscription();
      const premium = await premiumService.isPremium();
      
      setSubscription(sub);
      setIsPremium(premium);
      
      console.log('✅ Premium context loaded:', {
        has_subscription: !!sub,
        is_premium: premium,
        status: sub?.subscription_status
      });
    } catch (error) {
      console.error('❌ Error loading subscription in context:', error);
      setSubscription(null);
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSubscription = async () => {
    try {
      console.log('🔄 Manual premium subscription refresh started');
      
      // Clear cache first to ensure fresh data
      premiumService.clearCache();
      
      // Use direct database fetch to bypass any caching issues
      const sub = await premiumService.getSubscriptionDirect();
      console.log('📊 Direct subscription data:', sub);
      
      // Calculate premium status based on direct data
      const premium = sub ? await premiumService.isPremium(true) : false;
      
      setSubscription(sub);
      setIsPremium(premium);
      
      console.log('✅ Premium context manually refreshed:', {
        has_subscription: !!sub,
        is_premium: premium,
        status: sub?.subscription_status,
        subscription_type: sub?.subscription_type,
        subscription_end_date: sub?.subscription_end_date
      });
      
    } catch (error) {
      console.error('❌ Error refreshing subscription:', error);
    }
  };

  const canAccessFeature = (feature: PremiumFeature): boolean => {
    return isPremium;
  };

  const formatSubscription = () => {
    if (!subscription) return null;
    return premiumService.formatSubscription(subscription);
  };

  const value: PremiumContextType = {
    subscription,
    isPremium,
    isLoading,
    refreshSubscription,
    canAccessFeature,
    formatSubscription,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};

// Hook to use premium context
export const usePremium = (): PremiumContextType => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

// HOC to protect premium features
export const withPremium = <P extends object>(
  Component: React.ComponentType<P>,
  feature: PremiumFeature,
  fallbackComponent?: React.ComponentType<P>
) => {
  return (props: P) => {
    const { canAccessFeature } = usePremium();
    
    if (canAccessFeature(feature)) {
      return <Component {...props} />;
    }
    
    if (fallbackComponent) {
      const FallbackComponent = fallbackComponent;
      return <FallbackComponent {...props} />;
    }
    
    return null;
  };
};