import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
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

  // Set up axios defaults
  useEffect(() => {
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [state.token]);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // Mock auth check for development
        if (process.env.NODE_ENV === 'development') {
          const mockUser = {
            id: 1,
            email: 'demo@company.com',
            firstName: 'John',
            lastName: 'Doe',
            department: 'Sales',
            position: 'Senior Manager',
            language: 'en',
            currency: 'USD',
            timezone: 'UTC',
            role: 'admin'
          };
          
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: mockUser,
              token
            }
          });
          return;
        }
        
        try {
          const response = await axios.get('/api/auth/me');
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: response.data.user,
              token
            }
          });
        } catch (error) {
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    
    // Mock login for development
    if (process.env.NODE_ENV === 'development') {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data
      const mockUser = {
        id: 1,
        email: email,
        firstName: 'John',
        lastName: 'Doe',
        department: 'Sales',
        position: 'Senior Manager',
        language: 'en',
        currency: 'USD',
        timezone: 'UTC',
        role: 'admin'
      };
      
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      localStorage.setItem('token', mockToken);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: mockUser, token: mockToken }
      });

      return { success: true, message: 'Login successful!' };
    }
    
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      });

      return { success: true, message: t('auth.loginSuccess') };
    } catch (error) {
      const message = error.response?.data?.message || t('auth.loginError');
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: message
      });
      return { success: false, message };
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    
    // Mock register for development
    if (process.env.NODE_ENV === 'development') {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data
      const mockUser = {
        id: Date.now(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        department: userData.department,
        position: userData.position,
        language: 'en',
        currency: 'USD',
        timezone: 'UTC'
      };
      
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      localStorage.setItem('token', mockToken);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: mockUser, token: mockToken }
      });

      return { success: true, message: 'Registration successful!' };
    }
    
    try {
      const response = await axios.post('/api/auth/register', userData);
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      });

      return { success: true, message: t('auth.registerSuccess') };
    } catch (error) {
      const message = error.response?.data?.message || t('auth.registerError');
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
      const response = await axios.put('/api/auth/preferences', preferences);
      dispatch({
        type: 'UPDATE_USER',
        payload: { preferences: response.data.preferences }
      });
      return { success: true, message: t('messages.success.saved') };
    } catch (error) {
      const message = error.response?.data?.message || t('messages.error.general');
      return { success: false, message };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      return { success: true, message: t('messages.success.saved') };
    } catch (error) {
      const message = error.response?.data?.message || t('messages.error.general');
      return { success: false, message };
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updatePreferences,
    changePassword
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
