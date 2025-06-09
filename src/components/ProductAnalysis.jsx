import React, { useState, useEffect } from "react";
import { API_PATHS } from "../config/apiConfig";
// Import both GIFs - static and animated
import aiAnimationGif from "../assets/img/gif/AI-animation-unscreen.gif";
import aiAnimationStillFrame from "../assets/img/gif/AI-animation-unscreen-still-frame.gif";
import { useDashboard } from "../context/DashboardContext"; // Import dashboard context
import { useCacheData } from "../context/CacheDataContext"; // Import cache context
import { withErrorHandling, DateFilter } from "./common";

function TopSell({ handleApiError }) {
  // Get data from dashboard context
  const { 
    salesPerformance_from_context
  } = useDashboard();

  // Get data from cache context
  const { 
    fetchData,
    getCachedData
  } = useCacheData();

  // State management 
  const [selectedTab, setSelectedTab] = useState("top");
  const [dateRange, setDateRange] = useState("All Time");
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  const [salesData, setSalesData] = useState({
    top_selling: [],
    low_selling: []
  });
  const [error, setError] = useState(null);

  // Initial data load from cache and context
  useEffect(() => {
    // First try to get data from cache
    const cachedData = getCachedData(API_PATHS.salesPerformance);
    if (cachedData) {
      processSalesData(cachedData);
    }
    // If no cached data, use context data
    else if (salesPerformance_from_context) {
      processSalesData(salesPerformance_from_context);
    }
    
    // Fetch fresh data in background
    fetchSalesData();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchSalesData(getDateRange(dateRange), { forceRefresh: true });
  }, [dateRange]);

  // Process sales data from API or cache
  const processSalesData = (data) => {
    if (data) {
      setSalesData({
        top_selling: data.top_selling || [],
        low_selling: data.low_selling || []
      });
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
      case "All Time":
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

  // Fetch sales data using the cache context
  const fetchSalesData = async (dateFilter = {}, options = {}) => {
    try {
      setError(null);
      
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
      const data = await fetchData(API_PATHS.salesPerformance, requestData, {
        forceRefresh: options.forceRefresh || false,
        transformResponse: (response) => response?.detail || response
      });
      
      if (data) {
        processSalesData(data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(err)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError("Failed to load sales data. Please try again.");
      }
    }
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const handleCustomDateSelect = (start, end, formattedRange) => {
    setDateRange(formattedRange);
  };

  const handleReload = () => {
    setIsGifPlaying(true);
    fetchSalesData(getDateRange(dateRange), { forceRefresh: true });
  };

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

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

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      {/* Header */}
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Products Analysis</h5>
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
            style={{ border: "1px solid var(--bs-primary)" }}
          >
            <i className="fas fa-sync-alt"></i>
          </button>

          {/* <button
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
          </button> */}
        </div>
      </div>

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
        {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Content */}
        {renderDataTable()}
      </div>
    </div>
  );
}

// Export the component wrapped in the HOC
export default withErrorHandling(TopSell);
