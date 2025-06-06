/**
 * Auto-refresh utility for consistent refresh management across the application
 */

// Constants
export const REFRESH_INTERVAL = 30000; // 30 seconds

/**
 * Sets up an auto-refresh interval that calls the provided callback function
 * @param {Function} refreshCallback - The function to call on each refresh interval
 * @param {Object} options - Additional options
 * @param {number} options.interval - Custom interval in milliseconds (defaults to REFRESH_INTERVAL)
 * @param {boolean} options.immediate - Whether to execute the callback immediately before setting up the interval
 * @returns {Function} Cleanup function to clear the interval
 */
export const setupAutoRefresh = (refreshCallback, options = {}) => {
  const { 
    interval = REFRESH_INTERVAL,
    immediate = false 
  } = options;
  
  console.log(`Setting up auto-refresh timer at ${interval/1000} seconds interval`);
  
  // Execute immediately if requested
  if (immediate) {
    try {
      refreshCallback();
    } catch (error) {
      console.error('Error during immediate refresh:', error);
    }
  }
  
  // Set up the interval
  const timerId = setInterval(() => {
    try {
      console.log(`Auto-refresh triggered at ${new Date().toISOString()}`);
      refreshCallback();
    } catch (error) {
      console.error('Error during auto-refresh:', error);
    }
  }, interval);
  
  // Return cleanup function
  return () => {
    console.log('Clearing auto-refresh timer');
    clearInterval(timerId);
  };
};

/**
 * Creates a refresh options object with forceRefresh set to true
 * @param {Object} additionalOptions - Additional options to include
 * @returns {Object} Refresh options object
 */
export const createRefreshOptions = (additionalOptions = {}) => {
  return {
    forceRefresh: true,
    ...additionalOptions
  };
};

/**
 * Helper function to refresh multiple data sources
 * @param {Object} dataSources - Object containing data fetching functions
 * @param {Object} params - Parameters to pass to each function
 * @param {Object} options - Options to pass to each function
 * @returns {Promise<Array>} Array of results from all fetch operations
 */
export const refreshMultipleDataSources = async (dataSources, params = {}, options = {}) => {
  const refreshOptions = createRefreshOptions(options);
  const promises = [];
  
  console.log(`Refreshing ${Object.keys(dataSources).length} data sources with options:`, refreshOptions);
  
  // Create an array of promises for all data sources
  for (const [key, fetchFunction] of Object.entries(dataSources)) {
    if (typeof fetchFunction === 'function') {
      promises.push(
        fetchFunction(params, refreshOptions)
          .catch(error => {
            console.error(`Error refreshing ${key}:`, error);
            return null;
          })
      );
    }
  }
  
  // Wait for all promises to resolve
  return Promise.all(promises);
};

export default {
  REFRESH_INTERVAL,
  setupAutoRefresh,
  createRefreshOptions,
  refreshMultipleDataSources
}; 