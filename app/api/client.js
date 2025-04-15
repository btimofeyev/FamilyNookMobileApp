import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';

// Use environment variable with fallback
const API_ENDPOINT = API_URL || 'https://famlynook.com';

// Keep track of refresh token promise to prevent multiple calls
let refreshTokenPromise = null;

// Track retry attempts
let refreshRetryCount = 0;
const MAX_REFRESH_RETRIES = 5;

// Event to notify subscribers about auth state changes
export const authEvents = {
  listeners: new Set(),
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },
  emit(event) {
    this.listeners.forEach(callback => callback(event));
  }
};

const apiClient = axios.create({
  baseURL: API_ENDPOINT,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to add authentication token
apiClient.interceptors.request.use(
  async (config) => {
    // Skip auth for certain endpoints
    if (config.url === '/api/auth/refresh-token' || 
        config.url === '/api/auth/login' ||
        config.url === '/api/auth/register' ||
        config.url.startsWith('/api/invitations/check/')) {
      return config;
    }
    
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request setup error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error(`API Error (${error.config?.url}):`, error.message);
    
    // Skip retry logic for specific endpoints
    const skipRetryUrls = [
      '/api/auth/login', 
      '/api/auth/register', 
      '/api/auth/refresh-token'
    ];
    
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    
    // Handle 401/403 errors that need token refresh
    if ((error.response?.status === 401 || error.response?.status === 403) && 
        !originalRequest._retry && 
        !skipRetryUrls.some(url => requestUrl.includes(url))) {
  
      // Check if this is a new account in setup phase
      const registrationTime = await SecureStore.getItemAsync('registration_time');
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 5 * 60 * 1000; // 5 minutes
      
      // If this is a recent registration, don't attempt refresh
      if (isRecentRegistration) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
          
      try {
        // Only try to refresh if we haven't reached MAX_REFRESH_RETRIES
        if (refreshRetryCount < MAX_REFRESH_RETRIES) {
          refreshRetryCount++;
          
          // If a refresh is already in progress, wait for that instead of starting a new one
          if (!refreshTokenPromise) {
            refreshTokenPromise = (async () => {
              try {
                const refreshToken = await SecureStore.getItemAsync('refresh_token');
                if (!refreshToken) {
                  authEvents.emit({ 
                    type: 'refresh_failed', 
                    error: new Error('No refresh token available'),
                    retryCount: refreshRetryCount
                  });
                  throw new Error('No refresh token available');
                }
                
                // Make direct request to avoid interceptors
                const response = await axios.post(
                  `${API_ENDPOINT}/api/auth/refresh-token`, 
                  { refreshToken }, 
                  { 
                    withCredentials: true,
                    timeout: 15000
                  }
                );
                
                if (!response.data || !response.data.token) {
                  throw new Error('No token in refresh response');
                }
                
                const { token, refreshToken: newRefreshToken } = response.data;
                
                // Store the new access token
                await SecureStore.setItemAsync('auth_token', token);
                
                // Store the new refresh token if provided
                if (newRefreshToken) {
                  await SecureStore.setItemAsync('refresh_token', newRefreshToken);
                }
                
                // Reset failed refresh state
                refreshRetryCount = 0;
                
                // Notify listeners about successful token refresh
                authEvents.emit({ type: 'token_refreshed', token });
                
                return token;
              } catch (error) {
                authEvents.emit({ 
                  type: 'refresh_failed', 
                  error,
                  retryCount: refreshRetryCount
                });
                
                throw error;
              } finally {
                refreshTokenPromise = null;
              }
            })();
          }
          
          try {
            // Wait for the refresh token operation to complete
            const newToken = await refreshTokenPromise;
            
            // Update the failed request with the new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            // Retry the original request with the new token
            return axios(originalRequest);
          } catch (waitError) {
            throw waitError;
          }
        } else {
          authEvents.emit({ 
            type: 'authentication_required',
            retryCount: refreshRetryCount
          });
          throw error;
        }
      } catch (refreshError) {
        authEvents.emit({ 
          type: 'authentication_required',
          retryCount: refreshRetryCount
        });
        return Promise.reject(error);
      }
    }
    
    // Special handling for family membership errors
    if (error.response?.status === 403 && error.response.data?.error?.includes('not a member of this family')) {
      authEvents.emit({ 
        type: 'family_access_denied', 
        error: error.response.data 
      });
    }
    
    return Promise.reject(error);
  }
);

// Reset auth state resets retry count too
export const resetAuthState = () => {
  refreshRetryCount = 0;
};

export default apiClient;