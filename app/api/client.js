// app/api/client.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

//const API_URL = 'http://192.168.100.96:3001';
const API_URL = 'http://167.99.4.123:3001';
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for adding the token
apiClient.interceptors.request.use(
  async (config) => {
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

// Response interceptor for handling token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is due to an expired token (status 401) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh the token
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) {
          // No refresh token available, redirect to login
          return Promise.reject(error);
        }
        
        const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
          refreshToken,
        });
        
        const { token } = response.data;
        await SecureStore.setItemAsync('auth_token', token);
        
        // Update the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user');
        
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;