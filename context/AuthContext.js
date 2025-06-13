// context/AuthContext.js - Refactored
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Device from 'expo-device';

// Import utilities and services
import AuthService from '../app/api/authService';
import SecureStorage from '../app/utils/secureStorage';
import TokenManager from '../app/utils/tokenManager';
import { authEvents } from '../app/api/client';

// Create context
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Refs
  const mountedRef = useRef(true);
  
  // Clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      TokenManager.cleanup();
    };
  }, []);
  
  // Subscribe to auth events
  useEffect(() => {
    const unsubscribe = authEvents.subscribe((event) => {
      if (!mountedRef.current) return;
      
      switch (event.type) {
        case 'token_refreshed':
          setToken(event.token);
          break;
          
        case 'refresh_failed':
          console.log('Auth refresh failed:', event.error?.message);
          if (event.error?.message === 'No refresh token available' || (event.retryCount && event.retryCount > 3)) {
            handleSessionExpired();
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

  // Load auth state on startup
  useEffect(() => {
    loadAuthState();
  }, []);

  // Schedule token refresh when token changes
  useEffect(() => {
    if (token) {
      TokenManager.initialize();
      TokenManager.scheduleTokenRefresh(token);
    }
    
    return () => {};
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
          await logout(false);
          router.replace('/(auth)/login');
        }
      }]
    );
  };

  /**
   * Load initial auth state
   */
  const loadAuthState = async () => {
    try {
      const storedToken = await SecureStorage.getAuthToken();
      
      if (!storedToken) {
        finalizeAuthInit();
        return;
      }
      
      setToken(storedToken);
      
      const storedUser = await SecureStorage.getUserData();
      if (storedUser) {
        setUser(storedUser);
      }
      
      // Verify token
      await TokenManager.verifyToken(storedToken);
    } catch (e) {
      console.error('Failed to load auth state:', e);
    } finally {
      finalizeAuthInit();
    }
  };
  
  /**
   * Finalize auth initialization
   */
  const finalizeAuthInit = () => {
    if (mountedRef.current) {
      setLoading(false);
      setAuthInitialized(true);
    }
  };

  /**
   * Refresh user session
   */
  const refreshUserSession = async () => {
    try {
      const newToken = await TokenManager.refreshToken();
      
      if (newToken && mountedRef.current) {
        setToken(newToken);
        
        // Try to update user data
        try {
          const userData = await AuthService.getUserProfile();
          if (userData && mountedRef.current) {
            setUser(userData);
            await SecureStorage.updateUserData(userData);
          }
        } catch (userError) {
          console.warn('Could not refresh user profile');
        }
      }
      
      return !!newToken;
    } catch (error) {
      console.error('Session refresh failed:', error);
      throw error;
    }
  };

  /**
   * Login user with email and password
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const response = await AuthService.login(email, password);
      
      const { token: authToken, user: userData, refreshToken } = response;
      
      if (!authToken || !userData) {
        throw new Error('Invalid response from server');
      }
      
      // Check if user has family
      const hasFamily = !!(
        userData.families?.length > 0 || 
        userData.primary_family_id || 
        userData.family_id
      );
      
      // Store auth data
      await SecureStorage.storeAuthData({
        token: authToken,
        user: userData,
        refreshToken
      });
      
      // Store selected family if available
      if (userData.families?.length > 0) {
        await SecureStorage.setSelectedFamilyId(userData.families[0].family_id);
      } else if (userData.primary_family_id) {
        await SecureStorage.setSelectedFamilyId(userData.primary_family_id);
      } else if (userData.family_id) {
        await SecureStorage.setSelectedFamilyId(userData.family_id);
      }
      
      if (mountedRef.current) {
        setToken(authToken);
        setUser(userData);
      }
      
      // Update axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
      return { 
        success: true, 
        isNewUser: response.isNewUser || false,
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
   */
  const register = async (name, email, password, passkey = null) => {
    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
      
      if (!name || !email || !password) {
        throw new Error('Name, email and password are required');
      }
      
      const response = await AuthService.register(name, email, password, passkey);
      
      if (!response.token || !response.user) {
        throw new Error('Invalid response from server');
      }
      
      const { token: authToken, user: userData } = response;
      
      // Set new registration info
      await SecureStorage.setRegistrationInfo(true);
      
      // Store auth data
      await SecureStorage.storeAuthData({
        token: authToken,
        user: userData,
        refreshToken: response.refreshToken
      });
      
      if (mountedRef.current) {
        setToken(authToken);
        setUser(userData);
      }
      
      // Update axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
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
   * Register with invitation
   */
  const registerWithInvitation = async (name, email, password, token) => {
    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
      
      if (!name || !email || !password || !token) {
        throw new Error('Required fields missing');
      }
      
      const response = await AuthService.registerWithInvitation(name, email, password, token);
      
      if (!response.token || !response.user) {
        throw new Error('Invalid response from server');
      }
      
      // Store auth data
      await SecureStorage.storeAuthData({
        token: response.token,
        user: response.user,
        refreshToken: response.refreshToken
      });
      
      if (mountedRef.current) {
        setToken(response.token);
        setUser(response.user);
      }
      
      // Update axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
      
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
   * Logout user
   */
  const logout = async (callApi = true) => {
    try {
      // Cancel any token refresh
      TokenManager.cleanup();
      
      // Call API logout if requested
      if (callApi && token) {
        try {
          await AuthService.logout();
        } catch (apiError) {
          console.log('Logout API call failed, continuing with local logout');
        }
      }
      
      // Clear all auth data
      await SecureStorage.clearAuthStorage();
      
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
   * Check invitation
   */
  const checkInvitation = async (token) => {
    try {
      if (!token) {
        return { valid: false, error: 'Invalid invitation token' };
      }
      
      return await AuthService.checkInvitation(token);
    } catch (e) {
      return { 
        valid: false, 
        error: e.response?.data?.error || 'Invalid invitation link' 
      };
    }
  };

  /**
   * Update user information
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
      await SecureStorage.updateUserData(updatedUser);
      
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
    forceCleanAuthState: () => logout(false),
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