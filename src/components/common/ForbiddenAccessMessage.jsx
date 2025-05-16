import React from 'react';
import PropTypes from 'prop-types';

/**
 * ForbiddenAccessMessage - A simple component to display a 403 Forbidden error message
 * 
 * @param {Object} props
 * @param {string} props.message - Error message from the API response
 * @param {function} props.onRetry - Callback function to retry the operation
 * @param {string} props.className - Additional CSS classes
 */
const ForbiddenAccessMessage = ({
  message = "You don't have permission to access this resource.",
  onRetry,
  className = ""
}) => {
  return (
    <div className={`card ${className}`}>
      <div className="card-body p-4">
        <div className="d-flex align-items-center mb-3">
          <div className="bg-label-danger p-3 rounded me-3">
            <i className="fas fa-lock fs-3 text-danger"></i>
          </div>
          <div>
            <h4 className="mb-0">Access Denied</h4>
          </div>
        </div>
        
        <p className="text-muted mb-4">{message}</p>
        
        {onRetry && (
          <button 
            className="btn btn-primary" 
            onClick={onRetry}
          >
            <i className="fas fa-sync-alt me-2"></i>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

ForbiddenAccessMessage.propTypes = {
  message: PropTypes.string,
  onRetry: PropTypes.func,
  className: PropTypes.string
};

export default ForbiddenAccessMessage; 