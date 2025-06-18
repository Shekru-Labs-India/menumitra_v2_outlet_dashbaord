import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext'; 
import { useCacheData } from '../context/CacheDataContext'; 
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header'; 

const OrderAnalytics = ({ handleApiError }) => {
  // Get data from dashboard context
  const { 
    orderAnalytics_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState({
    avg_first_order_time: 0,
    avg_last_order_time: 0
  });

  // Initial data load from cache and context
  useEffect(() => {
    // First check if data is available from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.order_analytics) {
      updateAnalyticsFromData(allStatsData.order_analytics);
    } 
    // If no cached data, use context data
    else if (orderAnalytics_from_context) {
      updateAnalyticsFromData(orderAnalytics_from_context);
    } else {
      // If no data is available yet, ensure we have default values
      setAnalyticsData({
        avg_first_order_time: '0 mins',
        avg_last_order_time: '0 mins'
      });
    }
    
    // Fetch fresh data in background
    fetchOrderAnalytics();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchOrderAnalytics();
  }, [dateRange]);

  // Helper function to update analytics data from API response
  const updateAnalyticsFromData = (data) => {
    setAnalyticsData({
      avg_first_order_time: data.first_order_time || '0 mins',
      avg_last_order_time: data.last_order_time || '0 mins'
    });
  };

  // Fetch order analytics data using only the consolidated API
  const fetchOrderAnalytics = async () => {
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
      
      if (allStatsData && allStatsData.order_analytics) {
        updateAnalyticsFromData(allStatsData.order_analytics);
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

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  return (
    <div className="col-12 col-md-6 col-lg-6">
      <div className="card border" style={{ boxShadow: 'none' }}>
        <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
          <h5 className="card-title mb-0">Order Analytics</h5>
        </div>

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default withErrorHandling(OrderAnalytics); 