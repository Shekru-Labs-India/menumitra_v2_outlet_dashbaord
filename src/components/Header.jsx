import React, { useState, useEffect, createContext, useContext } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import 'animate.css'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useDashboard } from '../context/DashboardContext'
import { api, API_PATHS } from '../config/apiConfig'
import { useCacheData } from '../context/CacheDataContext'
import { useRefreshManager } from '../context/RefreshManager'
import OutletSearch from './OutletSearch'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

// Create a context for global date filter
export const GlobalDateFilterContext = createContext({
  dateRange: 'All Time',
  setDateRange: () => {},
  startDate: null,
  endDate: null,
  formatDate: () => {},
  getDateFilter: () => ({})
});

// Custom hook to use the global date filter
export const useGlobalDateFilter = () => useContext(GlobalDateFilterContext);

function Header() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('name'); // Default search field
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [userName, setUserName] = useState('User');
  const [outletId, setOutletId] = useState('');
  const [storedRole, setStoredRole] = useState('');
  const [outlets, setOutlets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectOutletError, setSelectOutletError] = useState(null);
  const [selectedOutletData, setSelectedOutletData] = useState(null);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [quickFilters] = useState([]);
  
  // Date filter states
  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get refreshDashboard from context
  const { refreshDashboard } = useDashboard();

  // Get cache data functions
  const { 
    fetchAnalytics, 
    fetchOrderAnalytics, 
    fetchFoodTypeStats, 
    fetchOrderTypeStats, 
    fetchOrderStats, 
    fetchWeeklyOrderStats, 
    fetchPaymentMethodCounts,
    fetchData,
    fetchAllStats
  } = useCacheData();

  // Get refresh manager functions
  const { refreshAllData, isRefreshing } = useRefreshManager();

  // Format date function for date filter
  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Helper function to get date range filter object
  const getDateFilter = (range = dateRange) => {
    const today = new Date();
    let start, end;
    
    switch (range) {
      case 'Today':
        start = end = new Date();
        break;
      case 'Yesterday':
        start = end = new Date();
        start.setDate(start.getDate() - 1);
        break;
      case 'Last 7 Days':
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - 6);
        break;
      case 'Last 30 Days':
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - 29);
        break;
      case 'Current Month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case 'Last Month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'All Time':
        // For 'All Time', don't send date parameters
        return {};
      default:
        // Check if it's a custom range with format "DD MMM YYYY - DD MMM YYYY"
        if (range.includes(' - ')) {
          const [startStr, endStr] = range.split(' - ');
          // These are already formatted dates, so just pass them directly
          return {
            start_date: startStr,
            end_date: endStr
          };
        }
        // Default case also returns empty object (no date filtering)
        return {};
    }
    
    if (start && end) {
      return {
        start_date: formatDate(start),
        end_date: formatDate(end)
      };
    }
    
    return {};
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    
    if (range === 'Custom Range') {
      // Only show date picker, don't reset dates
      setShowDatePicker(true);
    } else {
      // For non-custom ranges, reset dates and refresh data
      setShowDatePicker(false);
      setStartDate(null);
      setEndDate(null);
      
      // Trigger refresh with new date range
      const dateFilter = getDateFilter(range);
      refreshWithDateFilter(dateFilter);
    }
  };

  // Handle custom date selection
  const handleCustomDateSelect = () => {
    if (startDate && endDate) {
      const formattedRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
      setDateRange(formattedRange);
      setShowDatePicker(false);
      
      // Refresh data with custom date range
      const dateFilter = {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
      };
      refreshWithDateFilter(dateFilter);
    }
  };

  // Refresh data with date filter
  const refreshWithDateFilter = (dateFilter) => {
    const refreshFunction = getRefreshFunctionForRoute();
    const options = { forceRefresh: true };
    
    try {
      refreshFunction(dateFilter, options)
        .catch(err => {
          console.error('Error during refresh with date filter:', err);
          showToast('Failed to refresh data', 'error');
        });
    } catch (error) {
      console.error('Error initiating refresh:', error);
      showToast('Failed to refresh data', 'error');
    }
  };

  // Function to show toast notifications
  const showToast = (message, type = 'error') => {
    const options = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored", // Colored theme matches Materio's look
      className: "materio-toast",
      style: {
        borderRadius: '0.5rem',
        boxShadow: '0 0.25rem 1rem rgba(161, 172, 184, 0.45)'
      }
    };

    switch(type) {
      case 'success':
        toast.success(message, options);
        break;
      case 'warning':
        toast.warning(message, options);
        break;
      case 'info':
        toast.info(message, options);
        break;
      case 'error':
      default:
        toast.error(message, options);
        break;
    }
  };

  // Fetch outlets from API
  const fetchOutlets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userId = localStorage.getItem('user_id');
      const accessToken = localStorage.getItem('access_token');
      
      if (!userId || !accessToken) {
        setError('Authentication failed. Please login again.');
        return;
      }

      // Use the simplified payload format as provided
      const response = await api.post(`${API_PATHS.common}/get_outlet_list`, {
        owner_id: parseInt(userId)
      });

      if (response.status !== 200) {
        if (response.status === 401) {
          setError('Session expired. Please login again.');
          navigate('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.data;
      
      // Check for success response based on the presence of outlets array
      if (data.outlets && Array.isArray(data.outlets)) {
        const transformedOutlets = data.outlets.map(outlet => ({
          name: outlet.name,
          location: outlet.address,
          status: outlet.is_open ? 'open' : 'closed',
          outlet_id: outlet.outlet_id,
          outlet_status: outlet.outlet_status,
          account_type: outlet.account_type || '',
          is_active: outlet.outlet_status
        }));
        
        setOutlets(transformedOutlets);
        
        // If there's a stored outlet_id, update selected outlet data
        const storedOutletId = localStorage.getItem('outlet_id');
        if (storedOutletId) {
          const matchingOutlet = transformedOutlets.find(o => o.outlet_id.toString() === storedOutletId);
          if (matchingOutlet) {
            const truncatedName = truncateText(matchingOutlet.name, 20);
            setSelectedOutlet(truncatedName);
            setOutletId(matchingOutlet.outlet_id.toString());
            setSelectedOutletData(matchingOutlet);
          }
        } else if (transformedOutlets.length > 0) {
          // If no stored outlet_id but outlets exist, select the first one
          const firstOutlet = transformedOutlets[0];
          const truncatedName = truncateText(firstOutlet.name, 20);
          setSelectedOutlet(truncatedName);
          setOutletId(firstOutlet.outlet_id.toString());
          setSelectedOutletData(firstOutlet);
          
          // Store this outlet_id for future use
          localStorage.setItem('outlet_id', firstOutlet.outlet_id.toString());
        }
      } else {
        setError(data.detail || 'Failed to fetch outlets');
      }
    } catch (err) {
      console.error('Error fetching outlets:', err);
      setError('Failed to connect to server. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Search outlets using the new API
  

  useEffect(() => {
    fetchOutlets();
  }, []);

  useEffect(() => {
    // Check if menu is collapsed on initial load
    if (window.Helpers) {
      setIsMenuCollapsed(window.Helpers.isCollapsed());
    }
    
    // Listen for menu state changes
    const handleMenuToggle = () => {
      if (window.Helpers) {
        setIsMenuCollapsed(window.Helpers.isCollapsed());
      }
    };
    
    // Add listener for custom event
    window.addEventListener('layout:toggle', handleMenuToggle);
    
    return () => {
      window.removeEventListener('layout:toggle', handleMenuToggle);
    };
  }, []);

  // Load user data from localStorage
  useEffect(() => {
    const storedUserName = localStorage.getItem('user_name');
    const storedOutletId = localStorage.getItem('outlet_id');
    const storedRole = localStorage.getItem('role');

    if (storedUserName) {
      setUserName(storedUserName);
    }
    
    if (storedOutletId) {
      setOutletId(storedOutletId);
    }
    if (storedRole) {
      setStoredRole(storedRole);
    }
  }, []);

  const handleOutletSelect = async (outlet) => {
    try {
      const currentOutletId = localStorage.getItem('outlet_id');
      if (currentOutletId && currentOutletId === outlet.outlet_id.toString()) {
        const truncatedName = truncateText(outlet.name, 20);
        setSelectedOutlet(truncatedName);
        setOutletId(outlet.outlet_id.toString());
        setSelectedOutletData({
          ...outlet,
          outlet_status: outlet.outlet_status
        });
        return;
      }
      
      setIsLoading(true);
      
      const truncatedName = truncateText(outlet.name, 20);
      setSelectedOutlet(truncatedName);
      setOutletId(outlet.outlet_id.toString());
      setSelectedOutletData({
        ...outlet,
        outlet_status: outlet.outlet_status
      });
      
      localStorage.setItem('outlet_id', outlet.outlet_id.toString());
      
      showToast(`Outlet "${outlet.name}" selected successfully!`, 'success');
      
      // Use the refreshAllComponents function instead of just refreshDashboard
      refreshAllComponents();
      
      // Get the specific refresh function for the current route and refresh with the new outlet
      const refreshFunction = getRefreshFunctionForRoute();
      const dateFilter = getDateFilter();
      const options = { forceRefresh: true };
      
      try {
        // Execute the refresh function for the current page
        await refreshFunction(dateFilter, options);
      } catch (refreshError) {
        console.error('Error refreshing current page:', refreshError);
      }
      
    } catch (err) {
      console.error('Error selecting outlet:', err);
      showToast("Failed to select outlet. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('mobile_number');
    localStorage.removeItem('role');
    localStorage.removeItem('access_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('token_timestamp');
    
    window.location.href = '/login';
  };

  const toggleMenu = (e) => {
    e.preventDefault();
    if (window.Helpers) {
      const newState = !window.Helpers.isCollapsed();
      window.Helpers.toggleCollapsed();
      
      // Save state to localStorage if enabled
      if (window.config && window.config.enableMenuLocalStorage) {
        try {
          localStorage.setItem(`templateCustomizer-${window.templateName}--LayoutCollapsed`, String(newState));
        } catch (error) {
          console.error('Error writing to localStorage:', error);
        }
      }

      // For mobile: toggle layout-menu-expanded class
      if (window.Helpers.isSmallScreen()) {
        if (newState) {
          // Adding this class will show the sidebar overlay
          document.documentElement.classList.remove('layout-menu-expanded');
        } else {
          // Removing this class will hide the sidebar overlay
          document.documentElement.classList.add('layout-menu-expanded');
        }
        
        // Update data-menu-open attribute
        document.documentElement.setAttribute('data-menu-open', String(!newState));
      }
      
      // Trigger custom event for other components to listen
      window.dispatchEvent(new Event('layout:toggle'));
      
      setIsMenuCollapsed(newState);
    }
  };

  // Utility function to truncate text
  const truncateText = (text, maxLength, maxWords = 3) => {
    const words = text.split(' ');
    if (words.length <= maxWords) return text; // No truncation for maxWords or fewer words
    let truncated = '';
    for (let word of words) {
      if ((truncated + word).length > maxLength) break;
      truncated += word + ' ';
    }
    return truncated.trim() + '...';
  };

  // Function to refresh all components using the RefreshManager
  const refreshAllComponents = () => {
    console.log('Manual refresh triggered from Header');
    
    // Get the current date filter
    const currentDateFilter = getDateFilter();
    
    // Pass the date filter to refreshAllData
    refreshAllData({ 
      forceRefresh: true,
      dateFilter: currentDateFilter
    });
  };

  // Get the correct refresh function based on the current route
  const getRefreshFunctionForRoute = () => {
    const path = location.pathname;
    console.log(`Getting refresh function for path: ${path}`);
    
    // Map routes to their specific refresh functions
    if (path.includes('/dashboard')) {
      console.log('Using refreshDashboard for /dashboard');
      return refreshDashboard;
    }
    
    if (path.includes('/outlet-details')) {
      console.log('Using outletDetails fetch for /outlet-details');
      return (dateFilter, options) => fetchData(API_PATHS.outletDetails, dateFilter, options);
    }
    
    if (path.includes('/compare-outlets')) {
      console.log('Using outletCompareDetails fetch for /compare-outlets');
      return (dateFilter, options) => fetchData(API_PATHS.outletCompareDetails, dateFilter, options);
    }
    
    if (path.includes('/reports/menu')) {
      console.log('Using menuReport fetch for /reports/menu');
      return (dateFilter, options) => fetchData(API_PATHS.menuReport, dateFilter, options);
    }
    
    if (path.includes('/reports/orders')) {
      console.log('Using orderReport fetch for /reports/orders');
      return (dateFilter, options) => fetchData(API_PATHS.orderReport, dateFilter, options);
    }
    
    if (path.includes('/reports/tables')) {
      console.log('Using tableReport fetch for /reports/tables');
      return (dateFilter, options) => fetchData(API_PATHS.tableReport, dateFilter, options);
    }
    
    if (path.includes('/reports/join-tables')) {
      console.log('Using joinTableReport fetch for /reports/join-tables');
      return (dateFilter, options) => fetchData(API_PATHS.joinTableReport, dateFilter, options);
    }
    
    if (path.includes('/reports/split-tables')) {
      console.log('Using splitTableReport fetch for /reports/split-tables');
      return (dateFilter, options) => fetchData(API_PATHS.splitTableReport, dateFilter, options);
    }
    
    if (path.includes('/reports/order-status')) {
      console.log('Using orderStatusReport fetch for /reports/order-status');
      return (dateFilter, options) => fetchData(API_PATHS.orderStatusReport, dateFilter, options);
    }
    
    if (path.includes('/reports/payment-settle')) {
      console.log('Using paymentSettleReport fetch for /reports/payment-settle');
      return (dateFilter, options) => fetchData(API_PATHS.paymentSettleReport, dateFilter, options);
    }
    
    if (path.includes('/reports/coupons')) {
      console.log('Using couponReport fetch for /reports/coupons');
      return (dateFilter, options) => fetchData(API_PATHS.couponReport, dateFilter, options);
    }
    
    if (path.includes('/reports/inventory')) {
      console.log('Using inventoryReport fetch for /reports/inventory');
      return (dateFilter, options) => fetchData(API_PATHS.inventoryReport, dateFilter, options);
    }
    
    if (path.includes('/reports/staff')) {
      console.log('Using staffReport fetch for /reports/staff');
      return (dateFilter, options) => fetchData(API_PATHS.staffReport, dateFilter, options);
    }
    
    if (path.includes('/reports/customers')) {
      console.log('Using customerReport fetch for /reports/customers');
      return (dateFilter, options) => fetchData(API_PATHS.customerReport, dateFilter, options);
    }
    
    if (path.includes('/statistics')) {
      console.log('Using fetchAllStats for /statistics');
      return fetchAllStats;
    }
    
    // Default to refreshDashboard for any other route
    console.log('No specific refresh function found, using default refreshDashboard');
    return refreshDashboard;
  };

  // Modify the handleRefresh function to remove rotation animation
  const handleRefresh = () => {
    // Get the specific refresh function for the current route
    const refreshFunction = getRefreshFunctionForRoute();
    
    console.log(`Refreshing specific data for route: ${location.pathname} with date filter`);
    
    // Call the specific refresh function with force refresh option and current date filter
    const dateFilter = getDateFilter();
    const options = { forceRefresh: true };
    
    try {
      // Execute the refresh function
      const refreshResult = refreshFunction(dateFilter, options);
      
      // Check if the result is a Promise
      if (refreshResult && typeof refreshResult.then === 'function') {
        // It's a Promise, handle it properly
        refreshResult
          .then(result => {
            if (result) {
              showToast('Data refreshed successfully!', 'success');
            }
          })
          .catch(err => {
            console.error('Error during refresh:', err);
            showToast('Failed to refresh data', 'error');
          });
      } else {
        // Not a Promise, handle synchronously
        showToast('Data refresh initiated', 'info');
      }
    } catch (error) {
      console.error('Error initiating refresh:', error);
      showToast('Failed to refresh data', 'error');
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    fetchOutlets(); // Reset to show all outlets
  };

  // Date filter context value
  const dateFilterContextValue = {
    dateRange,
    setDateRange: handleDateRangeChange,
    startDate,
    endDate,
    formatDate,
    getDateFilter
  };

  return (
    <GlobalDateFilterContext.Provider value={dateFilterContextValue}>
    <div style={{
      position: "sticky",
      top: 0,
      width: "100%",
      zIndex: 1050,
      backgroundColor: "white"
    }}>
      <div 
        style={{
          backgroundColor: '#15a7f3 ',
          color: '#664d03',
          padding: '0.30rem',
          textAlign: 'center',
          fontWeight: 'bold',
          borderBottom: '1px solid #ffecb5',
          position: 'relative',
          zIndex: 1030
        }}
      >
         Testing Environment 
      </div>
      {/* Add custom CSS for React-Toastify to match Materio */}
      <style>
        {`
          /* Custom styling for toasts to match Materio theme */
          .Toastify__toast-theme--colored.Toastify__toast--success {
            background-color: #28c76f !important;
          }
          .Toastify__toast-theme--colored.Toastify__toast--error {
            background-color: #ea5455 !important;
          }
          .Toastify__toast-theme--colored.Toastify__toast--warning {
            background-color: #ff9f43 !important;
          }
          .Toastify__toast-theme--colored.Toastify__toast--info {
            background-color: #00cfe8 !important;
          }
          .Toastify__progress-bar {
            height: 3px !important;
          }
          .materio-toast {
            font-family: inherit;
          }
          .inactive-outlet-banner {
            background-color: #9747FF;
            color: white;
            text-align: center;
            padding: 12px;
            font-size: 16px;
            font-weight: 500;
            width: 100%;
          }
          .outlet-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1050;
            padding: 1rem;
          }
          
          .outlet-modal-content {
            background: white;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            animation: modalFadeIn 0.3s ease-out;
          }
          
          @keyframes modalFadeIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @media (max-width: 768px) {
            .outlet-modal-content {
              width: 95%;
              max-height: 95vh;
            }

            .outlet-modal {
              padding: 0.5rem;
            }

            .outlet-modal-header {
              padding: 1rem;
            }

            .outlet-modal-body {
              padding: 1rem;
            }

            .outlet-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
              padding: 0.75rem;
            }

            .outlet-meta {
              width: 100%;
              justify-content: space-between;
              margin-left: 0;
            }

            .outlet-info {
              width: 100%;
            }

            .outlet-name {
              font-size: 0.9rem;
            }

            .outlet-location {
              font-size: 0.8rem;
            }

            .outlet-id {
              font-size: 0.75rem;
            }

            .outlet-status {
              font-size: 0.7rem;
              padding: 0.2rem 0.4rem;
            }
          }

          @media (max-width: 480px) {
            .outlet-modal-content {
              width: 100%;
              height: 100%;
              max-height: 100vh;
              border-radius: 0;
            }

            .outlet-modal {
              padding: 0;
            }

            .quick-filters {
              padding: 0.5rem;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              scrollbar-width: none;
              -ms-overflow-style: none;
            }

            .quick-filters::-webkit-scrollbar {
              display: none;
            }

            .outlet-search input {
              font-size: 0.9rem;
              padding: 0.5rem 1rem 0.5rem 2rem;
            }
          }
          
          .outlet-modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: white;
            z-index: 1;
          }
          
          .outlet-modal-body {
            padding: 1.5rem;
          }
          
          .outlet-search {
            position: relative;
            margin-bottom: 1rem;
            position: sticky;
            top: 72px;
            background: white;
            z-index: 1;
            padding: 0.5rem 0;
          }
          
          .outlet-search input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 2.5rem;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            font-size: 1rem;
          }
          
          .outlet-search i {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #566a7f;
          }
          
          .outlet-search .clear-btn {
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            border: none;
            background: none;
            color: #566a7f;
            cursor: pointer;
            padding: 0.25rem 0.5rem;
          }
          
          .quick-filters {
            display: flex;
            flex-wrap: nowrap;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            padding: 0.75rem;
            background: #f8f9fa;
            border-radius: 8px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            position: sticky;
            top: 130px;
            z-index: 1;
          }
          
          .quick-filter {
            padding: 0.5rem 1rem;
            background: white;
            border-radius: 20px;
            border: 1px solid #e9ecef;
            color: #566a7f;
            cursor: pointer;
            white-space: nowrap;
            font-size: 0.875rem;
            flex-shrink: 0;
            transition: all 0.2s ease;
          }

          .quick-filter:hover {
            background: #f8f9fa;
            border-color: #566a7f;
          }
          
          .outlet-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .outlet-item {
            padding: 1rem;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            align-items: center;
            cursor: pointer;
            gap: 1rem;
            transition: background-color 0.2s ease;
          }
          
          .outlet-item:hover {
            background: #f8f9fa;
          }
          
          .outlet-icon {
            color: #566a7f;
            flex-shrink: 0;
            font-size: 1.2rem;
          }

          .outlet-info {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            min-width: 0;
          }

          .outlet-name {
            font-weight: 500;
            color: #566a7f;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .outlet-location {
            font-size: 0.875rem;
            color: #999;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .outlet-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-left: auto;
            flex-shrink: 0;
          }
          
          .outlet-id {
            color: #999;
            font-size: 0.875rem;
          }

          .outlet-status {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border-radius: 1rem;
            font-weight: 500;
          }

          .status-open {
            background-color: #28c76f1a;
            color: #28c76f;
          }

          .status-closed {
            background-color: #ea54551a;
            color: #ea5455;
          }
          
          .status-active {
            background-color: #7367f01a;
            color: #7367f0;
            margin-right: 4px;
          }
          
          .status-inactive {
            background-color: #82868b1a;
            color: #82868b;
            margin-right: 4px;
          }
          
          .status-live {
            background-color: #00cfe81a;
            color: #00cfe8;
            margin-right: 4px;
          }
          
          .status-test {
            background-color: #ff9f431a;
            color: #ff9f43;
            margin-right: 4px;
          }
        `}
      </style>

      {/* Add ToastContainer component at the root level */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      <nav
        className="layout-navbar navbar navbar-expand-xl align-items-center bg-navbar-theme"
        id="layout-navbar"
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
          position: "relative", 
          zIndex: 1000,
          paddingTop: "2.5rem",
          paddingBottom: "2.5rem",
        }}
      >
        <div
          className="container-xxl"
          style={{
            padding: "0 1.5rem",
            marginTop: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <div className="layout-menu-toggle navbar-nav align-items-xl-center me-4 me-xl-0 d-xl-none">
            <a
              className="nav-item nav-link px-0 me-xl-6"
              href="javascript:void(0)"
              onClick={toggleMenu}
              style={{ padding: "0.75rem" }}
            >
              <i className={`fas fa-${isMenuCollapsed ? "bars" : "times"}`} />
            </a>
          </div>
          <div
            className="navbar-nav-right d-flex align-items-center"
            id="navbar-collapse"
            style={{ padding: "0.5rem 0" }}
          >
            {/* Outlet Selector Dropdown */}
            <div className="navbar-nav flex-row">
              <li className="nav-item dropdown me-3">
                <button
                  className="btn btn-outline-primary dropdown-toggle d-flex align-items-center"
                  style={{
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontWeight: 600,
                    boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 2px",
                  }}
                  type="button"
                  onClick={() => setShowOutletModal(true)}
                >
                  <i className="fas fa-store me-2"></i>
                  {selectedOutlet || "Select Outlet"}
                </button>
              </li>
                
                {/* Global Date Filter Dropdown */}
                <li className="nav-item dropdown me-3">
                  <div className="dropdown">
                    <button
                      type="button"
                      className="btn btn-outline-primary dropdown-toggle d-flex align-items-center"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      style={{
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontWeight: 600,
                        boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 2px",
                      }}
                    >
                      <i className="fas fa-calendar me-2"></i>
                      {dateRange}
                    </button>
                    <ul className="dropdown-menu">
                      {['All Time', 'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Current Month', 'Last Month'].map((range) => (
                        <li key={range}>
                          <a
                            href="javascript:void(0);"
                            className="dropdown-item d-flex align-items-center"
                            onClick={() => handleDateRangeChange(range)}
                          >
                            {range}
                          </a>
                        </li>
                      ))}
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <a
                          href="javascript:void(0);"
                          className="dropdown-item d-flex align-items-center"
                          onClick={() => handleDateRangeChange('Custom Range')}
                        >
                          Custom Range
                        </a>
                      </li>
                    </ul>
                  </div>
                </li>
            </div>

            {/* Right aligned items */}
            <ul className="navbar-nav flex-row align-items-center ms-auto">
                {/* Date Picker Modal */}
                {showDatePicker && (
                  <li className="nav-item me-3">
                    <div className="date-picker-container border rounded p-3 bg-white shadow-sm position-absolute" 
                         style={{top: "100%", right: "80px", zIndex: 1060, width: "300px"}}>
                      <div className="d-flex flex-column gap-2">
                        <h6 className="mb-2">Select Date Range:</h6>
                        <div className="d-flex flex-column gap-2">
                          <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            maxDate={new Date()}
                            placeholderText="Start Date"
                            className="form-control"
                            dateFormat="dd MMM yyyy"
                          />
                          <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            maxDate={new Date()}
                            placeholderText="End Date"
                            className="form-control"
                            dateFormat="dd MMM yyyy"
                          />
                        </div>
                        <div className="d-flex gap-2 mt-2">
                          <button
                            className="btn btn-primary"
                            onClick={handleCustomDateSelect}
                            disabled={!startDate || !endDate}
                          >
                            Apply
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => setShowDatePicker(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )}
                
              {/* Refresh Button */}
              <li className="nav-item me-3">
                <div className="d-flex align-items-center">
                  <button
                    className="btn btn-icon p-2"
                    onClick={handleRefresh}
                    style={{ 
                      border: "1px solid var(--bs-primary)",
                      borderRadius: "4px",
                      backgroundColor: isRefreshing ? "rgba(105, 108, 255, 0.08)" : "transparent"
                    }}
                    disabled={isRefreshing}
                    title="Refresh current page data"
                  >
                    <i
                      className={`fas ${isRefreshing ? "fa-spinner" : "fa-sync-alt"}`}
                      style={{ color: "var(--bs-primary)" }}
                    ></i>
                  </button>
                </div>
              </li>

              {/* User Profile */}
              <li className="nav-item navbar-dropdown dropdown-user dropdown">
                <a
                  className="nav-link dropdown-toggle hide-arrow d-flex align-items-center"
                  href="javascript:void(0);"
                  data-bs-toggle="dropdown"
                >
                  <div className="flex-grow-1 me-3 text-end">
                    <h6 className="mb-0 small fw-bold">{userName}</h6>
                    <small className="text-muted">
                      {storedRole.toUpperCase()}
                    </small>
                  </div>
                  <div className="avatar ms-2">
                    <i className="far fa-user-circle fa-2x text-gray"></i>
                  </div>
                </a>
                <ul className="dropdown-menu dropdown-menu-end mt-3 py-2">
                  <li>
                   
                      <div className="d-flex align-items-center">
                        <div className="flex-shrink-0 me-2">
                         
                        </div>
                        <div className="flex-grow-1 align-items-center">
                          <h6 className="mb-0 small">{userName}</h6>
                          <small className="text-muted">
                            {storedRole.toUpperCase()}
                          </small>
                        </div>
                      </div>
                   
                  </li>
                  <li>
                    <div className="dropdown-divider" />
                  </li>
                  <li>
                    <div className="dropdown-divider" />
                  </li>

                  <li>
                    <div className="d-grid px-4 pt-2 pb-1">
                      <button
                        className="btn btn-danger d-flex align-items-center justify-content-center"
                        onClick={logoutUser}
                      >
                        <small className="align-middle">Logout</small>
                        <i className="fas fa-sign-out-alt fa-sm ms-2" />
                      </button>
                    </div>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
          {/* Search Small Screens */}
          <div className="navbar-search-wrapper search-input-wrapper container-xxl d-none">
            <input
              type="text"
              className="form-control search-input  border-0"
              placeholder="Search outlet"
              aria-label="Search outlet"
            />
            <i className="fas fa-times search-toggler cursor-pointer" />
          </div>
        </div>
      </nav>

      {/* Replace the inline outlet modal with the OutletSearch component */}
      <OutletSearch 
        show={showOutletModal}
        onClose={() => setShowOutletModal(false)}
        onSelect={(outlet) => {
          handleOutletSelect(outlet);
          setShowOutletModal(false);
        }}
        title="Select Outlet"
      />

      {/* Show banner only when selected outlet status is false */}
      {selectedOutletData?.outlet_status === false && (
        <div className="inactive-outlet-banner">
          This outlet is inactive. Please contact support.
        </div>
      )}
    </div>
    </GlobalDateFilterContext.Provider>
  );
}

export default Header