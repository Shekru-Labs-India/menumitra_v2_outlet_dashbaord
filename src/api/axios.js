import axios from 'axios';

// Environment configuration
const isDev = import.meta.env.DEV; // Vite provides this boolean
const MODE = import.meta.env.MODE || 'development'; // 'development' or 'production'

// API URLs - use env variables if available, otherwise fallback to defaults
const DEV_URL = import.meta.env.VITE_API_URL || '';  // Empty string to use relative URLs with proxy
const PROD_URL = import.meta.env.VITE_API_URL || 'https://ghanish.in';

// Base URLs for different environments
const BASE_URL = {
  dev: isDev ? '' : DEV_URL, // Empty for local development with proxy
  prod: PROD_URL // Production API
};

// Common API path prefixes
export const API_PREFIX = '/v2';
export const COMMON_PREFIX = `${API_PREFIX}/common`;
export const STATISTICS_PREFIX = `${API_PREFIX}/outlet_statistics`;

const axiosInstance = axios.create({
  baseURL: MODE === 'development' ? BASE_URL.dev : BASE_URL.prod,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log environment info during development
if (isDev) {
  console.log(`[API Config] Running in ${MODE} mode`);
  console.log(`[API Config] API Prefix: ${API_PREFIX}`);
  console.log(`[API Config] Using proxy: ${isDev}`);
  console.log(`[API Config] Base URL: ${MODE === 'development' ? BASE_URL.dev : BASE_URL.prod}`);
}

// Request interceptor for adding auth token and app_source
axiosInstance.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('access_token');
    
    if (isDev) {
      console.log('Debug - API Request:', {
        url: config.url,
        method: config.method,
        hasToken: !!token
      });
    }
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Check if this is a POST request with data
    if (config.method === 'post' && config.data) {
      // Parse the request data (in case it's a string)
      let requestData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      
      // Add app_source parameter if it doesn't exist
      if (!requestData.app_source) {
        requestData.app_source = 'admin';
      }
      
      // If outlet_id is null or undefined, try to get it from localStorage
      if (requestData.outlet_id === null || requestData.outlet_id === undefined) {
        const storedOutletId = localStorage.getItem('outlet_id');
        if (storedOutletId && storedOutletId !== 'null') {
          requestData.outlet_id = Number(storedOutletId);
        }
      }
      
      // Update the config data
      config.data = typeof config.data === 'string' 
        ? JSON.stringify(requestData) 
        : requestData;
    } else if (config.method === 'get') {
      // For GET requests, add app_source as a query parameter
      config.params = {
        ...config.params,
        app_source: 'admin'
      };
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (isDev) {
      console.error('API Response Error:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data
      });
    }

    // Handle common error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle 401 Unauthorized - typically expired or invalid token
      if (status === 401) {
        // Clear the auth state if token is invalid
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_name');
        localStorage.removeItem('mobile_number');
        localStorage.removeItem('role');
        
        // If not on login page, redirect to login
        if (!window.location.pathname.includes('/login')) {
          // Use timeout to prevent immediate redirect during ongoing request handling
          setTimeout(() => window.location.href = '/login', 500);
        }
      }
      
      // Handle offline mode errors
      if (data?.detail && (data.detail.includes('offline mode') || 
                          data.detail.includes('This operation is not allowed in offline mode'))) {
        // Dispatch custom event for offline mode modal
        window.dispatchEvent(new CustomEvent('offline:error', {
          detail: { error }
        }));
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 