import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { api, API_PATHS } from '../config/apiConfig';
// Import both GIFs - static and animated
import aiAnimationGif from '../assets/img/gif/AI-animation-unscreen.gif';
import aiAnimationStillFrame from '../assets/img/gif/AI-animation-unscreen-still-frame.gif';
import { withErrorHandling } from './common';

const RevenueLossWidget = ({ handleApiError }) => {
  const [dateRange, setDateRange] = useState('Yesterday');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGifPlaying, setIsGifPlaying] = useState(false);
  
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
        fetchData(range);
    }
};

const handleReload = () => {
    setLoading(true);
    fetchData(dateRange);
    setTimeout(() => setLoading(false), 1000);
};

const fetchData = async (range) => {
    try {
        setLoading(true);
        
        const userId = localStorage.getItem('user_id');
        const outletId = localStorage.getItem('outlet_id');
        
        if (!userId || !outletId) {
            console.error('User ID or outlet ID not found');
            setLoading(false);
            return;
        }
        
        // Prepare request data using new simplified format
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

        console.log('Sending revenue leakage request:', requestData);
        
        // Make API request using the API instance from apiConfig
        const response = await api.post(API_PATHS.revenueLoss, requestData);
        
        console.log('Revenue leakage response:', response.data);

        if (response.data?.detail) {
            // Process the response data from the new format
            const data = response.data.detail;
            // Update your metrics state here based on the response
            setMetrics([
                { title: 'Bills Modified', value: data.bills_modified || '0', subtitle: 'Bills Modified' },
                { title: 'Bills Re-Printed', value: data.bills_reprinted || '0', subtitle: 'Bills Re-Printed' },
                { title: 'Waived Off', value: `₹${data.waived_off || '0'}`, subtitle: 'Waived Off' },
                { title: 'KOTs Cancelled', value: data.kots_cancelled || '0', subtitle: 'KOTs Cancelled' },
                { title: 'Modified KOTs', value: data.modified_kots || '0', subtitle: 'Modified KOTs' },
                { title: 'Not Used In Bills', value: data.not_used_in_bills || '0', subtitle: 'Not Used In Bills' }
            ]);
        } else {
            console.error('No data available in response');
        }
    } catch (error) {
        console.error('Failed to fetch revenue leakage data:', error);
        
        // Use the handleApiError function from the HOC
        if (!handleApiError(error)) {
            // If error was not handled by the HOC (not a 403), handle it here
            // For now, just log it, but you could set a local error state if needed
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

  const [metrics, setMetrics] = useState([
    { title: 'Bills Modified', value: '0', subtitle: 'Bills Modified' },
    { title: 'Bills Re-Printed', value: '0', subtitle: 'Bills Re-Printed' },
    { title: 'Waived Off', value: '₹0', subtitle: 'Waived Off' },
    { title: 'KOTs Cancelled', value: '0', subtitle: 'KOTs Cancelled' },
    { title: 'Modified KOTs', value: '0', subtitle: 'Modified KOTs' },
    { title: 'Not Used In Bills', value: '0', subtitle: 'Not Used In Bills' }
  ]);

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
        <h5 className="card-title mb-0">Revenue Leakage</h5>
        <div className="d-flex align-items-center gap-2">
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
                            {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Current Month', 'Last Month'].map((range) => (
                                <li key={range}>
                                    <a href="javascript:void(0);"
                                        className="dropdown-item d-flex align-items-center"
                                        onClick={() => handleDateRangeChange(range)}>
                                        {range}
                                    </a>
                                </li>
                            ))}
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                                <a href="javascript:void(0);"
                                    className="dropdown-item d-flex align-items-center"
                                    onClick={() => handleDateRangeChange('Custom Range')}>
                                    Custom Range
                                </a>
                            </li>
                        </ul>
          </div>
          <button 
            type="button" 
            className={`btn btn-icon p-0 ${loading ? 'disabled' : ''}`}
            onClick={handleReload}
            disabled={loading}
            style={{ border: '1px solid var(--bs-primary)' }}
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
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
      <div className="card-body">
        <div className="row g-4">
          {metrics.map((metric, index) => (
            <div key={index} className="col-md-4">
              <div className="d-flex flex-column p-3 bg-label-primary rounded">
                <div className="text-heading mb-2">
                  {metric.title}
                </div>
                <div className="d-flex align-items-center">
                  <div className="bg-primary rounded me-2" style={{ width: '4px', height: '40px' }}></div>
                  <div>
                    <h4 className="mb-0 text-heading fw-medium fs-4">
                      {metric.value}
                    </h4>
                    <small className="text-muted">
                      {metric.subtitle}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Export the component wrapped in the HOC
export default withErrorHandling(RevenueLossWidget); 