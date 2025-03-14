// app/api/client.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';

// Use environment variable with fallback
const API_ENDPOINT = API_URL || 'https://famlynook.com';
console.log('Using API endpoint:', API_ENDPOINT);

// Keep track of refresh token promise to prevent multiple calls
let refreshTokenPromise = null;
// Track failed refresh attempts to avoid infinite refresh loops
let failedRefreshAttempt = false;

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

// Add request logging middleware
apiClient.interceptors.request.use(
  async (config) => {
    // Skip auth for certain endpoints
    if (config.url === '/api/auth/refresh-token' || 
        config.url === '/api/auth/login' ||
        config.url === '/api/auth/register' ||
        config.url.startsWith('/api/invitations/check/')) {
      console.log(`API Request: ${config.method} ${config.url} (no auth)`);
      return config;
    }
    
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`API Request: ${config.method} ${config.url} (with auth)`);
    } else {
      console.log(`API Request: ${config.method} ${config.url} (no token available)`);
    }
    return config;
  },
  (error) => {
    console.error('Request setup error:', error.message);
    return Promise.reject(error);
  }
);

// Add response logging middleware
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} from ${response.config.url}`);
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
        !skipRetryUrls.some(url => requestUrl.includes(url)) &&
        !failedRefreshAttempt) {
      
      console.log(`Auth error (${error.response?.status}) detected, attempting refresh...`);
      originalRequest._retry = true;
      
      try {
        // If a refresh is already in progress, wait for that instead of starting a new one
        if (!refreshTokenPromise) {
          refreshTokenPromise = (async () => {
            try {
              // Get refresh token
              const refreshToken = await SecureStore.getItemAsync('refresh_token');
              if (!refreshToken) {
                console.error('No refresh token available for refresh');
                failedRefreshAttempt = true;
                authEvents.emit({ type: 'refresh_failed', error: new Error('No refresh token available') });
                throw new Error('No refresh token available');
              }
              
              console.log('Attempting to refresh token using refresh token...');
              
              // Make direct request to avoid interceptors
              const response = await axios.post(
                `${API_ENDPOINT}/api/auth/refresh-token`, 
                { refreshToken }, 
                { 
                  withCredentials: true,
                  timeout: 10000  // 10 seconds timeout for token refresh
                }
              );
              
              if (!response.data || !response.data.token) {
                console.error('Invalid refresh response - no token');
                throw new Error('No token in refresh response');
              }
              
              const { token, refreshToken: newRefreshToken } = response.data;
              console.log('Token refreshed successfully');
              
              // Store the new access token
              await SecureStore.setItemAsync('auth_token', token);
              
              // Store the new refresh token if provided
              if (newRefreshToken) {
                console.log('New refresh token received, storing it');
                await SecureStore.setItemAsync('refresh_token', newRefreshToken);
              } else {
                console.log('No new refresh token provided, keeping existing one');
              }
              
              failedRefreshAttempt = false;
              
              // Notify listeners about successful token refresh
              authEvents.emit({ type: 'token_refreshed', token });
              
              return token;
            } catch (error) {
              console.error('Token refresh request failed:', error.message);
              failedRefreshAttempt = true;
              
              // Notify listeners about failed token refresh
              authEvents.emit({ type: 'refresh_failed', error });
              
              throw error;
            } finally {
              refreshTokenPromise = null;
            }
          })();
        }
        
        // Wait for the refresh token operation to complete
        const newToken = await refreshTokenPromise;
        
        // Update the failed request with the new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        console.log('Retrying request with new token');
        
        // Retry the original request with the new token
        return axios(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed completely:', refreshError.message);
        // Notify AuthContext about authentication issue
        authEvents.emit({ type: 'authentication_required' });
        return Promise.reject(error);
      }
    }
    
    // If token refresh already failed before, notify about authentication issue
    if ((error.response?.status === 401 || error.response?.status === 403) && failedRefreshAttempt) {
      console.log('Authentication issue after failed refresh, notifying auth system');
      authEvents.emit({ type: 'authentication_required' });
    }
    
    if (error.response?.status === 403 && error.response.data?.error?.includes('not a member of this family')) {
      // Special handling for family membership errors
      console.log('User is not a member of the specified family, notifying system');
      authEvents.emit({ type: 'family_access_denied', error: error.response.data });
    }
    
    return Promise.reject(error);
  }
);

// Reset failed refresh state
export const resetAuthState = () => {
  failedRefreshAttempt = false;
};

export default apiClient;