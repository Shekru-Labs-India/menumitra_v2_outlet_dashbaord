import React, { useState, useEffect } from "react";
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext';
import { useCacheData } from '../context/CacheDataContext';
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header';

const OrderType = ({ handleApiError, onVisibilityChange }) => {
  // Get data from dashboard context
  const { 
    orderTypeStatistics_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  const [orderTypes, setOrderTypes] = useState([]);
  const [error, setError] = useState('');

  // Initial data load from cache and context
  useEffect(() => {
    // First check if data is available from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.order_type_statistics) {
      processOrderTypeData(allStatsData.order_type_statistics);
    }
    // If no cached data, use context data
    else if (orderTypeStatistics_from_context) {
      processOrderTypeData(orderTypeStatistics_from_context);
    } else {
      // If no data is available, set default data
      processOrderTypeData({});
    }
    
    // Always make this component visible
    if (onVisibilityChange) {
      onVisibilityChange(true);
    }
    
    // Fetch fresh data in background
    fetchOrderTypeStats();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchOrderTypeStats();
  }, [dateRange]);

  // Process order type data from API or cache
  const processOrderTypeData = (data) => {
    // Map known order types to their display properties
    const orderTypeMap = {
      'dine-in': { name: 'Dine In', icon: 'fas fa-utensils', color: 'primary' },
      'parcel': { name: 'Parcel', icon: 'fas fa-box', color: 'success' },
      'delivery': { name: 'Delivery', icon: 'fas fa-globe', color: 'warning' },
      'counter': { name: 'Counter', icon: 'fas fa-cash-register', color: 'danger' },
      'drive-through': { name: 'Drive Through', icon: 'fas fa-car', color: 'info' }
    };
    
    // Check if the data is in object format with keys like 'dine-in', 'parcel', etc.
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // Convert the object format to our expected array format
      const orderTypesArray = [];
      
      // Include only order types with values greater than 0
      Object.entries(orderTypeMap).forEach(([key, properties]) => {
        const count = data[key] || 0;
        
        // Only add order types with count > 0
        if (count > 0) {
          orderTypesArray.push({
            name: properties.name,
            icon: properties.icon,
            count: count,
            color: properties.color
          });
        }
      });
      
      setOrderTypes(orderTypesArray);
    } else if (Array.isArray(data)) {
      // If it's already an array, filter out items with count of 0
      setOrderTypes(data.filter(item => item.count > 0));
    } else {
      // If no valid data, create an empty array (no order types with values > 0)
      setOrderTypes([]);
    }
  };

  // Fetch order type stats data using the consolidated API
  const fetchOrderTypeStats = async () => {
    try {
      setError('');
      
      // Get date filter from global context
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once
      const allStatsData = await fetchAllStats(dateFilter, {
        forceRefresh: true
      });
      
      if (allStatsData && allStatsData.order_type_statistics) {
        processOrderTypeData(allStatsData.order_type_statistics);
      } else {
        // If no data returned, set default data
        processOrderTypeData({});
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

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0">Order Type Statistics</h5>
      </div>

      {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      <div className="card-body">
        {orderTypes.length === 0 ? (
          <div className="alert alert-info" role="alert">
            No order type data available for the selected period
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default withErrorHandling(OrderType);
