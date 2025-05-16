import React, { useState } from 'react';
import ForbiddenAccessMessage from './ForbiddenAccessMessage';

/**
 * Higher-order component that adds error handling for API responses
 * Specifically handles 403 Forbidden errors
 */
const withErrorHandling = (WrappedComponent) => {
  return (props) => {
    const [error, setError] = useState(null);

    // Function to handle API errors
    const handleApiError = (error) => {
      // Check if it's a 403 error
      if (error.response && error.response.status === 403) {
        // Get the error message from the API response or use a default
        const errorMessage = error.response.data?.message || 
                           error.response.data?.detail ||
                           "You don't have permission to access this resource.";
        
        setError({
          status: 403,
          message: errorMessage
        });
        return true; // Error was handled
      }
      
      return false; // Error was not handled (not a 403)
    };

    // Function to retry the operation (clear the error)
    const handleRetry = () => {
      setError(null);
      // If the component has a refresh function, call it
      if (props.onRefresh) {
        props.onRefresh();
      }
    };

    // If there's a 403 error, show the ForbiddenAccessMessage
    if (error && error.status === 403) {
      return <ForbiddenAccessMessage message={error.message} onRetry={handleRetry} />;
    }

    // Otherwise, render the wrapped component with the additional props
    return <WrappedComponent {...props} handleApiError={handleApiError} />;
  };
};

export default withErrorHandling; 