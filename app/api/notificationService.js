// app/api/notificationService.js
import apiClient from './client';

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

// Mark all notifications as read
export const markAllAsRead = async () => {
  try {
    const response = await apiClient.post('/api/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (pushToken) => {
  try {
    const subscription = {
      endpoint: pushToken,
      keys: {
        p256dh: 'placeholder-for-expo-push', // Expo Push doesn't require these typical web push keys
        auth: 'placeholder-for-expo-push'     // but your backend might expect this structure
      }
    };
    
    const response = await apiClient.post('/api/notifications/push/subscribe', subscription);
    return response.data;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};