//app/api/client.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';

const API_ENDPOINT = API_URL || 'https://famlynook.com';

let refreshTokenPromise = null;
let refreshRetryCount = 0;
const MAX_REFRESH_RETRIES = 5;

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

apiClient.interceptors.request.use(
  async (config) => {
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
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const skipRetryUrls = [
      '/api/auth/login', 
      '/api/auth/register', 
      '/api/auth/refresh-token'
    ];
    
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    
    if ((error.response?.status === 401 || error.response?.status === 403) && 
        !originalRequest._retry && 
        !skipRetryUrls.some(url => requestUrl.includes(url))) {
  
      const registrationTime = await SecureStore.getItemAsync('registration_time');
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 5 * 60 * 1000;
      
      if (isRecentRegistration) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
          
      try {
        if (refreshRetryCount < MAX_REFRESH_RETRIES) {
          refreshRetryCount++;
          
          if (!refreshTokenPromise) {
            refreshTokenPromise = (async () => {
              try {
                const refreshToken = await SecureStore.getItemAsync('refresh_token');
                if (!refreshToken) {
                  console.log('No refresh token available - user may need to log in again');
                  authEvents.emit({ 
                    type: 'refresh_failed', 
                    error: new Error('No refresh token available'),
                    retryCount: refreshRetryCount
                  });
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
                  throw new Error('No token in refresh response');
                }
                
                const { token, refreshToken: newRefreshToken } = response.data;
                
                await SecureStore.setItemAsync('auth_token', token);
                
                if (newRefreshToken) {
                  await SecureStore.setItemAsync('refresh_token', newRefreshToken);
                }
                
                refreshRetryCount = 0;
                
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
            const newToken = await refreshTokenPromise;
            
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
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
    
    if (error.response?.status === 403 && error.response.data?.error?.includes('not a member of this family')) {
      authEvents.emit({ 
        type: 'family_access_denied', 
        error: error.response.data 
      });
    }
    
    return Promise.reject(error);
  }
);

export const resetAuthState = () => {
  refreshRetryCount = 0;
};

export default apiClient;