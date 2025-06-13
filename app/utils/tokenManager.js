// app/utils/tokenManager.js
import axios from 'axios';
import SecureStorage, { STORAGE_KEYS } from './secureStorage';
import AuthService from '../api/authService';
import { authEvents, resetAuthState } from '../api/client';

// Token refresh interval (8 hours)
const TOKEN_REFRESH_INTERVAL = 8 * 60 * 60 * 1000;

class TokenManager {
  constructor() {
    this.refreshTokenPromise = null;
    this.lastAuthCheck = Date.now();
    this.refreshTokenTimeoutId = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    
    // Clean up any existing timeouts
    if (this.refreshTokenTimeoutId) {
      clearTimeout(this.refreshTokenTimeoutId);
      this.refreshTokenTimeoutId = null;
    }
  }

  cleanup() {
    if (this.refreshTokenTimeoutId) {
      clearTimeout(this.refreshTokenTimeoutId);
      this.refreshTokenTimeoutId = null;
    }
    
    this.refreshTokenPromise = null;
    this.isInitialized = false;
  }

  scheduleTokenRefresh(token) {
    // Clean up existing timeout
    if (this.refreshTokenTimeoutId) {
      clearTimeout(this.refreshTokenTimeoutId);
    }
    
    // Calculate time until next refresh
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastAuthCheck;
    const timeUntilNextRefresh = Math.max(
      TOKEN_REFRESH_INTERVAL - timeSinceLastCheck,
      60000 // Minimum 1 minute
    );
    
    console.log(`Scheduling token refresh in ${Math.round(timeUntilNextRefresh / 60000)} minutes`);
    
    this.refreshTokenTimeoutId = setTimeout(async () => {
      try {
        await this.refreshToken();
        // Schedule next refresh
        this.scheduleTokenRefresh(token);
      } catch (error) {
        console.error('Scheduled token refresh failed:', error);
        // Try again in 30 minutes
        this.refreshTokenTimeoutId = setTimeout(
          () => this.scheduleTokenRefresh(token), 
          30 * 60 * 1000
        );
      }
    }, timeUntilNextRefresh);
  }

  async refreshToken() {
    // If a refresh is already in progress, return that promise
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }
    
    // Create a new refresh promise
    this.refreshTokenPromise = (async () => {
      try {
        // Check if this is a new account (special case)
        const isNewAccount = await SecureStorage.isNewAccount();
        const isRecentRegistration = await SecureStorage.isRecentRegistration();
        
        if (isNewAccount && isRecentRegistration) {
          return true;
        }
        
        // Get refresh token
        const refreshToken = await SecureStorage.getRefreshToken();
        
        if (!refreshToken) {
          console.log('TokenManager: No refresh token available - user may need to log in again');
          throw new Error('No refresh token available');
        }
        
        // Request new tokens
        const response = await AuthService.refreshToken(refreshToken);
        
        if (!response || !response.token) {
          throw new Error('Invalid refresh response');
        }
        
        const { token: newToken, refreshToken: newRefreshToken } = response;
        
        // Update storage
        await SecureStorage.storeAuthData({ 
          token: newToken, 
          refreshToken: newRefreshToken,
          user: await SecureStorage.getUserData()
        });
        
        // Update axios defaults
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        // Update last auth check time
        this.lastAuthCheck = Date.now();
        
        // Reset API client auth state
        resetAuthState();
        
        // Notify token refreshed
        authEvents.emit({ type: 'token_refreshed', token: newToken });
        
        return newToken;
      } catch (error) {
        console.error('Token refresh failed:', error);
        
        // Notify refresh failed
        authEvents.emit({ 
          type: 'refresh_failed', 
          error,
          retryCount: 1
        });
        
        throw error;
      } finally {
        // Always clear the promise reference
        this.refreshTokenPromise = null;
      }
    })();
    
    return this.refreshTokenPromise;
  }

  async verifyToken(token) {
    if (!token) return false;
    
    try {
      // Update authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Perform a validation request
      await axios.get('/api/dashboard/profile', { timeout: 5000 });
      
      // Token is valid, update lastAuthCheck
      this.lastAuthCheck = Date.now();
      return true;
    } catch (error) {
      // Token validation failed, try to refresh
      try {
        const newToken = await this.refreshToken();
        return !!newToken;
      } catch (refreshError) {
        return false;
      }
    }
  }
}

export default new TokenManager();