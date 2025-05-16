import axios from 'axios';

// Environment configuration
const isDev = import.meta.env.DEV; // Vite provides this boolean
const MODE = import.meta.env.MODE || 'development'; // 'development' or 'production'

// API URLs - use env variables if available, otherwise fallback to defaults
const DEV_URL = import.meta.env.VITE_API_URL || 'https://men4u.xyz';
const PROD_URL = import.meta.env.VITE_API_URL || 'https://menusmitra.xyz';

// Base URLs for different environments
const BASE_URL = {
  dev: '/', // Local development with proxy
  prod: PROD_URL // Production API
};

// Common API path prefixes
const API_PREFIX = '/v2';
const COMMON_PREFIX = `${API_PREFIX}/common`;
const STATISTICS_PREFIX = `${API_PREFIX}/outlet_statistics`;

// Create a base axios instance for API requests
const api = axios.create({
  baseURL: isDev ? BASE_URL.dev : BASE_URL.prod,
  timeout: 30000,
});

// Log environment info during development
if (isDev) {
  console.log(`[API Config] Running in ${MODE} mode`);
  console.log(`[API Config] API Prefix: ${API_PREFIX}`);
  console.log(`[API Config] Using proxy: ${isDev}`);
}

// Add a request interceptor to include the token in requests
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('access_token');
    
    console.log('Debug - API Request Interceptor:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      headers: config.headers
    });
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Check if this is a POST request with data
    if (config.method === 'post' && config.data) {
      // Parse the request data (in case it's a string)
      let requestData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      
      // If outlet_id is null or undefined, try to get it from localStorage
      if (requestData.outlet_id === null || requestData.outlet_id === undefined) {
        const storedOutletId = localStorage.getItem('outlet_id');
        if (storedOutletId && storedOutletId !== 'null') {
          requestData.outlet_id = Number(storedOutletId);
          console.log('Request interceptor: Using outlet_id from localStorage:', requestData.outlet_id);
          
          // Update the config data
          config.data = typeof config.data === 'string' 
            ? JSON.stringify(requestData) 
            : requestData;
        } else {
          console.warn('Request interceptor: outlet_id is missing and not found in localStorage');
        }
      }
    }
    
    return config;
  },
  (error) => {
    console.error('Debug - API Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    console.log('Debug - API Response Interceptor:', {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  (error) => {
    console.error('Debug - API Response Interceptor Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });

    // Handle common error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle 401 Unauthorized - typically expired or invalid token
      if (status === 401) {
        console.error('Authentication error: Token invalid or expired');
        // Clear the auth state if token is invalid
        localStorage.removeItem('access_token');
        
        // If not on login page, redirect to login
        if (!window.location.pathname.includes('/login')) {
          console.log('Redirecting to login due to 401 unauthorized response');
          // Use timeout to prevent immediate redirect during ongoing request handling
          setTimeout(() => window.location.href = '/login', 500);
        }
      }
      
      // Log helpful details for 403 Forbidden errors
      if (status === 403) {
        console.error('Permission denied (403 Forbidden):', data.detail || 'No permission for this action');
      }
    }
    
    return Promise.reject(error);
  }
);

// API path constants
const API_PATHS = {
  // Common API endpoints
  common: COMMON_PREFIX,
  updateProfile: `${COMMON_PREFIX}/update_profile`,
  viewProfileDetail: `${COMMON_PREFIX}/view_profile`,
  updateProfileDetail: `${COMMON_PREFIX}/update_profile`,
  activitiesLog: `${COMMON_PREFIX}/activities_log`,
  menuCategoryList: `${COMMON_PREFIX}/menu_category_list`,
  
  // Statistics API endpoints
  outletStatistics: STATISTICS_PREFIX,
  analyticsReports: `${STATISTICS_PREFIX}/analytics_reports`,
  foodTypeStats: `${STATISTICS_PREFIX}/food_type_statistics`,
  orderAnalytics: `${STATISTICS_PREFIX}/order_analytics`,
  orderStatistics: `${STATISTICS_PREFIX}/order_statistics`,
  orderTypeStats: `${STATISTICS_PREFIX}/order_type_statistics`,
  weeklyOrderStats: `${STATISTICS_PREFIX}/weekly_order_stats`,
  salesPerformance: `${STATISTICS_PREFIX}/sales_performance`,
  totalCollectionSource: `${STATISTICS_PREFIX}/total_collection_source`,
  revenueLoss: `${STATISTICS_PREFIX}/revenue_leakage`,
  paymentMethodCounts: `${STATISTICS_PREFIX}/payment_method_counts`,
  menuReport: `${STATISTICS_PREFIX}/menu_report`,
  orderReport: `${STATISTICS_PREFIX}/order_report`,
  tableReport: `${STATISTICS_PREFIX}/table_report`,
  couponReport: `${STATISTICS_PREFIX}/coupon_report`,
  inventoryReport: `${STATISTICS_PREFIX}/inventory_report`,
  staffReport: `${STATISTICS_PREFIX}/staff_report`,
  customerReport: `${STATISTICS_PREFIX}/customer_report`,
};

/**
 * Validates request parameters and provides defaults where appropriate
 * @param {Object} params - Request parameters to validate
 * @returns {Object} - Validated parameters or null if validation fails
 */
export const validateRequestParams = (params) => {
  // Create a copy of the params object to avoid modifying the original
  const validParams = { ...params };
  
  // Check if user_id is present and valid
  if (!validParams.user_id) {
    console.error('Missing required parameter: user_id');
    return null;
  }
  
  // Check if outlet_id is present
  if (validParams.outlet_id === null || validParams.outlet_id === undefined) {
    // Get outlet_id from localStorage as fallback
    const storedOutletId = localStorage.getItem('outlet_id');
    if (storedOutletId) {
      validParams.outlet_id = Number(storedOutletId);
      console.log('Using outlet_id from localStorage:', validParams.outlet_id);
    } else {
      console.error('Missing required parameter: outlet_id');
      return null;
    }
  }
  
  // Ensure user_id and outlet_id are numbers
  validParams.user_id = Number(validParams.user_id);
  validParams.outlet_id = Number(validParams.outlet_id);
  
  return validParams;
};

export { 
  api, 
  API_PATHS,
  API_PREFIX,
  COMMON_PREFIX,
  STATISTICS_PREFIX,
  isDev,
  MODE
}; 