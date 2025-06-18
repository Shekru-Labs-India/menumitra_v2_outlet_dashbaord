import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, API_PATHS } from '../config/apiConfig';

// Create the context
const CacheDataContext = createContext();

// Global request flag to prevent multiple API calls on initial page load
let isInitialRequestInProgress = false;
let initialRequestPromise = null;

// Global interval timer ID to avoid duplicating timers
let globalRefreshTimerId = null;

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
  
  // Track failed attempts to prevent infinite loops
  const failedAttemptsRef = useRef({});
  
  // Track if initial load has been completed
  const initialLoadCompletedRef = useRef(false);
  
  // Track component mount/unmount to control API calls
  const isMountedRef = useRef(true);
  
  // Track if an initial data load has been triggered
  const initialLoadTriggeredRef = useRef(false);

  // Clear globals on provider unmount to prevent issues with HMR
  useEffect(() => {
    return () => {
      isInitialRequestInProgress = false;
      initialRequestPromise = null;
      if (globalRefreshTimerId) {
        clearInterval(globalRefreshTimerId);
        globalRefreshTimerId = null;
      }
      isMountedRef.current = false;
    };
  }, []);
  
  // Mark component as mounted
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
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
    
    // Check for recent failed attempts to prevent infinite loops
    const failedAttempts = failedAttemptsRef.current[endpoint] || { count: 0, timestamp: 0 };
    const isRecentFailure = (now - failedAttempts.timestamp) < 10000; // 10 seconds cooldown
    
    // If forceRefresh is true, always fetch new data regardless of cache status
    // Otherwise, use cache if it's valid and available
    if (!forceRefresh && isCacheValid && cache[endpoint]) {
      console.log(`Using cached data for ${endpoint}, age: ${(now - lastFetch) / 1000}s`);
      return cache[endpoint]; // Return cached data immediately
    }
    
    // If there are too many recent failures and we're not forcing a refresh, use cache
    if (!forceRefresh && failedAttempts.count >= 3 && isRecentFailure) {
      console.log(`Too many recent failures for ${endpoint}, using cached data and waiting for cooldown`);
      return cache[endpoint]; // Return cached data and avoid making another request
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
      
      console.log(`Fetching data from ${endpoint}${forceRefresh ? ' (forced refresh)' : ''}`, apiRequestData);
      
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
        
        // Reset failed attempts counter on success
        failedAttemptsRef.current[endpoint] = { count: 0, timestamp: 0 };
        
        return transformedData;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // Update failed attempts counter
      failedAttemptsRef.current[endpoint] = {
        count: (failedAttemptsRef.current[endpoint]?.count || 0) + 1,
        timestamp: now
      };
      
      // Don't log 403 errors to reduce console noise
      if (error.response?.status === 403) {
        // Set error but don't log to console
        const errorMessage = error.response?.data?.detail || 'Permission denied';
        setErrors(prev => ({ ...prev, [endpoint]: errorMessage }));
      } 
      // Handle 500 errors with special care to prevent infinite loops
      else if (error.response?.status === 500) {
        console.error(`Server error (500) from ${endpoint}:`, error);
        const errorMessage = 'Server error occurred. Please try again later.';
        setErrors(prev => ({ ...prev, [endpoint]: errorMessage }));
      }
      else {
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
   * Fetch all statistics data using the consolidated API
   * This single API call will update multiple cache entries
   * @param {Object} dateFilter - Date filter parameters
   * @param {Object} options - Additional options
   */
  const fetchAllStats = useCallback(async (dateFilter = {}, options = {}) => {
    // Get force refresh option and other parameters
    const { forceRefresh = false } = options;

    // Always check if there's an ongoing API call first
    if (fetchingRef.current[API_PATHS.getAllStatsWithoutFilter]) {
      console.log('🛑 Already fetching all stats, skipping duplicate request');
      return initialRequestPromise || cache[API_PATHS.getAllStatsWithoutFilter] || null;
    }
    
    // Handle initial page load request synchronization
    if (!initialLoadCompletedRef.current && !forceRefresh) {
      // If this is our first request, start the process
      if (!isInitialRequestInProgress) {
        console.log('🔄 Initial stats load starting - first request');
        isInitialRequestInProgress = true;
        
        // Create the request promise that will be shared by all components
        initialRequestPromise = (async () => {
          try {
            // Set a flag so parallel requests know we're fetching
            fetchingRef.current[API_PATHS.getAllStatsWithoutFilter] = true;
            
            // Make the actual request
            const result = await makeStatRequest(dateFilter, options);
            
            // Mark initial load as completed
            initialLoadCompletedRef.current = true;
            
            return result;
          } finally {
            // Clean up once we're done
            isInitialRequestInProgress = false;
            fetchingRef.current[API_PATHS.getAllStatsWithoutFilter] = false;
          }
        })();
        
        return initialRequestPromise;
      } else {
        // If there's already a request in progress, reuse that promise
        console.log('🔁 Initial stats request already in progress, reusing existing promise');
        return initialRequestPromise || cache[API_PATHS.getAllStatsWithoutFilter] || null;
      }
    }
    
    // Add debounce logic to prevent multiple calls in quick succession
    const currentTime = Date.now();
    const lastFetchTime = lastFetchTimestampRef.current[API_PATHS.getAllStatsWithoutFilter] || 0;
    const timeSinceLastFetch = currentTime - lastFetchTime;
    const debounceTime = 3000; // 3 seconds debounce
    
    // Skip if recently fetched (unless force refresh is requested)
    if (!forceRefresh && timeSinceLastFetch < debounceTime) {
      console.log(`⏱️ Skipping fetch, last request was ${timeSinceLastFetch}ms ago (debounce: ${debounceTime}ms)`);
      return cache[API_PATHS.getAllStatsWithoutFilter] || null;
    }
    
    // For subsequent requests, make a new request
    return makeStatRequest(dateFilter, options);
  }, [cache]);

  // Separate the actual request logic to avoid duplication
  const makeStatRequest = async (dateFilter = {}, options = {}) => {
    // Set fetching flag to prevent parallel requests
    fetchingRef.current[API_PATHS.getAllStatsWithoutFilter] = true;
    
    try {
      console.log('🚀 Fetching all stats with consolidated API');
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      // Mark all related endpoints as fetching to prevent duplicate requests
      const endpoints = [
        API_PATHS.orderAnalytics,
        API_PATHS.foodTypeStats,
        API_PATHS.orderStatistics,
        API_PATHS.orderTypeStats,
        API_PATHS.weeklyOrderStats,
        API_PATHS.totalCollectionSource,
        API_PATHS.salesPerformance
      ];
      
      endpoints.forEach(endpoint => {
        fetchingRef.current[endpoint] = true;
        setLoadingStates(prev => ({ ...prev, [endpoint]: true }));
      });
      
      // Prepare request data
      const apiRequestData = {
        user_id: parseInt(userId),
        outlet_id: parseInt(outletId),
        app_source: "owner_app",
        ...dateFilter
      };
      
      try {
        // Make the API call to the consolidated endpoint
        const response = await api.post(API_PATHS.getAllStatsWithoutFilter, apiRequestData);
        
        if (response.data && response.data.detail) {
          const allStatsData = response.data.detail;
          const now = Date.now();
          
          // Update each individual cache entry with the relevant section from the response
          const cacheUpdates = {
            [API_PATHS.orderAnalytics]: allStatsData.order_analytics,
            [API_PATHS.foodTypeStats]: allStatsData.food_type_statistics,
            [API_PATHS.orderStatistics]: allStatsData.order_statistics,
            [API_PATHS.orderTypeStats]: allStatsData.order_type_statistics,
            [API_PATHS.weeklyOrderStats]: allStatsData.weekly_order_stats,
            [API_PATHS.totalCollectionSource]: allStatsData.total_collection_source,
            [API_PATHS.salesPerformance]: allStatsData.sales_performance
          };
          
          // Update cache with all new data at once
          setCache(prevCache => ({
            ...prevCache,
            ...cacheUpdates,
            [API_PATHS.getAllStatsWithoutFilter]: allStatsData // Store complete response too
          }));
          
          // Update last fetch timestamps
          Object.keys(cacheUpdates).forEach(endpoint => {
            lastFetchTimestampRef.current[endpoint] = now;
            // Clear errors
            setErrors(prev => ({ ...prev, [endpoint]: null }));
            // Reset failed attempts
            failedAttemptsRef.current[endpoint] = { count: 0, timestamp: 0 };
          });
          
          // Also update the timestamp for the consolidated API
          lastFetchTimestampRef.current[API_PATHS.getAllStatsWithoutFilter] = now;
          
          console.log('✅ Successfully updated all stats data from consolidated API');
          console.log('📊 Data received: ', Object.keys(allStatsData).join(', '));
          return allStatsData;
        } else {
          throw new Error('Invalid response format from consolidated API');
        }
      } catch (consolidatedError) {
        // Handle 502, timeout, and other errors with fallback to individual API calls
        console.error('❌ Error with consolidated API, falling back to individual endpoints:', consolidatedError);
        
        // Set a gentle error message for the consolidated API
        const errorMessage = 'Server is busy, using cached data';
        setErrors(prev => ({ ...prev, [API_PATHS.getAllStatsWithoutFilter]: errorMessage }));
        
        // Return cached data if available
        const cachedAllStats = cache[API_PATHS.getAllStatsWithoutFilter];
        if (cachedAllStats) {
          console.log('📦 Using cached consolidated data as fallback');
          return cachedAllStats;
        }
        
        // If no cached consolidated data, throw to use cached individual endpoints
        throw consolidatedError;
      }
    } catch (error) {
      console.error('❌ Error fetching consolidated stats data:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message ||
                         error.message || 'Failed to fetch statistics data';
      
      // Set error for each endpoint
      [
        API_PATHS.getAllStatsWithoutFilter,
        API_PATHS.orderAnalytics,
        API_PATHS.foodTypeStats,
        API_PATHS.orderStatistics,
        API_PATHS.orderTypeStats,
        API_PATHS.weeklyOrderStats,
        API_PATHS.totalCollectionSource,
        API_PATHS.salesPerformance
      ].forEach(endpoint => {
        setErrors(prev => ({ ...prev, [endpoint]: errorMessage }));
      });
      
      // Return cached data if available
      return cache[API_PATHS.getAllStatsWithoutFilter] || null;
    } finally {
      // Reset loading states for all endpoints
      const endpoints = [
        API_PATHS.orderAnalytics,
        API_PATHS.foodTypeStats,
        API_PATHS.orderStatistics,
        API_PATHS.orderTypeStats,
        API_PATHS.weeklyOrderStats,
        API_PATHS.totalCollectionSource,
        API_PATHS.salesPerformance
      ];
      
      endpoints.forEach(endpoint => {
        fetchingRef.current[endpoint] = false;
        setLoadingStates(prev => ({ ...prev, [endpoint]: false }));
      });
      
      // Also reset for the consolidated API
      fetchingRef.current[API_PATHS.getAllStatsWithoutFilter] = false;
      setLoadingStates(prev => ({ ...prev, [API_PATHS.getAllStatsWithoutFilter]: false }));
    }
  };

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
      
      // Reset failed attempts
      const newFailedAttempts = { ...failedAttemptsRef.current };
      delete newFailedAttempts[endpoint];
      failedAttemptsRef.current = newFailedAttempts;
      
      console.log(`Cleared cache for ${endpoint}`);
    } else {
      // Clear all cache
      setCache({});
      lastFetchTimestampRef.current = {};
      failedAttemptsRef.current = {};
      console.log('Cleared all cache');
    }
  }, []);
  
  // Create the context value
  const value = {
    // Data fetching methods
    fetchData,
    fetchAllStats,
    getCachedData,
    clearCache,
    
    // Status methods
    isLoading,
    getError
  };
  
  return (
    <CacheDataContext.Provider value={value}>
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