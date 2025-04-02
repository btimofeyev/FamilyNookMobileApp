// context/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
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
  
  const isRefreshing = useRef(false);
  const lastAuthCheck = useRef(Date.now());
  
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
              "Session Issue",
              "We're having trouble maintaining your session. You'll stay logged in, but some features may be limited.",
              [{ text: "OK" }]
            );
          }
          break;
          
        case 'authentication_required':
          if (!isRefreshing.current) {
            isRefreshing.current = true;
            refreshUserSession()
              .catch(error => {
                console.log('Failed to refresh session, but keeping user logged in:', error.message);
              })
              .finally(() => {
                isRefreshing.current = false;
              });
          }
          break;
      }
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        
        if (storedToken) {
          const refreshToken = await SecureStore.getItemAsync('refresh_token');
          
          const tempHeaders = axios.defaults.headers.common['Authorization'];
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          try {
            await apiClient.get('/api/dashboard/profile', { timeout: 5000 });
            
            setToken(storedToken);
            
            const storedUser = await SecureStore.getItemAsync('user');
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
          } catch (validationError) {
            if (refreshToken) {
              try {
                const response = await axios.post(
                  `${API_ENDPOINT}/api/auth/refresh-token`,
                  { refreshToken },
                  { timeout: 15000 }
                );
                
                if (response.data.token) {
                  const newToken = response.data.token;
                  await SecureStore.setItemAsync('auth_token', newToken);
                  
                  if (response.data.refreshToken) {
                    await SecureStore.setItemAsync('refresh_token', response.data.refreshToken);
                  }
                  
                  setToken(newToken);
                  axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                  
                  try {
                    const userResponse = await apiClient.get('/api/dashboard/profile');
                    if (userResponse.data) {
                      setUser(userResponse.data);
                      await SecureStore.setItemAsync('user', JSON.stringify(userResponse.data));
                    }
                  } catch (userError) {
                    const storedUser = await SecureStore.getItemAsync('user');
                    if (storedUser) {
                      setUser(JSON.parse(storedUser));
                    }
                  }
                } else {
                  setToken(storedToken);
                  
                  const storedUser = await SecureStore.getItemAsync('user');
                  if (storedUser) {
                    setUser(JSON.parse(storedUser));
                  }
                }
              } catch (refreshError) {
                setToken(storedToken);
                
                const storedUser = await SecureStore.getItemAsync('user');
                if (storedUser) {
                  setUser(JSON.parse(storedUser));
                }
                
                if (tempHeaders) {
                  axios.defaults.headers.common['Authorization'] = tempHeaders;
                } else {
                  delete axios.defaults.headers.common['Authorization'];
                }
              }
            } else {
              setToken(storedToken);
              
              const storedUser = await SecureStore.getItemAsync('user');
              if (storedUser) {
                setUser(JSON.parse(storedUser));
              }
              
              if (tempHeaders) {
                axios.defaults.headers.common['Authorization'] = tempHeaders;
              } else {
                delete axios.defaults.headers.common['Authorization'];
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to load auth state:', e);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
        lastAuthCheck.current = Date.now();
      }
    };
    
    loadAuthState();
  }, []);

  useEffect(() => {
    if (!token) return;
    
    const tokenRefreshInterval = 8 * 60 * 60 * 1000; // 8 hours
    
    const refreshIfNeeded = async () => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastAuthCheck.current;
      
      if (timeSinceLastCheck > tokenRefreshInterval && !isRefreshing.current) {
        isRefreshing.current = true;
        try {
          await refreshUserSession();
        } catch (error) {
          console.error('Proactive token refresh failed:', error.message);
        } finally {
          isRefreshing.current = false;
        }
      }
    };

    const initialTimer = setTimeout(refreshIfNeeded, 30000);
    const intervalId = setInterval(refreshIfNeeded, 2 * 60 * 60 * 1000); 
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [token]);

  const refreshUserSession = async () => {
    if (isRefreshing.current) return;
    
    isRefreshing.current = true;
    try {
      const registrationTime = await SecureStore.getItemAsync('registration_time');
      const isNewAccount = await SecureStore.getItemAsync('is_new_account');
      
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 5 * 60 * 1000;
      
      if (isNewAccount === 'true' && isRecentRegistration) {
        return true;
      }
      
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
  
      const response = await axios.post(
        `${API_ENDPOINT}/api/auth/refresh-token`,
        { refreshToken },
        { 
          withCredentials: true,
          timeout: 15000
        }
      );
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid refresh response');
      }
      
      const { token: newToken, refreshToken: newRefreshToken } = response.data;
      
      await SecureStore.setItemAsync('auth_token', newToken);
      
      if (newRefreshToken) {
        await SecureStore.setItemAsync('refresh_token', newRefreshToken);
      }
      
      setToken(newToken);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      try {
        const userResponse = await apiClient.get('/api/dashboard/profile');
        if (userResponse.data) {
          setUser(userResponse.data);
          await SecureStore.setItemAsync('user', JSON.stringify(userResponse.data));
        }
      } catch (userError) {
        console.warn('Could not refresh user profile, but continuing with token refresh');
      }
      
      lastAuthCheck.current = Date.now();
      resetAuthState();
      
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error.message);
      throw error;
    } finally {
      isRefreshing.current = false;
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(`${API_ENDPOINT}/api/auth/login`, {
        email,
        password
      });
      
      const { token: authToken, user: userData, refreshToken } = response.data;
      
      const hasFamily = userData.families && userData.families.length > 0 || 
                        userData.primary_family_id || 
                        userData.family_id;
      
      await SecureStore.setItemAsync('auth_token', authToken);
      if (refreshToken) {
        await SecureStore.setItemAsync('refresh_token', refreshToken);
      }
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
      if (userData.families && userData.families.length > 0) {
        await SecureStore.setItemAsync('selected_family_id', userData.families[0].family_id.toString());
      } else if (userData.primary_family_id) {
        await SecureStore.setItemAsync('selected_family_id', userData.primary_family_id.toString());
      } else if (userData.family_id) {
        await SecureStore.setItemAsync('selected_family_id', userData.family_id.toString());
      }
      
      setToken(authToken);
      setUser(userData);
      resetAuthState();
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
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
      await SecureStore.setItemAsync('registration_time', now.toString());
      await SecureStore.setItemAsync('is_new_account', 'true');
      
      await SecureStore.setItemAsync('auth_token', authToken);
      
      if (response.data.refreshToken) {
        await SecureStore.setItemAsync('refresh_token', response.data.refreshToken);
      }
      
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
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
      
      await SecureStore.setItemAsync('auth_token', authToken);
      if (refreshToken) {
        await SecureStore.setItemAsync('refresh_token', refreshToken);
      }
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
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
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user');
        await SecureStore.deleteItemAsync('selected_family_id');
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
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('selected_family_id');
      
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