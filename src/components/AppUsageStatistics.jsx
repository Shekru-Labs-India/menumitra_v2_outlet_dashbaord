import React, { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { API_PATHS } from '../config/apiConfig';
import { useCacheData } from '../context/CacheDataContext';
import { useGlobalDateFilter } from './Header';
import { withErrorHandling } from './withErrorHandling';

const AppUsageStatistics = ({ handleApiError }) => {
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
      return { labels: [], series: [] };
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
    
    // Filter out entries with zero usage
    const filteredData = Object.entries(usageData)
      .filter(([_, value]) => value > 0);
    
    const labels = filteredData.map(([key]) => formatAppName(key));
    const series = filteredData.map(([_, value]) => value);
    
    return { labels, series };
  }, [usageData]);
  
  // Check if data is meaningful before rendering
  const hasData = usageData && 
                Object.keys(usageData).length > 0 && 
                Object.values(usageData).some(value => value > 0);
  
  // Return null if there's no meaningful data or it's not done loading
  if (!hasData && !loading) {
    return null;
  }
  
  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }
  
  // Chart options
  const chartOptions = {
    chart: {
      type: 'donut',
      height: 350,
      toolbar: {
        show: false
      }
    },
    labels: chartData.labels,
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '14px'
    },
    colors: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'],
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Usage',
              formatter: function(w) {
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return total;
              }
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function(val, opts) {
        return opts.w.globals.seriesTotals[opts.seriesIndex];
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          height: 350
        },
        legend: {
          position: 'bottom'
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
          <>
            <div className="chart-container">
              <ReactApexChart 
                options={chartOptions}
                series={chartData.series}
                type="donut"
                height={350}
              />
            </div>
            
            <div className="table-responsive mt-4">
              <table className="table table-bordered table-hover">
                <thead className="table-light">
                  <tr>
                    <th>App Type</th>
                    <th className="text-center">Usage Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(usageData)
                    .filter(([_, value]) => value > 0)
                    .sort(([_, a], [__, b]) => b - a)
                    .map(([key, value], index) => (
                      <tr key={index}>
                        <td>{key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}</td>
                        <td className="text-center fw-bold">{value}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </>
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