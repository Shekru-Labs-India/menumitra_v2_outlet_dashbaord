import React, { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { API_PATHS } from '../config/apiConfig';
import { useCacheData } from '../context/CacheDataContext';
import { useGlobalDateFilter } from './Header';
import { withErrorHandling } from './withErrorHandling';

const AppUsageStatistics = ({ handleApiError, onVisibilityChange }) => {
  const [usageData, setUsageData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();
  
  // Get data from cache context
  const { getCachedData, fetchAllStats } = useCacheData();
  
  // Initial data load from cache
  useEffect(() => {
    // First check if we already have data in the cache
    const cachedAllStats = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (cachedAllStats && cachedAllStats.app_usage_statistics) {
      setUsageData(cachedAllStats.app_usage_statistics);
      setLoading(false);
    } else {
      // If there's no cached data, we'll rely on the centralized data fetching
      // from CacheDataContext's built-in mechanism
    }

    // Always show the component
    if (onVisibilityChange) {
      onVisibilityChange(true);
    }
  }, []);
  
  // Only fetch when date range changes, not on initial mount
  useEffect(() => {
    if (dateRange) { // Skip on initial mount
      fetchUsageData();
    }
  }, [dateRange]);
  
  const fetchUsageData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get date filter from global context
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once with no forceRefresh
      const allStatsData = await fetchAllStats(dateFilter);
      
      if (allStatsData && allStatsData.app_usage_statistics) {
        setUsageData(allStatsData.app_usage_statistics);
      } else {
        setUsageData({});
      }
    } catch (error) {
      console.error('Failed to fetch app usage statistics:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load app usage statistics. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Transform data for charts
  const chartData = useMemo(() => {
    if (!usageData || Object.keys(usageData).length === 0) {
      // Return empty default data when no data is available
      return { 
        categories: ['No Data'], 
        series: [{
          name: 'Usage',
          data: [0]
        }]
      };
    }
    
    // Format app names to be more readable
    const formatAppName = (name) => {
      switch (name) {
        case 'owner_app':
          return 'Owner App';
        case 'pos_app':
          return 'POS App';
        case 'waiter_app':
          return 'Waiter App';
        case 'captain_app':
          return 'Captain App';
        case 'user_app':
          return 'Customer App';
        default:
          return name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' ');
      }
    };
    
    // Sort data by usage count (descending)
    const sortedData = Object.entries(usageData)
      .sort(([_, a], [__, b]) => b - a);
    
    const categories = sortedData.map(([key]) => formatAppName(key));
    const data = sortedData.map(([_, value]) => value || 0);
    
    return { 
      categories, 
      series: [{
        name: 'Usage Count',
        data: data
      }]
    };
  }, [usageData]);
  
  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }
  
  // Bar chart options
  const chartOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function(val) {
        return val;
      },
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ['#304758']
      }
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Usage Count'
      },
      min: 0
    },
    fill: {
      opacity: 1,
      colors: ['#7367f0']
    },
    tooltip: {
      y: {
        formatter: function(val) {
          return val + " uses";
        }
      }
    },
    colors: ['#7367f0'],
    legend: {
      show: false
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          height: 300
        },
        plotOptions: {
          bar: {
            horizontal: true
          }
        },
        yaxis: {
          labels: {
            show: false
          }
        },
        xaxis: {
          labels: {
            show: true
          }
        }
      }
    }]
  };
  
  return (
    <div className="card border h-100" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">App Usage Statistics</h5>
      </div>
      
      <div className="card-body">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error && !error.includes('permission') ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : usageData && Object.keys(usageData).length > 0 ? (
            <div className="chart-container">
              <ReactApexChart 
                options={chartOptions}
                series={chartData.series}
              type="bar"
                height={350}
              />
            </div>
        ) : (
          <div className="alert alert-info" role="alert">
            No app usage data available
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorHandling(AppUsageStatistics);