// src/services/serviceUtils.ts
import React from 'react';
import mockService from './api/mock/index';
import { ServiceOption, ServiceOptionState, ApiResponse } from '../types/service';

/**
 * Utility class for handling service-related API calls and data transformations
 */
export class ServiceUtils {
  /**
   * Fetches service options from the API and transforms them for component use
   */
  static async fetchServiceOptions(serviceId: string): Promise<{
    options: ServiceOptionState[];
    error: string | null;
  }> {
    try {
      const response: ApiResponse<ServiceOption[]> = await mockService.getServiceOptions(serviceId);
      
      if (response.error) {
        return {
          options: [],
          error: response.error
        };
      }

      // Transform API response to component state format
      const transformedOptions: ServiceOptionState[] = response.data.map((apiOption: ServiceOption, index: number) => ({
        id: apiOption.id,
        name: apiOption.name,
        description: apiOption.description,
        duration: `${apiOption.duration} min`,
        price: `${apiOption.price} SEK`, // You can make currency configurable
        selected: apiOption.is_default || (index === 0 && !response.data.some(opt => opt.is_default)),
      }));

      return {
        options: transformedOptions,
        error: null
      };
    } catch (error) {
      console.error('Error in fetchServiceOptions:', error);
      return {
        options: [],
        error: 'Failed to load service options'
      };
    }
  }

  /**
   * Fetches a service with its options in a single call
   */
  static async fetchServiceWithOptions(serviceId: string) {
    try {
      const response = await mockService.getServiceWithOptions(serviceId);
      
      if (response.error) {
        return {
          service: null,
          options: [],
          error: response.error
        };
      }

      const service = response.data;
      const transformedOptions: ServiceOptionState[] = service.options.map((apiOption: ServiceOption, index: number) => ({
        id: apiOption.id,
        name: apiOption.name,
        description: apiOption.description,
        duration: `${apiOption.duration} min`,
        price: `${apiOption.price} SEK`,
        selected: apiOption.is_default || (index === 0 && !service.options.some(opt => opt.is_default)),
      }));

      return {
        service: service,
        options: transformedOptions,
        error: null
      };
    } catch (error) {
      console.error('Error in fetchServiceWithOptions:', error);
      return {
        service: null,
        options: [],
        error: 'Failed to load service with options'
      };
    }
  }

  /**
   * Calculates total price from selected options
   */
  static calculateTotalPrice(options: ServiceOptionState[]): number {
    return options
      .filter(option => option.selected)
      .reduce((total, option) => {
        const price = parseFloat(option.price.replace(/[^0-9.]/g, ''));
        return total + (isNaN(price) ? 0 : price);
      }, 0);
  }

  /**
   * Validates if at least one option is selected
   */
  static hasSelectedOptions(options: ServiceOptionState[]): boolean {
    return options.some(option => option.selected);
  }

  /**
   * Formats price for display
   */
  static formatPrice(price: number, currency: string = 'SEK'): string {
    return `${price} ${currency}`;
  }

  /**
   * Formats duration for display
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${remainingMinutes}min`;
      }
    }
  }

  /**
   * Transforms selected options for booking
   */
  static prepareSelectedServicesForBooking(options: ServiceOptionState[]) {
    return options
      .filter(option => option.selected)
      .map(option => ({
        id: option.id,
        name: option.name,
        price: option.price,
        duration: option.duration
      }));
  }
}

/**
 * Custom hook for managing service options state
 */
export const useServiceOptions = (serviceId: string) => {
  const [options, setOptions] = React.useState<ServiceOptionState[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOptions = React.useCallback(async () => {
    if (!serviceId) return;
    
    setLoading(true);
    setError(null);
    
    const result = await ServiceUtils.fetchServiceOptions(serviceId);
    
    setOptions(result.options);
    setError(result.error);
    setLoading(false);
  }, [serviceId]);

  const toggleOption = React.useCallback((optionId: string) => {
    setOptions(prevOptions => 
      prevOptions.map(option => 
        option.id === optionId 
          ? { ...option, selected: !option.selected }
          : option
      )
    );
  }, []);

  const selectOption = React.useCallback((optionId: string) => {
    setOptions(prevOptions => 
      prevOptions.map(option => 
        option.id === optionId 
          ? { ...option, selected: true }
          : option
      )
    );
  }, []);

  const deselectOption = React.useCallback((optionId: string) => {
    setOptions(prevOptions => 
      prevOptions.map(option => 
        option.id === optionId 
          ? { ...option, selected: false }
          : option
      )
    );
  }, []);

  const clearAllSelections = React.useCallback(() => {
    setOptions(prevOptions => 
      prevOptions.map(option => ({ ...option, selected: false }))
    );
  }, []);

  const selectAllOptions = React.useCallback(() => {
    setOptions(prevOptions => 
      prevOptions.map(option => ({ ...option, selected: true }))
    );
  }, []);

  const totalPrice = React.useMemo(() => 
    ServiceUtils.calculateTotalPrice(options), [options]
  );

  const hasSelections = React.useMemo(() => 
    ServiceUtils.hasSelectedOptions(options), [options]
  );

  const selectedCount = React.useMemo(() => 
    options.filter(option => option.selected).length, [options]
  );

  React.useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return {
    options,
    loading,
    error,
    totalPrice,
    hasSelections,
    selectedCount,
    actions: {
      toggleOption,
      selectOption,
      deselectOption,
      clearAllSelections,
      selectAllOptions,
      refetch: fetchOptions,
    }
  };
};