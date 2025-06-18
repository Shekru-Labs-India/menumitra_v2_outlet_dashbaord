import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
import { useCacheData } from '../context/CacheDataContext';
import { useGlobalDateFilter } from './Header';
import { withErrorHandling } from './withErrorHandling';

const MenuCombos = ({ handleApiError }) => {
  const [comboData, setComboData] = useState([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
    } else {
      // If there's no cached data, we'll rely on the centralized data fetching
      // from CacheDataContext's built-in mechanism
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
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };
  
  // Check if data is meaningful before rendering
  const hasData = Array.isArray(comboData) && comboData.length > 0 && 
                  comboData.some(combo => combo.items && combo.items.length > 0 && combo.order_count > 0);
  
  // Return null if there's no meaningful data or a 403 error
  if (!hasData && !loading) {
    return null;
  }
  
  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }
  
  return (
    <div className="card border h-100" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Popular Menu Combinations</h5>
      </div>
      
      <div className="card-body">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error && !error.includes('permission') ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : comboData && comboData.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>Menu Combination</th>
                  <th className="text-center">Order Count</th>
                </tr>
              </thead>
              <tbody>
                {comboData.map((combo, index) => (
                  <tr key={index}>
                    <td>
                      <ul className="list-unstyled mb-0">
                        {combo.items && combo.items.map((item, idx) => (
                          <li key={idx} className={idx !== combo.items.length - 1 ? "mb-1" : ""}>
                            • {item.name}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="text-center align-middle fw-bold">
                      {combo.order_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info" role="alert">
            No menu combination data available
          </div>
        )}
      </div>
      
      {comboData && comboData.length > 0 && (
        <div className="card-footer bg-light">
          <div className="text-muted">
            <small>These are the most frequently ordered combinations of menu items</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default withErrorHandling(MenuCombos);