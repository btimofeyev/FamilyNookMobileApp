// context/NotificationContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getNotifications, markAllAsRead, markAsRead, subscribeToPushNotifications } from '../app/api/notificationService';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

const NotificationContext = createContext({});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState('');

  // Function to register for push notifications
  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      console.log('Push Notifications are not available on simulator');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token: permission not granted!');
        return;
      }

      // Get the token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID || 'your-project-id',
      });
      
      setExpoPushToken(token.data);

      // Send token to backend
      if (isAuthenticated && token.data) {
        try {
          await subscribeToPushNotifications(token.data);
          console.log('Successfully subscribed to push notifications');
        } catch (error) {
          console.error('Error subscribing to push notifications:', error);
        }
      }

      // Required for Android
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  // Set up notification handling
  useEffect(() => {
    // Configure how notifications appear when the app is in the foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (isAuthenticated) {
      // Set up notification handlers
      const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received!', notification);
        // Refresh notifications when a new one is received
        fetchNotifications();
      });

      const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response received!', response);
        // Handle notification tap/click here
        // You might want to navigate to a specific screen based on the notification
      });

      // Register for push notifications
      registerForPushNotifications();

      return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
      };
    }
  }, [isAuthenticated]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getNotifications();
      
      // Ensure data has the expected structure with all notification types
      // (likes, comments, memories, events, etc.)
      console.log('Notification data:', data);
      
      // Update notifications array with all notification types
      setNotifications(data.notifications || []);
      
      // Update unread count
      setUnreadCount(data.unread?.length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch notifications when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications]);

  // Mark a notification as read
  const markNotificationAsRead = async (notificationId) => {
    if (!notificationId) {
      console.error('No notification ID provided');
      return;
    }
    
    try {
      await markAsRead(notificationId);
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await markAllAsRead();
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Check for new notifications periodically (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [isAuthenticated, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        expoPushToken,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};