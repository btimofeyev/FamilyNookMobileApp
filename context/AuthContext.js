// context/AuthContext.js - Improved version
import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '@env';
import apiClient, { authEvents, resetAuthState } from '../app/api/client';
import { Alert } from 'react-native';
import { router } from 'expo-router';

const API_ENDPOINT = API_URL || 'https://famlynook.com';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Single refreshTokenPromise to prevent multiple simultaneous refreshes
  const refreshTokenPromise = useRef(null);
  const lastAuthCheck = useRef(Date.now());
  
  // Clear the refresh promise when component unmounts
  useEffect(() => {
    return () => {
      refreshTokenPromise.current = null;
    };
  }, []);
  
  // Listen to auth events from the API client
  useEffect(() => {
    const unsubscribe = authEvents.subscribe((event) => {
      switch (event.type) {
        case 'token_refreshed':
          setToken(event.token);
          lastAuthCheck.current = Date.now();
          break;
          
          case 'refresh_failed':
            if (event.retryCount && event.retryCount > 3) {
              Alert.alert(
                "Session Expired",
                "Your session has expired. Please log in again to continue.",
                [{ text: "OK", onPress: async () => {
                  // Call logout with false to avoid trying to call the server again
                  await logout(false);
                  // Redirect to login screen
                  router.replace('/(auth)/login');
                }}]
              );
            }
            break;
          
        case 'authentication_required':
          refreshUserSession().catch(error => {
            console.log('Failed to refresh session:', error.message);
          });
          break;
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Load persisted auth state on startup
  useEffect(() => {
    loadAuthState();
  }, []);

  // Check and refresh token periodically
  useEffect(() => {
    if (!token) return;
    
    const tokenRefreshInterval = 8 * 60 * 60 * 1000; // 8 hours
    
    const refreshIfNeeded = async () => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastAuthCheck.current;
      
      if (timeSinceLastCheck > tokenRefreshInterval) {
        refreshUserSession().catch(error => {
          console.error('Proactive token refresh failed:', error.message);
        });
      }
    };

    const initialTimer = setTimeout(refreshIfNeeded, 30000);
    const intervalId = setInterval(refreshIfNeeded, 2 * 60 * 60 * 1000); 
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [token]);

  // Load the initial authentication state
  const loadAuthState = async () => {
    try {
      // Retrieve stored token
      const storedToken = await SecureStore.getItemAsync('auth_token');
      
      if (!storedToken) {
        finalizeAuthInit();
        return;
      }
      
      // Set token in auth state
      setToken(storedToken);
      
      // Try to load stored user
      const storedUser = await SecureStore.getItemAsync('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.warn('Failed to parse stored user data');
        }
      }
      
      // Verify token validity or refresh if needed
      try {
        // Update authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        // Perform a quick validation request
        await apiClient.get('/api/dashboard/profile', { timeout: 5000 });
        
        // Token is valid, simply update lastAuthCheck
        lastAuthCheck.current = Date.now();
      } catch (validationError) {
        // Token validation failed, try to refresh
        try {
          await refreshUserSession();
        } catch (refreshError) {
          // Keep using the stored token even if refresh fails
          console.warn('Token refresh failed during initialization, using stored token');
        }
      }
    } catch (e) {
      console.error('Failed to load auth state:', e);
    } finally {
      finalizeAuthInit();
    }
  };
  
  // Helper to finalize auth initialization
  const finalizeAuthInit = () => {
    setLoading(false);
    setAuthInitialized(true);
  };

  // Improved token refresh function that prevents race conditions
  const refreshUserSession = useCallback(async () => {
    // If a refresh is already in progress, return that promise
    if (refreshTokenPromise.current) {
      return refreshTokenPromise.current;
    }
    
    // Create a new refresh promise
    refreshTokenPromise.current = (async () => {
      try {
        // Check if this is a new account (special case)
        const registrationTime = await SecureStore.getItemAsync('registration_time');
        const isNewAccount = await SecureStore.getItemAsync('is_new_account');
        
        const isRecentRegistration = registrationTime && 
          (Date.now() - parseInt(registrationTime)) < 5 * 60 * 1000;
        
        if (isNewAccount === 'true' && isRecentRegistration) {
          return true;
        }
        
        // Get refresh token from storage
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
      
        // Request new tokens
        const response = await axios.post(
          `${API_ENDPOINT}/api/auth/refresh-token`,
          { refreshToken },
          { 
            withCredentials: true,
            timeout: 15000
          }
        );
        
        // Validate response
        if (!response.data || !response.data.token) {
          throw new Error('Invalid refresh response');
        }
        
        // Extract tokens
        const { token: newToken, refreshToken: newRefreshToken } = response.data;
        
        // Update storage
        await Promise.all([
          SecureStore.setItemAsync('auth_token', newToken),
          newRefreshToken ? SecureStore.setItemAsync('refresh_token', newRefreshToken) : Promise.resolve()
        ]);
        
        // Update state
        setToken(newToken);
        
        // Update axios defaults
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        // Try to update user data
        try {
          const userResponse = await apiClient.get('/api/dashboard/profile');
          if (userResponse.data) {
            setUser(userResponse.data);
            await SecureStore.setItemAsync('user', JSON.stringify(userResponse.data));
          }
        } catch (userError) {
          console.warn('Could not refresh user profile, but continuing with token refresh');
        }
        
        // Update last auth check time
        lastAuthCheck.current = Date.now();
        
        // Reset API client auth state
        resetAuthState();
        
        return true;
      } catch (error) {
        console.error('Session refresh failed:', error.message);
        throw error;
      } finally {
        // Always clear the promise reference when done
        refreshTokenPromise.current = null;
      }
    })();
    
    return refreshTokenPromise.current;
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(`${API_ENDPOINT}/api/auth/login`, {
        email,
        password
      });
      
      const { token: authToken, user: userData, refreshToken } = response.data;
      
      const hasFamily = !!(userData.families?.length > 0 || 
                         userData.primary_family_id || 
                         userData.family_id);
      
      // Update storage in parallel for better performance
      await Promise.all([
        SecureStore.setItemAsync('auth_token', authToken),
        refreshToken ? SecureStore.setItemAsync('refresh_token', refreshToken) : Promise.resolve(),
        SecureStore.setItemAsync('user', JSON.stringify(userData)),
        (userData.families?.length > 0) ? 
          SecureStore.setItemAsync('selected_family_id', userData.families[0].family_id.toString()) :
          (userData.primary_family_id) ?
            SecureStore.setItemAsync('selected_family_id', userData.primary_family_id.toString()) :
            (userData.family_id) ?
              SecureStore.setItemAsync('selected_family_id', userData.family_id.toString()) :
              Promise.resolve()
      ]);
      
      // Update state
      setToken(authToken);
      setUser(userData);
      
      // Reset API client auth state
      resetAuthState();
      
      // Update axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
      // Update last auth check time
      lastAuthCheck.current = Date.now();
      
      return { 
        success: true, 
        isNewUser: response.data.isNewUser,
        needsFamilySetup: !hasFamily
      };
    } catch (e) {
      const message = e.response?.data?.error || 'Login failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };
  
  const register = async (name, email, password, passkey = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = { name, email, password };
      if (passkey) payload.passkey = passkey;
      
      const response = await axios.post(`${API_ENDPOINT}/api/auth/register`, payload);
      
      const { token: authToken, user: userData } = response.data;
      
      const now = Date.now();
      await Promise.all([
        SecureStore.setItemAsync('registration_time', now.toString()),
        SecureStore.setItemAsync('is_new_account', 'true'),
        SecureStore.setItemAsync('auth_token', authToken),
        response.data.refreshToken ? 
          SecureStore.setItemAsync('refresh_token', response.data.refreshToken) : Promise.resolve(),
        SecureStore.setItemAsync('user', JSON.stringify(userData))
      ]);
      
      setToken(authToken);
      setUser(userData);
      resetAuthState();
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      lastAuthCheck.current = Date.now();
      
      const needsFamilySetup = !userData.family_id;
      
      return { 
        success: true, 
        needsFamilySetup: needsFamilySetup,
        isNewUser: response.data.isNewUser || true
      };
    } catch (e) {
      const message = e.response?.data?.error || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

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
      
      await Promise.all([
        SecureStore.setItemAsync('auth_token', authToken),
        refreshToken ? SecureStore.setItemAsync('refresh_token', refreshToken) : Promise.resolve(),
        SecureStore.setItemAsync('user', JSON.stringify(userData))
      ]);
      
      setToken(authToken);
      setUser(userData);
      resetAuthState();
      
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

  const logout = async (callApi = true) => {
    try {
      if (callApi && token) {
        try {
          await apiClient.post(`/api/auth/logout`);
        } catch (apiError) {
          console.log('Logout API call failed, continuing with local logout');
        }
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      try {
        await Promise.all([
          SecureStore.deleteItemAsync('auth_token'),
          SecureStore.deleteItemAsync('refresh_token'),
          SecureStore.deleteItemAsync('user'),
          SecureStore.deleteItemAsync('selected_family_id')
        ]);
      } catch (storageError) {
        console.error('Error clearing secure storage:', storageError);
      }
      
      setToken(null);
      setUser(null);
      
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const forceCleanAuthState = async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('auth_token'),
        SecureStore.deleteItemAsync('refresh_token'),
        SecureStore.deleteItemAsync('user'),
        SecureStore.deleteItemAsync('selected_family_id')
      ]);
      
      setToken(null);
      setUser(null);
      
      delete axios.defaults.headers.common['Authorization'];
      
      router.replace('/(auth)/login');
      
      return true;
    } catch (error) {
      console.error('Error clearing auth state:', error);
      return false;
    }
  };

  const checkInvitation = async (token) => {
    try {
      const response = await axios.get(`${API_ENDPOINT}/api/invitations/check/${token}`);
      return response.data;
    } catch (e) {
      return { valid: false, error: e.response?.data?.error || 'Invalid invitation link' };
    }
  };

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};