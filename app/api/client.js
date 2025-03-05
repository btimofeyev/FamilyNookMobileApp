// app/api/client.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Use the direct IP that works for now
const API_ENDPOINT = 'https://167.99.4.123:3001';
console.log('Using fixed API endpoint:', API_ENDPOINT);

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
    console.log(`Request to: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Using auth token:', token.substring(0, 15) + '...');
    } else {
      console.log('No auth token available');
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
    console.log(`Response from ${response.config.url}: ${response.status}`);
    return response;
  },
  async (error) => {
    console.error(`Error response from ${error.config?.url}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Token refresh logic (same as before)
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) {
          return Promise.reject(error);
        }
        
        const response = await axios.post(`${API_ENDPOINT}/api/auth/refresh-token`, {
          refreshToken,
        });
        
        const { token } = response.data;
        await SecureStore.setItemAsync('auth_token', token);
        
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
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