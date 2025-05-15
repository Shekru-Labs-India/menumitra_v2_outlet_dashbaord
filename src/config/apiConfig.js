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
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
  
  // Statistics API endpoints
  outletStatistics: STATISTICS_PREFIX,
  analyticsReports: `${STATISTICS_PREFIX}/analytics_reports`,
  foodTypeStats: `${STATISTICS_PREFIX}/food_type_statistics`,
  orderAnalytics: `${STATISTICS_PREFIX}/order_analytics`,
  orderStatistics: `${STATISTICS_PREFIX}/order_statistics`,
  orderTypeStats: `${STATISTICS_PREFIX}/order_type_statistics`,
  weeklyOrderStats: `${STATISTICS_PREFIX}/weekly_order_stats`,
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