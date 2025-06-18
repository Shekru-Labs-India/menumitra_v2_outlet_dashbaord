import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
import { useCacheData } from '../context/CacheDataContext';
import { useGlobalDateFilter } from './Header';
import { withErrorHandling } from './withErrorHandling';

const CategoryPerformance = ({ handleApiError }) => {
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();
  
  // Get data from cache context
  const { getCachedData, fetchAllStats } = useCacheData();
  
  // Helper function to format currency in Indian format
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
  
  // Update the useEffect that loads data on initial mount
  useEffect(() => {
    // First check if we already have data in the cache
    const cachedAllStats = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (cachedAllStats && cachedAllStats.category_wise_performance) {
      setCategoryData(cachedAllStats.category_wise_performance);
      setLoading(false);
    } else {
      // If there's no cached data, we'll rely on the centralized data fetching
      // from CacheDataContext's built-in mechanism
    }
  }, []);
  
  // Only fetch when date range changes, not on initial mount
  useEffect(() => {
    if (dateRange) { // Skip on initial mount
      fetchCategoryData();
    }
  }, [dateRange]);
  
  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get date filter from global context
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once with no forceRefresh
      const allStatsData = await fetchAllStats(dateFilter);
      
      if (allStatsData && allStatsData.category_wise_performance) {
        setCategoryData(allStatsData.category_wise_performance);
      } else {
        setCategoryData([]);
      }
    } catch (error) {
      console.error('Failed to fetch category performance data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load category performance data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Check if data is meaningful before rendering
  const hasData = Array.isArray(categoryData) && 
                categoryData.length > 0 && 
                categoryData.some(category => category.total_orders > 0);
  
  // Return null if there's no meaningful data or it's not done loading
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
        <h5 className="card-title mb-0">Category Performance</h5>
      </div>
      
      <div className="card-body p-0">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error && !error.includes('permission') ? (
          <div className="alert alert-danger m-3" role="alert">
            {error}
          </div>
        ) : categoryData && categoryData.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered m-0">
              <thead className="table-light">
                <tr>
                  <th>Category</th>
                  <th className="text-center">Total Orders</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((category, index) => (
                  <React.Fragment key={category.category_id || index}>
                    <tr className="table-light">
                      <td className="fw-bold">{category.category_name}</td>
                      <td className="text-center fw-bold">{category.total_orders}</td>
                    </tr>
                    {category.top_menus && category.top_menus.length > 0 && (
                      <tr>
                        <td colSpan="2" className="p-0">
                          <table className="table table-sm m-0">
                            <thead className="table-secondary">
                              <tr>
                                <th className="ps-4">Menu Item</th>
                                <th className="text-center">Sales Count</th>
                                <th className="text-end">Revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {category.top_menus.map((menu, idx) => (
                                <tr key={menu.menu_id || idx}>
                                  <td className="ps-4">{menu.menu_name}</td>
                                  <td className="text-center">{menu.sales_count}</td>
                                  <td className="text-end">{formatIndianCurrency(menu.total_revenue)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info m-3" role="alert">
            No category performance data available
          </div>
        )}
      </div>
      
      {categoryData && categoryData.length > 0 && (
        <div className="card-footer bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span className="fw-bold">{categoryData.length}</span> categories
            </div>
            <div>
              <span className="fw-bold">
                {categoryData.reduce((total, category) => total + category.total_orders, 0)}
              </span> total orders
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withErrorHandling(CategoryPerformance); 