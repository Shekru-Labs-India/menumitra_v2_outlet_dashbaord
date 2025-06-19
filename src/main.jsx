import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Import ApexCharts Promise fix - this will automatically initialize and fix the "resolve is not defined" error
import './utils/apexChartsPromiseFix';

// Additional fix for "resolve is not defined" error - define in global scope
if (typeof window !== 'undefined') {
  window.resolve = window.resolve || function(value) {
    return Promise.resolve(value);
  };
  
  window.reject = window.reject || function(reason) {
    return Promise.reject(reason);
  };
}

import App from './App.jsx'

// Initialize Helpers when available
document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme based on user preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Apply theme class to document
  document.documentElement.classList.add(prefersDark ? 'dark-style' : 'light-style');
  
  // Initialize menu state from localStorage if available
  if (window.templateName) {
    try {
      const storedCollapsed = localStorage.getItem(`templateCustomizer-${window.templateName}--LayoutCollapsed`);
      if (storedCollapsed === 'true') {
        document.documentElement.setAttribute('data-menu-open', 'false');
      } else {
        document.documentElement.setAttribute('data-menu-open', 'true');
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
  }
  
  // Initialize Helpers if available
  if (window.Helpers) {
    window.Helpers.init();
  }
});

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then(function(registration) {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(function(error) {
      console.error('Service Worker registration failed:', error);
    });
}

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <App />
  // </StrictMode>,
)
