import React, { useState } from 'react';

// Update the HOC to include onVisibilityChange prop
export const withErrorHandling = (WrappedComponent) => {
  // Return a new component that wraps the original component
  return function WithErrorHandlingComponent(props) {
    const [error, setError] = useState(null);
    
    // Handle API errors and decide whether to show or hide the component
    const handleApiError = (error) => {
      // Check for 403 Forbidden or permission denied errors
      if (error && error.response && (error.response.status === 403 || error.response.status === 401)) {
        setError('Permission denied. You do not have access to view this data.');
        
        // If the parent component needs to know about visibility changes,
        // let it know that this component should be hidden
        if (props.onVisibilityChange) {
          props.onVisibilityChange(false);
        }
        
        return true; // Error was handled
      }
      
      return false; // Error was not handled
    };
    
    // Pass all props to the wrapped component, plus the error handling functions
    return <WrappedComponent {...props} handleApiError={handleApiError} error={error} />;
  };
}; 