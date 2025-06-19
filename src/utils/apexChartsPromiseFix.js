/**
 * Fix for "Uncaught ReferenceError: resolve is not defined" in react-apexcharts
 * This utility adds a proper Promise polyfill to fix the error that occurs in react-apexcharts
 */

export const initApexChartsPromiseFix = () => {
  if (typeof window !== 'undefined') {
    // Only apply if Promise doesn't exist or we need to patch it
    if (!window.Promise) {
      window.Promise = function(executor) {
        // Store callbacks
        let resolveCallbacks = [];
        let rejectCallbacks = [];
        let resolved = false;
        let rejected = false;
        let value;
        let error;

        // Define resolve and reject functions
        function resolve(val) {
          if (!resolved && !rejected) {
            resolved = true;
            value = val;
            resolveCallbacks.forEach(callback => callback(value));
          }
        }

        function reject(err) {
          if (!resolved && !rejected) {
            rejected = true;
            error = err;
            rejectCallbacks.forEach(callback => callback(error));
          }
        }

        // Execute the executor function with resolve and reject callbacks
        try {
          executor(resolve, reject);
        } catch (e) {
          reject(e);
        }

        // Return promise object
        return {
          then: function(onFulfilled, onRejected) {
            if (resolved) {
              if (typeof onFulfilled === 'function') {
                setTimeout(() => onFulfilled(value), 0);
              }
            } else if (rejected && typeof onRejected === 'function') {
              setTimeout(() => onRejected(error), 0);
            } else {
              if (typeof onFulfilled === 'function') {
                resolveCallbacks.push(onFulfilled);
              }
              if (typeof onRejected === 'function') {
                rejectCallbacks.push(onRejected);
              }
            }
            return this;
          },
          catch: function(onRejected) {
            if (rejected) {
              if (typeof onRejected === 'function') {
                setTimeout(() => onRejected(error), 0);
              }
            } else {
              if (typeof onRejected === 'function') {
                rejectCallbacks.push(onRejected);
              }
            }
            return this;
          }
        };
      };
    }
    
    // Make sure window.Promise has the resolve and reject static methods
    if (!window.Promise.resolve) {
      window.Promise.resolve = function(value) {
        return new window.Promise(function(resolve) {
          resolve(value);
        });
      };
    }
    
    if (!window.Promise.reject) {
      window.Promise.reject = function(reason) {
        return new window.Promise(function(_, reject) {
          reject(reason);
        });
      };
    }
  }
};

// Auto-initialize the fix
initApexChartsPromiseFix();

export default initApexChartsPromiseFix; 