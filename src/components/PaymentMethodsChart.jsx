import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext';
import { useCacheData } from '../context/CacheDataContext';
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header';

const PaymentMethodsChart = ({ handleApiError, onVisibilityChange }) => {
  // Get data from dashboard context
  const { 
    totalCollectionSource_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  const [paymentData, setPaymentData] = useState({});
  const [error, setError] = useState('');
  
  // Add loading state
  const [loading, setLoading] = useState(true);
  
  // Helper function to format currency in Indian format
  const formatIndianCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '₹0';
    const [integerPart, decimalPart] = num.toFixed(2).split('.');
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `₹${otherNumbers ? formatted + ',' + lastThree : lastThree}.${decimalPart}`;
  };

  // Initial data load from cache and context
  useEffect(() => {
    // First check if data is available from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.total_collection_source) {
      processPaymentData(allStatsData.total_collection_source);
    }
    // If no cached data, use context data
    else if (totalCollectionSource_from_context) {
      processPaymentData(totalCollectionSource_from_context);
    }
    
    // Fetch fresh data in background
    fetchPaymentData();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchPaymentData();
  }, [dateRange]);

  // Process payment data
  const processPaymentData = (data) => {
    if (data) {
      setPaymentData({
        upi_amount: data.upi_amount || 0,
        upi_orders: data.upi_orders || 0,
        cash_amount: data.cash_amount || 0,
        cash_orders: data.cash_orders || 0,
        card_amount: data.card_amount || 0,
        card_orders: data.card_orders || 0,
        complementary_amount: data.complementary_amount || 0,
        complementary_orders: data.complementary_orders || 0
      });
    }
    
    setLoading(false);
    
    // Calculate if there's meaningful data to show
    const hasData = data && (
      data.upi_amount > 0 || data.cash_amount > 0 || 
      data.card_amount > 0 || data.complementary_amount > 0 ||
      data.upi_orders > 0 || data.cash_orders > 0 ||
      data.card_orders > 0 || data.complementary_orders > 0
    );
    
    // Notify parent about visibility
    if (onVisibilityChange) {
      onVisibilityChange(hasData || loading);
    }
  };

  // Fetch payment data using the consolidated API
  const fetchPaymentData = async () => {
    try {
      setLoading(true);
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
      
      if (allStatsData && allStatsData.total_collection_source) {
        processPaymentData(allStatsData.total_collection_source);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load payment data. Please try again.');
      }
      setLoading(false);
    }
  };

  // Check if there's meaningful data
  const hasData = paymentData && 
                 (paymentData.upi_amount > 0 || paymentData.cash_amount > 0 || 
                  paymentData.card_amount > 0 || paymentData.complementary_amount > 0 ||
                  paymentData.upi_orders > 0 || paymentData.cash_orders > 0 ||
                  paymentData.card_orders > 0 || paymentData.complementary_orders > 0);
  
  // Return null if there's no meaningful data and not loading
  if (!hasData && !loading) {
    return null;
  }

  // Transform API data to the format expected by our component
  const data = [
    { method: 'Cash', value: paymentData.cash_amount || 0, count: paymentData.cash_orders || 0 },
    { method: 'Card', value: paymentData.card_amount || 0, count: paymentData.card_orders || 0 },
    { method: 'UPI', value: paymentData.upi_amount || 0, count: paymentData.upi_orders || 0 },
    { method: 'Complementary', value: paymentData.complementary_amount || 0, count: paymentData.complementary_orders || 0 },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
        <h5 className="card-title mb-0">Total Collections Sources</h5>
      </div>

      {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      <div className="card-body">
        <div className="d-flex justify-content-between mb-3">
          <div>
            <h6 className="mb-0">Total: {formatIndianCurrency(total)}</h6>
          </div>
        </div>
        <div className="payment-methods-chart">
          {data.map((item, index) => (
            <div
              key={index}
              className="d-flex align-items-center mb-3 payment-row"
            >
              <div
                className="payment-method text-dark"
                style={{ width: "120px", color: "#433c50" }}
              >
                {item.method}
              </div>
              <div className="flex-grow-1 px-3">
                <div
                  className="progress"
                  style={{ height: "8px", backgroundColor: "#f4f5fa" }}
                >
                  <div
                    className="progress-bar bg-primary"
                    role="progressbar"
                    style={{
                      width: `${
                        Math.max(...data.map((d) => d.value)) === 0 
                          ? 0 // Return 0% width when all values are 0
                          : (item.value / Math.max(...data.map((d) => d.value))) * 100
                      }%`,
                      backgroundColor: "#8c57ff",
                      borderRadius: "4px",
                    }}
                    aria-valuenow={item.value}
                    aria-valuemin="0"
                    aria-valuemax={Math.max(...data.map((d) => d.value)) || 1} // Use 1 as fallback max
                  ></div>
                </div>
              </div>
              <div
                className="payment-amount"
                style={{ width: "120px", textAlign: "right", color: "#433c50" }}
              >
                <div>{formatIndianCurrency(item.value)}</div>
                <div className="text-muted small">{item.count} orders</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Export the component wrapped in the HOC
export default withErrorHandling(PaymentMethodsChart); 