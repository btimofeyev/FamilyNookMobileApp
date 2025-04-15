// context/AuthContext.js - Production ready version
import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '@env';
import apiClient, { authEvents, resetAuthState } from '../app/api/client';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Device from 'expo-device';

// Constants
const API_ENDPOINT = API_URL || 'https://famlynook.com';
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user';
const REGISTRATION_TIME_KEY = 'registration_time';
const IS_NEW_ACCOUNT_KEY = 'is_new_account';
const SELECTED_FAMILY_ID_KEY = 'selected_family_id';

// Token refresh interval (8 hours)
const TOKEN_REFRESH_INTERVAL = 8 * 60 * 60 * 1000;

// Authentication context
export const AuthContext = createContext(null);

/**
 * Authentication Provider component that manages auth state
 */
export const AuthProvider = ({ children }) => {
  // State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Refs
  const refreshTokenPromise = useRef(null);
  const lastAuthCheck = useRef(Date.now());
  const refreshTokenTimeoutId = useRef(null);
  const mountedRef = useRef(true);
  
  // Clear timeouts and refs when component unmounts
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshTokenTimeoutId.current) {
        clearTimeout(refreshTokenTimeoutId.current);
      }
      refreshTokenPromise.current = null;
    };
  }, []);
  
  // Subscribe to auth events from API client
  useEffect(() => {
    const unsubscribe = authEvents.subscribe((event) => {
      if (!mountedRef.current) return;
      
      switch (event.type) {
        case 'token_refreshed':
          setToken(event.token);
          lastAuthCheck.current = Date.now();
          break;
          
        case 'refresh_failed':
          if (event.retryCount && event.retryCount > 3) {
            handleSessionExpired();
          }
          break;
          
        case 'authentication_required':
          refreshUserSession().catch(error => {
            console.log('Failed to refresh session:', error.message);
          });
          break;
          
        case 'family_access_denied':
          // Handle family access denied errors
          console.log('Family access denied:', event.error);
          break;
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Load stored auth state on startup
  useEffect(() => {
    loadAuthState();
  }, []);

  // Schedule token refresh
  useEffect(() => {
    if (!token) return;
    
    const scheduleNextTokenRefresh = () => {
      // Clear any existing timeout
      if (refreshTokenTimeoutId.current) {
        clearTimeout(refreshTokenTimeoutId.current);
      }
      
      // Calculate time until next refresh (every 8 hours)
      const now = Date.now();
      const timeSinceLastCheck = now - lastAuthCheck.current;
      const timeUntilNextRefresh = Math.max(
        TOKEN_REFRESH_INTERVAL - timeSinceLastCheck,
        60000 // Minimum 1 minute
      );
      
      console.log(`Scheduling token refresh in ${Math.round(timeUntilNextRefresh / 60000)} minutes`);
      
      // Set timeout for next refresh
      refreshTokenTimeoutId.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        
        try {
          await refreshUserSession();
          // Schedule next refresh after this one completes
          scheduleNextTokenRefresh();
        } catch (error) {
          console.error('Failed scheduled token refresh:', error);
          // Try again in 30 minutes on failure
          refreshTokenTimeoutId.current = setTimeout(
            scheduleNextTokenRefresh, 
            30 * 60 * 1000
          );
        }
      }, timeUntilNextRefresh);
    };

    // Initial timeout to check token shortly after app starts
    refreshTokenTimeoutId.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      
      try {
        await refreshUserSession();
        scheduleNextTokenRefresh();
      } catch (error) {
        console.log('Initial token refresh check failed:', error.message);
        // Schedule regular refresh anyway
        scheduleNextTokenRefresh();
      }
    }, 30000); // Check 30 seconds after startup
    
    return () => {
      if (refreshTokenTimeoutId.current) {
        clearTimeout(refreshTokenTimeoutId.current);
      }
    };
  }, [token]);

  /**
   * Handles session expired scenario
   */
  const handleSessionExpired = () => {
    if (!mountedRef.current) return;
    
    Alert.alert(
      "Session Expired",
      "Your session has expired. Please log in again to continue.",
      [{ 
        text: "OK", 
        onPress: async () => {
          // Call logout with false to avoid trying to call the server again
          await logout(false);
          // Redirect to login screen
          router.replace('/(auth)/login');
        }
      }]
    );
  };

  /**
   * Load the initial authentication state
   */
  const loadAuthState = async () => {
    try {
      // Retrieve stored token
      const storedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      
      if (!storedToken) {
        finalizeAuthInit();
        return;
      }
      
      // Set token in auth state
      setToken(storedToken);
      
      // Try to load stored user
      const storedUser = await SecureStore.getItemAsync(USER_DATA_KEY);
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (e) {
          console.warn('Failed to parse stored user data');
        }
      }
      
      // Verify token validity or refresh if needed
      try {
        // Update authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        // Perform a quick validation request with short timeout
        await apiClient.get('/api/dashboard/profile', { timeout: 5000 });
        
        // Token is valid, simply update lastAuthCheck
        lastAuthCheck.current = Date.now();
      } catch (validationError) {
        // Token validation failed, try to refresh
        try {
          await refreshUserSession();
        } catch (refreshError) {
          // Keep using the stored token even if refresh fails
          // We'll retry later with the scheduled refresh
          console.warn('Token refresh failed during initialization, using stored token');
        }
      }
    } catch (e) {
      console.error('Failed to load auth state:', e);
    } finally {
      finalizeAuthInit();
    }
  };
  
  /**
   * Helper to finalize auth initialization
   */
  const finalizeAuthInit = () => {
    if (mountedRef.current) {
      setLoading(false);
      setAuthInitialized(true);
    }
  };

  /**
   * Refreshes the user session by getting a new access token
   * using the refresh token
   */
  const refreshUserSession = useCallback(async () => {
    // If a refresh is already in progress, return that promise
    if (refreshTokenPromise.current) {
      return refreshTokenPromise.current;
    }
    
    // Create a new refresh promise
    refreshTokenPromise.current = (async () => {
      try {
        // Check if this is a new account (special case)
        const registrationTime = await SecureStore.getItemAsync(REGISTRATION_TIME_KEY);
        const isNewAccount = await SecureStore.getItemAsync(IS_NEW_ACCOUNT_KEY);
        
        const isRecentRegistration = registrationTime && 
          (Date.now() - parseInt(registrationTime)) < 5 * 60 * 1000;
        
        if (isNewAccount === 'true' && isRecentRegistration) {
          return true;
        }
        
        // Get refresh token from storage
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        
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
          SecureStore.setItemAsync(AUTH_TOKEN_KEY, newToken),
          newRefreshToken ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken) : Promise.resolve()
        ]);
        
        // Update state
        if (mountedRef.current) {
          setToken(newToken);
        }
        
        // Update axios defaults
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        // Try to update user data
        try {
          const userResponse = await apiClient.get('/api/dashboard/profile');
          if (userResponse.data && mountedRef.current) {
            setUser(userResponse.data);
            await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(userResponse.data));
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

  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Make login request
      const response = await axios.post(`${API_ENDPOINT}/api/auth/login`, {
        email,
        password
      });
      
      // Extract data from response
      const { token: authToken, user: userData, refreshToken } = response.data;
      
      if (!authToken || !userData) {
        throw new Error('Invalid response from server');
      }
      
      // Check if user has family
      const hasFamily = !!(
        userData.families?.length > 0 || 
        userData.primary_family_id || 
        userData.family_id
      );
      
      // Update storage in parallel for better performance
      const storagePromises = [
        SecureStore.setItemAsync(AUTH_TOKEN_KEY, authToken),
        SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(userData)),
      ];
      
      // Store refresh token if provided
      if (refreshToken) {
        storagePromises.push(
          SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
        );
      }
      
      // Store selected family if available
      if (userData.families?.length > 0) {
        storagePromises.push(
          SecureStore.setItemAsync(SELECTED_FAMILY_ID_KEY, userData.families[0].family_id.toString())
        );
      } else if (userData.primary_family_id) {
        storagePromises.push(
          SecureStore.setItemAsync(SELECTED_FAMILY_ID_KEY, userData.primary_family_id.toString())
        );
      } else if (userData.family_id) {
        storagePromises.push(
          SecureStore.setItemAsync(SELECTED_FAMILY_ID_KEY, userData.family_id.toString())
        );
      }
      
      await Promise.all(storagePromises);
      
      // Update state
      if (mountedRef.current) {
        setToken(authToken);
        setUser(userData);
      }
      
      // Reset API client auth state
      resetAuthState();
      
      // Update axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
      // Update last auth check time
      lastAuthCheck.current = Date.now();
      
      return { 
        success: true, 
        isNewUser: response.data.isNewUser || false,
        needsFamilySetup: !hasFamily
      };
    } catch (e) {
      const message = e.response?.data?.error || 
                      'Login failed. Please check your credentials and try again.';
      
      if (mountedRef.current) {
        setError(message);
      }
      return { success: false, message };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };
  
  /**
   * Register a new user
   * @param {string} name - User's name
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} passkey - Optional family passkey
   */
  const register = async (name, email, password, passkey = null) => {
    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
      
      // Validate input
      if (!name || !email || !password) {
        throw new Error('Name, email and password are required');
      }
      
      // Prepare payload
      const payload = { name, email, password };
      if (passkey) payload.passkey = passkey;
      
      // Make registration request
      const response = await axios.post(`${API_ENDPOINT}/api/auth/register`, payload);
      
      if (!response.data || !response.data.token || !response.data.user) {
        throw new Error('Invalid response from server');
      }
      
      const { token: authToken, user: userData } = response.data;
      
      // Record registration time and set new account flag
      const now = Date.now();
      const storagePromises = [
        SecureStore.setItemAsync(REGISTRATION_TIME_KEY, now.toString()),
        SecureStore.setItemAsync(IS_NEW_ACCOUNT_KEY, 'true'),
        SecureStore.setItemAsync(AUTH_TOKEN_KEY, authToken),
        SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(userData))
      ];
      
      // Store refresh token if provided
      if (response.data.refreshToken) {
        storagePromises.push(
          SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refreshToken)
        );
      }
      
      await Promise.all(storagePromises);
      
      // Update state
      if (mountedRef.current) {
        setToken(authToken);
        setUser(userData);
      }
      
      // Reset API client auth state
      resetAuthState();
      
      // Update axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
      // Update last auth check time
      lastAuthCheck.current = Date.now();
      
      // Determine if user needs family setup
      const needsFamilySetup = !userData.family_id;
      
      return { 
        success: true, 
        needsFamilySetup,
        isNewUser: true
      };
    } catch (e) {
      const message = e.response?.data?.error || 'Registration failed. Please try again.';
      
      if (mountedRef.current) {
        setError(message);
      }
      return { success: false, message };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  /**
   * Register using an invitation token
   */
  const registerWithInvitation = async (name, email, password, token) => {
    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
      
      // Validate input
      if (!name || !email || !password || !token) {
        throw new Error('Name, email, password and invitation token are required');
      }
      
      // Make invitation registration request
      const response = await axios.post(`${API_ENDPOINT}/api/auth/register-invited`, {
        name,
        email,
        password,
        token
      });
      
      if (!response.data || !response.data.token || !response.data.user) {
        throw new Error('Invalid response from server');
      }
      
      const { token: authToken, user: userData, refreshToken } = response.data;
      
      // Update storage
      const storagePromises = [
        SecureStore.setItemAsync(AUTH_TOKEN_KEY, authToken),
        SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(userData))
      ];
      
      // Store refresh token if provided
      if (refreshToken) {
        storagePromises.push(
          SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
        );
      }
      
      await Promise.all(storagePromises);
      
      // Update state
      if (mountedRef.current) {
        setToken(authToken);
        setUser(userData);
      }
      
      // Reset API client auth state
      resetAuthState();
      
      // Update axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
      // Update last auth check time
      lastAuthCheck.current = Date.now();
      
      return { success: true };
    } catch (e) {
      const message = e.response?.data?.error || 'Registration failed. Please try again.';
      
      if (mountedRef.current) {
        setError(message);
      }
      return { success: false, message };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  /**
   * Log out user
   * @param {boolean} callApi - Whether to call the API logout endpoint
   */
  const logout = async (callApi = true) => {
    try {
      // Cancel any ongoing refresh timeouts
      if (refreshTokenTimeoutId.current) {
        clearTimeout(refreshTokenTimeoutId.current);
      }
      
      // Try to call logout API if requested
      if (callApi && token) {
        try {
          await apiClient.post(`/api/auth/logout`);
        } catch (apiError) {
          console.log('Logout API call failed, continuing with local logout');
        }
      }
      
      // Clear all secure storage keys
      const keysToDelete = [
        AUTH_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        USER_DATA_KEY,
        SELECTED_FAMILY_ID_KEY
      ];
      
      await Promise.all(
        keysToDelete.map(key => SecureStore.deleteItemAsync(key))
      );
      
      // Reset state
      if (mountedRef.current) {
        setToken(null);
        setUser(null);
      }
      
      // Clear axios authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  /**
   * Force clean auth state and redirect to login
   */
  const forceCleanAuthState = async () => {
    try {
      // Cancel any ongoing refresh timeouts
      if (refreshTokenTimeoutId.current) {
        clearTimeout(refreshTokenTimeoutId.current);
      }
      
      // Clear all auth-related keys from secure storage
      const keysToDelete = [
        AUTH_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        USER_DATA_KEY,
        SELECTED_FAMILY_ID_KEY
      ];
      
      await Promise.all(
        keysToDelete.map(key => SecureStore.deleteItemAsync(key))
      );
      
      // Reset state
      if (mountedRef.current) {
        setToken(null);
        setUser(null);
      }
      
      // Clear axios authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      // Redirect to login
      router.replace('/(auth)/login');
      
      return true;
    } catch (error) {
      console.error('Error cleaning auth state:', error);
      return false;
    }
  };

  /**
   * Check invitation token
   * @param {string} token - Invitation token
   */
  const checkInvitation = async (token) => {
    try {
      if (!token) {
        return { valid: false, error: 'Invalid invitation token' };
      }
      
      const response = await axios.get(`${API_ENDPOINT}/api/invitations/check/${token}`);
      return response.data;
    } catch (e) {
      return { 
        valid: false, 
        error: e.response?.data?.error || 'Invalid invitation link' 
      };
    }
  };

  /**
   * Update user information
   * @param {Object} newUserData - New user data to merge with existing user
   */
  const updateUserInfo = async (newUserData) => {
    try {
      if (!user) {
        return false;
      }
      
      // Merge existing user with new data
      const updatedUser = { ...user, ...newUserData };
      
      // Update state
      if (mountedRef.current) {
        setUser(updatedUser);
      }
      
      // Update storage
      await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(updatedUser));
      
      return true;
    } catch (e) {
      console.error('Error updating user info:', e);
      return false;
    }
  };

  // Context value
  const contextValue = {
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
    authInitialized,
    deviceInfo: {
      isDevice: Device.isDevice,
      platform: Platform.OS,
      version: Platform.Version
    }
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access AuthContext
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};