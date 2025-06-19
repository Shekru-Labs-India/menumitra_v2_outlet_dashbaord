import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext';
import { useCacheData } from '../context/CacheDataContext';
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header';

const WeeklyOrderStat = ({ handleApiError, onVisibilityChange }) => {
  // Get data from dashboard context
  const { weeklyOrderStats_from_context } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  // Data state
  const [weekData, setWeekData] = useState({
    days: [],
    dayNames: [],
    values: []
  });

  // Derived statistics
  const [peakDay, setPeakDay] = useState('');
  const [lowPeakDay, setLowPeakDay] = useState('');
  const [maxOrders, setMaxOrders] = useState(0);
  const [minOrders, setMinOrders] = useState(0);

  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Initial data load from cache and context
  useEffect(() => {
    // First check if data is available from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.weekly_order_stats) {
      processWeeklyData(allStatsData.weekly_order_stats);
    }
    // If no cached data, use context data
    else if (weeklyOrderStats_from_context) {
      processWeeklyData(weeklyOrderStats_from_context);
    }
    
    // Fetch fresh data in background
    fetchWeeklyData();
    
    // Always set visible
    if (onVisibilityChange) {
      onVisibilityChange(true);
    }
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchWeeklyData();
  }, [dateRange]);

  // Process weekly data from API response
  const processWeeklyData = (data) => {
    if (!data) {
      setWeekData({
        days: [],
        dayNames: [],
        values: []
      });
      return;
    }

    try {
      // Try to format the data for the chart
      const days = [];
      const dayNames = [];
      const values = [];

      // Check if data is in the expected format
      if (Array.isArray(data)) {
        // Sort by weekday_index to ensure correct order
        const sortedData = [...data].sort((a, b) => a.weekday_index - b.weekday_index);
        
        sortedData.forEach(day => {
          days.push(day.weekday_index);
          dayNames.push(day.weekday_name);
          values.push(day.total_orders);
        });

        // Find peak day
        if (values.length > 0) {
          const maxIndex = values.indexOf(Math.max(...values));
          const minIndex = values.indexOf(Math.min(...values));
          
          setPeakDay(dayNames[maxIndex] || '');
          setLowPeakDay(dayNames[minIndex] || '');
          setMaxOrders(values[maxIndex] || 0);
          setMinOrders(values[minIndex] || 0);
        }
      }

      setWeekData({
        days,
        dayNames,
        values
      });

      // Always show this component if onVisibilityChange is provided
      if (onVisibilityChange) {
        onVisibilityChange(true);
      }
    } catch (error) {
      console.error('Error processing weekly order data:', error);
      setError('Failed to process weekly order data.');
    }
  };

  // Fetch weekly data using the consolidated API
  const fetchWeeklyData = async () => {
    try {
      setError('');
      
      // Get date filter from global context
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once
      const allStatsData = await fetchAllStats(dateFilter, {
        forceRefresh: true
      });
      
      if (allStatsData && allStatsData.weekly_order_stats) {
        processWeeklyData(allStatsData.weekly_order_stats);
      }
    } catch (error) {
      console.error('Failed to fetch weekly order data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load weekly order statistics. Please try again.');
      }
    }
  };
  
  // Chart series
  const chartSeries = [{
    name: 'Orders',
    data: weekData.values
  }];
  
  // Chart options
  const chartOptions = {
    chart: {
      height: 350,
      type: 'bar',
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        },
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return val;
      },
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ["#304758"]
      }
    },
    xaxis: {
      categories: weekData.dayNames,
      position: 'bottom',
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      },
      tooltip: {
        enabled: false,
      }
    },
    yaxis: {
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false,
      },
      labels: {
        show: true,
        formatter: function (val) {
          return val;
        }
      }
    },
    title: {
      text: '',
      floating: false,
      offsetY: 330,
      align: 'center',
      style: {
        color: '#444'
      }
    },
    colors: ['#7367f0']
  };

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
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
        
        <div className="position-relative">
          <button
            type="button"
            className="btn btn-icon btn-sm btn-outline-primary position-absolute"
            style={{ 
              top: '0px', 
              right: '5px',
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
            height={350}
          />
        </div>
      </div>

      {/* Modal for expanded chart */}
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