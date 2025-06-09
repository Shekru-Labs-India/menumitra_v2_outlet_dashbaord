import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { useDashboard } from '../context/DashboardContext'; // Import dashboard context
import { useCacheData } from '../context/CacheDataContext'; // Import cache context
import { withErrorHandling, DateFilter } from './common';

const OrderStat = ({ handleApiError }) => {
    // Get data from dashboard context
    const { 
      orderStatistics_from_context
    } = useDashboard();

    // Get data from cache context
    const { 
      fetchData,
      getCachedData
    } = useCacheData();

    const [dateRange, setDateRange] = useState('All Time');
    const [isGifPlaying, setIsGifPlaying] = useState(false);
    const [error, setError] = useState('');
    const [orderStats, setOrderStats] = useState({});

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
        const cachedData = getCachedData(API_PATHS.orderStatistics);
        if (cachedData) {
            processOrderStats(cachedData);
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
        fetchOrderStats(getDateRange(dateRange), { forceRefresh: true });
    }, [dateRange]);

    // Process order stats data
    const processOrderStats = (data) => {
        if (data) {
            setOrderStats({
                success_orders: data.success_orders || 0,
                cancelled_orders: data.cancelled_orders || 0,
                complementary_orders: data.complementary_orders || 0,
                KOT_orders: data.KOT_orders || 0
            });
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
    };

    const handleCustomDateSelect = (start, end, formattedRange) => {
        setDateRange(formattedRange);
    };

    const handleReload = () => {
        setIsGifPlaying(true);
        
        // Always fetch fresh data on reload, regardless of the date range
        fetchOrderStats(getDateRange(dateRange), { forceRefresh: true });
    };

    // Fetch order statistics using the cache context
    const fetchOrderStats = async (dateFilter = {}, options = {}) => {
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
            const data = await fetchData(API_PATHS.orderStatistics, requestData, {
                forceRefresh: options.forceRefresh || false,
                transformResponse: (response) => response?.detail || response
            });
            
            if (data) {
                processOrderStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch order statistics:', error);
            
            // Use the handleApiError function from the HOC
            if (!handleApiError(error)) {
                // If error was not handled by the HOC (not a 403), set local error state
                setError('Failed to load order statistics. Please try again.');
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
            case 'All Time':
                // For 'All Time', don't send date parameters
                return {};
            default:
                // Check if it's a custom range with format "DD MMM YYYY - DD MMM YYYY"
                if (range.includes(' - ')) {
                    const [startStr, endStr] = range.split(' - ');
                    // These are already formatted dates, so just pass them directly
                    return {
                        start_date: startStr,
                        end_date: endStr
                    };
                }
                // Default case also returns empty object (no date filtering)
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

    // Return null if there's a 403 error (permission denied)
    if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
        return null;
    }

    // Generate metrics based on API response data
    const getMetrics = () => [
      {
        title: "Success Order",
        value: orderStats.success_orders?.toString() || "0",
      },
      {
        title: "Cancelled Order",
        value: orderStats.cancelled_orders?.toString() || "0",
      },
      {
        title: "Complimentary Order",
        value: orderStats.complementary_orders?.toString() || "0",
      },
      {
        title: "Kitchen Order token (KOT)",
        value: orderStats.KOT_orders?.toString() || "0",
      },
    ];

    return (
        <div className="card border" style={{ boxShadow: 'none' }}>
            <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
                <h5 className="card-title mb-0">Order Statistics</h5>
                <div className="d-flex align-items-center gap-2 ">
                    <DateFilter 
                        dateRange={dateRange}
                        onDateRangeChange={handleDateRangeChange}
                        onCustomDateSelect={handleCustomDateSelect}
                    />

                    <button
                        type="button"
                        className="btn btn-icon p-0"
                        onClick={handleReload}
                        style={{ border: '1px solid var(--bs-primary)' }}
                    >
                        <i className="fas fa-sync-alt"></i>
                    </button>

                    {/* <button
                        type="button"
                        className="btn btn-icon btn-sm p-0"
                        style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid #e9ecef'
                        }}
                        onClick={() => setIsGifPlaying(true)}
                        title={isGifPlaying ? "Animation playing" : "Click to play animation"}
                    >
                    
                        {isGifPlaying ? (
                            // Show animated GIF when playing
                            <img 
                                src={aiAnimationGif} 
                                alt="AI Animation (Playing)"
                                style={{ 
                                    width: '24px', 
                                    height: '24px',
                                    objectFit: 'contain'
                                }}
                            />
                        ) : (
                            // Show static frame when not playing
                            <img 
                                src={aiAnimationStillFrame} 
                                alt="AI Animation (Click to play)"
                                style={{ 
                                    width: '24px', 
                                    height: '24px',
                                    objectFit: 'contain',
                                    opacity: 0.9
                                }}
                            />
                        )}
                    </button> */}
                </div>
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
                            <div className="d-flex flex-column p-3 bg-label-primary rounded border">
                                <div className="text-heading mb-2">{metric.title}</div>
                                <div className="d-flex align-items-center">
                                    <div className="bg-primary rounded me-2" style={{ width: '4px', height: '40px' }}></div>
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