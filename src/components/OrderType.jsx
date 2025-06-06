import React, { useState, useEffect } from "react";
import axios from 'axios';
import { api, API_PATHS } from '../config/apiConfig';
import Chart from 'react-apexcharts';
import { withErrorHandling } from './common';

import 'remixicon/fonts/remixicon.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { useDashboard } from '../context/DashboardContext'; // Import context

// Placeholder data for when API fails or is loading
const placeholderOrderTypes = [
  { 
    name: "Dine In", 
    icon: "fas fa-utensils",
    count: 0,
    trend: "0%",
    trendUp: true,
    color: "primary"
  },
  { 
    name: "Drive Through", 
    icon: "fas fa-car",
    count: 0,
    trend: "0%",
    trendUp: true,
    color: "info"
  },
  { 
    name: "Parcel", 
    icon: "fas fa-box",
    count: 0,
    trend: "0%",
    trendUp: true,
    color: "success"
  },
  { 
    name: "Delivery", 
    icon: "fas fa-globe",
    count: 0,
    trend: "0%",
    trendUp: true,
    color: "warning"
  },
];

const OrderType = ({ handleApiError }) => {
  // Get data from context
  const { 
    orderTypeStatistics_from_context,
    loading: contextLoading,
    error: contextError
  } = useDashboard();

  const [dateRange, setDateRange] = useState('All Time');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  const [orderTypes, setOrderTypes] = useState(placeholderOrderTypes);
  const [error, setError] = useState('');
  const [userInteracted, setUserInteracted] = useState(false); // Flag to track user interaction

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

  // Use context data when component mounts
  useEffect(() => {
    if (orderTypeStatistics_from_context) {
      // Convert the context data structure to the array format our component expects
      const orderTypesArray = [
        {
          name: "Dine In",
          icon: "fas fa-utensils",
          count: orderTypeStatistics_from_context["dine-in"] || 0,
          trend: "0%", // We don't have trend data in the response
          trendUp: true,
          color: "primary"
        },
        {
          name: "Drive Through",
          icon: "fas fa-car",
          count: orderTypeStatistics_from_context["drive-through"] || 0,
          trend: "0%",
          trendUp: true,
          color: "info"
        },
        {
          name: "Parcel",
          icon: "fas fa-box",
          count: orderTypeStatistics_from_context["parcel"] || 0,
          trend: "0%",
          trendUp: true,
          color: "success"
        },
        {
          name: "Delivery",
          icon: "fas fa-globe",
          count: orderTypeStatistics_from_context["delivery"] || 0,
          trend: "0%",
          trendUp: true,
          color: "warning"
        }
      ];
      
      // Add counter type if it exists in the response
      if (orderTypeStatistics_from_context["counter"] !== undefined) {
        orderTypesArray.push({
          name: "Counter",
          icon: "fas fa-cash-register",
          count: orderTypeStatistics_from_context["counter"] || 0,
          trend: "0%",
          trendUp: true,
          color: "danger"
        });
      }
      
      setOrderTypes(orderTypesArray);
    }
  }, [orderTypeStatistics_from_context]);

  // Set error from context if available
  useEffect(() => {
    if (contextError && !userInteracted) {
      setError(contextError);
    }
  }, [contextError, userInteracted]);

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
    setShowDatePicker(range === 'Custom Range');
    if (range !== 'Custom Range') {
      setStartDate(null);
      setEndDate(null);
      fetchData(range);
    }
  };

  const handleReload = () => {
    setLoading(true);
    // Set user interaction flag to true
    setUserInteracted(true);
    
    // Check if we have valid startDate and endDate (indicating custom range)
    if (startDate && endDate) {
      console.log('Reloading with custom date range:', formatDate(startDate), 'to', formatDate(endDate));
      // For custom range, explicitly use 'Custom Range'
      fetchData('Custom Range');
    } else {
      // For other ranges, use the current dateRange state
      console.log('Reloading with standard date range:', dateRange);
      fetchData(dateRange);
    }
  };

  const fetchData = async (range) => {
    try {
      setLoading(true);
      setError('');
      
      // Set user interaction flag to true
      setUserInteracted(true);
      
      // Get user and outlet ID from localStorage
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      if (!userId || !outletId) {
        setError('User ID or outlet ID not found. Please check your login.');
        setLoading(false);
        return;
      }
      
      // Prepare request data
      const requestData = {
        user_id: Number(userId),
        outlet_id: Number(outletId)
      };
      
      // Add date range if not "All Time"
      if (range === 'Custom Range' && startDate && endDate) {
        requestData.start_date = formatDate(startDate);
        requestData.end_date = formatDate(endDate);
      } else if (range !== 'All Time') {
        const dateRange = getDateRange(range);
        if (dateRange) {
          requestData.start_date = dateRange.start_date;
          requestData.end_date = dateRange.end_date;
        }
      }
      
      console.log('Sending order type statistics request:', requestData);
      
      // Make API request using the API instance from apiConfig
      const response = await api.post(API_PATHS.orderTypeStats, requestData);
      
      console.log('Order type statistics response:', response.data);
      
      if (response.data?.detail) {
        // Process the response data from the new format
        const data = response.data.detail;
        
        // Check if the response is in object format with keys like 'dine-in', 'parcel', etc.
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Convert the object format to our expected array format
          const orderTypesArray = [];
          
          // Map known order types to their display properties
          const orderTypeMap = {
            'dine-in': { name: 'Dine In', icon: 'fas fa-utensils', color: 'primary' },
            'parcel': { name: 'Parcel', icon: 'fas fa-box', color: 'success' },
            'delivery': { name: 'Delivery', icon: 'fas fa-globe', color: 'warning' },
            'counter': { name: 'Counter', icon: 'fas fa-cash-register', color: 'danger' },
            'drive-through': { name: 'Drive Through', icon: 'fas fa-car', color: 'info' }
          };
          
          // Convert each order type to our array format
          Object.entries(data).forEach(([key, value]) => {
            // Skip total_orders or any non-order type keys
            if (key !== 'total_orders' && orderTypeMap[key]) {
              orderTypesArray.push({
                name: orderTypeMap[key].name,
                icon: orderTypeMap[key].icon,
                count: value,
                trend: '0%', // We don't have trend data
                trendUp: true,
                color: orderTypeMap[key].color
              });
            }
          });
          
          setOrderTypes(orderTypesArray);
        } else if (Array.isArray(data)) {
          // If it's already an array, use it directly
          setOrderTypes(data);
        } else {
          console.error('Unexpected data format:', data);
          setError('Unexpected data format received');
        }
      } else {
        console.error('No data available in response');
        setError('No data available');
      }
    } catch (error) {
      console.error('Failed to fetch order type statistics:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load order type statistics. Please try again.');
      }
    } finally {
      setLoading(false);
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
      default:
        return null;
    }
    
    return {
      start_date: formatDate(start),
      end_date: formatDate(end)
    };
  };

  const handleCustomDateSelect = () => {
    if (startDate && endDate) {
      setDateRange(`${formatDate(startDate)} - ${formatDate(endDate)}`);
      setShowDatePicker(false);
      fetchData('Custom Range');
    }
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

  // Determine current loading state
  const isLoading = userInteracted ? loading : contextLoading;
  // Determine current error state
  const currentError = userInteracted ? error : contextError;

  // Return null if there's a 403 error (permission denied)
  if (currentError && (currentError.includes('permission') || currentError.includes('Permission') || currentError.includes('403'))) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0">Order Type Statistics</h5>
        <div className="d-flex gap-2">
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
              {[
                "All Time",
                "Today",
                "Yesterday",
                "Last 7 Days",
                "Last 30 Days",
                "Current Month",
                "Last Month",
              ].map((range) => (
                <li key={range}>
                  <a
                    href="javascript:void(0);"
                    className="dropdown-item d-flex align-items-center"
                    onClick={() => handleDateRangeChange(range)}
                  >
                    {range}
                  </a>
                </li>
              ))}
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <a
                  href="javascript:void(0);"
                  className="dropdown-item d-flex align-items-center"
                  onClick={() => handleDateRangeChange("Custom Range")}
                >
                  Custom Range
                </a>
              </li>
            </ul>
          </div>
          <button
            type="button"
            className={`btn btn-icon p-0 ${isLoading ? "disabled" : ""}`}
            onClick={handleReload}
            disabled={isLoading}
            style={{ border: "1px solid var(--bs-primary)" }}
          >
            <i className={`fas fa-sync-alt ${isLoading ? "fa-spin" : ""}`}></i>
          </button>

          <button
            type="button"
            className="btn btn-icon btn-sm p-0"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              position: "relative",
              border: "1px solid #e9ecef",
            }}
            onClick={() => setIsGifPlaying(true)}
            title={
              isGifPlaying ? "Animation playing" : "Click to play animation"
            }
          >
            {/* Using two separate images - static frame and animated */}
            {isGifPlaying ? (
              // Show animated GIF when playing
              <img
                src={aiAnimationGif}
                alt="AI Animation (Playing)"
                style={{
                  width: "24px",
                  height: "24px",
                  objectFit: "contain",
                }}
              />
            ) : (
              // Show static frame when not playing
              <img
                src={aiAnimationStillFrame}
                alt="AI Animation (Click to play)"
                style={{
                  width: "24px",
                  height: "24px",
                  objectFit: "contain",
                  opacity: 0.9,
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
            <button
              className="btn btn-primary mt-2"
              onClick={handleCustomDateSelect}
              disabled={!startDate || !endDate}
            >
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
        <div className="row g-3">
          {isLoading
            ? // Display skeleton loading for 4 order type cards
              Array(4)
                .fill(0)
                .map((_, index) => (
                  <div key={index} className="col-md-4 col-sm-6">
                    <div className="card shadow-none bg-label-secondary h-100 position-relative overflow-hidden">
                      <div className="card-body">
                        <div className="d-flex align-items-center mb-2">
                          <div
                            className="rounded-2 avatar avatar-sm me-2 bg-secondary d-flex align-items-center justify-content-center"
                            style={{
                              width: "35px",
                              height: "35px",
                              opacity: 0.5,
                            }}
                          ></div>
                          <span
                            className="bg-secondary"
                            style={{
                              width: "80px",
                              height: "20px",
                              opacity: 0.5,
                            }}
                          ></span>
                        </div>
                        <div className="d-flex align-items-center mt-3">
                          <div
                            className="bg-secondary me-2"
                            style={{
                              width: "30px",
                              height: "24px",
                              opacity: 0.5,
                            }}
                          ></div>
                          <div
                            className="bg-secondary"
                            style={{
                              width: "50px",
                              height: "20px",
                              opacity: 0.5,
                            }}
                          ></div>
                        </div>
                        <div
                          className="bg-secondary mt-1"
                          style={{
                            width: "70px",
                            height: "15px",
                            opacity: 0.5,
                          }}
                        ></div>
                      </div>
                      <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center">
                        <div
                          className="spinner-border text-primary"
                          role="status"
                        >
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            : // Display actual order type data
              Array.isArray(orderTypes) && orderTypes.map((order, index) => (
                <div key={index} className="col-md-4 col-sm-6">
                  <div
                    className={`card shadow-none bg-label-${order.color} h-100`}
                  >
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-2">
                        <div
                          className={`rounded-2 avatar avatar-sm me-2 bg-${order.color} d-flex align-items-center justify-content-center`}
                          style={{ width: "35px", height: "35px" }}
                        >
                          <i
                            className={`${order.icon} text-white`}
                            style={{ fontSize: "1rem" }}
                          ></i>
                        </div>
                        <span className="fw-semibold">{order.name}</span>
                      </div>
                      <div className="d-flex align-items-center mt-3">
                        <h4 className="mb-0 me-2">{order.count}</h4>
                        {/* <small className={`${order.trendUp ? 'text-success' : 'text-danger'} fw-semibold`}>
                        <i className={`fas fa-arrow-${order.trendUp ? 'up' : 'down'}`}></i>
                        {order.trend}
                      </small> */}
                      </div>
                      <small className="text-muted">Total Orders</small>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

export default withErrorHandling(OrderType);
