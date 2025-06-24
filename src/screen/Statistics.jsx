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
import CategoryPerformance from "../components/CategoryPerformance";
import CouponStatistics from "../components/CouponStatistics";
import MenuCombos from "../components/MenuCombos";
import AppUsageStatistics from "../components/AppUsageStatistics";
import UdhariStatistics from "../components/UdhariStatistics";
import AdvancedPaymentStatistics from "../components/AdvancedPaymentStatistics";
import { NoDataMessage } from '../components/common.jsx';

// Create a new component for the no data message card
const NoDataCard = ({ onRefresh }) => {
  return (
    <div className="card border-0 shadow-sm mt-5">
      <div className="card-body text-center py-5">
        <div className="mb-4">
          <i className="fas fa-chart-bar fa-4x text-muted"></i>
        </div>
        <h4 className="mb-3">No Data Available</h4>
        <p className="text-muted mb-4">
          There is no statistical data available for the selected time period. 
          Please try selecting a different date range or refresh to check again.
        </p>
      
      </div>
    </div>
  );
};

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
    appUsageStatistics: true,
    udhariStatistics: true,
    advancedPaymentStatistics: true
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
      
      // Log visibility changes for debugging
      console.log(`Component ${componentName} visibility: ${isVisible}`);
      
      return updated;
    });
  };

  // Check if any components are visible with better logging
  const hasAnyVisibleComponents = () => {
    // Check if any component (other than outletStats) is visible
    const visibleCount = Object.entries(visibleComponents)
      .filter(([key, value]) => key !== 'outletStats' && value)
      .length;
    
    return visibleCount > 0;
  };

  // Helper function to check if a component is visible
  const isComponentVisible = (componentName) => {
    return visibleComponents[componentName] === true;
  };

  // Helper function to check if any component in a list is visible
  const isAnyComponentVisible = (componentNames) => {
    return componentNames.some(name => isComponentVisible(name));
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

  // Initial load and component mounting effects
  useEffect(() => {
    console.log('Statistics component mounted, fetching data...');
    
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
      console.log('Date range changed, fetching new data...');
      fetchStatisticsData();
    }
  }, [dateRange]);

  // Log component visibility changes for debugging
  useEffect(() => {
    console.log('Component visibility updated:', visibleComponents);
  }, [visibleComponents]);

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
    
    // Update statistics state
    setStatistics({
      total_orders: data.total_orders || 0,
      average_order_value: data.avg_order_value || data.average_order_value || 0,
      customer_count: 0,
      total_revenue: data.total_revenue || 0,
      average_turnover_time: data.average_turnover_time || "0 min"
    });

    // Always show outlet stats for now (can be hidden by the component itself if no data)
    updateComponentVisibility('outletStats', true);
    
    // Check if all main stats are zero
    const allZero = !data.total_orders && 
                   !(data.avg_order_value || data.average_order_value) && 
                   !data.total_revenue && 
                   (!data.average_turnover_time || data.average_turnover_time === "0 min");
                   
    // Each component will handle its own visibility based on data in fetchStatisticsData
    // This is just a fallback if all main stats are zero
    if (allZero) {
      console.log('All statistics are zero, hiding components');
      // You might want to reset visibility for all components except outletStats
      setVisibleComponents(prev => {
        const updated = {...prev};
        Object.keys(updated).forEach(key => {
          if (key !== 'outletStats') {
            updated[key] = false;
          }
        });
        return updated;
      });
    }
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
      
      if (allStatsData) {
        // Check analytic reports - main stats
        if (allStatsData.analytic_reports) {
          updateStatisticsFromData(allStatsData.analytic_reports);
        }
        
        // Update coupon stats
        if (allStatsData.coupon_statistics) {
          const hasCouponData = Array.isArray(allStatsData.coupon_statistics) && 
                               allStatsData.coupon_statistics.length > 0 &&
                               allStatsData.coupon_statistics.some(coupon => 
                                 (coupon.total_orders && coupon.total_orders > 0) || 
                                 (coupon.total_discount && coupon.total_discount > 0));
          
          setCouponStats(allStatsData.coupon_statistics);
          updateComponentVisibility('couponStatistics', hasCouponData);
        } else {
          updateComponentVisibility('couponStatistics', false);
        }
        
        // Update category performance
        if (allStatsData.category_wise_performance) {
          const hasCategoryData = Array.isArray(allStatsData.category_wise_performance) && 
                                 allStatsData.category_wise_performance.length > 0 &&
                                 allStatsData.category_wise_performance.some(category => 
                                   (category.total_orders && category.total_orders > 0) || 
                                   (category.total_revenue && category.total_revenue > 0));
          
          setCategoryPerformance(allStatsData.category_wise_performance);
          updateComponentVisibility('categoryPerformance', hasCategoryData);
        } else {
          updateComponentVisibility('categoryPerformance', false);
        }
        
        // Update payment methods chart visibility
        if (allStatsData.total_collection_source) {
          const tcs = allStatsData.total_collection_source;
          const hasPaymentData = 
            (tcs.upi_orders && tcs.upi_orders > 0) ||
            (tcs.cash_orders && tcs.cash_orders > 0) ||
            (tcs.card_orders && tcs.card_orders > 0) ||
            (tcs.complementary_orders && tcs.complementary_orders > 0) ||
            (tcs.udhari_orders && tcs.udhari_orders > 0) ||
            (tcs.advance_payment_orders && tcs.advance_payment_orders > 0);
          
          updateComponentVisibility('paymentMethods', hasPaymentData);
        } else {
          updateComponentVisibility('paymentMethods', false);
        }
        
        // Update order stat visibility
        if (allStatsData.order_statistics) {
          const os = allStatsData.order_statistics;
          const hasOrderStatData = 
            (os.success_orders && os.success_orders > 0) ||
            (os.cancelled_orders && os.cancelled_orders > 0) ||
            (os.complementary_orders && os.complementary_orders > 0) ||
            (os.KOT_orders && os.KOT_orders > 0) ||
            (os.udhari_orders && os.udhari_orders > 0);
          
          updateComponentVisibility('orderStat', hasOrderStatData);
        } else {
          updateComponentVisibility('orderStat', false);
        }
        
        // Update product analysis visibility
        if (allStatsData.sales_performance) {
          const sp = allStatsData.sales_performance;
          const hasProductData = 
            (sp.top_selling && sp.top_selling.length > 0) ||
            (sp.low_selling && sp.low_selling.length > 0);
          
          updateComponentVisibility('productAnalysis', hasProductData);
        } else {
          updateComponentVisibility('productAnalysis', false);
        }
        
        // Update food type graph visibility
        if (allStatsData.food_type_statistics) {
          const fts = allStatsData.food_type_statistics;
          const hasFoodTypeData = Object.values(fts).some(day => {
            return Object.values(day).some(count => count > 0);
          });
          
          updateComponentVisibility('foodTypeGraph', hasFoodTypeData);
        } else {
          updateComponentVisibility('foodTypeGraph', false);
        }
        
        // Update order type visibility
        if (allStatsData.order_type_statistics) {
          const ots = allStatsData.order_type_statistics;
          const hasOrderTypeData = 
            (ots['dine-in'] && ots['dine-in'] > 0) ||
            (ots.parcel && ots.parcel > 0) ||
            (ots.delivery && ots.delivery > 0) ||
            (ots.counter && ots.counter > 0) ||
            (ots['drive-through'] && ots['drive-through'] > 0);
          
          updateComponentVisibility('orderType', hasOrderTypeData);
        } else {
          updateComponentVisibility('orderType', false);
        }
        
        // Update weekly order stat visibility
        if (allStatsData.weekly_order_stats && allStatsData.weekly_order_stats.data) {
          const hasWeeklyData = allStatsData.weekly_order_stats.data.some(day => 
            day[1] && parseInt(day[1]) > 0
          );
          
          updateComponentVisibility('weeklyOrderStat', hasWeeklyData);
        } else {
          updateComponentVisibility('weeklyOrderStat', false);
        }
        
        // Update menu combos visibility
        if (allStatsData.menu_combos) {
          const hasMenuCombosData = Array.isArray(allStatsData.menu_combos) && 
                                  allStatsData.menu_combos.length > 0;
          
          updateComponentVisibility('menuCombos', hasMenuCombosData);
        } else {
          updateComponentVisibility('menuCombos', false);
        }
        
        // Update app usage statistics visibility
        if (allStatsData.app_usage_statistics) {
          const aus = allStatsData.app_usage_statistics;
          
          // Check if any app usage field has a non-zero value
          const hasAppUsageData = 
            (aus.owner_app && aus.owner_app > 0) ||
            (aus.pos_app && aus.pos_app > 0) ||
            (aus.waiter_app && aus.waiter_app > 0) ||
            (aus.captain_app && aus.captain_app > 0) ||
            (aus.user_app && aus.user_app > 0) ||
            (aus.kds_app && aus.kds_app > 0) ||
            (aus.cds_app && aus.cds_app > 0);
          
          console.log('App usage statistics data:', aus);
          console.log('Has app usage data:', hasAppUsageData);
          
          updateComponentVisibility('appUsageStatistics', hasAppUsageData);
        } else {
          updateComponentVisibility('appUsageStatistics', false);
        }
        
        // Update udhari statistics visibility
        if (allStatsData.udhari_card) {
          const uc = allStatsData.udhari_card;
          const hasUdhariData = 
            (uc.udhari_pending && uc.udhari_pending.count > 0) ||
            (uc.udhari_paid && uc.udhari_paid.count > 0);
          
          updateComponentVisibility('udhariStatistics', hasUdhariData);
        } else {
          updateComponentVisibility('udhariStatistics', false);
        }
        
        // Update advanced payment statistics visibility
        if (allStatsData.advance_payment_card) {
          const apc = allStatsData.advance_payment_card;
          const hasAdvancedPaymentData = 
            (apc.partial_payment && apc.partial_payment.count > 0) ||
            (apc.settled_payment && apc.settled_payment.count > 0);
          
          updateComponentVisibility('advancedPaymentStatistics', hasAdvancedPaymentData);
        } else {
          updateComponentVisibility('advancedPaymentStatistics', false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch statistics data:', error);
    }
  };

  // Stats card component with no skeleton loader
  const StatCard = ({ title, value, isPrice }) => {
    // Don't render the card if value is 0
    if (value === 0 || value === "0 min") return null;
    
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

  // Check if any statistics value is non-zero
  const hasAnyStatValue = () => {
    return (
      statistics.total_orders > 0 || 
      statistics.average_order_value > 0 || 
      statistics.total_revenue > 0 || 
      (statistics.average_turnover_time !== "0 min" && statistics.average_turnover_time !== "00:00 - 00:00")
    );
  };

  // Check if all statistics values are zero
  const allStatsAreZero = () => {
    return !hasAnyStatValue();
  };

  // Get error from cache
  const error = getError(API_PATHS.analyticsReports);

  // Determine component pairings based on visibility
  const renderCategoryAndPairedComponent = () => {
    if (!isComponentVisible('categoryPerformance')) {
      return null;
    }

    // If coupon statistics is visible, pair with it (original pairing)
    if (isComponentVisible('couponStatistics')) {
      return (
        <div className="row g-4 m-0 mx-3 mb-4">
          <div className="col-12 col-md-7 pe-md-2 p-0">
            <CategoryPerformance onVisibilityChange={visible => updateComponentVisibility('categoryPerformance', visible)} />
          </div>
          <div className="col-12 col-md-5 ps-md-2 p-0">
            <CouponStatistics onVisibilityChange={visible => updateComponentVisibility('couponStatistics', visible)} />
          </div>
        </div>
      );
    } 
    // If menu combos is visible, pair with it
    else if (isComponentVisible('menuCombos')) {
      return (
        <div className="row g-4 m-0 mx-3 mb-4">
          <div className="col-12 col-md-7 pe-md-2 p-0">
            <CategoryPerformance onVisibilityChange={visible => updateComponentVisibility('categoryPerformance', visible)} />
          </div>
          <div className="col-12 col-md-5 ps-md-2 p-0">
            <MenuCombos onVisibilityChange={visible => updateComponentVisibility('menuCombos', visible)} />
          </div>
        </div>
      );
    }
    // Otherwise show category performance at 70% width
    else {
      return (
        <div className="row g-4 m-0 mx-3 mb-4">
          <div className="col-12 col-md-8 mx-auto p-0">
            <CategoryPerformance onVisibilityChange={visible => updateComponentVisibility('categoryPerformance', visible)} />
          </div>
        </div>
      );
    }
  };

  // Determine if we should show the menu combos and app usage section
  const shouldShowMenuCombosAndAppUsage = () => {
    // Only show this section if:
    // 1. Menu combos is visible AND not already paired with category performance
    // 2. OR app usage statistics is visible
    return (isComponentVisible('menuCombos') && isComponentVisible('couponStatistics')) || 
           isComponentVisible('appUsageStatistics');
  };

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
                  
                  {/* Statistics Dashboard Card - only show if at least one stat has a value */}
                  {hasAnyStatValue() && (
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
                            {statistics.total_orders > 0 && (
                              <StatCard
                                title="Total Orders"
                                value={statistics.total_orders}
                                isPrice={false}
                              />
                            )}
                            {statistics.total_revenue > 0 && (
                              <StatCard
                                title="Total Revenue"
                                value={statistics.total_revenue}
                                isPrice={true}
                              />
                            )}
                            {statistics.average_order_value > 0 && (
                              <StatCard
                                title="Average Order Value"
                                value={statistics.average_order_value}
                                isPrice={true}
                              />
                            )}
                            {statistics.average_turnover_time !== "0 min" && statistics.average_turnover_time !== "00:00 - 00:00" && (
                              <StatCard
                                title="Average Turnover Time"
                                value={statistics.average_turnover_time}
                                isPrice={false}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Charts Section - only render if at least one component has data */}
                  {isAnyComponentVisible(['paymentMethods', 'orderStat']) && (
                  <div className="row g-4 m-0 mx-3 mb-4">
                      {isComponentVisible('paymentMethods') && (
                        <div className={`col-12 ${isComponentVisible('orderStat') ? 'col-md-6 col-lg-6 pe-md-2' : ''} p-0`}>
                      <div className="h-100">
                        <PaymentMethodsChart onVisibilityChange={visible => updateComponentVisibility('paymentMethods', visible)} />
                      </div>
                    </div>
                      )}
                      {isComponentVisible('orderStat') && (
                        <div className={`col-12 ${isComponentVisible('paymentMethods') ? 'col-md-6 col-lg-6 ps-md-2' : ''} p-0`}>
                      <div className="h-100">
                        <OrderStat onVisibilityChange={visible => updateComponentVisibility('orderStat', visible)} />
                      </div>
                    </div>
                      )}
                  </div>
                  )}

                  {/* Sales Section - only render if at least one component has data */}
                  {isAnyComponentVisible(['productAnalysis', 'foodTypeGraph']) && (
                  <div className="row g-4 m-0 mx-3 mb-4">
                      {isComponentVisible('productAnalysis') && (
                        <div className={`col-12 ${isComponentVisible('foodTypeGraph') ? 'col-md-6 col-lg-6 pe-md-2' : ''} p-0`}>
                      <div className="h-100">
                        <ProductAnalysis onVisibilityChange={visible => updateComponentVisibility('productAnalysis', visible)} />
                      </div>
                    </div>
                      )}
                      {isComponentVisible('foodTypeGraph') && (
                        <div className={`col-12 ${isComponentVisible('productAnalysis') ? 'col-md-6 col-lg-6 ps-md-2' : ''} p-0`}>
                      <div className="h-100">
                        <FoodTypeGraph onVisibilityChange={visible => updateComponentVisibility('foodTypeGraph', visible)} />
                      </div>
                    </div>
                      )}
                  </div>
                  )}

                  {/* Analytics Section - only render if at least one component has data */}
                  {isAnyComponentVisible(['orderType', 'weeklyOrderStat']) && (
                  <div className="row g-4 m-0 mx-3 mb-4">
                      {isComponentVisible('orderType') && (
                        <div className={`col-12 ${isComponentVisible('weeklyOrderStat') ? 'col-md-6 col-lg-6 pe-md-2' : ''} p-0`}>
                      <div className="h-100">
                        <OrderType onVisibilityChange={visible => updateComponentVisibility('orderType', visible)} />
                      </div>
                    </div>
                      )}
                      {isComponentVisible('weeklyOrderStat') && (
                        <div className={`col-12 ${isComponentVisible('orderType') ? 'col-md-6 col-lg-6 ps-md-2' : ''} p-0`}>
                      <div className="h-100">
                        <WeeklyOrderStat onVisibilityChange={visible => updateComponentVisibility('weeklyOrderStat', visible)} />
                      </div>
                    </div>
                      )}
                  </div>
                  )}
                  
                  {/* Category Performance with dynamic pairing */}
                  {renderCategoryAndPairedComponent()}
                  
                  {/* Menu Combos and App Usage Section - only shown if menu combos isn't paired with category */}
                  {shouldShowMenuCombosAndAppUsage() && (
                  <div className="row g-4 m-0 mx-3 mb-4">
                      {isComponentVisible('menuCombos') && isComponentVisible('couponStatistics') && (
                        <div className={`col-12 ${isComponentVisible('appUsageStatistics') ? 'col-md-6 pe-md-2' : ''} p-0`}>
                      <MenuCombos onVisibilityChange={visible => updateComponentVisibility('menuCombos', visible)} />
                    </div>
                      )}
                      {isComponentVisible('appUsageStatistics') && (
                        <div className={`col-12 ${(isComponentVisible('menuCombos') && isComponentVisible('couponStatistics')) ? 'col-md-6 ps-md-2' : ''} p-0`}>
                      <AppUsageStatistics onVisibilityChange={visible => updateComponentVisibility('appUsageStatistics', visible)} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Udhari and Advanced Payment Statistics Section */}
                  {isAnyComponentVisible(['udhariStatistics', 'advancedPaymentStatistics']) && (
                  <div className="row g-4 m-0 mx-3 mb-4">
                      {isComponentVisible('udhariStatistics') && (
                        <div className={`col-12 ${isComponentVisible('advancedPaymentStatistics') ? 'col-md-6 pe-md-2' : ''} p-0`}>
                      <div className="h-100">
                        <UdhariStatistics onVisibilityChange={visible => updateComponentVisibility('udhariStatistics', visible)} />
                      </div>
                    </div>
                      )}
                      {isComponentVisible('advancedPaymentStatistics') && (
                        <div className={`col-12 ${isComponentVisible('udhariStatistics') ? 'col-md-6 ps-md-2' : ''} p-0`}>
                      <div className="h-100">
                        <AdvancedPaymentStatistics onVisibilityChange={visible => updateComponentVisibility('advancedPaymentStatistics', visible)} />
                      </div>
                    </div>
                      )}
                  </div>
                  )}

                  {/* No Data Message - Show user-friendly card when no data */}
                  {(allStatsAreZero() && !hasAnyVisibleComponents()) && (
                    <div className="row m-0 mx-3 mb-4">
                      <div className="col-12 p-0">
                        <NoDataCard 
                          onRefresh={fetchStatisticsData}
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