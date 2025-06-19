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
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('quantity');
  const [loading, setLoading] = useState(true);

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
      const formattedProducts = data.top_selling.map(item => ({
        product_id: item.item_id,
        product_name: item.name,
        quantity: item.sales_count || 0,
        revenue: item.total_revenue || 0
      }));
      
      setTopProducts(formattedProducts);
    } 
    // Check for direct array format
    else if (data && Array.isArray(data)) {
      setTopProducts(data);
    } 
    // Default to empty array
    else {
      setTopProducts([]);
    }
    
    setLoading(false);
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

  // Fetch product data using the consolidated API
  const fetchProductData = async () => {
    try {
      setLoading(true);
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
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch product data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load product data. Please try again.');
      }
      setLoading(false);
    }
  };

  // Sort products based on active tab
  const getSortedProducts = () => {
    if (!topProducts || !Array.isArray(topProducts)) return [];

    // Clone the array to avoid mutating the original
    const sortedProducts = [...topProducts];

    // Sort based on the active tab
    if (activeTab === 'quantity') {
      sortedProducts.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    } else {
      sortedProducts.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
    }

    // Take only the top 10 items
    return sortedProducts.slice(0, 10);
  };

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Product Sales Analysis</h5>
        <ul className="nav nav-tabs card-header-tabs" style={{ marginBottom: '-0.575rem' }}>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'quantity' ? 'active' : ''}`}
              onClick={() => setActiveTab('quantity')}
            >
              By Quantity
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'revenue' ? 'active' : ''}`}
              onClick={() => setActiveTab('revenue')}
            >
              By Revenue
            </button>
          </li>
        </ul>
      </div>

      {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      <div className="card-body">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : topProducts.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  {activeTab === 'quantity' ? (
                    <th className="text-end">Quantity</th>
                  ) : (
                    <th className="text-end">Revenue</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {getSortedProducts().map((product, index) => (
                  <tr key={`${product.product_name || 'product'}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{product.product_name}</td>
                    {activeTab === 'quantity' ? (
                      <td className="text-end fw-bold">{product.quantity || 0}</td>
                    ) : (
                      <td className="text-end fw-bold">{formatIndianCurrency(product.revenue || 0)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info text-center" role="alert">
            No product sales data available for the selected period.
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorHandling(ProductAnalysis);
