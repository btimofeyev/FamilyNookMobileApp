// context/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '@env';
import { Platform } from 'react-native';
import apiClient, { authEvents, resetAuthState } from '../app/api/client';
import { Alert } from 'react-native';
import { router } from 'expo-router';

// Fallback in case env variable isn't loaded
const API_ENDPOINT = API_URL || 'https://famlynook.com';

// Create the AuthContext
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Track if we're currently trying to refresh credentials
  const isRefreshing = useRef(false);
  
  // Track last successful auth check time
  const lastAuthCheck = useRef(Date.now());
  
  // Setup auth event listeners
  useEffect(() => {
    const unsubscribe = authEvents.subscribe((event) => {
      console.log('Auth event:', event.type);
      
      switch (event.type) {
        case 'token_refreshed':
          setToken(event.token);
          lastAuthCheck.current = Date.now();
          break;
          
        case 'refresh_failed':
          // Log the user out if refresh failed and show message
          logout(false).then(() => {
            Alert.alert(
              "Session Expired",
              "Your session has expired. Please log in again.",
              [
                { text: "OK", onPress: () => router.replace('/(auth)/login') }
              ]
            );
          });
          break;
          
        case 'authentication_required':
          // If we're not already handling auth, handle it
          if (!isRefreshing.current) {
            isRefreshing.current = true;
            refreshUserSession().finally(() => {
              isRefreshing.current = false;
            });
          }
          break;
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Initialize auth state by checking SecureStore
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        console.log('Starting to load auth state...');
        const storedToken = await SecureStore.getItemAsync('auth_token');
        
        if (storedToken) {
          const refreshToken = await SecureStore.getItemAsync('refresh_token');
          console.log('Found stored token, refresh token exists:', !!refreshToken);
          
          // Set a temporary header to validate the token
          const tempHeaders = axios.defaults.headers.common['Authorization'];
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Validate the token before proceeding
          try {
            // Make a lightweight request to validate the token
            await apiClient.get('/api/dashboard/profile', { timeout: 5000 });
            console.log('Token validation successful');
            
            // Only update state if validation succeeded
            setToken(storedToken);
            
            const storedUser = await SecureStore.getItemAsync('user');
            if (storedUser) {
              const userData = JSON.parse(storedUser);
              setUser(userData);
              console.log('User data loaded from storage');
            }
          } catch (validationError) {
            console.error('Token validation failed:', validationError);
            
            // If validation failed, try to refresh the token
            if (refreshToken) {
              try {
                console.log('Attempting to refresh token on startup');
                const response = await axios.post(
                  `${API_ENDPOINT}/api/auth/refresh-token`,
                  { refreshToken },
                  { timeout: 8000 }
                );
                
                if (response.data.token) {
                  console.log('Token refreshed successfully');
                  const newToken = response.data.token;
                  await SecureStore.setItemAsync('auth_token', newToken);
                  
                  setToken(newToken);
                  axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                  
                  // Try to load user data with new token
                  try {
                    const userResponse = await apiClient.get('/api/dashboard/profile');
                    if (userResponse.data) {
                      setUser(userResponse.data);
                      await SecureStore.setItemAsync('user', JSON.stringify(userResponse.data));
                      console.log('User profile fetched with refreshed token');
                    }
                  } catch (userError) {
                    console.error('Failed to fetch user profile after token refresh:', userError);
                    await logout(false);
                  }
                } else {
                  console.log('Token refresh failed - no token in response');
                  await logout(false);
                }
              } catch (refreshError) {
                console.error('Failed to refresh token on startup:', refreshError);
                await logout(false);
                
                // Restore original headers if refresh fails
                if (tempHeaders) {
                  axios.defaults.headers.common['Authorization'] = tempHeaders;
                } else {
                  delete axios.defaults.headers.common['Authorization'];
                }
              }
            } else {
              console.log('No refresh token available, clearing auth state');
              await logout(false);
              
              // Restore original headers if no refresh token
              if (tempHeaders) {
                axios.defaults.headers.common['Authorization'] = tempHeaders;
              } else {
                delete axios.defaults.headers.common['Authorization'];
              }
            }
          }
        } else {
          console.log('No stored token found');
        }
      } catch (e) {
        console.error('Failed to load auth state:', e);
        await logout(false);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
        lastAuthCheck.current = Date.now();
      }
    };
    
    loadAuthState();
  }, []);

  // Periodically check and refresh token if needed
  useEffect(() => {
    if (!token) return;
    
    const tokenRefreshInterval = 15 * 60 * 1000; // 15 minutes
    
    const refreshIfNeeded = async () => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastAuthCheck.current;
      
      // Only refresh if it's been more than our refresh interval
      if (timeSinceLastCheck > tokenRefreshInterval && !isRefreshing.current) {
        isRefreshing.current = true;
        try {
          // Make a lightweight request to check token validity
          await apiClient.get('/api/dashboard/profile');
          lastAuthCheck.current = now;
        } catch (error) {
          if (error.response?.status === 401) {
            console.log('Token expired, attempting refresh...');
            // This will trigger our interceptor's refresh logic
            try {
              await refreshUserSession();
            } catch (refreshError) {
              console.error('Auto refresh failed:', refreshError);
              // Logout will be handled by the event system
            }
          }
        } finally {
          isRefreshing.current = false;
        }
      }
    };

    // Initial check
    refreshIfNeeded();
    
    // Set up interval
    const intervalId = setInterval(refreshIfNeeded, 60 * 1000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [token]);

  // Proactively refresh the user session
  const refreshUserSession = async () => {
    if (isRefreshing.current) return;
    
    isRefreshing.current = true;
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      console.log('Attempting to refresh token with refresh token');
      const response = await axios.post(
        `${API_ENDPOINT}/api/auth/refresh-token`,
        { refreshToken },
        { withCredentials: true }
      );
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid refresh response');
      }
      
      const { token: newToken } = response.data;
      console.log('Token successfully refreshed');
      
      // Update tokens
      await SecureStore.setItemAsync('auth_token', newToken);
      setToken(newToken);
      
      // Update axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // Refresh user data
      const userResponse = await apiClient.get('/api/dashboard/profile');
      if (userResponse.data) {
        setUser(userResponse.data);
        await SecureStore.setItemAsync('user', JSON.stringify(userResponse.data));
      }
      
      lastAuthCheck.current = Date.now();
      resetAuthState(); // Reset the failed refresh attempt flag
      
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      
      // If refreshing fails, we'll need to log the user out
      if (error.response?.status === 401 || error.response?.status === 403) {
        await logout(false);
      }
      
      throw error;
    } finally {
      isRefreshing.current = false;
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting login to:', `${API_ENDPOINT}/api/auth/login`);
      
      // Use direct axios call instead of apiClient to ensure it works
      const response = await axios.post(`${API_ENDPOINT}/api/auth/login`, {
        email,
        password
      });
      
      console.log('Login response received');
      
      const { token: authToken, user: userData, refreshToken } = response.data;
      console.log('Login successful, storing tokens...');
      
      // Store in secure storage
      await SecureStore.setItemAsync('auth_token', authToken);
      if (refreshToken) {
        await SecureStore.setItemAsync('refresh_token', refreshToken);
        console.log('Refresh token stored');
      } else {
        console.warn('No refresh token in login response');
      }
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
      // Update state
      setToken(authToken);
      setUser(userData);
      resetAuthState(); // Reset any failed refresh state
      
      // Set token for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      lastAuthCheck.current = Date.now();
      
      return { success: true, isNewUser: response.data.isNewUser };
    } catch (e) {
      console.error('Login error details:', e.message);
      const message = e.response?.data?.error || 'Login failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name, email, password, passkey = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = { name, email, password };
      if (passkey) payload.passkey = passkey;
      
      const response = await axios.post(`${API_ENDPOINT}/api/auth/register`, payload);
      
      const { token: authToken, user: userData, refreshToken } = response.data;
      
      // Store in secure storage
      await SecureStore.setItemAsync('auth_token', authToken);
      if (refreshToken) {
        await SecureStore.setItemAsync('refresh_token', refreshToken);
      }
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
      // Update state
      setToken(authToken);
      setUser(userData);
      resetAuthState(); // Reset any failed refresh state
      
      // Set token for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      lastAuthCheck.current = Date.now();
      
      return { success: true, newUser: response.data.isNewUser };
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
      
      const { token: authToken, user: userData, refreshToken } = response.data;
      
      // Store in secure storage
      await SecureStore.setItemAsync('auth_token', authToken);
      if (refreshToken) {
        await SecureStore.setItemAsync('refresh_token', refreshToken);
      }
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
      // Update state
      setToken(authToken);
      setUser(userData);
      resetAuthState(); // Reset any failed refresh state
      
      // Set token for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      lastAuthCheck.current = Date.now();
      
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
  const logout = async (callApi = true) => {
    try {
      if (callApi && token) {
        // Call logout API if requested and we have a token
        try {
          await apiClient.post(`/api/auth/logout`);
        } catch (apiError) {
          console.log('Logout API call failed, continuing with local logout');
        }
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      // Always clear storage and state even if API call fails
      try {
        // Clear SecureStore
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user');
        await SecureStore.deleteItemAsync('selected_family_id');
        console.log('Auth storage cleared');
      } catch (storageError) {
        console.error('Error clearing secure storage:', storageError);
      }
      
      // Clear state
      setToken(null);
      setUser(null);
      
      // Remove Authorization header
      delete axios.defaults.headers.common['Authorization'];
      console.log('Logout complete');
    }
  };

  // Manually clear all auth data - useful for debugging
  const forceCleanAuthState = async () => {
    try {
      console.log('Forcing clean auth state...');
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('selected_family_id');
      
      // Clear state
      setToken(null);
      setUser(null);
      
      // Remove Authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      console.log('Auth state forcefully cleared!');
      
      // Force reload to a clean state
      router.replace('/(auth)/login');
      
      return true;
    } catch (error) {
      console.error('Error clearing auth state:', error);
      return false;
    }
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

  // Update user info in storage
  const updateUserInfo = async (newUserData) => {
    try {
      const updatedUser = { ...user, ...newUserData };
      setUser(updatedUser);
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
      return true;
    } catch (e) {
      console.error('Error updating user info:', e);
      return false;
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
        updateUserInfo,
        refreshUserSession,
        forceCleanAuthState,
        isAuthenticated: !!token,
        authInitialized
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