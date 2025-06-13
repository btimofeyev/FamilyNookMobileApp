// app/api/notificationService.js
import apiClient from './client';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';

// Define API endpoint with fallback
const API_ENDPOINT = API_URL || 'https://famlynook.com';

// Fetch all notifications for the current user
export const getNotifications = async () => {
  try {
    const response = await apiClient.get('/api/notifications');
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Mark a specific notification as read
export const markAsRead = async (notificationId) => {
  try {
    const response = await apiClient.post(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const getNotificationSettings = async () => {
  try {
    const response = await apiClient.get('/api/notifications/preferences');
    return response.data;
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    // Return default preferences if there's an error
    return {
      preferences: {
        like: true,
        comment: true,
        memory: true,
        event: true,
        post: true,
        invitation: true,
        mention: true
      }
    };
  }
};

export const updateNotificationPreferences = async (preferences) => {
  try {
    const response = await apiClient.put('/api/notifications/preferences', preferences);
    return response.data;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
};

export const markAllAsRead = async () => {
  try {
    const response = await apiClient.post('/api/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Update this function to properly send the Expo push token with direct fetch
export const subscribeToPushNotifications = async (pushToken) => {
  try {
    if (!pushToken) {
      console.error('No push token provided');
      return { success: false, error: 'No push token provided' };
    }
    
    console.log('Subscribing push token to server:', pushToken);
    
    // Get auth token
    const authToken = await SecureStore.getItemAsync('auth_token');
    if (!authToken) {
      console.error('No auth token found for push registration');
      return { success: false, error: 'Not authenticated' };
    }
    
    // Using direct fetch for maximum debug visibility
    const response = await fetch(`${API_ENDPOINT}/api/notifications/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` 
      },
      body: JSON.stringify({ token: pushToken })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server error (${response.status}):`, errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Push token registration response:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return { success: false, error: error.message };
  }
};

const NotificationServiceComponent = () => null;
export default NotificationServiceComponent;