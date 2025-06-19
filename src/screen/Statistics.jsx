import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import VerticalSidebar from "../components/VerticalSidebar";
import Header from "../components/Header";
import PaymentMethodsChart from "../components/PaymentMethodsChart";
import ProductAnalysis from "../components/ProductAnalysis";
import OrderStat from "../components/OrderStat";
import FoodTypeGraph from "../components/FoodTypeGraph";
import OrderType from "../components/OrderType";
import OutletStats from '../components/OutletStats';
import Footer from "../components/Footer";
import { API_PATHS } from '../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import WeeklyOrderStat from "../components/WeeklyOrderStat";
import { useDashboard } from "../context/DashboardContext";
import { useCacheData } from "../context/CacheDataContext";
import { useGlobalDateFilter } from "../components/Header";
import RevenueGraph from "../components/RevenueGraph";
import PaymentMethodCount from "../components/PaymentMethodCount";
import RevenueLossWidget from "../components/RevenueLossWidget";
import CategoryPerformance from "../components/CategoryPerformance";
import CouponStatistics from "../components/CouponStatistics";
import MenuCombos from "../components/MenuCombos";
import AppUsageStatistics from "../components/AppUsageStatistics";
import { NoDataMessage } from '../components/common.jsx';

function Statistics() {
  // Get data from dashboard context for backward compatibility
  const { 
    permissionDenied
  } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    isLoading,
    getError,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  const [statistics, setStatistics] = useState({
    total_orders: 0,
    average_order_value: 0,
    customer_count: 0,
    total_revenue: 0,
    average_turnover_time: "00:00 - 00:00"
  });

  // New state for coupon statistics
  const [couponStats, setCouponStats] = useState([]);
  
  // New state for category-wise performance
  const [categoryPerformance, setCategoryPerformance] = useState([]);
  
  const navigate = useNavigate();

  // Tracking which components have data
  const [visibleComponents, setVisibleComponents] = useState({
    outletStats: true,
    paymentMethods: true,
    orderStat: true,
    productAnalysis: true,
    foodTypeGraph: true,
    orderType: true,
    weeklyOrderStat: true,
    categoryPerformance: true,
    couponStatistics: true,
    menuCombos: true,
    appUsageStatistics: true
  });
  
  // Function to update component visibility with better logging
  const updateComponentVisibility = (componentName, isVisible) => {
    // Only update if the visibility actually changed to prevent re-renders
    setVisibleComponents(prev => {
      // If the value hasn't changed, return the same object to prevent re-renders
      if (prev[componentName] === isVisible) {
        return prev;
      }
      
      // Otherwise, update with the new visibility
      const updated = {
        ...prev,
        [componentName]: isVisible
      };
      
      // Commenting out logs that cause performance issues
      // console.log(`Component ${componentName} visibility: ${isVisible}`);
      // const visibleCount = Object.values(updated).filter(Boolean).length;
      // console.log(`Total visible components: ${visibleCount}/${Object.keys(updated).length}`);
      
      return updated;
    });
  };

  // Check if any components are visible with better logging
  const hasAnyVisibleComponents = () => {
    // Since we've updated components to always be visible, 
    // we should always have visible components now
    return true;
    
    // Previous code (commented out)
    // const visibleCount = Object.values(visibleComponents).filter(Boolean).length;
    // const hasVisible = visibleCount > 0;
    // return hasVisible;
  };

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

  // Helper function to format turnover time
  const formatTurnoverTime = (timeStr) => {
    // Check if the timeStr is in minutes format
    if (timeStr && typeof timeStr === 'string') {
      // Extract minutes and seconds if in format "X min Y sec"
      const minutesSecondsMatch = timeStr.match(/(\d+)\s*min(?:\s*(\d+)\s*sec)?/);
      if (minutesSecondsMatch) {
        const minutes = parseInt(minutesSecondsMatch[1], 10);
        
        if (!isNaN(minutes)) {
          // Convert to hours if >= 60 minutes
          if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? remainingMinutes + ' min' : ''}`;
          }
        }
      }
    }
    // Return original string if it's not in expected format or less than 60 minutes
    return timeStr;
  };

  // Load data on initial mount and update from cache
  useEffect(() => {
    // First try to get data from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.analytic_reports) {
      updateStatisticsFromData(allStatsData.analytic_reports);
    }
    // Then try to get data from specific cache
    else {
      const cachedData = getCachedData(API_PATHS.analyticsReports);
      if (cachedData) {
        // Use cached data immediately
        updateStatisticsFromData(cachedData);
      }
    }
    
    // Always fetch data on initial load/refresh
    fetchStatisticsData();
  }, []);

  // Only update statistics when date range changes
  // using a single call to fetchAllStats instead of each component making its own
  useEffect(() => {
    if (dateRange) {  // Only run this if dateRange exists (skip initial render)
      fetchStatisticsData();
    }
  }, [dateRange]);

  // Update statistics when cached data changes
  useEffect(() => {
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.analytic_reports) {
      updateStatisticsFromData(allStatsData.analytic_reports);
      
      // Update coupon stats
      if (allStatsData.coupon_statistics) {
        setCouponStats(allStatsData.coupon_statistics);
      }
      
      // Update category performance
      if (allStatsData.category_wise_performance) {
        setCategoryPerformance(allStatsData.category_wise_performance);
      }
    } else {
      const analyticsData = getCachedData(API_PATHS.analyticsReports);
      if (analyticsData) {
        updateStatisticsFromData(analyticsData);
      }
    }
  }, [getCachedData]);

  // Helper function to update statistics from data
  const updateStatisticsFromData = (data) => {
    if (!data) return;
    
    setStatistics({
      total_orders: data.total_orders || 0,
      average_order_value: data.avg_order_value || data.average_order_value || 0,
      customer_count: 0,
      total_revenue: data.total_revenue || 0,
      average_turnover_time: data.average_turnover_time || "0 min"
    });
  };

  // Fetch statistics data using the consolidated API
  const fetchStatisticsData = async () => {
    try {
      // Get date filter from global context 
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once with a forced refresh
      // This ensures data is always fetched when this function is called
      const allStatsData = await fetchAllStats(dateFilter, {
        forceRefresh: true
      });
      
      if (allStatsData && allStatsData.analytic_reports) {
        updateStatisticsFromData(allStatsData.analytic_reports);
        
        // Update coupon stats
        if (allStatsData.coupon_statistics) {
          setCouponStats(allStatsData.coupon_statistics);
        }
        
        // Update category performance
        if (allStatsData.category_wise_performance) {
          setCategoryPerformance(allStatsData.category_wise_performance);
        }
      }
    } catch (error) {
      console.error('Failed to fetch statistics data:', error);
    }
  };

  // Stats card component with no skeleton loader
  const StatCard = ({ title, value, isPrice }) => {
    // Format the value based on the card type
    let displayValue = value;
    if (isPrice) {
      displayValue = formatIndianCurrency(value);
    } else if (title === "Average Turnover Time") {
      displayValue = formatTurnoverTime(value);
    }
    
    return (
      <div className="col-md-6 col-lg-3">
        <div className="card h-100 border" style={{ boxShadow: 'none' }}>
          <div className="card-body text-center">
            <h3 className="mb-1">{displayValue}</h3>
            <p className="text-muted mb-0">{title}</p>
          </div>
        </div>
      </div>
    );
  };

  // Get error from cache
  const error = getError(API_PATHS.analyticsReports);

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1 p-0">
            <div className="container-fluid flex-grow-1 p-0">
              {/* Comment out console logs that can cause rerender loops */}
              {/* console.log('Statistics component permissionDenied state:', permissionDenied) */}
              {permissionDenied ? (
                // Even if permission is denied for some components, we still want to show OutletStats
                // if that API is working
                <div className="row m-0">
                  <div className="col-12 p-0">
                    {/* console.log('Statistics: Rendering only OutletStats due to permissionDenied') */}
                    <OutletStats onVisibilityChange={visible => updateComponentVisibility('outletStats', visible)} />
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
                  <div className="row m-0 mb-4 mx-3">
                    <div className="col-12 p-0">
                      <div className="card rounded-0 border border-1" style={{ boxShadow: 'none' }}>
                        <div className="card-header d-flex justify-content-between align-items-md-center align-items-start p-4">
                          <h5 className="card-title mb-0">
                            Statistics Dashboard
                          </h5>
                        </div>

                        <div className="card-body p-4">
                          {/* Stats Cards */}
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
                              title="Average Turnover Time"
                              value={statistics.average_turnover_time}
                              isPrice={false}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outlet Stats Section */}
                  {/* <div className="row m-0 mx-3">
                    <div className="col-12 p-0">
                     
                      <OutletStats onVisibilityChange={visible => updateComponentVisibility('outletStats', visible)} />
                    </div>
                  </div> */}

                  {/* Charts Section */}
                  {(visibleComponents.paymentMethods || visibleComponents.orderStat) && (
                    <div className="row g-4 m-0 mx-3 mb-4">
                      {visibleComponents.paymentMethods && (
                        <div className={`col-12 ${visibleComponents.orderStat ? 'col-md-6 col-lg-6 pe-md-2' : ''} p-0`}>
                          <div className="h-100">
                            <PaymentMethodsChart onVisibilityChange={visible => updateComponentVisibility('paymentMethods', visible)} />
                          </div>
                        </div>
                      )}
                      {visibleComponents.orderStat && (
                        <div className={`col-12 ${visibleComponents.paymentMethods ? 'col-md-6 col-lg-6 ps-md-2' : ''} p-0`}>
                          <div className="h-100">
                            <OrderStat onVisibilityChange={visible => updateComponentVisibility('orderStat', visible)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sales Section */}
                  {(visibleComponents.productAnalysis || visibleComponents.foodTypeGraph) && (
                    <div className="row g-4 m-0 mx-3 mb-4">
                      {visibleComponents.productAnalysis && (
                        <div className={`col-12 ${visibleComponents.foodTypeGraph ? 'col-md-6 col-lg-6 pe-md-2' : ''} p-0`}>
                          <div className="h-100">
                            <ProductAnalysis onVisibilityChange={visible => updateComponentVisibility('productAnalysis', visible)} />
                          </div>
                        </div>
                      )}
                      {visibleComponents.foodTypeGraph && (
                        <div className={`col-12 ${visibleComponents.productAnalysis ? 'col-md-6 col-lg-6 ps-md-2' : ''} p-0`}>
                          <div className="h-100">
                            <FoodTypeGraph onVisibilityChange={visible => updateComponentVisibility('foodTypeGraph', visible)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Analytics Section */}
                  {(visibleComponents.orderType || visibleComponents.weeklyOrderStat) && (
                    <div className="row g-4 m-0 mx-3 mb-4">
                      {visibleComponents.orderType && (
                        <div className={`col-12 ${visibleComponents.weeklyOrderStat ? 'col-md-6 col-lg-6 pe-md-2' : ''} p-0`}>
                          <div className="h-100">
                            <OrderType onVisibilityChange={visible => updateComponentVisibility('orderType', visible)} />
                          </div>
                        </div>
                      )}
                      {visibleComponents.weeklyOrderStat && (
                        <div className={`col-12 ${visibleComponents.orderType ? 'col-md-6 col-lg-6 ps-md-2' : ''} p-0`}>
                          <div className="h-100">
                            <WeeklyOrderStat onVisibilityChange={visible => updateComponentVisibility('weeklyOrderStat', visible)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Category and Coupon Statistics Section */}
                  {(visibleComponents.categoryPerformance || visibleComponents.couponStatistics) && (
                    <div className="row g-4 m-0 mx-3 mb-4">
                      {visibleComponents.categoryPerformance && (
                        <div className={`col-12 ${visibleComponents.couponStatistics ? 'col-md-7 pe-md-2' : ''} p-0`}>
                          <CategoryPerformance onVisibilityChange={visible => updateComponentVisibility('categoryPerformance', visible)} />
                        </div>
                      )}
                      {visibleComponents.couponStatistics && (
                        <div className={`col-12 ${visibleComponents.categoryPerformance ? 'col-md-5 ps-md-2' : ''} p-0`}>
                          <CouponStatistics onVisibilityChange={visible => updateComponentVisibility('couponStatistics', visible)} />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Menu Combos and App Usage Section */}
                  {(visibleComponents.menuCombos || visibleComponents.appUsageStatistics) && (
                    <div className="row g-4 m-0 mx-3 mb-4">
                      {visibleComponents.menuCombos && (
                        <div className={`col-12 ${visibleComponents.appUsageStatistics ? 'col-md-6 pe-md-2' : ''} p-0`}>
                          <MenuCombos onVisibilityChange={visible => updateComponentVisibility('menuCombos', visible)} />
                        </div>
                      )}
                      {visibleComponents.appUsageStatistics && (
                        <div className={`col-12 ${visibleComponents.menuCombos ? 'col-md-6 ps-md-2' : ''} p-0`}>
                          <AppUsageStatistics onVisibilityChange={visible => updateComponentVisibility('appUsageStatistics', visible)} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* No Data Message */}
                  {!hasAnyVisibleComponents() && (
                    <div className="row m-0 mx-3 mb-4">
                      <div className="col-12 p-0">
                        <NoDataMessage 
                          message="No statistics data available for the selected time period" 
                          onRefresh={fetchStatisticsData}
                          icon="fas fa-chart-bar"
                          hideLoading={true}
                        />
                      </div>
                    </div>
                  )}
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