import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext';
import { useCacheData } from '../context/CacheDataContext';
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header';

const RevenueLossWidget = ({ handleApiError }) => {
  // Get data from dashboard context
  const { 
    revenueLoss_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  const [revenueLossData, setRevenueLossData] = useState([]);
  const [error, setError] = useState('');

  // Chart options
  const chartOptions = {
    chart: {
      height: 200,
      type: 'donut',
      offsetY: 0,
      sparkline: {
        enabled: true
      }
    },
    plotOptions: {
      pie: {
        customScale: 0.9,
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '0.938rem',
              offsetY: 20
            },
            value: {
              show: true,
              fontSize: '1.625rem',
              color: '#8c57ff',
              fontWeight: 500,
              offsetY: -20,
              formatter: function(val) {
                return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
              }
            },
            total: {
              show: true,
              label: 'Total Loss',
              color: '#8c57ff',
              fontSize: '0.938rem',
              formatter: function (w) {
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return '₹' + total.toLocaleString('en-IN', { maximumFractionDigits: 0 });
              }
            }
          }
        }
      }
    },
    labels: ['Cancelled', 'Complementary'],
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center'
    },
    colors: ['#FF4560', '#FEB019'],
    tooltip: {
      y: {
        formatter: function(value) {
          return '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        }
      }
    }
  };

  // Initial data load from cache and context
  useEffect(() => {
    // First check if data is available from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.revenue_loss) {
      processRevenueLossData(allStatsData.revenue_loss);
    }
    // If no cached data, use context data
    else if (revenueLoss_from_context) {
      processRevenueLossData(revenueLoss_from_context);
    }
    
    // Fetch fresh data in background
    fetchRevenueLossData();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchRevenueLossData();
  }, [dateRange]);

  // Process revenue loss data for chart
  const processRevenueLossData = (data) => {
    if (data) {
      const cancelledAmount = parseFloat(data.cancelled_amount) || 0;
      const complementaryAmount = parseFloat(data.complementary_amount) || 0;
      
      setRevenueLossData([
        Math.round(cancelledAmount),
        Math.round(complementaryAmount)
      ]);
    } else {
      setRevenueLossData([0, 0]);
    }
  };

  // Fetch revenue loss data using the consolidated API
  const fetchRevenueLossData = async () => {
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
      
      if (allStatsData && allStatsData.revenue_loss) {
        processRevenueLossData(allStatsData.revenue_loss);
      }
    } catch (error) {
      console.error('Failed to fetch revenue loss data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load revenue loss data. Please try again.');
      }
    }
  };

  // Calculate total revenue loss
  const totalRevenueLoss = revenueLossData.reduce((acc, val) => acc + val, 0);

  // Series data for the chart
  const chartSeries = revenueLossData;

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
        <h5 className="card-title mb-0">Revenue Loss</h5>
      </div>

      {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      <div className="card-body">
        {totalRevenueLoss > 0 ? (
          <ReactApexChart 
            options={chartOptions} 
            series={chartSeries} 
            type="donut" 
            height={240} 
          />
        ) : (
          <div className="text-center py-5">
            <h3>₹0</h3>
            <p>No revenue loss data for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Export the component wrapped with error handling HOC
export default withErrorHandling(RevenueLossWidget); 