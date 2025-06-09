import React, { useState, useEffect } from 'react'
import { API_PATHS } from '../config/apiConfig';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { useDashboard } from '../context/DashboardContext'; // Import dashboard context
import { useCacheData } from '../context/CacheDataContext'; // Import cache context
import Chart from 'react-apexcharts';
import { withErrorHandling, DateFilter } from './common';

const FoodTypeGraph = ({ handleApiError }) => {
    // Get data from dashboard context
    const { 
      foodTypeStatistics_from_context
    } = useDashboard();

    // Get data from cache context
    const { 
      fetchData,
      getCachedData
    } = useCacheData();

    const [dateRange, setDateRange] = useState('All Time');
    const [isGifPlaying, setIsGifPlaying] = useState(false);
    const [foodTypeData, setFoodTypeData] = useState([]);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false); // State for modal

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
      const cachedData = getCachedData(API_PATHS.foodTypeStats);
      if (cachedData) {
        processFoodTypeData(cachedData);
      }
      // If no cached data, use context data
      else if (foodTypeStatistics_from_context) {
        processFoodTypeData(foodTypeStatistics_from_context);
      } else {
        // If no data is available yet, ensure we have empty data structure
        setFoodTypeData([]);
      }
      
      // Explicitly call with empty filter for "All Time"
      // This ensures data is loaded on initial mount even with "All Time" filter
      const emptyFilter = {};
      console.log('FoodTypeGraph - Initial load with empty filter for All Time');
      fetchFoodTypeStats(emptyFilter, { forceRefresh: true });
    }, []);

    // Update when date range changes
    useEffect(() => {
      fetchFoodTypeStats(getDateRange(dateRange), { forceRefresh: true });
    }, [dateRange]);

    // Function to get week date range
    const getWeekDateRange = (weeksAgo = 0) => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
        const diff = currentDay === 0 ? 6 : currentDay - 1; // Adjust to make Monday the first day
        
        // Calculate the start of the current week (Monday)
        const startOfCurrentWeek = new Date(today);
        startOfCurrentWeek.setDate(today.getDate() - diff);
        
        // Calculate the start of the target week
        const startOfTargetWeek = new Date(startOfCurrentWeek);
        startOfTargetWeek.setDate(startOfCurrentWeek.getDate() - (weeksAgo * 7));
        
        // Calculate the end of the target week (Sunday)
        const endOfTargetWeek = new Date(startOfTargetWeek);
        endOfTargetWeek.setDate(startOfTargetWeek.getDate() + 6);
        
        return {
            start: startOfTargetWeek,
            end: endOfTargetWeek
        };
    };

    const formatDate = (date) => {
        if (!date) return '';
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const processFoodTypeData = (data) => {
        try {
            // The API response has days of the week as keys
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            
            // Create an array of objects with day and food type data
            const formattedData = days.map(day => {
                const dayData = data[day] || { veg: 0, nonveg: 0, vegan: 0, egg: 0 };
                return {
                    day: day.charAt(0).toUpperCase() + day.slice(1), // Capitalize first letter
                    Veg: dayData.veg || 0,
                    'Non-Veg': dayData.nonveg || 0,
                    Vegan: dayData.vegan || 0,
                    Eggs: dayData.egg || 0
                };
            });
            
            setFoodTypeData(formattedData);
        } catch (error) {
            console.error('Error processing food type data:', error);
            setFoodTypeData([]);
        }
    };

    // Function to get date range
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

    const handleDateRangeChange = (range) => {
        setDateRange(range);
    };

    const handleCustomDateSelect = (start, end, formattedRange) => {
        setDateRange(formattedRange);
    };

    const handleReload = () => {
        setIsGifPlaying(true);
        
        // Always fetch fresh data on reload, regardless of the date range
        fetchFoodTypeStats(getDateRange(dateRange), { forceRefresh: true });
    };

    // Fetch food type stats data using the cache context
    const fetchFoodTypeStats = async (dateFilter = {}, options = {}) => {
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
            
            console.log('FoodTypeGraph - Fetching data with params:', requestData);
            
            // Use the fetchData function from context which handles caching
            const data = await fetchData(API_PATHS.foodTypeStats, requestData, {
                forceRefresh: options.forceRefresh || false,
                transformResponse: (response) => {
                    console.log('FoodTypeGraph - Raw response:', response);
                    return response?.detail || response;
                }
            });
            
            if (data) {
                console.log('FoodTypeGraph - Processed data:', data);
                processFoodTypeData(data);
            } else {
                console.log('FoodTypeGraph - No data returned');
                // If no data is returned but no error occurred, set empty data
                setFoodTypeData([]);
            }
        } catch (error) {
            console.error('Failed to fetch food type statistics:', error);
            
            // Use the handleApiError function from the HOC
            if (!handleApiError(error)) {
                // If error was not handled by the HOC (not a 403), set local error state
                setError('Failed to load food type statistics. Please try again.');
            }
            
            // Even on error, we should ensure we have at least empty data
            setFoodTypeData([]);
        }
    };

    // Return null if there's a 403 error (permission denied)
    if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
        return null;
    }

    const chartOptions = {
        chart: {
            type: 'bar',
            stacked: true,
            stackType: '100%',
            toolbar: {
                show: false
            },
            animations: {
                enabled: true
            }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                borderRadius: 4,
                distributed: false,
                dataLabels: {
                    position: 'center'
                }
            },
        },
        dataLabels: {
            enabled: true,
            formatter: function(val) {
                return Math.round(val);
            },
            style: {
                fontSize: '12px',
                colors: ['#fff']
            }
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        xaxis: {
            categories: foodTypeData.map(item => item.day),
            labels: {
                style: {
                    colors: '#433c50',
                    fontSize: '12px'
                },
                axisBorder: {
                    show: true
                },
                axisTicks: {
                    show: true
                }
            }
        },
        yaxis: {
            show: true,
            labels: {
                formatter: function(val) {
                    return Math.round(val);
                },
                style: {
                    colors: '#433c50',
                    fontSize: '12px'
                }
            }
        },
        fill: {
            opacity: 1,
            colors: ['#2e7d32', '#d32f2f', '#FFBF00', '#9e9e9e']
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            offsetY: -10,
            labels: {
                colors: '#433c50',
                useSeriesColors: false
            },
            markers: {
                width: 12,
                height: 12,
                radius: 12
            }
        },
        tooltip: {
            y: {
                formatter: function(val) {
                    return Math.round(val);
                }
            },
            shared: true,
            intersect: false
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: 'bottom'
                }
            }
        }]
    };

    const chartSeries = [
        {
            name: 'Veg',
            data: foodTypeData.map(item => item.Veg)
        },
        {
            name: 'Non-Veg',
            data: foodTypeData.map(item => item['Non-Veg'])
        },
        {
            name: 'Vegan',
            data: foodTypeData.map(item => item.Vegan)
        },
        {
            name: 'Eggs',
            data: foodTypeData.map(item => item.Eggs)
        }
    ];

    return (
        <div className="card border" style={{ boxShadow: 'none' }}>
            <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
                <h5 className="card-title mb-0">Food Type Analysis</h5>
                <div className="d-flex align-items-center gap-3">
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
                <div className="position-relative">
                    <button
                        type="button"
                        className="btn btn-icon btn-sm btn-outline-primary position-absolute"
                        style={{ 
                            top: '-5px', 
                            right: '55px',
                            zIndex: 1
                        }}
                        onClick={() => setShowModal(true)}
                        title="Expand Graph"
                    >
                        <i className="fas fa-expand"></i>
                    </button>
                    {foodTypeData.length > 0 ? (
                        <Chart
                            options={chartOptions}
                            series={chartSeries}
                            type="bar"
                            height={400}
                        />
                    ) : (
                        <div className="text-center p-5">
                            <p>No food type data available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for expanded graph */}
            {showModal && foodTypeData.length > 0 && (
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
                                <h5 className="modal-title">Food Type Analysis</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowModal(false)}
                                    aria-label="Close"
                                ></button>
                            </div>
                            <div className="modal-body">
                                <Chart
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

export default withErrorHandling(FoodTypeGraph);