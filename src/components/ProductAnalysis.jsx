import React, { useState, useEffect } from "react";
import { API_PATHS } from "../config/apiConfig";
import { useDashboard } from "../context/DashboardContext";
import { useCacheData } from "../context/CacheDataContext";
import { withErrorHandling } from "./withErrorHandling";
import { useGlobalDateFilter } from "./Header";

const ProductAnalysis = ({ handleApiError, onVisibilityChange }) => {
  // Get data from dashboard context
  const { 
    salesPerformance_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  const [topProducts, setTopProducts] = useState([]);
  const [lowProducts, setLowProducts] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('top');

  // Initial data load from cache and context
  useEffect(() => {
    // First check if data is available from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.sales_performance) {
      processProductData(allStatsData.sales_performance);
    }
    // If no cached data, use context data
    else if (salesPerformance_from_context) {
      processProductData(salesPerformance_from_context);
    }
    
    // Always make this component visible
    if (onVisibilityChange) {
      onVisibilityChange(true);
    }
    
    // Fetch fresh data in background
    fetchProductData();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchProductData();
  }, [dateRange]);

  // Process product data from API response
  const processProductData = (data) => {
    // Check for sales_performance with top_selling and low_selling
    if (data && data.top_selling && Array.isArray(data.top_selling)) {
      // Format the data to include quantity and revenue fields
      const formattedTopProducts = data.top_selling.map(item => ({
        product_id: item.item_id,
        product_name: item.name,
        quantity: item.sales_count || 0,
        revenue: item.total_revenue || 0
      }));
      
      setTopProducts(formattedTopProducts);
      
      // Process low selling products if available
      if (data.low_selling && Array.isArray(data.low_selling)) {
        const formattedLowProducts = data.low_selling.map(item => ({
          product_id: item.item_id,
          product_name: item.name,
          quantity: item.sales_count || 0,
          revenue: item.total_revenue || 0
        }));
        
        setLowProducts(formattedLowProducts);
      }
    } 
    // Check for direct array format
    else if (data && Array.isArray(data)) {
      // For direct array format, we'll assume they're all top selling
      setTopProducts(data);
      setLowProducts([]);
    } 
    // Default to empty arrays
    else {
      setTopProducts([]);
      setLowProducts([]);
    }
  };

  // Fetch product data using the consolidated API
  const fetchProductData = async () => {
    try {
      setError('');
      
      // Get date filter from global context
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once
      const allStatsData = await fetchAllStats(dateFilter, {
        forceRefresh: true
      });
      
      if (allStatsData && allStatsData.sales_performance) {
        processProductData(allStatsData.sales_performance);
      } else {
        setTopProducts([]);
        setLowProducts([]);
      }
    } catch (error) {
      console.error('Failed to fetch product data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load product data. Please try again.');
      }
    }
  };

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  // Get products based on active tab
  const getProductsToDisplay = () => {
    return activeTab === 'top' ? topProducts : lowProducts;
  };

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header">
        <h5 className="card-title mb-3">Products Analysis</h5>
        <div className="d-flex">
          <button
            className={`btn ${activeTab === 'top' ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ 
              backgroundColor: activeTab === 'top' ? '#8c57ff' : 'white',
              color: activeTab === 'top' ? 'white' : '#6c757d',
              borderColor: activeTab === 'top' ? '#8c57ff' : '#dee2e6',
              borderRadius: '4px', 
              padding: '8px 20px',
              minWidth: '280px',
              textAlign: 'center',
              marginRight: '15px'
            }}
            onClick={() => setActiveTab('top')}
          >
            Top Selling
          </button>
          <button
            className={`btn ${activeTab === 'low' ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ 
              backgroundColor: activeTab === 'low' ? '#8c57ff' : 'white',
              color: activeTab === 'low' ? 'white' : '#6c757d',
              borderColor: activeTab === 'low' ? '#8c57ff' : '#dee2e6',
              borderRadius: '4px', 
              padding: '8px 20px',
              minWidth: '280px',
              textAlign: 'center'
            }}
            onClick={() => setActiveTab('low')}
          >
            Low Selling
          </button>
        </div>
      </div>

      {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="bg-light">
              <tr>
                <th>#</th>
                <th>MENU NAME</th>
                <th className="text-end">SALES COUNT</th>
              </tr>
            </thead>
            <tbody>
              {getProductsToDisplay().length > 0 ? (
                getProductsToDisplay().map((product, index) => (
                  <tr key={`${product.product_name || 'product'}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{product.product_name}</td>
                    <td className="text-end fw-bold">{product.quantity || 0}</td>
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
      </div>
    </div>
  );
};

export default withErrorHandling(ProductAnalysis);
