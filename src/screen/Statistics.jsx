import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import VerticalSidebar from "../components/VerticalSidebar";
import Header from "../components/Header";
import PaymentMethodsChart from "../components/PaymentMethodsChart";
import ProductAnalysis from "../components/ProductAnalysis";
import OrderStat from "../components/OrderStat";
import FoodTypeGraph from "../components/FoodTypeGraph";
import OrderType from "../components/OrderType";
import OrderAnalytics from '../components/OrderAnalytics';
import OutletStats from '../components/OutletStats';
import Footer from "../components/Footer";
import { API_PATHS } from '../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import WeeklyOrderStat from "../components/WeeklyOrderStat";
import { useDashboard } from "../context/DashboardContext";
import { useCacheData } from "../context/CacheDataContext";

function Statistics() {
  // Get data from dashboard context for backward compatibility
  const { 
    permissionDenied,
    refreshDashboard
  } = useDashboard();

  // Get data from cache context
  const { 
    fetchData,
    getCachedData,
    isLoading,
    getError,
    fetchAnalytics
  } = useCacheData();

  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statistics, setStatistics] = useState({
    total_orders: 0,
    average_order_value: 0,
    customer_count: 0,
    total_revenue: 0,
    average_turnover_time: "00:00 - 00:00"
  });
  const navigate = useNavigate();

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

  // Load data on initial mount and update from cache
  useEffect(() => {
    // Try to get cached data first
    const cachedData = getCachedData(API_PATHS.analyticsReports);
    
    if (cachedData) {
      // Use cached data immediately
      updateStatisticsFromData(cachedData);
    }
    
    // Fetch fresh data in background
    fetchAnalytics();
  }, []);

  // Update statistics when cached data changes
  useEffect(() => {
    const analyticsData = getCachedData(API_PATHS.analyticsReports);
    if (analyticsData) {
      updateStatisticsFromData(analyticsData);
    }
  }, [getCachedData]);

  // Helper function to update statistics from data
  const updateStatisticsFromData = (data) => {
    setStatistics({
      total_orders: data.total_orders || 0,
      average_order_value: data.avg_order_value || data.average_order_value || 0,
      customer_count: 0,
      total_revenue: data.total_revenue || 0,
      average_turnover_time: data.average_turnover_time || "0 min"
    });
  };

  // Memoized function to prepare request data based on date range
  const prepareRequestData = useMemo(() => (range) => {
    const today = new Date();
    
    const formatDate = (date) => {
      if (!date) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };
    
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

    return getDateRange(range);
  }, [startDate, endDate]);

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (range === 'Custom Range') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
      setStartDate(null);
      setEndDate(null);
      
      // Fetch data with date range
      const dateFilter = prepareRequestData(range);
      fetchAnalytics(dateFilter, { forceRefresh: true });
    }
  };

  const handleReload = () => {
    if (startDate && endDate) {
      const dateFilter = prepareRequestData('Custom Range');
      fetchAnalytics(dateFilter, { forceRefresh: true });
    } else {
      const dateFilter = prepareRequestData(dateRange);
      fetchAnalytics(dateFilter, { forceRefresh: true });
    }
  };

  const handleCustomDateSelect = () => {
    if (startDate && endDate) {
      const formatDate = (date) => {
        if (!date) return '';
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
      };
      
      setDateRange(`${formatDate(startDate)} - ${formatDate(endDate)}`);
      setShowDatePicker(false);
      
      // Fetch data with custom date range
      const dateFilter = prepareRequestData('Custom Range');
      fetchAnalytics(dateFilter, { forceRefresh: true });
    }
  };

  // Stats card component with no skeleton loader
  const StatCard = ({ title, value, isPrice }) => (
    <div className="col-md-6 col-lg-3">
      <div className="card h-100 border" style={{ boxShadow: 'none' }}>
        <div className="card-body text-center">
          <h3 className="mb-1">{isPrice ? formatIndianCurrency(value) : value}</h3>
          <p className="text-muted mb-0">{title}</p>
        </div>
      </div>
    </div>
  );

  // Get error from cache
  const error = getError(API_PATHS.analyticsReports);
  // Get loading state from cache (only used for the reload button spinner)
  const loading = isLoading(API_PATHS.analyticsReports);

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1 p-0">
            <div className="container-fluid flex-grow-1 p-0">
              {console.log('Statistics component permissionDenied state:', permissionDenied)}
              {permissionDenied ? (
                // Even if permission is denied for some components, we still want to show OutletStats
                // if that API is working
                <div className="row m-0">
                  <div className="col-12 p-0">
                    {console.log('Statistics: Rendering only OutletStats due to permissionDenied')}
                    <OutletStats />
                  </div>
                </div>
              ) : (
                <>
                  {error ? (
                    <div className="alert alert-danger mb-0" role="alert">
                      {error}
                    </div>
                  ) : null}
                  
                  {/* Statistics Dashboard Card */}
                  <div className="row m-0">
                    <div className="col-12 p-0">
                      <div className="card rounded-0 border border-1">
                        <div className="card-header d-flex justify-content-between align-items-md-center align-items-start p-4">
                          <h5 className="card-title mb-0">
                            Statistics Dashboard
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
                                    onClick={() => handleDateRangeChange("Custom Range")}
                                  >
                                    Custom Range
                                  </a>
                                </li>
                              </ul>
                            </div>
                            <button
                              type="button"
                              className={`btn btn-icon p-0 ${loading ? "disabled" : ""}`}
                              onClick={handleReload}
                              disabled={loading}
                              style={{ border: "1px solid var(--bs-primary)" }}
                            >
                              <i className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`}></i>
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
                            Select an outlet from the search menu above to view detailed statistics.
                          </p>
                          
                          {/* Stats Cards - Always show data (cached or new) */}
                          <div className="row g-4">
                            <StatCard
                              title="Total Orders"
                              value={statistics.total_orders}
                              isPrice={false}
                            />
                            <StatCard
                              title="Total Revenue"
                              value={statistics.total_revenue}
                              isPrice={true}
                            />
                            <StatCard
                              title="Average Order Value"
                              value={statistics.average_order_value}
                              isPrice={true}
                            />
                            <StatCard
                              title="Table Turnover"
                              value={statistics.average_turnover_time}
                              isPrice={false}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outlet Stats Section */}
                  <div className="row m-0">
                    <div className="col-12 p-0">
                      {console.log('Statistics: Rendering OutletStats component')}
                      <OutletStats />
                    </div>
                  </div>

                  {/* Charts Section */}
                  <div className="row g-4 m-0">
                    <div className="col-12 col-md-6 col-lg-6 p-0 pe-md-2">
                      <div className="h-100">
                        <PaymentMethodsChart />
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-6 p-0 ps-md-2">
                      <div className="h-100">
                        <OrderStat />
                      </div>
                    </div>
                  </div>

                  {/* Sales Section */}
                  <div className="row g-4 m-0">
                    <div className="col-12 col-md-6 col-lg-6 p-0 pe-md-2">
                      <div className="h-100">
                        <ProductAnalysis />
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-6 p-0 ps-md-2">
                      <div className="h-100">
                        <FoodTypeGraph />
                      </div>
                    </div>
                  </div>

                  {/* Analytics Section */}
                  <div className="row g-4 m-0">
                    <div className="col-12 col-md-6 col-lg-6 p-0 pe-md-2">
                      <div className="h-100">
                        <OrderType />
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-6 p-0 ps-md-2">
                      <div className="h-100">
                        <WeeklyOrderStat />
                      </div>
                    </div>

                    <div className="row m-0">
                      <OrderAnalytics />
                    </div>
                  </div>
                </>
              )}
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Statistics; 