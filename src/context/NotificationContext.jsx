import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import NotificationSound from '../components/NotificationSound';
import { toast, ToastContainer } from 'react-toastify';
import CustomToast from '../components/CustomToast';
import 'react-toastify/dist/ReactToastify.css';
import { useOutletId } from '../hooks/useOutletId'; 

// Create notification context
export const NotificationContext = createContext();

// Custom hook for using the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Toast notification configuration
const toastConfig = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: false,
  draggable: true,
  progress: undefined,
  theme: "light",
};

// Get toast type based on notification type
const getToastType = (notificationType) => {
  // Convert to lowercase for case-insensitive comparison
  const type = notificationType?.toLowerCase() || 'info';
  
  switch (type) {
    case 'success':
      return 'success';
    case 'info':
    case 'order':
    case 'information':
      return 'info';
    case 'warning':
    case 'warn':
      return 'warning';
    case 'danger':
    case 'error':
    case 'alert':
      return 'error';
    default:
      // Default to info for unknown types
      return 'info';
  }
};

// Format notification data from server format to our internal format
const formatNotificationData = (serverData) => {
  // Make sure we're not using the type as the title
  const notificationType = serverData.type || 'info';
  
  // Use a custom title if provided, otherwise leave blank (not using type as title)
  const title = serverData.title || '';
  
  return {
    id: serverData.notification_id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: title,
    message: serverData.message || '',
    notificationType: notificationType,
    timestamp: serverData.timestamp || new Date().toISOString(),
    read: false,
    outlet_id: serverData.outlet_id,
    role: serverData.role,
    user_id: serverData.user_id
  };
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { isAuthenticated, user } = useAuth();
  // Fix: Get outletId directly without destructuring to avoid the error
  const outletId = useOutletId();
  
  // Helper function to generate a test notification for development
  const testNotification = useCallback((type = 'info') => {
    const notificationTypes = [
      'success', 'info', 'warning', 'error', 'order', 
      'payment', 'offer', 'alert', 'table', 'menu', 
      'customer', 'staff', 'inventory'
    ];
    
    const notificationType = type === 'random' 
      ? notificationTypes[Math.floor(Math.random() * notificationTypes.length)]
      : notificationTypes.includes(type) ? type : 'info';
    
    const testData = {
      notification_id: `test-${Date.now()}`,
      type: notificationType,
      title: '', // Empty title to avoid showing type
      message: `This is a test notification with ${notificationType} styling`,
      timestamp: new Date().toISOString(),
      outlet_id: '123',
      role: 'admin',
      user_id: '456'
    };
    
    handleNewNotification(formatNotificationData(testData));
  }, []);

  // Attach test function to window for development use
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.testNotification = testNotification;
      console.info(
        'Development mode: Use window.testNotification() to test notifications. ' +
        'Options: window.testNotification("success"), window.testNotification("info"), ' +
        'window.testNotification("warning"), window.testNotification("error"), ' +
        'window.testNotification("order"), window.testNotification("payment"), etc., ' +
        'or window.testNotification("random") for a random type.'
      );
    }
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        delete window.testNotification;
      }
    };
  }, [testNotification]);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated || socket) return;

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        setConnectionError('No access token available');
        return;
      }

      // Fix: Check if outletId exists before creating WebSocket connection
      if (!outletId) {
        setConnectionError('No outlet selected');
        return;
      }

      // Create WebSocket connection
      const ws = new WebSocket(`wss://ghanish.in/v2/common/ws/${outletId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        setConnectionError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Handle different types of messages
          if (data.type === 'notification') {
            // Handle single notification
            if (data.data) {
              const notificationData = formatNotificationData(data.data);
              handleNewNotification(notificationData);
            }
          } 
          else if (data.type === 'notification_history') {
            // Handle notification history
            if (Array.isArray(data.data) && data.data.length > 0) {
              // Process notification history
              const formattedNotifications = data.data.map(formatNotificationData);
              
              // Check if notifications were cleared previously
              const wasCleared = localStorage.getItem('notifications_cleared') === 'true';
              
              // Skip loading history if notifications were cleared
              if (wasCleared) {
                return;
              }
              
              // Update notifications state with history
              setNotifications(prev => {
                // Combine existing notifications with new ones, removing duplicates
                const combined = [...formattedNotifications, ...prev];
                const uniqueNotifications = Array.from(
                  new Map(combined.map(item => [item.id, item])).values()
                );
                
                // Sort by timestamp (newest first)
                return uniqueNotifications
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .slice(0, 100); // Keep only the latest 100
              });
              
              // Update unread count
              setUnreadCount(prev => {
                const newUnread = formattedNotifications.filter(n => !n.read).length;
                return prev + newUnread;
              });
              
              // Show toast for the most recent notification if it's new
              if (formattedNotifications.length > 0) {
                const mostRecent = formattedNotifications[0];
                // Check if this notification is recent (within the last minute)
                const isRecent = new Date(mostRecent.timestamp) > new Date(Date.now() - 60000);
                if (isRecent) {
                  showToast(mostRecent);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        // console.error('WebSocket error:', error);
        setConnectionError('Failed to connect to notification service');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect after a delay if closed unexpectedly
        if (event.code !== 1000) { // 1000 is normal closure
          setTimeout(() => {
            if (isAuthenticated) {
              connectWebSocket();
            }
          }, 5000);
        }
      };

      setSocket(ws);
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setConnectionError(`Failed to setup WebSocket: ${error.message}`);
    }
  }, [isAuthenticated, socket, outletId]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Show toast notification
  const showToast = (notification) => {
    try {
      // Create a custom toast config with auto-close explicitly set
      const customToastConfig = {
        ...toastConfig,
        autoClose: 4000,
        closeOnClick: true,
        pauseOnHover: false,
        hideProgressBar: false,
        className: "toast-custom"
      };
      
      // Show toast with the CustomToast component
      toast(
        <CustomToast 
          title={notification.title} 
          message={notification.message} 
          type={notification.notificationType} 
        />, 
        customToastConfig
      );
      
      // Play notification sound
      if (window.playNotificationSound) {
        window.playNotificationSound();
      }
    } catch (error) {
      console.error('Error showing toast notification:', error);
      // Fallback to default toast
      toast.info(notification.message || 'New notification received', toastConfig);
    }
  };

  // Handle new notification
  const handleNewNotification = (notification) => {
    // Reset notifications_cleared flag when new notifications arrive
    try {
      localStorage.removeItem('notifications_cleared');
    } catch (error) {
      console.error('Error resetting notifications cleared flag:', error);
    }
    
    // Ensure notification has an ID
    const notificationWithId = {
      ...notification,
      id: notification.id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Show toast notification
    showToast(notificationWithId);
    
    // If not toast-only, add to notifications list
    if (!notification.toastOnly) {
      // Add to notifications list
      setNotifications(prev => [notificationWithId, ...prev].slice(0, 100)); // Keep last 100 notifications
      setUnreadCount(prev => prev + 1);
    }
  };

  // Mark notifications as read
  const markAsRead = (notificationId) => {
    if (!notificationId) {
      // Mark all as read
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } else {
      // Mark specific notification as read
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Recalculate unread count
      setUnreadCount(prev => {
        const newCount = prev - 1;
        return newCount < 0 ? 0 : newCount;
      });
    }
  };

  // Delete a notification
  const deleteNotification = (notificationId) => {
    if (!notificationId) return;
    
    // Remove notification from state
    setNotifications(prev => {
      const filtered = prev.filter(notification => notification.id !== notificationId);
      return filtered;
    });
    
    // Recalculate unread count
    setNotifications(prev => {
      const unread = prev.filter(n => !n.read).length;
      setUnreadCount(unread);
      return prev;
    });
  };

  // Clear all notifications
  const clearNotifications = () => {
    // Clear notifications from state
    setNotifications([]);
    setUnreadCount(0);
    
    // Clear notifications from localStorage to prevent them from reappearing on refresh
    try {
      localStorage.removeItem('notifications');
      localStorage.setItem('notifications_cleared', 'true'); // Mark as cleared
    } catch (error) {
      console.error('Failed to clear saved notifications:', error);
    }
  };

  // Connect/disconnect WebSocket based on authentication status
  useEffect(() => {
    if (isAuthenticated) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated, connectWebSocket, disconnectWebSocket]);

  // Listen for test notification events
  useEffect(() => {
    const handleTestNotification = (event) => {
      handleNewNotification(event.detail);
    };

    window.addEventListener('test:notification', handleTestNotification);

    return () => {
      window.removeEventListener('test:notification', handleTestNotification);
    };
  }, []);

  // Clear existing toasts on mount
  useEffect(() => {
    // Clear any existing toasts when the component mounts
    toast.dismiss();
  }, []);

  // Load saved notifications from localStorage on mount
  useEffect(() => {
    try {
      // Check if notifications were cleared previously
      const wasCleared = localStorage.getItem('notifications_cleared') === 'true';
      
      // Skip loading if notifications were cleared
      if (wasCleared) {
        return;
      }
      
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        const parsedNotifications = JSON.parse(savedNotifications);
        setNotifications(parsedNotifications);
        
        // Calculate unread count
        const unread = parsedNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Failed to load saved notifications:', error);
    }
  }, []);

  // Save notifications to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        connectionError,
        markAsRead,
        clearNotifications,
        deleteNotification, // Add deleteNotification to the context
        testNotification,
      }}
    >
      {children}
      <NotificationSound />
      <ToastContainer 
        position="top-right"
        autoClose={4000}
        limit={5}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        pauseOnHover={false}
        draggable
        theme="colored"
        icon={false}
        toastClassName="toast-custom"
        bodyClassName="toast-body-custom"
        closeButton={true}
        style={{
          top: '1rem',
          right: '1rem',
          width: 'auto',
          maxWidth: '420px'
        }}
      />
    </NotificationContext.Provider>
  );
}; 