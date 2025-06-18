import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react';
import { setupAutoRefresh, REFRESH_INTERVAL, refreshMultipleDataSources } from '../utils/autoRefresh';
import { useCacheData } from './CacheDataContext';
import { useDashboard } from './DashboardContext';

// Create the context
const RefreshManagerContext = createContext();

// External reference to the global refresh timer
const globalTimerRef = { current: null };

// At the module level, track if we have an active timer to handle hot reloads
let isAutoRefreshSetup = false;

/**
 * RefreshManagerProvider - Manages auto-refresh functionality across the entire application
 * - Centralizes refresh logic
 * - Ensures consistent timing
 * - Prevents duplicate refresh calls
 */
export const RefreshManagerProvider = ({ children }) => {
  // Get all data fetching functions from CacheDataContext
  const {
    fetchAllStats
  } = useCacheData();
  
  // Get refreshDashboard from DashboardContext
  const { refreshDashboard } = useDashboard();
  
  // Track last refresh time
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  
  // Track if a refresh is currently in progress
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Ref to check if the component is mounted
  const isMountedRef = useRef(true);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Clear auto-refresh timer when component unmounts
      if (globalTimerRef.current) {
        console.log('Cleaning up global auto-refresh timer on RefreshManager unmount');
        clearInterval(globalTimerRef.current);
        globalTimerRef.current = null;
      }
    };
  }, []);
  
  /**
   * Refresh all data sources
   * @param {Object} options - Refresh options
   */
  const refreshAllData = useCallback(async (options = {}) => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing) {
      console.log('🔄 Refresh already in progress, skipping');
      return;
    }
    
    try {
      setIsRefreshing(true);
      console.log('🔄 Global refresh started at', new Date().toISOString());
      
      // Default options for refresh
      const refreshOptions = {
        forceRefresh: true,
        ...options
      };
      
      // Date filter (can be extended)
      const dateFilter = options.dateFilter || {};
      
      // Use the consolidated API to refresh all data at once
      await fetchAllStats(dateFilter, refreshOptions);
      
      // Update last refresh time
      setLastRefreshTime(new Date());
      
      console.log('✅ Global refresh completed at', new Date().toISOString());
    } catch (error) {
      console.error('❌ Error during global refresh:', error);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchAllStats, isRefreshing]);
  
  // Set up auto-refresh
  useEffect(() => {
    console.log('Setting up global auto-refresh');
    
    // Check if auto-refresh is already set up globally (even across hot reloads)
    if (!globalTimerRef.current && !isAutoRefreshSetup) {
      console.log(`Creating new global auto-refresh timer (interval: ${REFRESH_INTERVAL/1000}s)`);
      
      isAutoRefreshSetup = true;
      
      // Use the utility function to set up auto-refresh
      globalTimerRef.current = setInterval(() => {
        console.log(`Auto-refresh triggered at ${new Date().toISOString()}`);
        if (isMountedRef.current) {
          refreshAllData();
        }
      }, REFRESH_INTERVAL);
    } else {
      console.log('Using existing global auto-refresh timer');
    }
    
    // Return cleanup function
    return () => {
      // Note: We don't clear the timer on unmount to allow it to persist
      // It will be cleared when the app is completely unmounted
    };
  }, [refreshAllData]);
  
  // Create the context value
  const value = {
    refreshAllData,
    lastRefreshTime,
    isRefreshing,
    REFRESH_INTERVAL
  };
  
  return (
    <RefreshManagerContext.Provider value={value}>
      {children}
    </RefreshManagerContext.Provider>
  );
};

// Custom hook to use the refresh manager context
export const useRefreshManager = () => {
  const context = useContext(RefreshManagerContext);
  
  if (!context) {
    throw new Error('useRefreshManager must be used within a RefreshManagerProvider');
  }
  
  return context;
};

export default RefreshManagerContext; 