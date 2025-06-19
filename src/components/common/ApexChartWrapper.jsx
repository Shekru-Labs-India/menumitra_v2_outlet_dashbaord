import React, { useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';

/**
 * ApexChartWrapper - A wrapper component for ReactApexChart that ensures the proper
 * Promise implementation and resolve/reject functions are available.
 * 
 * This component solves the "Uncaught ReferenceError: resolve is not defined" error.
 */
const ApexChartWrapper = (props) => {
  // Apply fix when component mounts
  useEffect(() => {
    // Create a local scope fix for resolve/reject to ensure they're available
    // for the specific ApexCharts instance
    window.resolve = window.resolve || function(value) {
      return Promise.resolve(value);
    };
    
    window.reject = window.reject || function(reason) {
      return Promise.reject(reason);
    };
    
    // Define these directly in global scope as fallback
    if (typeof resolve === 'undefined') {
      window.resolve = window.resolve;
    }
    
    if (typeof reject === 'undefined') {
      window.reject = window.reject;
    }
  }, []);
  
  // Pass all props directly to ReactApexChart
  return <ReactApexChart {...props} />;
};

export default ApexChartWrapper; 