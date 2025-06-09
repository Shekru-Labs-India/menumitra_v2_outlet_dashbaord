import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../config/apiConfig';
import { useCacheData } from '../context/CacheDataContext';
import DateFilter from './common/DateFilter';

function OutletStats() {
  // Initialize with dates from a week ago to today to ensure we have some data
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  
  const [error, setError] = useState(null);
  const [outletData, setOutletData] = useState({
    outlets: [
      {
        id: localStorage.getItem('outlet_id'),
        statistics: {
          waiters_count: 0,
          avg_order_per_week: 0,
          most_popular_item: {
            name: "",
            orders: 0
          },
          least_popular_item: {
            name: "",
            orders: 0
          }
        }
      }
    ]
  });
  const [allStatsData, setAllStatsData] = useState({
    order_analytics: {
      first_order_time: "",
      last_order_time: "",
      average_order_time: "",
      average_cooking_time: ""
    },
    order_statistics: {
      success_orders: 0,
      cancelled_orders: 0,
      complementary_orders: 0,
      KOT_orders: 0
    }
  });
  const [dateRange, setDateRange] = useState('All Time');
  
  // Track permission denied state separately for each API
  const [mainStatsPermissionDenied, setMainStatsPermissionDenied] = useState(false);
  const [allStatsPermissionDenied, setAllStatsPermissionDenied] = useState(false);

  // Get cache data context
  const { fetchData, getCachedData } = useCacheData();

  useEffect(() => {
    // Check for cached data first
    const cachedOutletStats = getCachedData(API_PATHS.getOutletStats);
    if (cachedOutletStats) {
      setOutletData(cachedOutletStats);
    }
    
    const cachedAllStats = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (cachedAllStats) {
      setAllStatsData(cachedAllStats);
    }
    
    // Fetch fresh data in background
    fetchOutletStats();
    fetchAllStats();
  }, [dateRange]);

  const fetchOutletStats = async () => {
    try {
      setError(null);
      setMainStatsPermissionDenied(false);

      const dateFilter = getDateRange(dateRange);
      const params = {
        outlet_id: localStorage.getItem('outlet_id'),
        ...dateFilter
      };

      console.log('Fetching outlet stats with params:', params);
      
      // Use the fetchData function from context which handles caching
      const data = await fetchData(API_PATHS.getOutletStats, params, { 
        forceRefresh: true,
        transformResponse: (response) => response?.detail || response
      });
      
      if (data && data.outlets && data.outlets.length > 0) {
        setOutletData(data);
        console.log('Outlet data set:', data);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setMainStatsPermissionDenied(true);
      } else {
        console.error('Error fetching outlet stats:', err);
        setError(err.response?.data?.detail || 'Failed to fetch outlet statistics');
      }
    }
  };

  const fetchAllStats = async () => {
    try {
      const params = {
        user_id: localStorage.getItem('user_id'),
        outlet_id: localStorage.getItem('outlet_id')
      };

      console.log('Fetching all stats with params:', params);
      
      // Use the fetchData function from context which handles caching
      const data = await fetchData(API_PATHS.getAllStatsWithoutFilter, params, {
        forceRefresh: true,
        transformResponse: (response) => response?.detail || response
      });
      
      if (data) {
        setAllStatsData(data);
        console.log('All stats data set:', data);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setAllStatsPermissionDenied(true);
      } else {
        console.error('Error fetching all stats:', err);
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getDateRange = (range) => {
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

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const handleCustomDateSelect = (start, end, formattedRange) => {
    setDateRange(formattedRange);
  };

  const formatIndianCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return '₹0.00';
    
    const [integerPart, decimalPart = '00'] = num.toFixed(2).split('.');
    if (integerPart.length <= 3) {
      return `₹${integerPart}.${decimalPart}`;
    }
    
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `₹${formatted},${lastThree}.${decimalPart}`;
  };

  // Only return null if the main stats API has permission denied
  if (mainStatsPermissionDenied) {
    console.log('OutletStats: Main stats permission denied, returning null');
    return null;
  }

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Outlet Statistics</h5>
        <div className="d-flex align-items-center gap-3">
          <DateFilter 
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onCustomDateSelect={handleCustomDateSelect}
          />
        </div>
      </div>
      
      <div className="card-body">
        {error && (
          <div className="alert alert-danger mb-4" role="alert">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <div className="row g-4">
            {/* Staff Stats */}
            <div className="col-md-6 col-lg-3">
              <div className="card h-100 border" style={{ boxShadow: 'none' }}>
                <div className="card-body text-center">
                  <h3 className="mb-1">{outletData.outlets[0]?.statistics?.waiters_count || 0}</h3>
                  <p className="text-muted mb-0">Waiters</p>
                </div>
              </div>
            </div>

            {/* Weekly Orders */}
            <div className="col-md-6 col-lg-3">
              <div className="card h-100 border" style={{ boxShadow: 'none' }}>
                <div className="card-body text-center">
                  <h3 className="mb-1">{outletData.outlets[0]?.statistics?.avg_order_per_week || 0}</h3>
                  <p className="text-muted mb-0">Avg Orders/Week</p>
                </div>
              </div>
            </div>

            {/* Popular Items */}
            <div className="col-md-6 col-lg-3">
              <div className="card h-100 border" style={{ boxShadow: 'none' }}>
                <div className="card-body text-center">
                  <h3 className="mb-1">{outletData.outlets[0]?.statistics?.most_popular_item?.name || 'N/A'}</h3>
                  <p className="text-muted mb-0">Most Popular Menu ({outletData.outlets[0]?.statistics?.most_popular_item?.orders || 0} orders)</p>
                </div>
              </div>
            </div>

            {/* Least Popular Items */}
            <div className="col-md-6 col-lg-3">
              <div className="card h-100 border" style={{ boxShadow: 'none' }}>
                <div className="card-body text-center">
                  <h3 className="mb-1">{outletData.outlets[0]?.statistics?.least_popular_item?.name || 'N/A'}</h3>
                  <p className="text-muted mb-0">Least Popular Menu ({outletData.outlets[0]?.statistics?.least_popular_item?.orders || 0} orders)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Always show detailed statistics section */}
        
        </div>
      </div>
    </div>
  );
}

export default OutletStats; 