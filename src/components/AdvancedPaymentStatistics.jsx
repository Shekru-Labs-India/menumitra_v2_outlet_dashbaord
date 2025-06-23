import React, { useState, useEffect } from 'react';
import { API_PATHS } from '../config/apiConfig';
import { useCacheData } from '../context/CacheDataContext';
import { useGlobalDateFilter } from './Header';
import { withErrorHandling } from './withErrorHandling';

const AdvancedPaymentStatistics = ({ handleApiError, onVisibilityChange }) => {
  const [advancedPaymentData, setAdvancedPaymentData] = useState({
    advance_payment_pending_count: 0,
    advance_payment_pending_amount: 0,
    advance_payment_paid_count: 0,
    advance_payment_paid_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get global date filter
  const { dateRange, getDateFilter } = useGlobalDateFilter();
  
  // Get data from cache context
  const { getCachedData, fetchAllStats } = useCacheData();
  
  // Helper function to format currency in Indian format
  const formatIndianCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return '₹0.00';
    
    const [integerPart, decimalPart = '00'] = num.toFixed(2).split('.');
    if (integerPart.length <= 3) {
      return `₹${integerPart}.${decimalPart}`;
    }
    
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `₹${formatted},${lastThree}.${decimalPart}`;
  };
  
  // Initial data load from cache
  useEffect(() => {
    // First check if data is available from the consolidated API cache
    const allStatsData = getCachedData(API_PATHS.getAllStatsWithoutFilter);
    if (allStatsData && (allStatsData.advance_payment_statistics || allStatsData.advance_payment_card)) {
      processAdvancedPaymentData(allStatsData.advance_payment_statistics || allStatsData.advance_payment_card);
    }
    
    // Fetch fresh data in background
    fetchAdvancedPaymentData();
  }, []);

  // Update when date range changes
  useEffect(() => {
    fetchAdvancedPaymentData();
  }, [dateRange]);

  // Process advanced payment data
  const processAdvancedPaymentData = (data) => {
    if (data) {
      // Handle new data format (advance_payment_card) if it exists
      if (data.partial_payment && data.settled_payment) {
        setAdvancedPaymentData({
          advance_payment_pending_count: data.partial_payment.count || 0,
          advance_payment_pending_amount: data.partial_payment.amount || 0,
          advance_payment_paid_count: data.settled_payment.count || 0,
          advance_payment_paid_amount: data.settled_payment.amount || 0
        });
      } 
      
    }
    
    setLoading(false);
    
    // Check if component should be visible (has non-zero data)
    const hasData = 
      (data.partial_payment?.count > 0 || data.partial_payment?.amount > 0 || 
       data.settled_payment?.count > 0 || data.settled_payment?.amount > 0) ||
      (data.advance_payment_pending_count > 0 || data.advance_payment_pending_amount > 0 || 
       data.advance_payment_paid_count > 0 || data.advance_payment_paid_amount > 0);
    
    if (onVisibilityChange) {
      onVisibilityChange(hasData);
    }
  };

  // Fetch advanced payment data using the consolidated API
  const fetchAdvancedPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user and outlet IDs
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      if (!userId || !outletId) {
        setError('User ID or outlet ID not found. Please check your login.');
        setLoading(false);
        return;
      }
      
      // Get date filter from global context
      const dateFilter = getDateFilter();
      
      // Use fetchAllStats to get all stats at once
      const allStatsData = await fetchAllStats(dateFilter, {
        forceRefresh: true
      });
      
      if (allStatsData) {
        // Check for new data format first, then fall back to old format
        if (allStatsData.advance_payment_card) {
          processAdvancedPaymentData(allStatsData.advance_payment_card);
        } else if (allStatsData.advance_payment_statistics) {
          processAdvancedPaymentData(allStatsData.advance_payment_statistics);
        } else {
          // If no data returned, set empty data
          processAdvancedPaymentData({});
        }
      } else {
        // If no data returned, set empty data
        processAdvancedPaymentData({});
      }
    } catch (error) {
      console.error('Failed to fetch advanced payment statistics:', error);
      
      // Use the handleApiError function from the HOC
      if (!handleApiError(error)) {
        // If error was not handled by the HOC (not a 403), set local error state
        setError('Failed to load advanced payment statistics. Please try again.');
      }
      setLoading(false);
    }
  };

  // Return null if there's a 403 error (permission denied)
  if (error && (error.includes('permission') || error.includes('Permission') || error.includes('403'))) {
    return null;
  }

  // Return null if there's no meaningful data
  const hasData = 
    advancedPaymentData.advance_payment_pending_count > 0 || 
    advancedPaymentData.advance_payment_pending_amount > 0 || 
    advancedPaymentData.advance_payment_paid_count > 0 || 
    advancedPaymentData.advance_payment_paid_amount > 0;
  
  if (!hasData && !loading) {
    return null;
  }

  return (
    <div className="card border" style={{ boxShadow: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-md-center align-items-start">
        <h5 className="card-title mb-0">Advanced Payment Statistics</h5>
      </div>

      {error && !error.includes('permission') && !error.includes('Permission') && !error.includes('403') && (
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      <div className="card-body">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {/* Pending Advanced Payment */}
            <div className="col-md-6">
              <div className="d-flex flex-column p-3 bg-light-primary rounded border">
                <div className="text-heading mb-2">Partial Payment</div>
                <div className="d-flex align-items-center">
                  <div className="border-primary rounded me-2" style={{ width: '4px', height: '40px' }}></div>
                  <div>
                    <h4 className="mb-0 text-heading fw-medium fs-4">{formatIndianCurrency(advancedPaymentData.advance_payment_pending_amount)}</h4>
                    <small className="text-muted">{advancedPaymentData.advance_payment_pending_count} transactions</small>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Paid Advanced Payment */}
            <div className="col-md-6">
              <div className="d-flex flex-column p-3 bg-light-success rounded border">
                <div className="text-heading mb-2">Settled Payment</div>
                <div className="d-flex align-items-center">
                  <div className="border-success rounded me-2" style={{ width: '4px', height: '40px' }}></div>
                  <div>
                    <h4 className="mb-0 text-heading fw-medium fs-4">{formatIndianCurrency(advancedPaymentData.advance_payment_paid_amount)}</h4>
                    <small className="text-muted">{advancedPaymentData.advance_payment_paid_count} transactions</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorHandling(AdvancedPaymentStatistics); 