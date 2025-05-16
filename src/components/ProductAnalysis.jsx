import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { api, API_PATHS } from "../config/apiConfig";
// Import both GIFs - static and animated
import aiAnimationGif from "../assets/img/gif/AI-animation-unscreen.gif";
import aiAnimationStillFrame from "../assets/img/gif/AI-animation-unscreen-still-frame.gif";
import { useDashboard } from "../context/DashboardContext"; // Import context
import { withErrorHandling } from "./common";

function TopSell({ handleApiError }) {
  // Get data from context
  const { 
    salesPerformance_from_context,
    loading: contextLoading,
    error: contextError
  } = useDashboard();

  // State management 
  const [selectedTab, setSelectedTab] = useState("top");
  const [dateRange, setDateRange] = useState("All Time");
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  const [salesData, setSalesData] = useState({
    top_selling: [],
    low_selling: []
  });
  const [error, setError] = useState(null);
  const [userInteracted, setUserInteracted] = useState(false); // Flag to track user interaction

  // Use context data when component mounts
  useEffect(() => {
    if (salesPerformance_from_context) {
      setSalesData({
        top_selling: salesPerformance_from_context.top_selling || [],
        low_selling: salesPerformance_from_context.low_selling || []
      });
    }
  }, [salesPerformance_from_context]);

  // Set error from context if available
  useEffect(() => {
    if (contextError && !userInteracted) {
      setError(contextError);
    }
  }, [contextError, userInteracted]);

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

  // Format date for display (e.g., "01 Jan 2023")
  const formatDate = (date) => {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
    return `${day} ${month} ${date.getFullYear()}`;
  };

  // Get date range parameters based on selected option
  const getDateRange = (range) => {
    const today = new Date();
    let start, end;
    
    switch (range) {
      case "Today":
        start = end = new Date();
        break;
      case "Yesterday":
        start = end = new Date();
        start.setDate(start.getDate() - 1);
        break;
      case "Last 7 Days":
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - 6);
        break;
      case "Last 30 Days":
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - 29);
        break;
      case "Current Month":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case "Last Month":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "Custom Range":
        start = startDate;
        end = endDate;
        break;
      default: // All Time
        return null;
    }
    
    return { 
      start_date: formatDate(start),
      end_date: formatDate(end)
    };
  };

  // Fetch data from API
  const fetchData = async (range) => {
    setLoading(true);
    setError(null);
    // Set user interaction flag to true
    setUserInteracted(true);
    
    try {
      // Get user and outlet ID from localStorage
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      if (!userId || !outletId) {
        setError('User ID or outlet ID not found. Please check your login.');
        setLoading(false);
        return;
      }
      
      // Prepare request data using new simplified format
      const requestData = { 
        user_id: Number(userId),
        outlet_id: Number(outletId)
      };
      
      // Add date range if not "All Time" and if both dates are available for custom range
      const dateParams = getDateRange(range);
      if (dateParams && (range !== "Custom Range" || (startDate && endDate))) {
        Object.assign(requestData, dateParams);
      }
      
      console.log('Sending sales performance request:', requestData);
      
      // Make API request using the API instance from apiConfig
      const response = await api.post(API_PATHS.salesPerformance, requestData);
      
      console.log('Sales performance response:', response.data);
      
      // Parse and store response data
      if (response.data) {
        // Handle nested data structure - the detail field contains the data
        const responseData = response.data.detail || response.data;
        
        setSalesData({
          top_selling: responseData.top_selling || [],
          low_selling: responseData.low_selling || []
        });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(err)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError("Failed to load sales data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === "Custom Range");
    
    if (range !== "Custom Range") {
      setStartDate(null);
      setEndDate(null);
      fetchData(range);
    }
  };

  // Handle custom date selection
  const handleCustomDateSelect = () => {
    if (startDate && endDate) {
      setDateRange(`${formatDate(startDate)} - ${formatDate(endDate)}`);
      setShowDatePicker(false);
      fetchData("Custom Range");
    }
  };

  // Determine current loading state
  const isLoading = userInteracted ? loading : contextLoading;
  // Determine current error state
  const currentError = userInteracted ? error : contextError;

  // Get the current data to display based on selected tab
  const getCurrentData = () => {
    return salesData[selectedTab === "top" ? "top_selling" : "low_selling"];
  };

  // Render data table
  const renderDataTable = () => {
    const data = getCurrentData();
    
    if (data.length === 0) {
      return (
        <div className="text-center text-muted p-3">
          No products data available for the selected period
        </div>
      );
    }
    
    // Check if total_quantity exists in the data
    const hasQuantity = data.length > 0 && 'total_quantity' in data[0];
    
    return (
      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Menu Name</th>
              <th>Sales Count</th>
              {hasQuantity && <th>Total Quantity</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((product) => (
              <tr key={product.item_id}>
                <td>{product.name}</td>
                <td>{product.sales_count}</td>
                {hasQuantity && <td>{product.total_quantity}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render date options dropdown
  const renderDateOptions = () => {
    const dateOptions = [
      "All Time",
      "Today",
      "Yesterday",
      "Last 7 Days",
      "Last 30 Days",
      "Current Month",
      "Last Month",
      "Custom Range"
    ];
    
    return (
      <div className="dropdown">
        <button
          type="button"
          className="btn btn-outline-primary dropdown-toggle"
          data-bs-toggle="dropdown"
        >
          <i className="fas fa-calendar me-2"></i>
          {dateRange}
        </button>
        <ul className="dropdown-menu dropdown-menu-end">
          {dateOptions.map((option) => (
            <li key={option}>
              <a
                href="javascript:void(0);"
                className="dropdown-item"
                onClick={() => handleDateRangeChange(option)}
              >
                {option}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Products Analysis</h5>
        <div className="d-flex align-items-center gap-3">
          {renderDateOptions()}

          {/* Reload button */}
          <button
            type="button"
            className="btn btn-icon p-0"
            onClick={() => {
              // Always fetch data with current dateRange
              fetchData(dateRange);
            }}
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

      {/* Custom date picker */}
      {showDatePicker && (
        <div className="card-body border-bottom">
          <div className="d-flex flex-column gap-2">
            <label>Select Date Range:</label>
            <div className="d-flex gap-2">
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={new Date()}
                className="form-control"
                dateFormat="dd MMM yyyy"
                placeholderText="DD MMM YYYY"
              />
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                maxDate={new Date()}
                className="form-control"
                dateFormat="dd MMM yyyy"
                placeholderText="DD MMM YYYY"
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

      {/* Body */}
      <div className="card-body">
        {/* Tabs */}
        <div className="nav nav-tabs mb-3">
          <button
            className={`nav-link ${selectedTab === "top" ? "active" : ""}`}
            onClick={() => setSelectedTab("top")}
            style={{
              fontWeight: selectedTab === "top" ? "bold" : "normal",
              borderRadius: "8px",
              backgroundColor:
                selectedTab === "top" ? "var(--bs-primary)" : "transparent",
              color: selectedTab === "top" ? "var(--bs-white)" : "",
            }}
          >
            Top Selling
          </button>
          <button
            className={`nav-link ${selectedTab === "low" ? "active" : ""}`}
            onClick={() => setSelectedTab("low")}
            style={{
              fontWeight: selectedTab === "low" ? "bold" : "normal",
              borderRadius: "8px",
              backgroundColor:
                selectedTab === "low" ? "var(--bs-primary)" : "transparent",
              color: selectedTab === "low" ? "var(--bs-white)" : "",
            }}
          >
            Low Selling
          </button>
        </div>

        {/* Error message */}
        {currentError && (
          <div className="alert alert-danger" role="alert">
            {currentError}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="text-center p-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          renderDataTable()
        )}
      </div>
    </div>
  );
}

// Export the component wrapped in the HOC
export default withErrorHandling(TopSell);
