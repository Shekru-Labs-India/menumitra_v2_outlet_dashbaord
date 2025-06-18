import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext';
import { useCacheData } from '../context/CacheDataContext';
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header';

const OutletStats = ({ handleApiError, onVisibilityChange }) => {
  // Get data from dashboard context
  const { 
    outletPerformance_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  const [outletStats, setOutletStats] = useState([]);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'revenue',
    direction: 'descending'
  });

  // Initialize the loading state
  const [loading, setLoading] = useState(true);

  // Initial data load from cache and context
  useEffect(() => {
    // First check if data is available from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.outlet_performance) {
      processOutletData(allStatsData.outlet_performance);
    }
    // If no cached data, use context data
    else if (outletPerformance_from_context) {
      processOutletData(outletPerformance_from_context);
    }
    
    // Fetch fresh data in background
    fetchOutletData();

    // Add loading state management
    setLoading(false);
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchOutletData();
  }, [dateRange]);

  // Process outlet data from API response
  const processOutletData = (data) => {
    if (data && Array.isArray(data)) {
      setOutletStats(data);
    } else {
      setOutletStats([]);
    }
  };

  // Helper function to format price in Indian currency format
  const formatIndianCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '₹0';
    return num.toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0
    });
  };

  // Fetch outlet data using the consolidated API
  const fetchOutletData = async () => {
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
      
      if (allStatsData && allStatsData.outlet_performance) {
        processOutletData(allStatsData.outlet_performance);
      }
    } catch (error) {
      console.error('Failed to fetch outlet data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load outlet performance data. Please try again.');
      }
    }
  };

  // Handle sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted data
  const getSortedData = () => {
    if (!outletStats || outletStats.length === 0) return [];

    const sortableData = [...outletStats];
    sortableData.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    return sortableData;
  };

  // Update the useEffect that processes data
  useEffect(() => {
    // If there's no meaningful data, notify parent component via onVisibilityChange
    const hasData = !!outletStats && 
                   outletStats.last_day_order_count > 0 ||
                   outletStats.last_month_order_count > 0 || 
                   outletStats.this_month_order_count > 0;
    
    if (onVisibilityChange) {
      onVisibilityChange(hasData || loading);
    }
  }, [outletStats]);

  // Check if data is meaningful before rendering
  const hasData = !!outletStats && 
                 (outletStats.last_day_order_count > 0 ||
                 outletStats.last_month_order_count > 0 || 
                 outletStats.this_month_order_count > 0);
  
  // Return null if there's no meaningful data or it's not done loading
  if (!hasData && !loading) {
    return null;
  }

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Outlet Performance</h5>
      </div>

      {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      <div className="card-body">
        {outletStats.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Outlet Name</th>
                  <th 
                    className="text-end sortable-header" 
                    onClick={() => requestSort('orders')}
                    style={{ cursor: 'pointer' }}
                  >
                    Orders
                    {sortConfig.key === 'orders' && (
                      <i className={`ms-1 fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                  <th 
                    className="text-end sortable-header" 
                    onClick={() => requestSort('items')}
                    style={{ cursor: 'pointer' }}
                  >
                    Items
                    {sortConfig.key === 'items' && (
                      <i className={`ms-1 fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                  <th 
                    className="text-end sortable-header" 
                    onClick={() => requestSort('revenue')}
                    style={{ cursor: 'pointer' }}
                  >
                    Revenue
                    {sortConfig.key === 'revenue' && (
                      <i className={`ms-1 fas fa-sort-${sortConfig.direction === 'ascending' ? 'up' : 'down'}`}></i>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedData().map((outlet) => (
                  <tr key={outlet.outlet_id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar avatar-sm me-2">
                          <div className="avatar-initial rounded-circle bg-label-primary">
                            {outlet.outlet_name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="fw-medium">{outlet.outlet_name}</div>
                      </div>
                    </td>
                    <td className="text-end">{outlet.orders}</td>
                    <td className="text-end">{outlet.items}</td>
                    <td className="text-end">{formatIndianCurrency(outlet.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-5">
            <p>No outlet performance data available for the selected time period</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorHandling(OutletStats); 