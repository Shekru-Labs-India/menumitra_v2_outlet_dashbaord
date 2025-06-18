import React, { useState, useEffect } from 'react'
import { API_PATHS } from '../config/apiConfig';
import { useDashboard } from '../context/DashboardContext';
import { useCacheData } from '../context/CacheDataContext';
import Chart from 'react-apexcharts';
import { withErrorHandling } from './withErrorHandling';
import { useGlobalDateFilter } from './Header';

const FoodTypeGraph = ({ handleApiError, onVisibilityChange }) => {
    // Get data from dashboard context
    const { 
      foodTypeStatistics_from_context
    } = useDashboard();

    // Get data from cache context
    const { 
      getCachedData,
      fetchAllStats
    } = useCacheData();

    // Get global date filter
    const { dateRange, getDateFilter } = useGlobalDateFilter();

    const [foodTypeData, setFoodTypeData] = useState([]);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false); // State for modal
    const [loading, setLoading] = useState(true);

    // Initial data load from cache and context
    useEffect(() => {
      // First check if data is available from the consolidated API cache
      const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
      if (allStatsData && allStatsData.food_type_statistics) {
        processFoodTypeData(allStatsData.food_type_statistics);
      }
      // If no cached data, use context data
      else if (foodTypeStatistics_from_context) {
        processFoodTypeData(foodTypeStatistics_from_context);
      } else {
        // If no data is available yet, ensure we have empty data structure
        setFoodTypeData([]);
      }
      
      // Fetch fresh data in background
      fetchFoodTypeStats();
    }, []);

    // Update when date range changes
    useEffect(() => {
      fetchFoodTypeStats();
    }, [dateRange]);

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
            setLoading(false);
        } catch (error) {
            console.error('Error processing food type data:', error);
            setFoodTypeData([]);
            setLoading(false);
        }
    };

    // Fetch food type stats data using only the consolidated API
    const fetchFoodTypeStats = async () => {
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
            
            if (allStatsData && allStatsData.food_type_statistics) {
                processFoodTypeData(allStatsData.food_type_statistics);
            } else {
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
            setLoading(false);
        }
    };

    // Process data for the chart
    const processChartData = () => {
        // ... existing processing code ...
    };

    // Make the hasData check more comprehensive
    const hasData = foodTypeData && 
                   Array.isArray(foodTypeData) &&
                   foodTypeData.length > 0 && 
                   foodTypeData.some(dayData => 
                      dayData && 
                      (dayData.Veg > 0 || dayData['Non-Veg'] > 0 || dayData.Vegan > 0 || dayData.Eggs > 0)
                   );

    // Use useEffect to notify the parent component about visibility
    useEffect(() => {
        // Only call onVisibilityChange if it exists
        if (onVisibilityChange) {
            onVisibilityChange(hasData || loading);
        }
    }, [foodTypeData, loading, onVisibilityChange, hasData]);

    // Add clear console log for debugging
    if (!hasData && !loading) {
        console.log('FoodTypeGraph: No data to display');
        return null;
    }

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