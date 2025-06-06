import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../config/apiConfig';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useCacheData } from '../context/CacheDataContext';

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
  const [startDate, setStartDate] = useState(oneWeekAgo);
  const [endDate, setEndDate] = useState(today);
  
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
  }, [startDate, endDate]);

  const fetchOutletStats = async () => {
    try {
      setError(null);
      setMainStatsPermissionDenied(false);

      const params = {
        outlet_id: localStorage.getItem('outlet_id'),
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
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
          <div className="d-flex flex-column">
            <label className="form-label mb-1">Start Date</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              maxDate={new Date()}
              placeholderText="DD MMM YYYY"
              className="btn btn-outline-secondary"
              dateFormat="dd MMM yyyy"
            />
          </div>
          <div className="d-flex flex-column">
            <label className="form-label mb-1">End Date</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              maxDate={new Date()}
              placeholderText="DD MMM YYYY"
              className="btn btn-outline-secondary"
              dateFormat="dd MMM yyyy"
            />
          </div>
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
                  <p className="text-muted mb-0">Most Popular ({outletData.outlets[0]?.statistics?.most_popular_item?.orders || 0} orders)</p>
                </div>
              </div>
            </div>

            {/* Least Popular Items */}
            <div className="col-md-6 col-lg-3">
              <div className="card h-100 border" style={{ boxShadow: 'none' }}>
                <div className="card-body text-center">
                  <h3 className="mb-1">{outletData.outlets[0]?.statistics?.least_popular_item?.name || 'N/A'}</h3>
                  <p className="text-muted mb-0">Least Popular ({outletData.outlets[0]?.statistics?.least_popular_item?.orders || 0} orders)</p>
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