import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
import { useCacheData } from '../context/CacheDataContext';
import { useGlobalDateFilter } from './Header';
import { withErrorHandling } from './withErrorHandling';

const MenuCombos = ({ handleApiError, onVisibilityChange }) => {
  const [comboData, setComboData] = useState([]);
  const [error, setError] = useState(null);
  
  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();
  
  // Get data from cache context
  const { getCachedData, fetchAllStats } = useCacheData();
  
  // Initial data load from cache
  useEffect(() => {
    // First check if we already have data in the cache
    const cachedAllStats = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (cachedAllStats && cachedAllStats.menu_combos) {
      setComboData(cachedAllStats.menu_combos);
    } else {
      // If there's no cached data, we'll rely on the centralized data fetching
      // from CacheDataContext's built-in mechanism
    }
    
    // Always show this component
    if (onVisibilityChange) {
      onVisibilityChange(true);
    }
  }, []);
  
  // Only fetch when date range changes, not on initial mount
  useEffect(() => {
    if (dateRange) { // Skip on initial mount
      fetchComboData();
    }
  }, [dateRange]);
  
  const fetchComboData = async () => {
    try {
      setError(null);
      
      // Get date filter from global context
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once with no forceRefresh
      const allStatsData = await fetchAllStats(dateFilter);
      
      if (allStatsData && allStatsData.menu_combos) {
        setComboData(allStatsData.menu_combos);
      } else {
        setComboData([]);
      }
    } catch (error) {
      console.error('Failed to fetch menu combo data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load menu combination data. Please try again.');
      }
    }
  };
  
  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }
  
  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Top Combo Orders</h5>
      </div>
      
      <div className="card-body p-0">
        {error && !error.includes('permission') ? (
          <div className="alert alert-danger m-3" role="alert">
            {error}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th>#</th>
                  <th>COMBO ITEMS</th>
                  <th className="text-end">ORDER COUNT</th>
                </tr>
              </thead>
              <tbody>
                {comboData && comboData.length > 0 ? (
                  comboData.map((combo, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        {combo.items && combo.items.map((item, idx) => (
                          <React.Fragment key={idx}>
                            {item.name}
                            {idx !== combo.items.length - 1 && (
                              <span className="mx-2 text-muted">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </td>
                      <td className="text-end fw-bold">{combo.order_count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorHandling(MenuCombos);