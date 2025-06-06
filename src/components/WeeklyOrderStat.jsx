import React, { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext';
import { useCacheData } from '../context/CacheDataContext';
import { withErrorHandling } from './common';

const WeeklyOrderStat = ({ handleApiError }) => {
  // Get data from dashboard context
  const {
    weeklyOrderStats_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    fetchData,
    getCachedData
  } = useCacheData();

  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  const [days, setDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  const [orderData, setOrderData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [peakDay, setPeakDay] = useState('');
  const [lowPeakDay, setLowPeakDay] = useState('');
  const [maxOrders, setMaxOrders] = useState(0);
  const [minOrders, setMinOrders] = useState(0);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

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
    const cachedData = getCachedData(API_PATHS.weeklyOrderStats);
    if (cachedData) {
      processWeeklyData(cachedData);
    }
    // If no cached data, use context data
    else if (weeklyOrderStats_from_context) {
      processWeeklyData(weeklyOrderStats_from_context);
    }
    
    // Fetch fresh data in background
    fetchWeeklyOrderStats();
  }, []);

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
    const { detail: weekData, peak_day, low_day } = data;
    
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
    
    if (range === 'Custom Range') {
      // Only show date picker, don't reset dates
      setShowDatePicker(true);
    } else {
      // For non-custom ranges, reset dates and fetch data
      setShowDatePicker(false);
      setStartDate(null);
      setEndDate(null);
      // Always force refresh when changing date range
      fetchWeeklyOrderStats(getDateRange(range), { forceRefresh: true });
    }
  };

  const handleReload = () => {
    setIsGifPlaying(true);
    
    // Always fetch fresh data on reload, regardless of the date range
    fetchWeeklyOrderStats(getDateRange(dateRange), { forceRefresh: true });
  };

  // Fetch weekly order stats using the cache context
  const fetchWeeklyOrderStats = async (dateFilter = {}, options = {}) => {
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
      const data = await fetchData(API_PATHS.weeklyOrderStats, requestData, {
        forceRefresh: options.forceRefresh || false,
        transformResponse: (response) => response || {}
      });
      
      if (data) {
        processWeeklyData(data);
      }
    } catch (error) {
      console.error('Failed to fetch weekly order stats:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load weekly order statistics. Please try again.');
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
      case 'This week': {
        const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
        const diff = day === 0 ? 6 : day - 1; // Adjust to make Monday the first day
        start = new Date(today);
        start.setDate(today.getDate() - diff);
        end = new Date();
        break;
      }
      case 'Last week': {
        const lastWeekEnd = new Date(today);
        const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
        const diff = day === 0 ? 6 : day - 1; // Adjust to make Monday the first day
        lastWeekEnd.setDate(today.getDate() - diff - 1); // End of previous week (Sunday)
        start = new Date(lastWeekEnd);
        start.setDate(lastWeekEnd.getDate() - 6); // Start of previous week (Monday)
        end = lastWeekEnd;
        break;
      }
      case 'Custom Range':
        if (startDate && endDate) {
          return {
            start_date: formatDate(startDate),
            end_date: formatDate(endDate)
          };
        }
        return {};
      default:
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

  const handleCustomDateSelect = () => {
    if (startDate && endDate) {
      setDateRange(`${formatDate(startDate)} - ${formatDate(endDate)}`);
      setShowDatePicker(false);
      fetchWeeklyOrderStats(getDateRange('Custom Range'), { forceRefresh: true });
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
      max: orderData.length > 0 ? Math.max(...orderData) * 1.2 : 500,
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

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
        <h5 className="card-title mb-0">Weekly Order Statistics</h5>
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
                "This week",
                "Last week"
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

          {/* <button
            type="button"
            className="btn btn-icon p-0"
            onClick={handleReload}
            style={{ border: "1px solid var(--bs-primary)" }}
          >
            <i className="fas fa-sync-alt"></i>
          </button> */}

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
                className="btn btn-outline-secondary"
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
                className="btn btn-outline-secondary"
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