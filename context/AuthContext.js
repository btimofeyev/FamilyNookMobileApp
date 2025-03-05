// app/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '@env';
import Constants from 'expo-constants';

// Fallback in case env variable isn't loaded
const API_ENDPOINT = API_URL || 'https://famlynook.com';


// Create the AuthContext
export const AuthContext = createContext();


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state by checking SecureStore
  useEffect(() => {
    const loadToken = async () => {
      try {
        console.log('Starting to load auth token...');
        const storedToken = await SecureStore.getItemAsync('auth_token');
        console.log('Stored token exists:', !!storedToken);
        
        if (storedToken) {
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          const storedUser = await SecureStore.getItemAsync('user');
          console.log('Stored user exists:', !!storedUser);
          
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
          }
        }
      } catch (e) {
        console.error('Failed to load auth tokens', e);
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };
    
    loadToken();
  }, []);
  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting login to:', `${API_ENDPOINT}/api/auth/login`);
      console.log('Login payload:', { email, password });
      
      // Use direct axios call instead of apiClient to ensure it works
      const response = await axios.post(`${API_ENDPOINT}/api/auth/login`, {
        email,
        password
      });
      
      console.log('Login response:', response.data);
      
      const { token, user } = response.data;
      
      // Store in secure storage
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      // Update state
      setToken(token);
      setUser(user);
      
      // Set token for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('Auth state updated:', { 
        hasToken: !!token, 
        hasUser: !!user,
        isAuthenticated: !!token 
      });
      
      return { success: true };
    } catch (e) {
      console.error('Login error details:', {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        code: e.code
      });
      const message = e.response?.data?.error || 'Login failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name, email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(`${API_ENDPOINT}/api/auth/register`, {
        name,
        email,
        password
      });
      
      const { token, user } = response.data;
      
      // Store in secure storage
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      // Update state
      setToken(token);
      setUser(user);
      
      // Set token for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { success: true };
    } catch (e) {
      const message = e.response?.data?.error || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Register with invitation
  const registerWithInvitation = async (name, email, password, token) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(`${API_ENDPOINT}/api/auth/register-invited`, {
        name,
        email,
        password,
        token
      });
      
      const { token: authToken, user } = response.data;
      
      // Store in secure storage
      await SecureStore.setItemAsync('auth_token', authToken);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      // Update state
      setToken(authToken);
      setUser(user);
      
      // Set token for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
      return { success: true };
    } catch (e) {
      const message = e.response?.data?.error || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout API
      await axios.post(`${API_ENDPOINT}/api/auth/logout`);
    } catch (e) {
      console.error('Logout API error', e);
    }
    
    // Clear SecureStore
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user');
    
    // Clear state
    setToken(null);
    setUser(null);
    
    // Remove Authorization header
    delete axios.defaults.headers.common['Authorization'];
  };

  // Check invitation token
  const checkInvitation = async (token) => {
    try {
      const response = await axios.get(`${API_ENDPOINT}/api/invitations/check/${token}`);
      return response.data;
    } catch (e) {
      return { valid: false, error: e.response?.data?.error || 'Invalid invitation link' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        registerWithInvitation,
        logout,
        checkInvitation,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};