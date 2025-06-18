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
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
  };

  // Fetch order type stats data using the consolidated API
  const fetchOrderTypeStats = async () => {
    try {
      setError('');
      
      // Get user and outlet IDs
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      if (!userId || !outletId) {
        setError('User ID or outlet ID not found. Please check your login.');
        return;
      }
      
      // Get date filter from global context
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once
      const allStatsData = await fetchAllStats(dateFilter, {
        forceRefresh: true
      });
      
      if (allStatsData && allStatsData.order_type_statistics) {
        processOrderTypeData(allStatsData.order_type_statistics);
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

  // ApexCharts options
  const chartOptions = {
    // ... existing chart options ...
  };

  // Improve data check to properly handle both array and object data structures
  const hasData = Array.isArray(orderTypes) 
    ? (orderTypes.length > 0 && orderTypes.some(type => type && type.count > 0))
    : (orderTypes && Object.values(orderTypes).some(count => typeof count === 'number' && count > 0));

  // Notify parent about visibility
  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(hasData || loading);
    }
  }, [orderTypes, loading, onVisibilityChange, hasData]);

  // Add clear console log for debugging
  if (!hasData && !loading) {
    console.log('OrderType: No data to display');
    return null;
  }

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
