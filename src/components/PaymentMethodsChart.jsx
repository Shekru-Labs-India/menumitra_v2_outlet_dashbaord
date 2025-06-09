import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { API_PATHS } from '../config/apiConfig';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { useDashboard } from '../context/DashboardContext'; // Import dashboard context
import { useCacheData } from '../context/CacheDataContext'; // Import cache context
import { withErrorHandling, DateFilter } from './common';

const PaymentMethodsChart = ({ handleApiError }) => {
  // Get data from dashboard context
  const { 
    totalCollectionSource_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    fetchData,
    getCachedData
  } = useCacheData();

  const [dateRange, setDateRange] = useState('All Time');
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  const [paymentData, setPaymentData] = useState({});
  const [error, setError] = useState('');
  
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

  // Simplified effect to handle the animation timing
  useEffect(() => {
    if (isGifPlaying) {
      // Set a timeout to stop playing after 3 seconds
      const timer = setTimeout(() => {
        setIsGifPlaying(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isGifPlaying]);

  // Initial data load from cache and context
  useEffect(() => {
    // First try to get data from cache
    const cachedData = getCachedData(API_PATHS.totalCollectionSource);
    if (cachedData) {
      processPaymentData(cachedData);
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
    fetchPaymentData(getDateRange(dateRange), { forceRefresh: true });
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
  };

  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const handleCustomDateSelect = (start, end, formattedRange) => {
    setDateRange(formattedRange);
  };

  const handleReload = () => {
    setIsGifPlaying(true);
    
    // Always fetch fresh data on reload, regardless of the date range
    fetchPaymentData(getDateRange(dateRange), { forceRefresh: true });
  };

  // Fetch payment data using the cache context
  const fetchPaymentData = async (dateFilter = {}, options = {}) => {
    try {
      setError('');
      
      // Get user and outlet IDs
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      if (!userId || !outletId) {
        setError('User ID or outlet ID not found. Please check your login.');
        return;
      }
      
      // Prepare request data
      const requestData = {
        user_id: Number(userId),
        outlet_id: Number(outletId),
        ...dateFilter
      };
      
      // Use the fetchData function from context which handles caching
      const data = await fetchData(API_PATHS.totalCollectionSource, requestData, {
        forceRefresh: options.forceRefresh || false,
        transformResponse: (response) => response?.detail || response
      });
      
      if (data) {
        processPaymentData(data);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load payment data. Please try again.');
      }
    }
  };

  // Helper function to get date range
  const getDateRange = (range) => {
    const today = new Date();
    let start, end;
    
    switch (range) {
      case 'Today':
        start = end = new Date();
        break;
      case 'Yesterday':
        start = end = new Date();
        start.setDate(start.getDate() - 1);
        break;
      case 'Last 7 Days':
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - 6);
        break;
      case 'Last 30 Days':
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - 29);
        break;
      case 'Current Month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case 'Last Month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'All Time':
        // For 'All Time', don't send date parameters
        return {};
      default:
        // Check if it's a custom range with format "DD MMM YYYY - DD MMM YYYY"
        if (range.includes(' - ')) {
          const [startStr, endStr] = range.split(' - ');
          // These are already formatted dates, so just pass them directly
          return {
            start_date: startStr,
            end_date: endStr
          };
        }
        // Default case also returns empty object (no date filtering)
        return {};
    }
    
    if (start && end) {
      return {
        start_date: formatDate(start),
        end_date: formatDate(end)
      };
    }
    
    return {};
  };

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
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
        <div className="d-flex align-items-center gap-2">
          <DateFilter 
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onCustomDateSelect={handleCustomDateSelect}
          />

          <button
            type="button"
            className="btn btn-icon p-0"
            onClick={handleReload}
            style={{ border: "1px solid var(--bs-primary)" }}
          >
            <i className="fas fa-sync-alt"></i>
          </button>

          {/* <button
            type="button"
            className="btn btn-icon btn-sm p-0"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              position: "relative",
              border: "1px solid #e9ecef",
            }}
            onClick={() => setIsGifPlaying(true)}
            title={
              isGifPlaying ? "Animation playing" : "Click to play animation"
            }
          >
          
            {isGifPlaying ? (
              // Show animated GIF when playing
              <img
                src={aiAnimationGif}
                alt="AI Animation (Playing)"
                style={{
                  width: "24px",
                  height: "24px",
                  objectFit: "contain",
                }}
              />
            ) : (
              // Show static frame when not playing
              <img
                src={aiAnimationStillFrame}
                alt="AI Animation (Click to play)"
                style={{
                  width: "24px",
                  height: "24px",
                  objectFit: "contain",
                  opacity: 0.9,
                }}
              />
            )}
          </button> */}
        </div>
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