import React, { createContext, useContext, useReducer, useEffect } from 'react';
import apiClient from '../utils/axiosConfig';
import { useTranslation } from 'react-i18next';

const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { t } = useTranslation();

  // Token 已经通过 axios 拦截器自动添加，这里不再需要手动设置

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // 始终从API获取用户信息，确保使用真实数据库数据
        try {
          const response = await apiClient.get('/auth/me');
          if (response.data && response.data.success) {
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: response.data.user,
                token
              }
            });
          } else {
            // API返回失败，清除token
            localStorage.removeItem('token');
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  // Login function - 始终使用真实API，校验用户是否在数据库中
  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // 始终调用真实API，确保校验用户是否在数据库中
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Login failed');
      }

      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('token', token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      });

      return { success: true, message: t('auth.loginSuccess') };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || error.message || t('auth.loginError');
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: message
      });
      return { success: false, message };
    }
  };

  // Register function - 始终使用真实API
  const register = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // 始终调用真实API，确保用户注册到数据库
      const response = await apiClient.post('/auth/register', userData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Registration failed');
      }

      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('token', token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      });

      return { success: true, message: t('auth.registerSuccess') };
    } catch (error) {
      console.error('Register error:', error);
      const message = error.response?.data?.message || error.message || t('auth.registerError');
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: message
      });
      return { success: false, message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  // Update user preferences
  const updatePreferences = async (preferences) => {
    try {
      const response = await apiClient.put('/api/auth/preferences', preferences);
      dispatch({
        type: 'UPDATE_USER',
        payload: { preferences: response.data.preferences }
      });
      return { success: true, message: t('messages.success.saved') };
    } catch (error) {
      console.error('Update preferences error:', error);
      const message = error.response?.data?.message || error.message || t('messages.error.general');
      return { success: false, message };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await apiClient.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      return { success: true, message: t('messages.success.saved') };
    } catch (error) {
      console.error('Change password error:', error);
      const message = error.response?.data?.message || error.message || t('messages.error.general');
      return { success: false, message };
    }
  };

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    // Admin role (case-insensitive) has all permissions
    if (state.user?.role && state.user.role.toUpperCase() === 'ADMIN') {
      return true;
    }
    
    // Check if user has the permission
    return state.user?.permissions?.includes(permission) || false;
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissions) => {
    if (!Array.isArray(permissions)) {
      return hasPermission(permissions);
    }
    return permissions.some(permission => hasPermission(permission));
  };

  // Check if user has all of the specified permissions
  const hasAllPermissions = (permissions) => {
    if (!Array.isArray(permissions)) {
      return hasPermission(permissions);
    }
    return permissions.every(permission => hasPermission(permission));
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updatePreferences,
    changePassword,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
