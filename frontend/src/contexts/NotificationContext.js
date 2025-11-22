import React, { createContext, useContext, useReducer } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();

// Notification reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      // 使用时间戳 + 随机数确保唯一性
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return [...state, { ...action.payload, id: uniqueId }];
    case 'REMOVE_NOTIFICATION':
      return state.filter(notification => notification.id !== action.payload);
    case 'CLEAR_ALL':
      return [];
    default:
      return state;
  }
};

// Initial state
const initialState = [];

// Notification provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, dispatch] = useReducer(notificationReducer, initialState);

  const showNotification = (message, severity = 'info', duration = 6000) => {
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        message,
        severity,
        duration
      }
    });
  };

  const removeNotification = (id) => {
    dispatch({
      type: 'REMOVE_NOTIFICATION',
      payload: id
    });
  };

  const clearAllNotifications = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  const value = {
    notifications,
    showNotification,
    removeNotification,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
