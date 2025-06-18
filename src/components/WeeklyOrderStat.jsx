import React, { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext';
import { useCacheData } from '../context/CacheDataContext';
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header';

const WeeklyOrderStat = ({ handleApiError, onVisibilityChange }) => {
  // Get data from dashboard context
  const {
    weeklyOrderStats_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  const [days, setDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  const [orderData, setOrderData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [peakDay, setPeakDay] = useState('');
  const [lowPeakDay, setLowPeakDay] = useState('');
  const [maxOrders, setMaxOrders] = useState(0);
  const [minOrders, setMinOrders] = useState(0);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initial data load from cache and context
  useEffect(() => {
    // First try to get data from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.weekly_order_stats) {
      processWeeklyData(allStatsData.weekly_order_stats);
      setLoading(false);
    } 
    // If not available in consolidated API, try specific endpoint cache
    else if (weeklyOrderStats_from_context) {
      processWeeklyData(weeklyOrderStats_from_context);
      setLoading(false);
    } 
    // Don't trigger a fetch on initial load - rely on the coordinated fetch from CacheDataContext
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchWeeklyData();
  }, [dateRange]);

  // Process weekly order data
  const processWeeklyData = (data) => {
    if (!data) {
      console.log('No data received in processWeeklyData');
      return;
    }
    
    console.log('Processing weekly data:', data);
    
    // Check if data is already in the expected format (array of arrays)
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      // Data is directly the array we need
      const weekData = data;
      console.log('Data is already in array format:', weekData);
      
      // Transform the data into the required format
      const days = weekData.map(item => item[0]);
      const orderCounts = weekData.map(item => parseInt(item[1]));
      
      console.log('Processed days:', days);
      console.log('Processed order counts:', orderCounts);
      
      setDays(days);
      setOrderData(orderCounts);
      
      // Find peak and low days manually
      if (orderCounts.length > 0) {
        const maxValue = Math.max(...orderCounts);
        const minValue = Math.min(...orderCounts);
        const maxIndex = orderCounts.indexOf(maxValue);
        const minIndex = orderCounts.indexOf(minValue);
        
        setPeakDay(days[maxIndex] || 'N/A');
        setMaxOrders(maxValue);
        setLowPeakDay(days[minIndex] || 'N/A');
        setMinOrders(minValue);
      }
      
      return;
    }
    
    // Handle the case where data has detail, peak_day and low_day properties
    const { data: weekData, peak_day, low_day } = data;
    
    console.log('Extracted data:', { weekData, peak_day, low_day });
    
    if (weekData && Array.isArray(weekData)) {
      // Transform the data into the required format
      const days = weekData.map(item => item[0]);
      const orderCounts = weekData.map(item => parseInt(item[1]));
      
      console.log('Processed days:', days);
      console.log('Processed order counts:', orderCounts);
      
      setDays(days);
      setOrderData(orderCounts);
      
      // Set peak day information
      if (peak_day && peak_day.length === 2) {
        setPeakDay(peak_day[0]);
        setMaxOrders(parseInt(peak_day[1]));
      }
      
      // Set low day information
      if (low_day && low_day.length === 2) {
        setLowPeakDay(low_day[0]);
        setMinOrders(parseInt(low_day[1]));
      }
    } else {
      console.error('Weekly data is not in expected format:', weekData);
    }
  };

  // Fetch weekly order stats using only consolidated API
  const fetchWeeklyData = async () => {
    try {
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
      
      // First check if we already have data in the cache
      const cachedAllStats = getCachedData(API_PATHS.getAllStatsWithoutFilter);
      if (cachedAllStats && cachedAllStats.weekly_order_stats) {
        // Use cached data instead of making a new request
        processWeeklyData(cachedAllStats.weekly_order_stats);
        return;
      }
      
      // Use fetchAllStats to get all stats at once with no forceRefresh
      // to respect the debounce mechanism
      const allStatsData = await fetchAllStats(dateFilter);
      
      if (allStatsData && allStatsData.weekly_order_stats) {
        processWeeklyData(allStatsData.weekly_order_stats);
      } else {
        // Handle empty data case
        setDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
        setOrderData([0, 0, 0, 0, 0, 0, 0]);
        setPeakDay('N/A');
        setMaxOrders(0);
        setLowPeakDay('N/A');
        setMinOrders(0);
      }
    } catch (error) {
      console.error('Failed to fetch weekly order stats:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load weekly order statistics. Please try again.');
      }
      
      // Set default data in case of error
      setDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
      setOrderData([0, 0, 0, 0, 0, 0, 0]);
      setPeakDay('N/A');
      setMaxOrders(0);
      setLowPeakDay('N/A');
      setMinOrders(0);
    }
  };

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  // Colors for each day (Monday to Sunday)
  const dayColors = [
    '#9bbb59', // Monday - green
    '#c0504d', // Tuesday - pink
    '#d8c878', // Wednesday - gold
    '#8064a2', // Thursday - purple
    '#4bacc6', // Friday - teal
    '#c0504d', // Saturday - red
    '#4f81bd', // Sunday - blue
  ];

  // ApexCharts options
  const chartOptions = {
    chart: {
      height: 350,
      type: 'bar',
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      },
      fontFamily: 'Helvetica, Arial, sans-serif',
      background: 'transparent',
      parentHeightOffset: 0
    },
    noData: {
      text: 'No data available',
      align: 'center',
      verticalAlign: 'middle',
      offsetX: 0,
      offsetY: 0,
      style: {
        color: '#6c757d',
        fontSize: '16px',
        fontFamily: 'Helvetica, Arial, sans-serif'
      }
    },
    colors: dayColors,
    fill: {
      opacity: 1
    },
    dataLabels: {
      enabled: false
    },
    plotOptions: {
      bar: {
        borderRadius: 2,
        columnWidth: '65%',
        distributed: true,
        endingShape: 'flat'
      }
    },
    grid: {
      borderColor: 'rgba(0, 0, 0, 0.05)',
      row: {
        colors: ['transparent'],
        opacity: 0.2
      },
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 0,
        right: 10,
        bottom: 30,
        left: 10
      }
    },
    states: {
      hover: {
        filter: {
          type: 'lighten',
          value: 0.15
        }
      }
    },
    xaxis: {
      categories: days,
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          colors: days.map(() => '#000000')
        },
        rotate: -45,
        offsetY: 5,
        trim: false
      },
      axisBorder: {
        show: true
      },
      axisTicks: {
        show: true
      }
    },
    yaxis: {
      title: {
        text: 'Count',
        style: {
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'Helvetica, Arial, sans-serif',
          color: '#454545'
        }
      },
      min: 0,
      // Set a reasonable default max value when all data is 0
      max: orderData.length > 0 && Math.max(...orderData) > 0 
          ? Math.max(...orderData) * 1.2 
          : 10,
      labels: {
        style: {
          fontSize: '10px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          colors: '#5a5a5a'
        },
        formatter: function(val) {
          return val.toFixed(0);
        }
      }
    },
    tooltip: {
      enabled: true,
      theme: 'light',
      style: {
        fontSize: '12px',
        fontFamily: 'Helvetica, Arial, sans-serif'
      },
      y: {
        formatter: function(val) {
          return val;
        }
      }
    },
    title: {
      text: 'Weekly Order Distribution',
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
        fontFamily: 'Helvetica, Arial, sans-serif',
        color: '#2c2c2c'
      },
      offsetY: 10,
      offsetX: 10
    }
  };

  const chartSeries = [
    {
      name: "Orders",
      data: orderData
    }
  ];

  console.log('Chart series data:', chartSeries);
  console.log('Days:', days);
  console.log('Order data:', orderData);

  // Make sure the hasData check works properly and loading state is properly set
  const hasData = Array.isArray(orderData) && 
                orderData.length > 0 && 
                orderData.some(count => count > 0);
  
  // Use useEffect to notify the parent component about visibility
  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(hasData || loading);
    }
  }, [orderData, loading, onVisibilityChange, hasData]);

  // Return early if there's no meaningful data
  if (!hasData && !loading) {
    console.log('WeeklyOrderStat: No data to display');
    return null;
  }

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
        <h5 className="card-title mb-0">Weekly Order Statistics</h5>
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
          <div className="d-flex gap-6">
            <div className="d-flex align-items-center">
              <div className="me-3">
                <span className="badge bg-danger p-2">
                  <i className="fas fa-arrow-up"></i>
                </span>
              </div>
              <div>
                <p className="mb-0">Peak Day</p>
                <h6 className="mb-0">{peakDay || 'N/A'} - {maxOrders || 0} orders</h6>
              </div>
            </div>
            <div className="d-flex align-items-center ms-4">
              <div className="me-3">
                <span className="badge bg-success p-2">
                  <i className="fas fa-arrow-down"></i>
                </span>
              </div>
              <div>
                <p className="mb-0">Low Peak Day</p>
                <h6 className="mb-0">{lowPeakDay || 'N/A'} - {minOrders || 0} orders</h6>
              </div>
            </div>
          </div>
        </div>
        
        <div id="weeklyOrderChart">
          <div className="position-relative">
            <button
              type="button"
              className="btn btn-icon btn-sm btn-outline-primary position-absolute"
              style={{ 
                top: '-60px', 
                right: '50px',
                zIndex: 1
              }}
              onClick={() => setShowModal(true)}
              title="Expand Graph"
            >
              <i className="fas fa-expand"></i>
            </button>
            <ReactApexChart 
              options={chartOptions} 
              series={chartSeries} 
              type="bar" 
              height={450}
            />
          </div>
        </div>
      </div>

      {/* Modal for expanded graph */}
      {showModal && (
        <div 
          className="modal fade show" 
          tabIndex="-1" 
          role="dialog"
          style={{ 
            display: 'block',
            backgroundColor: 'rgba(0,0,0,0.5)'
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Weekly Order Statistics</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <ReactApexChart
                  options={{
                    ...chartOptions,
                    chart: {
                      ...chartOptions.chart,
                      toolbar: {
                        show: true,
                        tools: {
                          download: true,
                          selection: true,
                          zoom: true,
                          zoomin: true,
                          zoomout: true,
                          pan: true,
                        }
                      }
                    }
                  }}
                  series={chartSeries}
                  type="bar"
                  height={600}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withErrorHandling(WeeklyOrderStat);