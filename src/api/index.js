import axios from 'axios';

// Environment configuration
const isDev = import.meta.env.DEV; // Vite provides this boolean
const MODE = import.meta.env.MODE || 'development'; // 'development' or 'production'

// API URLs - use env variables if available, otherwise fallback to defaults
const DEV_URL = import.meta.env.VITE_API_URL || 'https://ghanish.in';
const PROD_URL = import.meta.env.VITE_API_URL || 'https://menusmitra.xyz';

// Base URLs for different environments
const BASE_URL = {
  dev: isDev ? '/' : DEV_URL, // Local development with proxy or direct DEV_URL
  prod: PROD_URL // Production API
};

// Common API path prefixes
const API_PREFIX = '/v2';
const COMMON_PREFIX = `${API_PREFIX}/common`;
const STATISTICS_PREFIX = `${API_PREFIX}/outlet_statistics`;

// Create a base axios instance for API requests
const api = axios.create({
  baseURL: MODE === 'development' ? BASE_URL.dev : BASE_URL.prod,
  timeout: 30000,
});

// Add a request interceptor to include the token in requests
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('access_token');
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Check if this is a POST request with data
    if (config.method === 'post' && config.data) {
      // Parse the request data (in case it's a string)
      let requestData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      
      // Add app_source parameter
      requestData.app_source = 'admin';
      
      // If outlet_id is null or undefined, try to get it from localStorage
      if (requestData.outlet_id === null || requestData.outlet_id === undefined) {
        const storedOutletId = localStorage.getItem('outlet_id');
        if (storedOutletId && storedOutletId !== 'null') {
          requestData.outlet_id = Number(storedOutletId);
          
          // Update the config data
          config.data = typeof config.data === 'string' 
            ? JSON.stringify(requestData) 
            : requestData;
        }
      } else {
        // Update the config data with app_source even if outlet_id exists
        config.data = typeof config.data === 'string' 
          ? JSON.stringify(requestData) 
          : requestData;
      }
    } else if (config.method === 'get') {
      // For GET requests, add app_source as a query parameter
      config.params = {
        ...config.params,
        app_source: 'admin'
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common error scenarios
    if (error.response) {
      const { status } = error.response;
      
      // Handle 401 Unauthorized - typically expired or invalid token
      if (status === 401) {
        // Clear the auth state if token is invalid
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        
        // If not on login page, redirect to login
        if (!window.location.pathname.includes('/login')) {
          // Use timeout to prevent immediate redirect during ongoing request handling
          setTimeout(() => window.location.href = '/login', 500);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API path constants
const API_PATHS = {
  // Auth endpoints
  login: `${COMMON_PREFIX}/login`,
  verifyOtp: `${COMMON_PREFIX}/verify_otp`,
  resendOtp: `${COMMON_PREFIX}/resend_otp`,
  
  // Common API endpoints
  common: COMMON_PREFIX,
  
  // Statistics API endpoints
  outletStatistics: STATISTICS_PREFIX,
  getAllStatsWithoutFilter: `${STATISTICS_PREFIX}/get_all_stats`,
  outletDetails: `${STATISTICS_PREFIX}/outlet_details`,
  outletCompareDetails: `${STATISTICS_PREFIX}/outlet_compare_details`,

  // Reports API endpoints
  orderReport: `${STATISTICS_PREFIX}/order_report`,
  menuReport: `${STATISTICS_PREFIX}/menu_report`,
  customerReport: `${STATISTICS_PREFIX}/customer_report`,
  paymentReport: `${STATISTICS_PREFIX}/payment_report`,
  staffReport: `${STATISTICS_PREFIX}/staff_report`,
  tableReport: `${STATISTICS_PREFIX}/table_report`,
  splitTableReport: `${STATISTICS_PREFIX}/report_split_table`,
  joinTableReport: `${STATISTICS_PREFIX}/report_join_table`,
  orderStatusReport: `${STATISTICS_PREFIX}/report_order_status_changed`,
  paymentSettleReport: `${STATISTICS_PREFIX}/report_order_payment_settle_type_changed`,
  couponReport: `${STATISTICS_PREFIX}/coupon_report`,
  tipReport: `${STATISTICS_PREFIX}/tip_report`,
  chargesReport: `${STATISTICS_PREFIX}/charges_report`,
  specialDiscountReport: `${STATISTICS_PREFIX}/special_discount_report`,
  reportFilterCategory: `${STATISTICS_PREFIX}/report_filter_category`,
  inventoryReport: `${STATISTICS_PREFIX}/inventory_report`,
  reportFilterSupplier: `${STATISTICS_PREFIX}/report_filter_supplier`,
  reportFilterSection: `${STATISTICS_PREFIX}/report_filter_section`,
  udhariReport: `${STATISTICS_PREFIX}/udhari_report`,
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