import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { useDashboard } from '../context/DashboardContext'; // Import dashboard context
import { useCacheData } from '../context/CacheDataContext'; // Import cache context
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header'; // Import global date filter context

const OrderStat = ({ handleApiError, onVisibilityChange }) => {
    // Get data from dashboard context
    const { 
      orderStatistics_from_context
    } = useDashboard();

    // Get data from cache context
    const { 
      getCachedData,
      fetchAllStats
    } = useCacheData();

    // Get global date filter
    const { dateRange, getDateFilter } = useGlobalDateFilter();
    
    const [error, setError] = useState('');
    const [orderStats, setOrderStats] = useState({});
    const [loading, setLoading] = useState(true);

    // Initial data load from cache and context
    useEffect(() => {
        // First try to get data from cache, since it might have been populated by fetchAllStats
        const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
        if (allStatsData && allStatsData.order_statistics) {
            processOrderStats(allStatsData.order_statistics);
        }
        // If no cached data, use context data
        else if (orderStatistics_from_context) {
            processOrderStats(orderStatistics_from_context);
        }
        
        // Fetch fresh data in background
        fetchOrderStats();
    }, []);

    // Update when date range changes
    useEffect(() => {
        // Use global date filter to get date range for API call
        fetchOrderStats();
    }, [dateRange]);

    // Process order stats data
    const processOrderStats = (data) => {
        if (!data) {
            setOrderStats({});
            setLoading(false);
            return;
        }
        
        setOrderStats({
            success_orders: data.success_orders || 0,
            cancelled_orders: data.cancelled_orders || 0,
            complementary_orders: data.complementary_orders || 0,
            KOT_orders: data.KOT_orders || 0
        });
        
        setLoading(false);
        
        // Always show the component
        if (onVisibilityChange) {
            onVisibilityChange(true);
        }
    };

    // Fetch order statistics using the cache context
    const fetchOrderStats = async () => {
        try {
            setError('');
            setLoading(true);
            
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
            
            if (allStatsData && allStatsData.order_statistics) {
                processOrderStats(allStatsData.order_statistics);
            }
        } catch (error) {
            console.error('Failed to fetch order statistics:', error);
            
            // Use the handleApiError function from the HOC
            if (!handleApiError(error)) {
                // If error was not handled by the HOC (not a 403), set local error state
                setError('Failed to load order statistics. Please try again.');
            }
            setLoading(false);
        }
    };

    // Return null if there's a 403 error (permission denied)
    if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
        return null;
    }

    // Generate metrics based on API response data
    const getMetrics = () => [
      {
        title: "Success Order",
        value: orderStats.success_orders?.toString() || "0",
        bgColor: "bg-label-success",
        borderColor: "bg-success"
      },
      {
        title: "Cancelled Order",
        value: orderStats.cancelled_orders?.toString() || "0",
        bgColor: "bg-label-danger",
        borderColor: "bg-danger"
      },
      {
        title: "Complimentary Order",
        value: orderStats.complementary_orders?.toString() || "0",
        bgColor: "bg-label-primary",
        borderColor: "bg-primary"
      },
      {
        title: "Kitchen Order token (KOT)",
        value: orderStats.KOT_orders?.toString() || "0",
        bgColor: "bg-label-dark",
        borderColor: "bg-dark"
      },
    ];

    return (
        <div className="card border" style={{ boxShadow: 'none' }}>
            <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
                <h5 className="card-title mb-0">Order Statistics</h5>
            </div>

            {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
                <div className="card-body">
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                </div>
            )}

            <div className="card-body">
                <div className="row g-4">
                    {getMetrics().map((metric, index) => (
                        <div key={index} className="col-md-6">
                            <div className={`d-flex flex-column p-3 ${metric.bgColor} rounded border`}>
                                <div className="text-heading mb-2">{metric.title}</div>
                                <div className="d-flex align-items-center">
                                    <div className={`${metric.borderColor} rounded me-2`} style={{ width: '4px', height: '40px' }}></div>
                                    <div>
                                        <h4 className="mb-0 text-heading fw-medium fs-4">{metric.value}</h4>
                                        <small className="text-muted">{metric.subtitle}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default withErrorHandling(OrderStat);