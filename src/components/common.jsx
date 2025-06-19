import React from 'react';

/**
 * A reusable component to display a message when no data is available
 * @param {Object} props - Component props
 * @param {string} props.message - Optional custom message to display
 * @param {function} props.onRefresh - Optional refresh function to call
 * @param {string} props.icon - Optional custom icon class
 * @param {boolean} props.hideLoading - Hide loading indicator when refreshing
 */
export const NoDataMessage = ({ 
  message = "No data available for the selected time period", 
  onRefresh = null,
  icon = "fas fa-chart-bar",
  hideLoading = false
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

/**
 * A reusable component to display a message when user does not have permission to access a feature
 * @param {Object} props - Component props
 * @param {string} props.message - Optional custom message to display
 * @param {function} props.onRetry - Optional retry function to call
 */
export const ForbiddenAccessMessage = ({ 
  message = "You don't have permission to access this feature", 
  onRetry = null
}) => {
  return (
    <div className="card border rounded-3 text-center p-4">
      <div className="card-body">
        <i className="fas fa-lock fa-3x text-danger mb-3"></i>
        <h4 className="mt-3">{message}</h4>
        <p className="text-muted">Please contact your administrator if you believe this is an error.</p>
        {onRetry && (
          <button 
            className="btn btn-outline-primary mt-3" 
            onClick={onRetry}
          >
            <i className="fas fa-redo me-2"></i> Try Again
          </button>
        )}
      </div>
    </div>
  );
};

// Also adding ReportTable and ReportFilters components that are imported in MenuReports.jsx
export const ReportTable = ({ columns, data, loading, exportFilename }) => {
  // Simple placeholder for now - implement based on your needs
  return (
    <div className="report-table-container">
      {loading ? (
        <div className="text-center p-4">Loading...</div>
      ) : (
        <div>Table content would go here</div>
      )}
    </div>
  );
};

export const ReportFilters = ({ onApplyFilters, categories, loading }) => {
  // Simple placeholder for now - implement based on your needs
  return (
    <div className="filters-container">
      <div>Filter controls would go here</div>
    </div>
  );
}; 