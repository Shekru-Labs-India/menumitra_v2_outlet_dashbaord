import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import VerticalSidebar from "../components/VerticalSidebar";
import Header from "../components/Header";
import PaymentMethodsChart from "../components/PaymentMethodsChart";
import RevenueLossWidget from "../components/RevenueLossWidget";
import ProductAnalysis from "../components/ProductAnalysis";
import OrderStat from "../components/OrderStat";
import FoodTypeGraph from "../components/FoodTypeGraph";
import OrderType from "../components/OrderType";
import OrderAnalytics from '../components/OrderAnalytics';
import OutletStats from '../components/OutletStats';
import Footer from "../components/Footer";
// Import the ForbiddenAccessMessage component
import { ForbiddenAccessMessage } from "../components/common";
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { api, API_PATHS } from '../config/apiConfig';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useNavigate } from 'react-router-dom';
import PaymentMethodCount from "../components/PaymentMethodCount";
import WeeklyOrderStat from "../components/WeeklyOrderStat";
import { useDashboard } from "../context/DashboardContext"; // Import the context
import { UpdateService } from '../config/UpdateService'; // Import UpdateService
import logo from "../assets/img/company/MenuMitra_logo.png"; // Import logo

function HomeScreen() {
  // Get data from context
  const { 
    analyticReports_from_context,
    loading: contextLoading, 
    error: contextError,
    refreshDashboard,
    permissionDenied
  } = useDashboard();

  const [dateRange, setDateRange] = useState('All Time');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  const [error, setError] = useState('');
  const [statistics, setStatistics] = useState({
    total_orders: 0,
    average_order_value: 0,
    customer_count: 0,
    total_revenue: 0,
    average_turnover_time: "00:00 - 00:00"
  });
  const [userInteracted, setUserInteracted] = useState(false); // Flag to track if user has interacted with filters
  const didInitialLoadRef = useRef(false); // Use ref instead of state to avoid re-renders
  const postLoginFetchedRef = useRef(false); // Track if we've already fetched after login
  const navigate = useNavigate();
  
  // Add state for version check
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [redirectProgress, setRedirectProgress] = useState(0);
  const [redirectTimer, setRedirectTimer] = useState(null);

  // Check if user just arrived from login/OTP verification
  const isPostLogin = () => {
    // Get the timestamp of when token was saved (if available)
    const tokenTimestamp = localStorage.getItem('token_timestamp');
    if (!tokenTimestamp) return false;
    
    // Check if token was saved recently (within last 10 seconds)
    const now = Date.now();
    const tokenTime = parseInt(tokenTimestamp, 10);
    return now - tokenTime < 10000; // 10 seconds
  };

  // Check version on component mount
  useEffect(() => {
    const checkVersion = async () => {
      const versionData = await UpdateService.checkForUpdates();
      setVersionInfo(versionData);
      
      if (versionData.hasUpdate) {
        setShowUpdatePopup(true);
        
        // Start progress bar for 5 seconds
        let progress = 0;
        const interval = setInterval(() => {
          progress += 2; // 2% per 100ms = 100% in 5 seconds
          setRedirectProgress(progress);
          
          if (progress >= 100) {
            clearInterval(interval);
            // Redirect to login after 5 seconds
            navigate('/login');
          }
        }, 100);
        
        setRedirectTimer(interval);
      }
    };
    
    checkVersion();
    
    // Cleanup interval on unmount
    return () => {
      if (redirectTimer) {
        clearInterval(redirectTimer);
      }
    };
  }, [navigate]);

  // Check if user is logged in
  useEffect(() => {
    // Don't check credentials on the login page to prevent redirect loops
    if (window.location.pathname.includes('/login')) {
      console.log('On login page, skipping auth check');
      return;
    }
    
    const userId = localStorage.getItem('user_id');
    const accessToken = localStorage.getItem('access_token');
    
    // Log auth status for debugging
    console.log('HomeScreen auth check:', { 
      hasUserId: !!userId,
      hasToken: !!accessToken,
      tokenLength: accessToken ? accessToken.length : 0,
      path: window.location.pathname,
      isPostLogin: isPostLogin(),
      didInitialLoadRef: didInitialLoadRef.current,
      postLoginFetchedRef: postLoginFetchedRef.current
    });
    
    if (!userId || !accessToken) {
      console.warn('Missing credentials in HomeScreen, redirecting to login');
      navigate('/login');
      return;
    }
    
    // Only fetch on initial mount or post-login (one time)
    if (!didInitialLoadRef.current) {
      console.log('First time load, marking initial load done');
      didInitialLoadRef.current = true;
      refreshDashboard();
      return;
    }
    
    // Handle the post-login case, but only once
    const isAfterLogin = isPostLogin();
    if (isAfterLogin && !postLoginFetchedRef.current) {
      console.log('Post-login detected, doing one-time refresh');
      postLoginFetchedRef.current = true;
      refreshDashboard();
    }
  }, [navigate, refreshDashboard]);

  // Use context data when component mounts
  useEffect(() => {
    if (analyticReports_from_context) {
      console.log('Received context data:', { 
        hasData: !!analyticReports_from_context,
        totalOrders: analyticReports_from_context.total_orders,
        timestamp: new Date().toISOString()
      });
      
      setStatistics({
        total_orders: analyticReports_from_context.total_orders || 0,
        average_order_value: analyticReports_from_context.avg_order_value || 0,
        customer_count: 0,
        total_revenue: analyticReports_from_context.total_revenue || 0,
        average_turnover_time: analyticReports_from_context.average_turnover_time || "0 min"
      });
    }
  }, [analyticReports_from_context]);

  // Set error from context if available and redirect to login if authentication fails
  useEffect(() => {
    // Don't process errors if already on login page
    if (window.location.pathname.includes('/login')) {
      return;
    }
    
    if (contextError && !userInteracted) {
      setError(contextError);
      
      // If error contains authentication-related terms, redirect to login
      if (
        contextError.includes('authentication') || 
        contextError.includes('credentials') || 
        contextError.includes('login') ||
        contextError.includes('expired')
      ) {
        console.warn('Authentication error from context, redirecting to login');
        navigate('/login');
      }
    }
  }, [contextError, userInteracted, navigate]);

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

  // Helper function to get auth headers
  const getAuthHeaders = useMemo(() => (includeAuth = true) => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (includeAuth) {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }
    
    return headers;
  }, []);

  // Memoized date formatting function
  const formatDate = useMemo(() => (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }, []);

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

  // Memoized function to prepare request data based on date range
  const prepareRequestData = useMemo(() => (range) => {
    const today = new Date();
    
    const getDateRange = (range) => {
      switch(range) {
        case 'All Time':
          return {}; // Only send outlet_id for All Time
        case 'Today':
          return {
            start_date: formatDate(today),
            end_date: formatDate(today)
          };
        case 'Yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          return {
            start_date: formatDate(yesterday),
            end_date: formatDate(yesterday)
          };
        }
        case 'Last 7 Days': {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 6);
          return {
            start_date: formatDate(sevenDaysAgo),
            end_date: formatDate(today)
          };
        }
        case 'Last 30 Days': {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 29);
          return {
            start_date: formatDate(thirtyDaysAgo),
            end_date: formatDate(today)
          };
        }
        case 'Current Month': {
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          return {
            start_date: formatDate(firstDayOfMonth),
            end_date: formatDate(today)
          };
        }
        case 'Last Month': {
          const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          return {
            start_date: formatDate(firstDayOfLastMonth),
            end_date: formatDate(lastDayOfLastMonth)
          };
        }
        case 'Custom Range': {
          if (startDate && endDate) {
            return {
              start_date: formatDate(startDate),
              end_date: formatDate(endDate)
            };
          }
          return {};
        }
        default: {
          const defaultStart = new Date(today);
          defaultStart.setDate(today.getDate() - 29);
          return {
            start_date: formatDate(defaultStart),
            end_date: formatDate(today)
          };
        }
      }
    };

    const requestData = {
      ...getDateRange(range),
      outlet_id: localStorage.getItem('outlet_id'),
      device_token: localStorage.getItem('device_token') || '',
      device_id: localStorage.getItem('device_id') || ''
    };

    return requestData;
  }, [formatDate, startDate, endDate]);

  // Memoized function to fetch statistics
  const fetchStatistics = useMemo(() => async (range = 'All Time', useAuth = true) => {
    try {
      setLoading(true);
      setError('');
      // Set user interaction flag to true
      setUserInteracted(true);

      const requestData = prepareRequestData(range);
      
      // Get user_id from localStorage
      const userId = localStorage.getItem('user_id');
      
      // Update request data with user_id and remove device tokens
      const apiRequestData = {
        user_id: parseInt(userId),
        outlet_id: parseInt(requestData.outlet_id),
        ...requestData.start_date && { start_date: requestData.start_date },
        ...requestData.end_date && { end_date: requestData.end_date }
      };
      
      console.log('Sending request to analytics_reports with data:', apiRequestData);
      
      const response = await api.post(`${API_PATHS.analyticsReports}`, apiRequestData);

      console.log('API Response:', response.data);
      
      if (response.data?.detail) {
        const responseData = response.data.detail;
        console.log('Statistics data received:', responseData);
        
        setStatistics({
          total_orders: responseData.total_orders || 0,
          average_order_value: responseData.average_order_value || 0,
          customer_count: 0, // Not in response
          total_revenue: responseData.total_revenue || 0,
          average_turnover_time: responseData.average_turnover_time || "0 min"
        });
      } else {
        console.warn('Invalid response format or empty data');
        setError('Received invalid data from server');
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.status === 401 ? 'Unauthorized access' :
                          error.request ? 'No response from server' :
                          'Failed to fetch statistics';
      
      setError(errorMessage);
      if (error.response?.status === 401) {
        navigate('/login');
      }

      // Reset statistics on error
      setStatistics({
        total_orders: 0,
        average_order_value: 0,
        customer_count: 0,
        total_revenue: 0,
        average_turnover_time: "0 min"
      });
    } finally {
      setLoading(false);
    }
  }, [prepareRequestData, navigate, API_PATHS.analyticsReports, api]);

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (range === 'Custom Range') {
      // Don't reset the dates if they're already set
      // Only show the date picker UI
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
      // Reset custom date values when selecting a non-custom range
      setStartDate(null);
      setEndDate(null);
      // Set user interaction flag to true before API call
      setUserInteracted(true);
      console.log('Date range changed to:', range, '- using direct API call');
      fetchStatistics(range);
    }
  };

  const handleReload = () => {
    // Always use direct API call when user clicks reload
    setLoading(true);
    // Set user interaction flag to true
    setUserInteracted(true);
    console.log('Reload button clicked - using direct API call to analytics_reports');
    
    // Check if we have valid startDate and endDate (indicating custom range)
    // regardless of what's in the dateRange state
    if (startDate && endDate) {
      // For custom range, we need to explicitly use 'Custom Range'
      console.log('Reloading with custom date range:', formatDate(startDate), 'to', formatDate(endDate));
      fetchStatistics('Custom Range');
    } else {
      // For other ranges, just use the current dateRange state
      console.log('Reloading with standard date range:', dateRange);
      fetchStatistics(dateRange);
    }
  };

  const handleCustomDateSelect = () => {
    if (startDate && endDate) {
      setDateRange(`${formatDate(startDate)} - ${formatDate(endDate)}`);
      setShowDatePicker(false);
      // Set user interaction flag to true before API call
      setUserInteracted(true);
      console.log('Custom date range selected:', `${formatDate(startDate)} - ${formatDate(endDate)}`);
      fetchStatistics('Custom Range');
    } else {
      setError('Please select both start and end dates.');
    }
  };

  // Skeleton card component
  const StatCardSkeleton = ({ color }) => {
    // Define color mapping for different variants
    const colorMap = {
      primary: { base: '#cfe2ff', highlight: '#9ec5fe' },
      success: { base: '#d1e7dd', highlight: '#a3cfbb' },
      warning: { base: '#fff3cd', highlight: '#ffe69c' },
      info: { base: '#cff4fc', highlight: '#9eeaf9' },
      danger: { base: '#f8d7da', highlight: '#f1aeb5' }
    };

    const selectedColor = colorMap[color] || colorMap.primary;

    return (
      <div className="col-md-6 col-lg-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="d-flex align-items-start justify-content-between">
              <div className="content-left" style={{ flex: 1 }}>
                <Skeleton width={120} height={20} className="mb-2" />
                <div className="d-flex align-items-center">
                  <Skeleton width={80} height={28} className="me-2" />
                  <Skeleton width={40} height={20}  />
                </div>
              </div>
              <div className="avatar">
                <Skeleton 
                  width={38} 
                  height={38} 
                  baseColor={selectedColor.base}
                  highlightColor={selectedColor.highlight}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Stats card component
  const StatCard = ({ title, value, icon, color, isPrice }) => (
    <div className="col-md-6 col-lg-3">
      <div className="card h-100">
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between">
            <div className="content-left">
              <span className="fw-medium d-block mb-1">
                {title}
              </span>
              <div className="d-flex align-items-center">
                <h4 className="mb-0 me-2">{isPrice ? formatIndianCurrency(value) : value}</h4>
              </div>
            </div>
            <div className="avatar">
              <span className={`avatar-initial rounded bg-label-${color}`}>
                <i className={icon}></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Determine current loading state
  const isLoading = userInteracted ? loading : contextLoading;
  // Determine current error state
  const currentError = userInteracted ? error : contextError;

  // If update popup is shown, render the update popup
  if (showUpdatePopup) {
    return (
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <div className="layout-page d-flex flex-column min-vh-100">
            <div className="content-wrapper flex-grow-1">
              <div className="container-fluid flex-grow-1 container-p-y">
                <div className="row justify-content-center">
                  <div className="col-md-8 col-lg-6">
                    <div className="card">
                      <div className="card-body p-4">
                        <div className="text-center mb-4">
                          <img
                            src={logo}
                            alt="MenuMitra Logo"
                            style={{
                              width: "150px",
                              height: "auto",
                              marginBottom: "1.5rem"
                            }}
                          />
                          <h3 className="mb-3" style={{ color: '#dc3545' }}>
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Update Required
                          </h3>
                        </div>

                        <div className="mb-4 text-center">
                          <p className="mb-2 fs-5">Current Version: <strong>{versionInfo?.currentVersion || '1.0.0'}</strong></p>
                          <p className="mb-4 fs-5">Latest Version: <strong>{versionInfo?.serverVersion || '1.3'}</strong></p>
                        </div>

                        <p className="text-danger fs-5">
                          Please update your application to the latest version to continue.
                        </p>

                        <div className="mt-4">
                          <div className="progress mb-2" style={{ height: '10px' }}>
                            <div 
                              className="progress-bar progress-bar-striped progress-bar-animated bg-danger" 
                              role="progressbar" 
                              style={{ width: `${redirectProgress}%` }}
                              aria-valuenow={redirectProgress} 
                              aria-valuemin="0" 
                              aria-valuemax="100"
                            ></div>
                          </div>
                          <p className="text-center text-muted">
                            Redirecting to login in {Math.ceil((100 - redirectProgress) / 2)} seconds...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1">
            <div className="container-fluid flex-grow-1 container-p-y">
              {permissionDenied ? (
                <ForbiddenAccessMessage 
                  title="Permission Denied" 
                  message="You don't have permission to access statistics management functionality."
                  resourceName="Statistics Dashboard"
                  onRetry={() => refreshDashboard()}
                  onBack={() => navigate(-1)}
                />
              ) : currentError ? (
                <div className="alert alert-danger mb-4" role="alert">
                  {currentError}
                </div>
              ) : null}
              {/* Welcome Card Section */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-md-center align-items-start p-4">
                      <h5 className="card-title mb-0">
                        Welcome to MenuMitra Owner Dashboard
                      </h5>
                      <div className="d-flex align-items-center gap-3">
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
                                onClick={() =>
                                  handleDateRangeChange("Custom Range")
                                }
                              >
                                Custom Range
                              </a>
                            </li>
                          </ul>
                        </div>
                        <button
                          type="button"
                          className={`btn btn-icon p-0 ${
                            isLoading ? "disabled" : ""
                          }`}
                          onClick={handleReload}
                          disabled={isLoading}
                          style={{ border: "1px solid var(--bs-primary)" }}
                        >
                          <i
                            className={`fas fa-sync-alt ${
                              isLoading ? "fa-spin" : ""
                            }`}
                          ></i>
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
                            isGifPlaying
                              ? "Animation playing"
                              : "Click to play animation"
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
                      <div className="card-body px-4 py-3">
                        <div className="d-flex flex-column gap-2">
                          <label>Select Date Range:</label>
                          <div className="d-flex gap-2 flex-wrap">
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

                    <div className="card-body p-4">
                      <p className="mb-4">
                        Select an outlet from the search menu above to view
                        detailed analytics and reports.
                      </p>
                      {/* Stats Cards */}
                      <div className="row g-4">
                        {isLoading ? (
                          <>
                            <StatCardSkeleton color="primary" />
                            <StatCardSkeleton color="success" />
                            {/* <StatCardSkeleton color="warning" /> */}
                            <StatCardSkeleton color="info" />
                            <StatCardSkeleton color="danger" />
                          </>
                        ) : (
                          <>
                            <StatCard
                              title="Total Orders"
                              value={statistics.total_orders}
                              icon="fas fa-shopping-cart"
                              color="primary"
                              isPrice={false}
                            />
                            <StatCard
                              title="Total Revenue"
                              value={statistics.total_revenue}
                              icon="fas fa-rupee-sign"
                              color="success"
                              isPrice={true}
                            />
                            {/* <StatCard
                              title="Customers count"
                              value={statistics.customer_count}
                              icon="fas fa-users"
                              color="warning"
                            /> */}
                            <StatCard
                              title="Average Order Value"
                              value={statistics.average_order_value}
                              icon="fas fa-chart-line"
                              color="info"
                              isPrice={true}
                            />
                            <StatCard
                              title="Table Turnover"
                              value={statistics.average_turnover_time}
                              icon="fas fa-chair"
                              color="danger"
                              isPrice={false}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outlet Stats Section */}
              <div className="row mb-4">
                <div className="col-12">
                  <OutletStats />
                </div>
              </div>

              {/* Charts Section */}
              <div className="row g-4 mb-4">
                <div className="col-12 col-md-6 col-lg-6">
                  <div className="h-100">
                    <PaymentMethodsChart />
                  </div>
                </div>
                {/* <div className="col-12 col-md-6 col-lg-6">
                  <div className="h-100">
                    <RevenueLossWidget />
                  </div>
                </div> */}
                <div className="col-12 col-md-6 col-lg-6">
                  <div className="h-100">
                    <OrderStat />
                  </div>
                </div>
              </div>

              {/* Sales Section */}
              <div className="row g-4 mb-4">
                <div className="col-12 col-md-6 col-lg-6">
                  <div className="h-100">
                    <ProductAnalysis />
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-6">
                  <div className="h-100">
                    <FoodTypeGraph />
                  </div>
                </div>
              </div>

              {/* Analytics Section */}
              <div className="row g-4">
                <div className="col-12 col-md-6 col-lg-6">
                  <div className="h-100">
                    <OrderType />
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-6">
                  <div className="h-100">
                    <WeeklyOrderStat />
                  </div>
                </div>

                <div className="row mt-4">
                  <OrderAnalytics />
                </div>
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;