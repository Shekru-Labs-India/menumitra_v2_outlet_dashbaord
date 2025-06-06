import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { useDashboard } from '../context/DashboardContext'; // Import dashboard context
import { useCacheData } from '../context/CacheDataContext'; // Import cache context
import { withErrorHandling } from './common';

const OrderAnalytics = ({ handleApiError }) => {
  // Get data from dashboard context
  const { 
    orderAnalytics_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    fetchData,
    getCachedData
  } = useCacheData();

  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState({
    avg_first_order_time: 0,
    avg_last_order_time: 0,
    avg_order_time: 0,
    avg_cooking_time: 0
  });

  // Simplified effect to handle the animation timing
  useEffect(() => {
    if (isGifPlaying) {
      // Set a timeout to stop playing after 3 seconds
      const timer = setTimeout(() => {
        setIsGifPlaying(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isGifPlaying]);

  // Initial data load from cache and context
  useEffect(() => {
    // First try to get data from cache
    const cachedData = getCachedData(API_PATHS.orderAnalytics);
    if (cachedData) {
      updateAnalyticsFromData(cachedData);
    }
    // If no cached data, use context data
    else if (orderAnalytics_from_context) {
      updateAnalyticsFromData(orderAnalytics_from_context);
    } else {
      // If no data is available yet, ensure we have default values
      setAnalyticsData({
        avg_first_order_time: '0 mins',
        avg_last_order_time: '0 mins',
        avg_order_time: '0 mins',
        avg_cooking_time: '0 mins'
      });
    }
    
    // Explicitly call with empty filter for "All Time"
    // This ensures data is loaded on initial mount even with "All Time" filter
    const emptyFilter = {};
    console.log('OrderAnalytics - Initial load with empty filter for All Time');
    fetchOrderAnalytics(emptyFilter, { forceRefresh: true });
  }, []);

  // Helper function to update analytics data from API response
  const updateAnalyticsFromData = (data) => {
    setAnalyticsData({
      avg_first_order_time: data.first_order_time || '0 mins',
      avg_last_order_time: data.last_order_time || '0 mins',
      avg_order_time: data.average_order_time || '0 mins',
      avg_cooking_time: data.average_cooking_time || '0 mins'
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    
    if (range === 'Custom Range') {
      // Only show date picker, don't reset dates
      setShowDatePicker(true);
    } else {
      // For non-custom ranges, reset dates and fetch data
      setShowDatePicker(false);
      setStartDate(null);
      setEndDate(null);
      fetchOrderAnalytics(getDateRange(range), { forceRefresh: true });
    }
  };

  const handleReload = () => {
    setIsGifPlaying(true);
    
    // Always fetch fresh data on reload, regardless of the date range
    fetchOrderAnalytics(getDateRange(dateRange), { forceRefresh: true });
  };

  // Fetch order analytics data using the cache context
  const fetchOrderAnalytics = async (dateFilter = {}, options = {}) => {
    try {
      setError('');
      
      // Get user and outlet IDs
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      if (!userId || !outletId) {
        setError('User ID or outlet ID not found. Please check your login.');
        return;
      }
      
      // Prepare request data
      const requestData = {
        user_id: Number(userId),
        outlet_id: Number(outletId),
        ...dateFilter
      };
      
      // Use the fetchData function from context which handles caching
      const data = await fetchData(API_PATHS.orderAnalytics, requestData, {
        forceRefresh: options.forceRefresh || false,
        transformResponse: (response) => response?.detail || response
      });
      
      if (data) {
        updateAnalyticsFromData(data);
      }
    } catch (error) {
      console.error('Failed to fetch order analytics:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load order analytics. Please try again.');
      }
    }
  };

  // Helper function to get date range
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
      case 'Custom Range':
        if (startDate && endDate) {
          return {
            start_date: formatDate(startDate),
            end_date: formatDate(endDate)
          };
        }
        return {};
      case 'All Time':
        // For 'All Time', don't send date parameters
        return {};
      default:
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

  const handleCustomDateSelect = () => {
    if (startDate && endDate) {
      setDateRange(`${formatDate(startDate)} - ${formatDate(endDate)}`);
      setShowDatePicker(false);
      fetchOrderAnalytics(getDateRange('Custom Range'), { forceRefresh: true });
    }
  };

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  return (
    <div className="col-12 col-md-6 col-lg-6">
      <div className="card border" style={{ boxShadow: 'none' }}>
        <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
          <h5 className="card-title mb-0">Order Analytics</h5>
          <div className="d-flex align-items-center gap-2">
            <div className="dropdown">
              <button
                type="button"
                className="btn btn-outline-primary dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="fas fa-calendar me-2"></i>
                {dateRange}
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                {[
                  "All Time",
                  "Today",
                  "Yesterday",
                  "Last 7 Days",
                  "Last 30 Days",
                  "Current Month",
                  "Last Month",
                ].map((range) => (
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
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <a
                    href="javascript:void(0);"
                    className="dropdown-item d-flex align-items-center"
                    onClick={() => handleDateRangeChange("Custom Range")}
                  >
                    Custom Range
                  </a>
                </li>
              </ul>
            </div>

            {/* <button
              type="button"
              className="btn btn-icon p-0"
              onClick={handleReload}
              style={{ border: '1px solid var(--bs-primary)' }}
            >
              <i className="fas fa-sync-alt"></i>
            </button> */}

            {/* <button
              type="button"
              className="btn btn-icon btn-sm p-0"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                position: "relative",
                border: '1px solid #e9ecef'
              }}
              onClick={() => setIsGifPlaying(true)}
              title={
                isGifPlaying ? "Animation playing" : "Click to play animation"
              }
            >
             
              {isGifPlaying ? (
                // Show animated GIF when playing
                <img
                  src={aiAnimationGif}
                  alt="AI Animation (Playing)"
                  style={{
                    width: "24px",
                    height: "24px",
                    objectFit: "contain",
                  }}
                />
              ) : (
                // Show static frame when not playing
                <img
                  src={aiAnimationStillFrame}
                  alt="AI Animation (Click to play)"
                  style={{
                    width: "24px",
                    height: "24px",
                    objectFit: "contain",
                    opacity: 0.9,
                  }}
                />
              )}
            </button> */}
          </div>
        </div>

        {showDatePicker && (
          <div className="card-body">
            <div className="d-flex flex-column gap-2">
              <label>Select Date Range:</label>
              <div className="d-flex flex-column flex-md-row gap-2">
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
              <button
                className="btn btn-primary mt-2"
                onClick={handleCustomDateSelect}
                disabled={!startDate || !endDate}
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
          <div className="card-body">
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          </div>
        )}

        <div className="card-body">
          <div className="row g-4">
            <div className="col-md-6">
              <div className="d-flex align-items-center mb-4 pt-1">
                <div
                  className="icon-bg bg-primary rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "40px", height: "40px" }}
                >
                  <i className="fas fa-clock text-white"></i>
                </div>
                <div className="ms-4 d-flex flex-column">
                  <h5 className="mb-0">Avg First Order Time</h5>
                  <p className="mb-0">{analyticsData.avg_first_order_time}</p>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="d-flex align-items-center mb-4">
                <div
                  className="icon-bg bg-success rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "40px", height: "40px" }}
                >
                  <i className="fas fa-hourglass-half text-white"></i>
                </div>
                <div className="ms-4 d-flex flex-column">
                  <h5 className="mb-0">Avg Last Order Time</h5>
                  <p className="mb-0">{analyticsData.avg_last_order_time}</p>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="d-flex align-items-center mb-4 mb-md-0">
                <div
                  className="icon-bg bg-warning rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "40px", height: "40px" }}
                >
                  <i className="fas fa-tachometer-alt text-white"></i>
                </div>
                <div className="ms-4 d-flex flex-column">
                  <h5 className="mb-0">Avg Order Time</h5>
                  <p className="mb-0">{analyticsData.avg_order_time}</p>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="d-flex align-items-center">
                <div
                  className="icon-bg bg-danger rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "40px", height: "40px" }}
                >
                  <i className="fas fa-utensils text-white"></i>
                </div>
                <div className="ms-4 d-flex flex-column">
                  <h5 className="mb-0">Avg Cooking Time</h5>
                  <p className="mb-0">{analyticsData.avg_cooking_time}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withErrorHandling(OrderAnalytics); 