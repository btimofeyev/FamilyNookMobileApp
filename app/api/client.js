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

// Request interceptor for adding the token
apiClient.interceptors.request.use(
  async (config) => {
    // Skip adding token for refresh token or login endpoints
    if (config.url === '/api/auth/refresh-token' || 
        config.url === '/api/auth/login' ||
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

// Response interceptor with better error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Skip retry for specific endpoints
    const skipRetryUrls = [
      '/api/auth/login', 
      '/api/auth/register', 
      '/api/auth/refresh-token'
    ];
    
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    
    // Check if error is due to an expired token (status 401)
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !skipRetryUrls.some(url => requestUrl.includes(url)) &&
        !failedRefreshAttempt) {
      
      originalRequest._retry = true;
      
      try {
        // If a refresh is already in progress, wait for that instead of starting a new one
        if (!refreshTokenPromise) {
          refreshTokenPromise = (async () => {
            try {
              console.log('Attempting to refresh token...');
              
              // Use HTTP cookie or try with refresh token from storage
              const refreshToken = await SecureStore.getItemAsync('refresh_token');
              const response = await axios.post(
                `${API_ENDPOINT}/api/auth/refresh-token`, 
                refreshToken ? { refreshToken } : {}, 
                { withCredentials: true }
              );
              
              if (!response.data.token) {
                throw new Error('No token in refresh response');
              }
              
              const { token } = response.data;
              
              // Store the new access token
              await SecureStore.setItemAsync('auth_token', token);
              failedRefreshAttempt = false;
              
              // Notify listeners about successful token refresh
              authEvents.emit({ type: 'token_refreshed', token });
              
              return token;
            } catch (error) {
              console.error('Token refresh failed', error);
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
        
        // Retry the original request with the new token
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh token fails, notify AuthContext to handle logout
        return Promise.reject(error);
      }
    }
    
    // If token refresh already failed before, notify about authentication issue
    if (error.response?.status === 401 && failedRefreshAttempt) {
      authEvents.emit({ type: 'authentication_required' });
    }
    
    return Promise.reject(error);
  }
);

// Reset failed refresh state
export const resetAuthState = () => {
  failedRefreshAttempt = false;
};

export default apiClient;