import React, { useState, useEffect } from "react";
import { API_PATHS } from '../config/apiConfig';
import 'remixicon/fonts/remixicon.css';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { useDashboard } from '../context/DashboardContext'; // Import dashboard context
import { useCacheData } from '../context/CacheDataContext'; // Import cache context
import { withErrorHandling, DateFilter } from './common';

const OrderType = ({ handleApiError }) => {
  // Get data from dashboard context
  const { 
    orderTypeStatistics_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    fetchData,
    getCachedData
  } = useCacheData();

  const [dateRange, setDateRange] = useState('All Time');
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  const [orderTypes, setOrderTypes] = useState([]);
  const [error, setError] = useState('');

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
    const cachedData = getCachedData(API_PATHS.orderTypeStats);
    if (cachedData) {
      processOrderTypeData(cachedData);
    }
    // If no cached data, use context data
    else if (orderTypeStatistics_from_context) {
      processOrderTypeData(orderTypeStatistics_from_context);
    }
    
    // Fetch fresh data in background
    fetchOrderTypeStats();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchOrderTypeStats(getDateRange(dateRange), { forceRefresh: true });
  }, [dateRange]);

  // Process order type data from API or cache
  const processOrderTypeData = (data) => {
    // Check if the data is in object format with keys like 'dine-in', 'parcel', etc.
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // Convert the object format to our expected array format
      const orderTypesArray = [];
      
      // Map known order types to their display properties
      const orderTypeMap = {
        'dine-in': { name: 'Dine In', icon: 'fas fa-utensils', color: 'primary' },
        'parcel': { name: 'Parcel', icon: 'fas fa-box', color: 'success' },
        'delivery': { name: 'Delivery', icon: 'fas fa-globe', color: 'warning' },
        'counter': { name: 'Counter', icon: 'fas fa-cash-register', color: 'danger' },
        'drive-through': { name: 'Drive Through', icon: 'fas fa-car', color: 'info' }
      };
      
      // Convert each order type to our array format
      Object.entries(data).forEach(([key, value]) => {
        // Skip total_orders or any non-order type keys
        if (key !== 'total_orders' && orderTypeMap[key]) {
          orderTypesArray.push({
            name: orderTypeMap[key].name,
            icon: orderTypeMap[key].icon,
            count: value,
            color: orderTypeMap[key].color
          });
        }
      });
      
      setOrderTypes(orderTypesArray);
    } else if (Array.isArray(data)) {
      // If it's already an array, use it directly
      setOrderTypes(data);
    } else {
      // If no valid data, set empty array
      setOrderTypes([]);
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

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const handleCustomDateSelect = (start, end, formattedRange) => {
    setDateRange(formattedRange);
  };

  const handleReload = () => {
    setIsGifPlaying(true);
    
    // Always fetch fresh data on reload, regardless of the date range
    fetchOrderTypeStats(getDateRange(dateRange), { forceRefresh: true });
  };

  // Fetch order type stats data using the cache context
  const fetchOrderTypeStats = async (dateFilter = {}, options = {}) => {
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
      const data = await fetchData(API_PATHS.orderTypeStats, requestData, {
        forceRefresh: options.forceRefresh || false,
        transformResponse: (response) => response?.detail || response
      });
      
      if (data) {
        processOrderTypeData(data);
      }
    } catch (error) {
      console.error('Failed to fetch order type statistics:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load order type statistics. Please try again.');
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

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0">Order Type Statistics</h5>
        <div className="d-flex gap-2">
          <DateFilter 
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onCustomDateSelect={handleCustomDateSelect}
          />
          <button
            type="button"
            className="btn btn-icon p-0"
            onClick={handleReload}
            style={{ border: "1px solid var(--bs-primary)" }}
          >
            <i className="fas fa-sync-alt"></i>
          </button>

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
              border: "1px solid #e9ecef",
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

      {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      <div className="card-body">
        {orderTypes.length > 0 ? (
          <div className="row g-3">
            {orderTypes.map((order, index) => (
              <div key={index} className="col-md-4 col-sm-6">
                <div
                  className={`card border bg-label-${order.color} h-100`}
                  style={{ boxShadow: 'none' }}
                >
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-2">
                      <div
                        className={`rounded-2 avatar avatar-sm me-2 bg-${order.color} d-flex align-items-center justify-content-center`}
                        style={{ width: "35px", height: "35px" }}
                      >
                        <i
                          className={`${order.icon} text-white`}
                          style={{ fontSize: "1rem" }}
                        ></i>
                      </div>
                      <span className="fw-semibold">{order.name}</span>
                    </div>
                    <div className="d-flex align-items-center mt-3">
                      <h4 className="mb-0 me-2">{order.count}</h4>
                    </div>
                    <small className="text-muted">Total Orders</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-5">
            <p>No order type data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorHandling(OrderType);
