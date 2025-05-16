import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { api, API_PATHS } from '../config/apiConfig';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { useDashboard } from '../context/DashboardContext'; // Import context
import { withErrorHandling } from './common';

const PaymentMethodsChart = ({ handleApiError }) => {
  // Get data from context
  const { 
    totalCollectionSource_from_context,
    loading: contextLoading
  } = useDashboard();

  const [dateRange, setDateRange] = useState('All Time');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  const [paymentData, setPaymentData] = useState({
    upi_amount: 0,
    upi_orders: 0,
    cash_amount: 0,
    cash_orders: 0,
    card_amount: 0,
    card_orders: 0,
    complementary_amount: 0,
    complementary_orders: 0
  });
  const [userInteracted, setUserInteracted] = useState(false); // Flag to track user interaction
  
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

  // Use context data when component mounts
  useEffect(() => {
    if (totalCollectionSource_from_context) {
      setPaymentData(totalCollectionSource_from_context);
    }
  }, [totalCollectionSource_from_context]);

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
    setShowDatePicker(range === 'Custom Range');
    if (range !== 'Custom Range') {
       setStartDate(null);
       setEndDate(null);
        fetchData(range);
    }
  };

  const handleReload = () => {
    // Set user interaction flag to true
    setUserInteracted(true);
    
    // Check if we have valid startDate and endDate (indicating custom range)
    if (startDate && endDate) {
      console.log('Reloading with custom date range:', formatDate(startDate), 'to', formatDate(endDate));
      // For custom range, explicitly use 'Custom Range'
      fetchData('Custom Range');
    } else {
      // For other ranges, use the current dateRange state
      console.log('Reloading with standard date range:', dateRange);
      fetchData(dateRange);
    }
  };

  const fetchData = async (range) => {
    try {
        setLoading(true);
        
        const userId = localStorage.getItem('user_id');
        const outletId = localStorage.getItem('outlet_id');
        
        if (!userId || !outletId) {
            console.error('User ID or outlet ID not found');
            setLoading(false);
            return;
        }
        
        // Prepare request data using new simplified format
        const requestData = {
            user_id: Number(userId),
            outlet_id: Number(outletId)
        };

        // Add date range if not "All Time"
        if (range === 'Custom Range' && startDate && endDate) {
            requestData.start_date = formatDate(startDate);
            requestData.end_date = formatDate(endDate);
        } else if (range !== 'All Time') {
            const dateRange = getDateRange(range);
            if (dateRange) {
                requestData.start_date = dateRange.start_date;
                requestData.end_date = dateRange.end_date;
            }
        }

        console.log('Sending total collection source request:', requestData);
        
        // Make API request using the API instance from apiConfig
        const response = await api.post(API_PATHS.totalCollectionSource, requestData);
        
        console.log('Total collection source response:', response.data);

        if (response.data?.detail) {
            // Process the response data from the new format
            const data = response.data.detail;
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
        } else {
            console.error('No data available in response');
        }
    } catch (error) {
        console.error('Failed to fetch payment methods data:', error);
        
        // Use the handleApiError function from the HOC
        if (!handleApiError(error)) {
            // If error was not handled by the HOC (not a 403), handle it here
            // For now, just log it, but you could set a local error state if needed
        }
    } finally {
        setLoading(false);
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
        default:
            return null;
    }
    
    return {
        start_date: formatDate(start),
        end_date: formatDate(end)
    };
};

  const handleCustomDateSelect = () => {
    if (startDate && endDate) {
        setDateRange(`${formatDate(startDate)} - ${formatDate(endDate)}`);
        setShowDatePicker(false);
        fetchData('Custom Range');
    }
  };

  // Transform API data to the format expected by our component
  const data = [
    { method: 'Cash', value: paymentData.cash_amount || 0, count: paymentData.cash_orders || 0 },
    { method: 'Card', value: paymentData.card_amount || 0, count: paymentData.card_orders || 0 },
    { method: 'UPI', value: paymentData.upi_amount || 0, count: paymentData.upi_orders || 0 },
    { method: 'Complementary', value: paymentData.complementary_amount || 0, count: paymentData.complementary_orders || 0 },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Determine current loading state
  const isLoading = userInteracted ? loading : contextLoading;

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
        <h5 className="card-title mb-0">Total Collections Sources</h5>
        <div className="d-flex align-items-center gap-2">
          <div className="dropdown">
            <button
              type="button"
              className="btn btn-outline-primary dropdown-toggle"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="fas fa-calendar me-2"></i>
              {dateRange}
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              {[
                "All Time",
                "Today",
                "Yesterday",
                "Last 7 Days",
                "Last 30 Days",
                "Current Month",
                "Last Month",
              ].map((range) => (
                <li key={range}>
                  <a
                    href="javascript:void(0);"
                    className="dropdown-item d-flex align-items-center"
                    onClick={() => handleDateRangeChange(range)}
                  >
                    {range}
                  </a>
                </li>
              ))}
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <a
                  href="javascript:void(0);"
                  className="dropdown-item d-flex align-items-center"
                  onClick={() => handleDateRangeChange("Custom Range")}
                >
                  Custom Range
                </a>
              </li>
            </ul>
          </div>

          <button
            type="button"
            className={`btn btn-icon p-0 ${isLoading ? "disabled" : ""}`}
            onClick={handleReload}
            disabled={isLoading}
            style={{ border: "1px solid var(--bs-primary)" }}
          >
            <i className={`fas fa-sync-alt ${isLoading ? "fa-spin" : ""}`}></i>
          </button>

          <button
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
            {/* Using two separate images - static frame and animated */}
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
          </button>
        </div>
      </div>

      {showDatePicker && (
        <div className="card-body">
          <div className="d-flex flex-column gap-2">
            <label>Select Date Range:</label>
            <div className="d-flex gap-2">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={new Date()}
                placeholderText="DD MMM YYYY"
                className="form-control"
                dateFormat="dd MMM yyyy"
              />
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                maxDate={new Date()}
                placeholderText="DD MMM YYYY"
                className="form-control"
                dateFormat="dd MMM yyyy"
              />
            </div>
            <button
              className="btn btn-primary mt-2"
              onClick={handleCustomDateSelect}
              disabled={!startDate || !endDate}
            >
              Apply
            </button>
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