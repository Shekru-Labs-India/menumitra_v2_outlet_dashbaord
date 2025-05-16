import React, { useState, useEffect } from 'react'
import { api, API_PATHS } from '../config/apiConfig';
import { withErrorHandling } from './common';

const PaymentMethodCount = ({ handleApiError }) => {
  const [paymentCounts, setPaymentCounts] = useState({
    cash: 0,
    upi: 0,
    card: 0,
    complementary: 0
  });
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('Today');
  
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

      console.log('Sending payment method counts request:', requestData);
      
      // Make API request using the API instance from apiConfig
      const response = await api.post(API_PATHS.paymentMethodCounts, requestData);
      
      console.log('Payment method counts response:', response.data);

      if (response.data?.detail) {
        // Process the response data from the new format
        const data = response.data.detail;
        setPaymentCounts({
          cash: data.cash || 0,
          upi: data.upi || 0,
          card: data.card || 0,
          complementary: data.complementary || 0
        });
      } else {
        console.error('No data available in response');
      }
    } catch (error) {
      console.error('Failed to fetch payment method counts:', error);
      
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
      case 'This Month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      default:
        return null;
    }
    
    return {
      start_date: formatDate(start),
      end_date: formatDate(end)
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

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange]);

  // Calculate total count
  const totalCount = Object.values(paymentCounts).reduce((a, b) => a + b, 0);
  
  // Calculate max count for scaling
  const maxCount = Math.max(...Object.values(paymentCounts));

  // Calculate percentage width for progress bars
  const getPercentage = (count) => {
    return maxCount === 0 ? 0 : (count / maxCount) * 100;
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Total Payment counts</h5>
        <div className="dropdown">
          <button 
            className="btn btn-outline-primary dropdown-toggle" 
            type="button" 
            data-bs-toggle="dropdown" 
            aria-expanded="false"
            disabled={loading}
          >
            <i className="fas fa-calendar me-2"></i>
            {dateRange}
          </button>
          <ul className="dropdown-menu">
            {['Today', 'Yesterday', 'Last 7 Days', 'This Month'].map((range) => (
              <li key={range}>
                <a 
                  className="dropdown-item" 
                  href="#" 
                  onClick={() => setDateRange(range)}
                >
                  {range}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="card-body">
        <h4 className="mb-4">Total: {totalCount}</h4>
        
        <div className="payment-methods-list">
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span>Cash</span>
              <span>{paymentCounts.cash}</span>
            </div>
            <div className="progress" style={{ height: '10px' }}>
              <div 
                className="progress-bar bg-success" 
                role="progressbar" 
                style={{ width: `${getPercentage(paymentCounts.cash)}%` }} 
                aria-valuenow={paymentCounts.cash} 
                aria-valuemin="0" 
                aria-valuemax={maxCount}
              ></div>
            </div>
          </div>
          
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span>Card</span>
              <span>{paymentCounts.card}</span>
            </div>
            <div className="progress" style={{ height: '10px' }}>
              <div 
                className="progress-bar bg-info" 
                role="progressbar" 
                style={{ width: `${getPercentage(paymentCounts.card)}%` }} 
                aria-valuenow={paymentCounts.card} 
                aria-valuemin="0" 
                aria-valuemax={maxCount}
              ></div>
            </div>
          </div>
          
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span>UPI</span>
              <span>{paymentCounts.upi}</span>
            </div>
            <div className="progress" style={{ height: '10px' }}>
              <div 
                className="progress-bar bg-primary" 
                role="progressbar" 
                style={{ width: `${getPercentage(paymentCounts.upi)}%` }} 
                aria-valuenow={paymentCounts.upi} 
                aria-valuemin="0" 
                aria-valuemax={maxCount}
              ></div>
            </div>
          </div>
          
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span>Complementary</span>
              <span>{paymentCounts.complementary}</span>
            </div>
            <div className="progress" style={{ height: '10px' }}>
              <div 
                className="progress-bar bg-warning" 
                role="progressbar" 
                style={{ width: `${getPercentage(paymentCounts.complementary)}%` }} 
                aria-valuenow={paymentCounts.complementary} 
                aria-valuemin="0" 
                aria-valuemax={maxCount}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withErrorHandling(PaymentMethodCount);