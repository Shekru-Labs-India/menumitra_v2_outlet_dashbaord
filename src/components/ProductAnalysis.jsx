import React, { useState, useEffect } from "react";
import { API_PATHS } from "../config/apiConfig";
import { useDashboard } from "../context/DashboardContext";
import { useCacheData } from "../context/CacheDataContext";
import { withErrorHandling } from "./withErrorHandling";
import { useGlobalDateFilter } from "./Header";

const ProductAnalysis = ({ handleApiError }) => {
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
    
    // Fetch fresh data in background
    fetchProductData();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchProductData();
  }, [dateRange]);

  // Process product data from API response
  const processProductData = (data) => {
    if (data && Array.isArray(data)) {
      setTopProducts(data);
    } else {
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
      
      // Get user and outlet IDs
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      if (!userId || !outletId) {
        setError('User ID or outlet ID not found. Please check your login.');
        setLoading(false);
        return;
      }
      
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
      sortedProducts.sort((a, b) => b.quantity - a.quantity);
    } else {
      sortedProducts.sort((a, b) => b.revenue - a.revenue);
    }

    // Take only the top 10 items
    return sortedProducts.slice(0, 10);
  };

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }
  
  // Check if data is meaningful before rendering (at least one valid item in topSelling or lowSelling)
  const hasTopSellingData = topProducts && 
                           Array.isArray(topProducts) && 
                           topProducts.length > 0 &&
                           topProducts.some(item => item && item.product_name && item.quantity > 0);
  
  const hasLowSellingData = topProducts && 
                           Array.isArray(topProducts) && 
                           topProducts.length > 0 &&
                           topProducts.some(item => item && item.product_name && item.quantity < 0);
                           
  // Return null if there's no meaningful data in either category and it's not loading
  if ((!hasTopSellingData && !hasLowSellingData) && !loading) {
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
        {topProducts.length > 0 ? (
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
                  <tr key={`${product.product_name}-${index}`}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar avatar-sm me-2">
                          <div className="avatar-initial rounded-circle bg-label-primary">
                            {product.product_name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <span className="fw-medium">
                            {product.product_name}
                          </span>
                          <small className="text-muted d-block">
                            {product.category_name || 'Uncategorized'}
                          </small>
                        </div>
                      </div>
                    </td>
                    {activeTab === 'quantity' ? (
                      <td className="text-end">
                        <span className="fw-medium">{product.quantity}</span>
                      </td>
                    ) : (
                      <td className="text-end">
                        <span className="fw-medium">
                          {formatIndianCurrency(product.revenue)}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-5">
            <p>No product data available for the selected time period</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorHandling(ProductAnalysis);
