import React from 'react';

/**
 * A reusable component to display a message when no data is available
 * @param {Object} props - Component props
 * @param {string} props.message - Optional custom message to display
 * @param {function} props.onRefresh - Optional refresh function to call
 * @param {string} props.icon - Optional custom icon class
 */
export const NoDataMessage = ({ 
  message = "No data available for the selected time period", 
  onRefresh = null,
  icon = "fas fa-chart-bar"
}) => {
  return (
    <div className="card border rounded-3 text-center p-4">
      <div className="card-body">
        <i className={`${icon} fa-3x text-muted mb-3`}></i>
        <h4 className="mt-3">{message}</h4>
        {onRefresh && (
          <button 
            className="btn btn-primary mt-3" 
            onClick={onRefresh}
          >
            <i className="fas fa-sync-alt me-2"></i> Refresh Data
          </button>
        )}
      </div>
    </div>
  );
}; 