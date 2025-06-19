import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
import { useCacheData } from '../context/CacheDataContext';
import { useGlobalDateFilter } from './Header';
import { withErrorHandling } from './withErrorHandling';

const CouponStatistics = ({ handleApiError, onVisibilityChange }) => {
  const [couponData, setCouponData] = useState([]);
  const [error, setError] = useState(null);
  
  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();
  
  // Get data from cache context
  const { getCachedData, fetchAllStats } = useCacheData();
  
  // Load data on initial mount and update from cache
  useEffect(() => {
    // First check if we already have data in the cache
    const cachedAllStats = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (cachedAllStats && cachedAllStats.coupon_statistics) {
      setCouponData(cachedAllStats.coupon_statistics);
    } else {
      // If there's no cached data, we'll rely on the centralized data fetching
      // from CacheDataContext's built-in mechanism
    }
    
    // Always make this component visible
    if (onVisibilityChange) {
      onVisibilityChange(true);
    }
  }, []);
  
  // Only fetch when date range changes, not on initial mount
  useEffect(() => {
    if (dateRange) { // Skip on initial mount
      fetchCouponData();
    }
  }, [dateRange]);
  
  const fetchCouponData = async () => {
    try {
      setError(null);
      
      // First check if we already have data in the cache
      const cachedAllStats = getCachedData(API_PATHS.getAllStatsWithoutFilter);
      if (cachedAllStats && cachedAllStats.coupon_statistics) {
        setCouponData(cachedAllStats.coupon_statistics);
        return;
      }
      
      // Get date filter from global context
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once with no forceRefresh
      const allStatsData = await fetchAllStats(dateFilter);
      
      if (allStatsData && allStatsData.coupon_statistics) {
        setCouponData(allStatsData.coupon_statistics);
      } else {
        setCouponData([]);
      }
    } catch (error) {
      console.error('Failed to fetch coupon statistics data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load coupon statistics. Please try again.');
      }
    }
  };
  
  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }
  
  return (
    <div className="card border h-100" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Coupon Statistics</h5>
      </div>
      
      <div className="card-body">
        {error && !error.includes('permission') ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>Coupon Name</th>
                  <th className="text-center">Usage Count</th>
                </tr>
              </thead>
              <tbody>
                {couponData && couponData.length > 0 ? (
                  couponData.map((coupon, index) => (
                    <tr key={coupon.coupon_id || index}>
                      <td className="fw-medium">{coupon.coupon_name}</td>
                      <td className="text-center fw-bold">{coupon.usage_count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="text-center">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {couponData && couponData.length > 0 && (
        <div className="card-footer bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span className="fw-bold">{couponData.length}</span> total coupons
            </div>
            <div>
              <span className="fw-bold">
                {couponData.reduce((total, coupon) => total + coupon.usage_count, 0)}
              </span> total uses
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withErrorHandling(CouponStatistics); 