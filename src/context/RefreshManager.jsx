import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { setupAutoRefresh, REFRESH_INTERVAL, refreshMultipleDataSources } from '../utils/autoRefresh';
import { useCacheData } from './CacheDataContext';
import { useDashboard } from './DashboardContext';

// Create the context
const RefreshManagerContext = createContext();

/**
 * RefreshManagerProvider - Manages auto-refresh functionality across the entire application
 * - Centralizes refresh logic
 * - Ensures consistent timing
 * - Prevents duplicate refresh calls
 */
export const RefreshManagerProvider = ({ children }) => {
  // Get all data fetching functions from CacheDataContext
  const {
    fetchAnalytics,
    fetchOrderAnalytics,
    fetchFoodTypeStats,
    fetchOrderTypeStats,
    fetchOrderStats,
    fetchWeeklyOrderStats,
    fetchPaymentMethodCounts
  } = useCacheData();
  
  // Get refreshDashboard from DashboardContext
  const { refreshDashboard } = useDashboard();
  
  // Track last refresh time
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  
  // Track if a refresh is currently in progress
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  /**
   * Refresh all data sources
   * @param {Object} options - Refresh options
   */
  const refreshAllData = useCallback(async (options = {}) => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing) {
      console.log('Refresh already in progress, skipping');
      return;
    }
    
    try {
      setIsRefreshing(true);
      console.log('Global refresh started at', new Date().toISOString());
      
      // Default options for refresh
      const refreshOptions = {
        forceRefresh: true,
        ...options
      };
      
      // Date filter (can be extended)
      const dateFilter = {};
      
      // Collect all data sources to refresh
      const dataSources = {
        analytics: fetchAnalytics,
        orderAnalytics: fetchOrderAnalytics,
        foodTypeStats: fetchFoodTypeStats,
        orderTypeStats: fetchOrderTypeStats,
        orderStats: fetchOrderStats,
        weeklyOrderStats: fetchWeeklyOrderStats,
        paymentMethodCounts: fetchPaymentMethodCounts
      };
      
      // Refresh all data sources in parallel
      await refreshMultipleDataSources(dataSources, dateFilter, refreshOptions);
      
      // Also call the legacy refresh function for backward compatibility
      await refreshDashboard(dateFilter, refreshOptions);
      
      // Update last refresh time
      setLastRefreshTime(new Date());
      
      console.log('Global refresh completed at', new Date().toISOString());
    } catch (error) {
      console.error('Error during global refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    fetchAnalytics,
    fetchOrderAnalytics,
    fetchFoodTypeStats,
    fetchOrderTypeStats,
    fetchOrderStats,
    fetchWeeklyOrderStats,
    fetchPaymentMethodCounts,
    refreshDashboard,
    isRefreshing
  ]);
  
  // Set up auto-refresh
  useEffect(() => {
    console.log('Setting up global auto-refresh');
    
    // Use the utility function to set up auto-refresh
    const cleanup = setupAutoRefresh(refreshAllData, {
      interval: REFRESH_INTERVAL,
      immediate: false // Don't refresh immediately on mount
    });
    
    // Return cleanup function
    return cleanup;
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