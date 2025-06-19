import React, { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext';
import { useCacheData } from '../context/CacheDataContext';
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header';

const RevenueGraph = ({ handleApiError }) => {
  // Get data from dashboard context
  const { 
    revenue_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  const [revenueData, setRevenueData] = useState([]);
  const [error, setError] = useState('');
  
  // Default chart options
  const [chartOptions, setChartOptions] = useState({
    chart: {
      height: 350,
      type: 'area',
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors: ['#8c57ff']
    },
    colors: ['#8c57ff'],
    xaxis: {
      type: 'datetime',
      categories: [],
      labels: {
        formatter: function(value, timestamp) {
          // Format date as "MMM DD" 
          const date = new Date(timestamp);
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return months[date.getMonth()] + ' ' + date.getDate();
        },
        style: {
          colors: '#858d98'
        }
      },
      axisBorder: {
        show: false
      }
    },
    yaxis: {
      labels: {
        formatter: function(value) {
          // Format with Indian currency symbol and thousands separator
          return '₹' + value.toLocaleString('en-IN');
        },
        style: {
          colors: '#858d98'
        }
      }
    },
    tooltip: {
      x: {
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: function(value) {
          return '₹' + value.toLocaleString('en-IN');
        }
      }
    },
    grid: {
      borderColor: '#f1f1f1',
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100]
      }
    }
  });

  // Initial data load from cache and context
  useEffect(() => {
    // First check if data is available from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.revenue) {
      processRevenueData(allStatsData.revenue);
    }
    // If no cached data, use context data
    else if (revenue_from_context) {
      processRevenueData(revenue_from_context);
    }
    
    // Fetch fresh data in background
    fetchRevenueData();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchRevenueData();
  }, [dateRange]);

  // Process revenue data for chart
  const processRevenueData = (data) => {
    if (!data || !Array.isArray(data)) {
      setRevenueData([]);
      return;
    }

    // Sort data by date (ascending)
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });

    // Extract dates and revenue for chart
    const formattedData = sortedData.map(item => ({
      x: new Date(item.date).getTime(),
      y: Math.round(parseFloat(item.revenue) || 0)
    }));

    setRevenueData(formattedData);
    
    // Update chart options with new dates
    setChartOptions(prevOptions => ({
      ...prevOptions,
      xaxis: {
        ...prevOptions.xaxis,
        categories: sortedData.map(item => new Date(item.date).getTime())
      }
    }));
  };

  // Fetch revenue data using the consolidated API
  const fetchRevenueData = async () => {
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
      
      // Use fetchAllStats to get all stats at once
      const allStatsData = await fetchAllStats(dateFilter, {
        forceRefresh: true
      });
      
      if (allStatsData && allStatsData.revenue) {
        processRevenueData(allStatsData.revenue);
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load revenue data. Please try again.');
      }
    }
  };

  // Create series data for the chart
  const chartSeries = [
    {
      name: 'Revenue',
      data: revenueData
    }
  ];

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
        <h5 className="card-title mb-0">Revenue Over Time</h5>
      </div>

      {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      <div className="card-body">
        {revenueData.length > 0 ? (
          <ReactApexChart 
            options={chartOptions} 
            series={chartSeries} 
            type="area" 
            height={350}
          />
        ) : (
          <div className="text-center py-5">
            <p>No revenue data available for the selected time period.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Export the component wrapped in the HOC
export default withErrorHandling(RevenueGraph); 