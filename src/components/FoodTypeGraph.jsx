import React, { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { api, API_PATHS } from '../config/apiConfig';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { useDashboard } from '../context/DashboardContext'; // Import context
import Chart from 'react-apexcharts';
import { withErrorHandling } from './common';

const FoodTypeGraph = ({ handleApiError }) => {
    // Get data from context
    const { 
      foodTypeStatistics_from_context,
      loading: contextLoading,
      error: contextError
    } = useDashboard();

    const [dateRange, setDateRange] = useState('All time');
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isGifPlaying, setIsGifPlaying] = useState(false);
    const [foodTypeData, setFoodTypeData] = useState([]);
    const [error, setError] = useState('');
    const [userInteracted, setUserInteracted] = useState(false); // Flag to track user interaction
    const [showModal, setShowModal] = useState(false); // New state for modal
  
    // Helper function to get auth headers
    const getAuthHeaders = (includeAuth = true) => {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Only add Authorization header if includeAuth is true and token exists
        if (includeAuth) {
            const accessToken = localStorage.getItem('access');
            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }
        }
        
        return headers;
    };

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

    // Use context data when component mounts
    useEffect(() => {
      if (foodTypeStatistics_from_context) {
        processFoodTypeData(foodTypeStatistics_from_context);
      }
    }, [foodTypeStatistics_from_context]);

    // Set error from context if available
    useEffect(() => {
      if (contextError && !userInteracted) {
        setError(contextError);
      }
    }, [contextError, userInteracted]);

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

    // Function to format date range string
    const formatDateRangeString = (start, end) => {
        const formatDate = (date) => {
            const day = date.getDate().toString().padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            return `${day} ${month}`;
        };
        
        return `${formatDate(start)} - ${formatDate(end)}`;
    };

    // Function to get date range options
    const getDateRangeOptions = () => {
        const options = [];
        
        // All time option
        options.push({
            label: 'All time',
            value: 'All time',
            dateRange: null
        });
        
        // This week
        const thisWeek = getWeekDateRange(0);
        options.push({
            label: 'This week',
            value: 'This week',
            dateRange: formatDateRangeString(thisWeek.start, thisWeek.end)
        });
        
        // Last week
        const lastWeek = getWeekDateRange(1);
        options.push({
            label: 'Last week',
            value: 'Last week',
            dateRange: formatDateRangeString(lastWeek.start, lastWeek.end)
        });
        
        // Previous weeks (up to 4 weeks ago)
        for (let i = 2; i <= 4; i++) {
            const week = getWeekDateRange(i);
            options.push({
                label: formatDateRangeString(week.start, week.end),
                value: `Week ${i}`,
                dateRange: formatDateRangeString(week.start, week.end)
            });
        }
        
        // Custom range
        options.push({
            label: 'Custom Range',
            value: 'Custom Range',
            dateRange: null
        });
        
        return options;
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
            // The new API response has days of the week as keys
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
            case 'This week': {
                const firstDayOfWeek = new Date(today);
                const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
                const diff = day === 0 ? 6 : day - 1; // Adjust to make Monday the first day
                firstDayOfWeek.setDate(today.getDate() - diff);
                start = firstDayOfWeek;
                end = today;
                break;
            }
            case 'Last week': {
                const lastWeekEnd = new Date(today);
                const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
                const diff = day === 0 ? 6 : day - 1; // Adjust to make Monday the first day
                lastWeekEnd.setDate(today.getDate() - diff - 1); // End of previous week (Sunday)
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Start of previous week (Monday)
                start = lastWeekStart;
                end = lastWeekEnd;
                break;
            }
            case 'Week 2': {
                const week = getWeekDateRange(2);
                start = week.start;
                end = week.end;
                break;
            }
            case 'Week 3': {
                const week = getWeekDateRange(3);
                start = week.start;
                end = week.end;
                break;
            }
            case 'Week 4': {
                const week = getWeekDateRange(4);
                start = week.start;
                end = week.end;
                break;
            }
            default:
                return null;
        }
        
        return {
            start_date: formatDate(start),
            end_date: formatDate(end)
        };
    };

    const handleDateRangeChange = (range) => {
        console.log('Date range changed to:', range);
        setDateRange(range);
        
        if (range === 'Custom Range') {
            // Only show date picker, don't reset dates
            setShowDatePicker(true);
        } else {
            // For non-custom ranges, reset dates and fetch data
            setShowDatePicker(false);
            setStartDate(null);
            setEndDate(null);
            fetchData(range);
        }
    };

    const handleReload = () => {
        console.log('Reloading data...');
        setUserInteracted(true);
        setIsGifPlaying(true);
        
        // Always fetch fresh data on reload, regardless of the date range
        fetchData(dateRange);
    };

    // Function to prepare request data based on date range
    const prepareRequestData = (range) => {
        const today = new Date();
        
        const getDateRange = (range) => {
            switch(range) {
                case 'All time': {
                    // For all time, we'll send an empty date range to get all data
                    return {
                        start_date: '',
                        end_date: ''
                    };
                }
                case 'This week': {
                    const firstDayOfWeek = new Date(today);
                    const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
                    const diff = day === 0 ? 6 : day - 1; // Adjust to make Monday the first day
                    firstDayOfWeek.setDate(today.getDate() - diff);
                    return {
                        start_date: formatDate(firstDayOfWeek),
                        end_date: formatDate(today)
                    };
                }
                case 'Last week': {
                    const lastWeekEnd = new Date(today);
                    const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
                    const diff = day === 0 ? 6 : day - 1; // Adjust to make Monday the first day
                    lastWeekEnd.setDate(today.getDate() - diff - 1); // End of previous week (Sunday)
                    const lastWeekStart = new Date(lastWeekEnd);
                    lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Start of previous week (Monday)
                    return {
                        start_date: formatDate(lastWeekStart),
                        end_date: formatDate(lastWeekEnd)
                    };
                }
                case 'Week 2':
                case 'Week 3':
                case 'Week 4': {
                    const weekNumber = parseInt(range.split(' ')[1]);
                    const week = getWeekDateRange(weekNumber);
                    return {
                        start_date: formatDate(week.start),
                        end_date: formatDate(week.end)
                    };
                }
                case 'Custom Range': {
                    if (startDate && endDate) {
                        return {
                            start_date: formatDate(startDate),
                            end_date: formatDate(endDate)
                        };
                    }
                    return {};
                }
                default: {
                    return {};
                }
            }
        };

        return getDateRange(range);
    };

    const fetchData = async (range) => {
        setLoading(true);
        setError('');
        // Set user interaction flag to true
        setUserInteracted(true);
        
        try {
            const requestData = prepareRequestData(range);
            const userId = localStorage.getItem('user_id');
            
            // Create the request payload - outlet_id will be handled by the API interceptor
            const apiRequestData = {
                user_id: parseInt(userId),
                ...requestData.start_date && { start_date: requestData.start_date },
                ...requestData.end_date && { end_date: requestData.end_date }
            };
            
            console.log('API Request Payload:', apiRequestData);

            // Make API request using the API instance
            const response = await api.post(API_PATHS.foodTypeStats, apiRequestData);
            
            console.log('API Response:', response.data);
            
            if (response.data?.detail) {
                processFoodTypeData(response.data.detail);
            } else {
                console.warn('Invalid response format');
                setError('Invalid data format received from the server');
            }
        } catch (error) {
            console.error('Error fetching food type data:', error);
            
            // Use the handleApiError function from the HOC
            if (!handleApiError(error)) {
                // If error was not handled by the HOC (not a 403), set local error state
                setError('Failed to load food type statistics. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCustomDateSelect = () => {
        if (startDate && endDate) {
            console.log('Custom date range selected:', formatDate(startDate), 'to', formatDate(endDate));
            setDateRange(`${formatDate(startDate)} - ${formatDate(endDate)}`);
            setShowDatePicker(false);
            fetchData('Custom Range');
        }
    };

    // Determine current loading state
    const isLoading = userInteracted ? loading : contextLoading;
    // Determine current error state
    const currentError = userInteracted ? error : contextError;

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

    console.log('Chart series data:', chartSeries);

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
                <h5 className="card-title mb-0">Food Type Analysis</h5>
                <div className="d-flex align-items-center gap-3">
                    <div className="dropdown">
                        <button
                            type="button"
                            className="btn btn-outline-primary dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            <i className="fas fa-calendar me-2"></i>
                            {dateRange}
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                            {getDateRangeOptions().map((option) => (
                                <li key={option.value}>
                                    <a
                                        href="javascript:void(0);"
                                        className="dropdown-item d-flex align-items-center"
                                        onClick={() => handleDateRangeChange(option.value)}
                                    >
                                        <div className="d-flex flex-column">
                                            <span>{option.label}</span>
                                            {option.dateRange && (
                                                <small className="text-muted">{option.dateRange}</small>
                                            )}
                                        </div>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button
                        type="button"
                        className={`btn btn-icon p-0 ${isLoading ? 'disabled' : ''}`}
                        onClick={handleReload}
                        disabled={isLoading}
                        style={{ border: '1px solid var(--bs-primary)' }}
                    >
                        <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
                    </button>

                    <button
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
                    </button>
                </div>
            </div>

            {showDatePicker && (
                <div className="card-body">
                    <div className="d-flex flex-column gap-2">
                        <label>Select Date Range:</label>
                        <div className="d-flex gap-2">
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                maxDate={new Date()}
                                placeholderText="DD MMM YYYY"
                                className="form-control"
                                dateFormat="dd MMM yyyy"
                            />
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                maxDate={new Date()}
                                placeholderText="DD MMM YYYY"
                                className="form-control"
                                dateFormat="dd MMM yyyy"
                            />
                        </div>
                        <button className="btn btn-primary mt-2" onClick={handleCustomDateSelect} disabled={!startDate || !endDate}>
                            Apply
                        </button>
                    </div>
                </div>
            )}
            
            {currentError && (
                <div className="card-body">
                    <div className="alert alert-danger" role="alert">
                        {currentError}
                    </div>
                </div>
            )}
            
            <div className="card-body">
                {isLoading ? (
                    <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
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
                        <Chart
                            options={chartOptions}
                            series={chartSeries}
                            type="bar"
                            height={400}
                        />
                    </div>
                )}
            </div>

            {/* Modal for expanded graph */}
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