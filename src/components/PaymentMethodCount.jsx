import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext';
import { useCacheData } from '../context/CacheDataContext';
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header';

const PaymentMethodCount = ({ handleApiError }) => {
  // Get data from dashboard context
  const { 
    totalCollectionSource_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    getCachedData,
    fetchAllStats
  } = useCacheData();

  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();

  const [paymentData, setPaymentData] = useState({});
  const [error, setError] = useState('');

  // Chart options
  const chartOptions = {
    chart: {
      height: 300,
      type: 'donut'
    },
    labels: ['Cash', 'Card', 'UPI', 'Complementary'],
    colors: ['#00CFE8', '#28C76F', '#7367F0', '#FF9F43'],
    dataLabels: {
      enabled: true,
      formatter: function(val) {
        return val.toFixed(1) + '%'
      }
    },
    legend: {
      show: true,
      position: 'bottom'
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              show: true
            },
            value: {
              show: true,
              formatter: function(val) {
                return val
              }
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Total Orders',
              formatter: function(w) {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0)
              }
            }
          }
        }
      }
    },
    responsive: [{
      breakpoint: 992,
      options: {
        chart: {
          height: 380
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  // Initial data load from cache and context
  useEffect(() => {
    // First check if data is available from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && allStatsData.total_collection_source) {
      processPaymentData(allStatsData.total_collection_source);
    }
    // If no cached data, use context data
    else if (totalCollectionSource_from_context) {
      processPaymentData(totalCollectionSource_from_context);
    }
    
    // Fetch fresh data in background
    fetchPaymentData();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchPaymentData();
  }, [dateRange]);

  // Process payment data
  const processPaymentData = (data) => {
    if (data) {
      setPaymentData({
        upi_amount: data.upi_amount || 0,
        upi_orders: data.upi_orders || 0,
        cash_amount: data.cash_amount || 0,
        cash_orders: data.cash_orders || 0,
        card_amount: data.card_amount || 0,
        card_orders: data.card_orders || 0,
        complementary_amount: data.complementary_amount || 0,
        complementary_orders: data.complementary_orders || 0
      });
    }
  };

  // Fetch payment data using the consolidated API
  const fetchPaymentData = async () => {
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
      
      if (allStatsData && allStatsData.total_collection_source) {
        processPaymentData(allStatsData.total_collection_source);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods data:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load payment data. Please try again.');
      }
    }
  };

  // Calculate series data for the chart
  const getChartSeries = () => {
    return [
      paymentData.cash_orders || 0,
      paymentData.card_orders || 0,
      paymentData.upi_orders || 0,
      paymentData.complementary_orders || 0
    ];
  };

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  // Calculate total orders
  const totalOrders = getChartSeries().reduce((a, b) => a + b, 0);

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
        <h5 className="card-title mb-0">Payment Method Distribution</h5>
      </div>

      {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      <div className="card-body">
        {totalOrders > 0 ? (
          <ReactApexChart 
            options={chartOptions} 
            series={getChartSeries()} 
            type="donut" 
            height={300}
          />
        ) : (
          <div className="text-center py-5">
            <p>No payment method data available for the selected time period</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Export the component wrapped in the HOC
export default withErrorHandling(PaymentMethodCount);