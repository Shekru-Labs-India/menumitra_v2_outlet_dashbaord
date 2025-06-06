import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, API_PATHS } from '../config/apiConfig';

// Create the context
const CacheDataContext = createContext();

/**
 * CacheDataProvider - A centralized provider for caching API data
 * - Maintains cached data for all API endpoints
 * - Handles background loading without skeleton loaders
 * - Provides cached data immediately while fetching fresh data
 */
export const CacheDataProvider = ({ children }) => {
  // Cache storage for all API endpoints
  const [cache, setCache] = useState({});
  
  // Track loading state for each endpoint
  const [loadingStates, setLoadingStates] = useState({});
  
  // Track errors for each endpoint
  const [errors, setErrors] = useState({});
  
  // Store timestamps of last successful fetch for each endpoint
  const lastFetchTimestampRef = useRef({});
  
  // Track which endpoints are currently being fetched
  const fetchingRef = useRef({});
  
  // Persist cache to localStorage when component unmounts
  useEffect(() => {
    // Load cached data from localStorage on mount
    try {
      const savedCache = localStorage.getItem('api_data_cache');
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        setCache(parsedCache);
        console.log('Loaded API cache from localStorage');
      }
    } catch (error) {
      console.error('Failed to load cache from localStorage:', error);
    }
    
    // Save cache to localStorage on unmount
    return () => {
      try {
        localStorage.setItem('api_data_cache', JSON.stringify(cache));
        console.log('Saved API cache to localStorage');
      } catch (error) {
        console.error('Failed to save cache to localStorage:', error);
      }
    };
  }, []);

  // Periodically save cache to localStorage
  useEffect(() => {
    const saveInterval = setInterval(() => {
      try {
        localStorage.setItem('api_data_cache', JSON.stringify(cache));
      } catch (error) {
        console.error('Failed to save cache to localStorage:', error);
      }
    }, 30000); // Save every 30 seconds
    
    return () => clearInterval(saveInterval);
  }, [cache]);

  /**
   * Fetch data from an API endpoint with caching
   * @param {string} endpoint - API endpoint path
   * @param {Object} requestData - Request data to send
   * @param {Object} options - Additional options
   * @param {boolean} options.forceRefresh - Force refresh ignoring cache
   * @param {number} options.cacheDuration - Cache duration in milliseconds
   * @param {function} options.transformResponse - Function to transform the response data
   */
  const fetchData = useCallback(async (endpoint, requestData = {}, options = {}) => {
    const {
      forceRefresh = false,
      cacheDuration = 5 * 60 * 1000, // Default: 5 minutes
      transformResponse = (data) => data, // Default: no transformation
    } = options;
    
    // Check if we're already fetching this endpoint
    if (fetchingRef.current[endpoint]) {
      console.log(`Already fetching ${endpoint}, using cached data`);
      return cache[endpoint]; // Return cached data immediately
    }
    
    // Check if we have valid cached data and not forcing refresh
    const now = Date.now();
    const lastFetch = lastFetchTimestampRef.current[endpoint] || 0;
    const isCacheValid = (now - lastFetch) < cacheDuration;
    
    if (!forceRefresh && isCacheValid && cache[endpoint]) {
      console.log(`Using cached data for ${endpoint}, age: ${(now - lastFetch) / 1000}s`);
      return cache[endpoint]; // Return cached data immediately
    }
    
    // Mark as fetching
    fetchingRef.current[endpoint] = true;
    
    // Update loading state
    setLoadingStates(prev => ({ ...prev, [endpoint]: true }));
    
    try {
      // Prepare request data
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      const apiRequestData = {
        user_id: parseInt(userId),
        outlet_id: parseInt(outletId),
        ...requestData
      };
      
      console.log(`Fetching data from ${endpoint}`, apiRequestData);
      
      // Make the API call
      const response = await api.post(endpoint, apiRequestData);
      
      // Process response
      if (response.data) {
        // Transform response data if needed
        const transformedData = transformResponse(response.data.detail || response.data);
        
        // Update cache with new data
        setCache(prev => ({ ...prev, [endpoint]: transformedData }));
        
        // Update last fetch timestamp
        lastFetchTimestampRef.current[endpoint] = now;
        
        // Clear error
        setErrors(prev => ({ ...prev, [endpoint]: null }));
        
        return transformedData;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // Don't log 403 errors to reduce console noise
      if (error.response?.status === 403) {
        // Set error but don't log to console
        const errorMessage = error.response?.data?.detail || 'Permission denied';
        setErrors(prev => ({ ...prev, [endpoint]: errorMessage }));
      } else {
        // Log other errors
        console.error(`Error fetching data from ${endpoint}:`, error);
        
        // Set error
        const errorMessage = error.response?.data?.detail || 
                            error.response?.data?.message ||
                            error.message || `Failed to fetch data from ${endpoint}`;
        
        setErrors(prev => ({ ...prev, [endpoint]: errorMessage }));
      }
      
      // Return cached data if available, otherwise null
      return cache[endpoint] || null;
    } finally {
      // Update loading state
      setLoadingStates(prev => ({ ...prev, [endpoint]: false }));
      
      // Mark as not fetching
      fetchingRef.current[endpoint] = false;
    }
  }, [cache]);

  /**
   * Get cached data for an endpoint
   * @param {string} endpoint - API endpoint path
   */
  const getCachedData = useCallback((endpoint) => {
    return cache[endpoint] || null;
  }, [cache]);

  /**
   * Check if an endpoint is currently loading
   * @param {string} endpoint - API endpoint path
   */
  const isLoading = useCallback((endpoint) => {
    return loadingStates[endpoint] || false;
  }, [loadingStates]);

  /**
   * Get error for an endpoint
   * @param {string} endpoint - API endpoint path
   */
  const getError = useCallback((endpoint) => {
    return errors[endpoint] || null;
  }, [errors]);

  /**
   * Clear cache for an endpoint or all endpoints
   * @param {string} endpoint - API endpoint path (optional, if not provided, clears all cache)
   */
  const clearCache = useCallback((endpoint = null) => {
    if (endpoint) {
      // Clear specific endpoint
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[endpoint];
        return newCache;
      });
      
      // Clear timestamp
      const newTimestamps = { ...lastFetchTimestampRef.current };
      delete newTimestamps[endpoint];
      lastFetchTimestampRef.current = newTimestamps;
      
      console.log(`Cleared cache for ${endpoint}`);
    } else {
      // Clear all cache
      setCache({});
      lastFetchTimestampRef.current = {};
      console.log('Cleared all cache');
    }
  }, []);

  // Fetch analytics data with caching
  const fetchAnalytics = useCallback(async (customData = {}, options = {}) => {
    return fetchData(API_PATHS.analyticsReports, customData, options);
  }, [fetchData]);

  // Fetch order analytics with caching
  const fetchOrderAnalytics = useCallback(async (customData = {}, options = {}) => {
    return fetchData(API_PATHS.orderAnalytics, customData, options);
  }, [fetchData]);

  // Fetch food type statistics with caching
  const fetchFoodTypeStats = useCallback(async (customData = {}, options = {}) => {
    return fetchData(API_PATHS.foodTypeStats, customData, options);
  }, [fetchData]);

  // Fetch order type statistics with caching
  const fetchOrderTypeStats = useCallback(async (customData = {}, options = {}) => {
    return fetchData(API_PATHS.orderTypeStats, customData, options);
  }, [fetchData]);

  // Fetch order statistics with caching
  const fetchOrderStats = useCallback(async (customData = {}, options = {}) => {
    return fetchData(API_PATHS.orderStatistics, customData, options);
  }, [fetchData]);

  // Fetch weekly order statistics with caching
  const fetchWeeklyOrderStats = useCallback(async (customData = {}, options = {}) => {
    return fetchData(API_PATHS.weeklyOrderStats, customData, options);
  }, [fetchData]);

  // Fetch payment method counts with caching
  const fetchPaymentMethodCounts = useCallback(async (customData = {}, options = {}) => {
    return fetchData(API_PATHS.paymentMethodCounts, customData, options);
  }, [fetchData]);

  // Create the context value
  const contextValue = {
    // Generic functions
    fetchData,
    getCachedData,
    isLoading,
    getError,
    clearCache,
    
    // Specific API functions
    fetchAnalytics,
    fetchOrderAnalytics,
    fetchFoodTypeStats,
    fetchOrderTypeStats,
    fetchOrderStats,
    fetchWeeklyOrderStats,
    fetchPaymentMethodCounts,
    
    // Direct cache access (for components that need it)
    cache,
  };

  return (
    <CacheDataContext.Provider value={contextValue}>
      {children}
    </CacheDataContext.Provider>
  );
};

// Custom hook to use the cache data context
export const useCacheData = () => {
  const context = useContext(CacheDataContext);
  
  if (!context) {
    throw new Error('useCacheData must be used within a CacheDataProvider');
  }
  
  return context;
};

export default CacheDataContext; 