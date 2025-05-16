import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../config/apiConfig';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { useDashboard } from '../context/DashboardContext'; // Import context
import Chart from 'react-apexcharts';
import { withErrorHandling } from './common';

const OrderAnalytics = ({ handleApiError }) => {
  // Get data from context
  const { 
    orderAnalytics_from_context,
    loading: contextLoading,
    error: contextError
  } = useDashboard();

  const [dateRange, setDateRange] = useState('All Time');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState({
    avg_first_order_time: 0,
    avg_last_order_time: 0,
    avg_order_time: 0,
    avg_cooking_time: 0
  });
  const [userInteracted, setUserInteracted] = useState(false); // Flag to track user interaction

  // Helper function to get auth headers
  const getAuthHeaders = (includeAuth = true) => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Only add Authorization header if includeAuth is true and token exists
    if (includeAuth) {
      const accessToken = localStorage.getItem('access');
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }
    
    return headers;
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
    if (orderAnalytics_from_context) {
      setAnalyticsData({
        avg_first_order_time: orderAnalytics_from_context.first_order_time || '0 mins',
        avg_last_order_time: orderAnalytics_from_context.last_order_time || '0 mins',
        avg_order_time: orderAnalytics_from_context.average_order_time || '0 mins',
        avg_cooking_time: orderAnalytics_from_context.average_cooking_time || '0 mins'
      });
    }
  }, [orderAnalytics_from_context]);

  // Set error from context if available
  useEffect(() => {
    if (contextError && !userInteracted) {
      setError(contextError);
    }
  }, [contextError, userInteracted]);

  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleDateRangeChange = (range) => {
    console.log('Date range changed to:', range);
    setDateRange(range);
    
    if (range === 'Custom Range') {
      // Only show date picker, don't reset dates
      setShowDatePicker(true);
    } else {
      // For non-custom ranges, reset dates and fetch data
      setShowDatePicker(false);
      setStartDate(null);
      setEndDate(null);
      fetchData(range);
    }
  };

  const handleReload = () => {
    console.log('Reloading data...');
    setUserInteracted(true);
    setIsGifPlaying(true);
    
    // Always fetch fresh data on reload, regardless of the date range
    fetchData(dateRange);
  };

  const fetchData = async (range) => {
    try {
      setLoading(true);
      setError('');
      
      // Set user interaction flag to true
      setUserInteracted(true);
      
      // Get user and outlet IDs
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      if (!userId || !outletId) {
        setError('User ID or outlet ID not found. Please check your login.');
        setLoading(false);
        return;
      }
      
      // Prepare request data
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
      
      console.log('Sending order analytics request:', requestData);
      
      // Make API request using the API instance from apiConfig
      const response = await api.post(API_PATHS.orderAnalytics, requestData);
      
      console.log('Order analytics response:', response.data);
      
      // Process response
      if (response.data?.detail) {
        const data = response.data.detail;
        // Update analytics data from response
        setAnalyticsData({
          avg_first_order_time: data.first_order_time || '0 mins',
          avg_last_order_time: data.last_order_time || '0 mins',
          avg_order_time: data.average_order_time || '0 mins',
          avg_cooking_time: data.average_cooking_time || '0 mins'
        });
      } else {
        console.error('Invalid response format');
        setError('Invalid response format received');
      }
    } catch (error) {
      console.error('Failed to fetch order analytics:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load order analytics. Please try again.');
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

  // Determine current loading state
  const isLoading = userInteracted ? loading : contextLoading;
  // Determine current error state
  const currentError = userInteracted ? error : contextError;

  return (
    <div className="col-12 col-md-6 col-lg-6">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
          <h5 className="card-title mb-0">Order Analytics</h5>
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
              style={{ border: '1px solid var(--bs-primary)' }}
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
                border: '1px solid #e9ecef'
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
              <div className="d-flex flex-column flex-md-row gap-2">
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

        {currentError && (
          <div className="card-body">
            <div className="alert alert-danger" role="alert">
              {currentError}
            </div>
          </div>
        )}

        <div className="card-body">
          {isLoading ? (
            // Loading skeleton for analytics cards
            <div className="row g-4">
              {Array(4).fill(0).map((_, index) => (
                <div key={index} className="col-md-6">
                  <div className="d-flex align-items-center mb-4 position-relative" style={{ minHeight: '80px' }}>
                    <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center" 
                         style={{ width: '40px', height: '40px', opacity: 0.5 }}>
                    </div>
                    <div className="ms-4 d-flex flex-column">
                      <div className="bg-secondary mb-2" style={{ width: '120px', height: '18px', opacity: 0.5 }}></div>
                      <div className="bg-secondary" style={{ width: '80px', height: '16px', opacity: 0.5 }}></div>
                    </div>
                    <div className="position-absolute start-0 w-100 h-100 d-flex justify-content-center align-items-center">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="row g-4">
              <div className="col-md-6">
                <div className="d-flex align-items-center mb-4 pt-1">
                  <div
                    className="icon-bg bg-primary rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: "40px", height: "40px" }}
                  >
                    <i className="fas fa-clock text-white"></i>
                  </div>
                  <div className="ms-4 d-flex flex-column">
                    <h5 className="mb-0">Avg First Order Time</h5>
                    <p className="mb-0">{analyticsData.avg_first_order_time}</p>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="d-flex align-items-center mb-4">
                  <div
                    className="icon-bg bg-success rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: "40px", height: "40px" }}
                  >
                    <i className="fas fa-hourglass-half text-white"></i>
                  </div>
                  <div className="ms-4 d-flex flex-column">
                    <h5 className="mb-0">Avg Last Order Time</h5>
                    <p className="mb-0">{analyticsData.avg_last_order_time}</p>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="d-flex align-items-center mb-4 mb-md-0">
                  <div
                    className="icon-bg bg-warning rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: "40px", height: "40px" }}
                  >
                    <i className="fas fa-tachometer-alt text-white"></i>
                  </div>
                  <div className="ms-4 d-flex flex-column">
                    <h5 className="mb-0">Avg Order Time</h5>
                    <p className="mb-0">{analyticsData.avg_order_time}</p>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="d-flex align-items-center">
                  <div
                    className="icon-bg bg-danger rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: "40px", height: "40px" }}
                  >
                    <i className="fas fa-utensils text-white"></i>
                  </div>
                  <div className="ms-4 d-flex flex-column">
                    <h5 className="mb-0">Avg Cooking Time</h5>
                    <p className="mb-0">{analyticsData.avg_cooking_time}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withErrorHandling(OrderAnalytics); 