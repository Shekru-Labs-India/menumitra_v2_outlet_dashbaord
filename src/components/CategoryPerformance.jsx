import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
import { useCacheData } from '../context/CacheDataContext';
import { useGlobalDateFilter } from './Header';
import { withErrorHandling } from './withErrorHandling';

const CategoryPerformance = ({ handleApiError, onVisibilityChange }) => {
  const [categoryData, setCategoryData] = useState([]);
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
    } else {
      // If there's no cached data, we'll rely on the centralized data fetching
      // from CacheDataContext's built-in mechanism
    }
    
    // Notify parent that this component is visible
    if (onVisibilityChange) {
      onVisibilityChange(true);
    }
    
    // Fetch data on initial mount to ensure we have data
    fetchCategoryData();
  }, []);
  
  // Only fetch when date range changes, not on initial mount
  useEffect(() => {
    if (dateRange) { // Skip on initial mount
      fetchCategoryData();
    }
  }, [dateRange]);
  
  const fetchCategoryData = async () => {
    try {
      setError(null);
      
      // Get date filter from global context
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once with forceRefresh to ensure we get data
      const allStatsData = await fetchAllStats(dateFilter, {
        forceRefresh: true
      });
      
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
    }
  };
  
  // Process category data to ensure required properties are available
  const processCategoryData = (data) => {
    if (!Array.isArray(data)) {
      return [];
    }
    
    return data.map(category => ({
      category_id: category.category_id || 0,
      category_name: category.category_name || 'Unknown Category',
      total_orders: category.total_orders || 0,
      top_menus: Array.isArray(category.top_menus) 
        ? category.top_menus.map(menu => ({
            menu_id: menu.menu_id || 0,
            menu_name: menu.menu_name || 'Unknown Item',
            sales_count: menu.sales_count || 0,
            total_revenue: menu.total_revenue || 0
          }))
        : []
    }));
  };
  
  // Processed category data - limit to top 5 categories
  const processedData = processCategoryData(categoryData).slice(0, 5);
  
  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }
  
  return (
    <div className="card border h-100" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Category Performance</h5>
      </div>
      
      <div className="card-body">
        {error && !error.includes('permission') ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : processedData && processedData.length > 0 ? (
          <div>
            {processedData.map((category, index) => (
              <div key={category.category_id || index} className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0">{category.category_name}</h6>
                  <span className="badge bg-primary rounded-pill">{category.total_orders} orders</span>
                </div>
                
                {category.top_menus && category.top_menus.length > 0 ? (
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {category.top_menus.map((menu, menuIndex) => (
                      <span 
                        key={menu.menu_id || menuIndex} 
                        className="badge bg-light text-dark"
                        style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}
                      >
                        {menu.menu_name} {menu.sales_count}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small">No menu items available</p>
                )}
                
                {index < processedData.length - 1 && <hr />}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted mb-0">No category data available</p>
          </div>
        )}
      </div>
      
      {processedData && processedData.length > 0 && (
        <div className="card-footer bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span className="fw-bold">{Math.min(processedData.length, 5)}</span> of {categoryData.length} categories
            </div>
            <div>
              <span className="fw-bold">
                {processedData.reduce((total, category) => total + category.total_orders, 0)}
              </span> total orders
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withErrorHandling(CategoryPerformance); 