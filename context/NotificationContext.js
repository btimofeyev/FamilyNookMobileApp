// Enhanced version of app/context/NotificationContext.js

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getNotifications, markAllAsRead, markAsRead, subscribeToPushNotifications, updateNotificationPreferences } from '../app/api/notificationService';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';

const NotificationContext = createContext({});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notificationPreferences, setNotificationPreferences] = useState({
    like: true,
    comment: true,
    memory: true,
    event: true,
    post: true,
    invitation: true,
    mention: true
  });
  
  const appState = React.useRef(AppState.currentState);
  const notificationListener = React.useRef();
  const responseListener = React.useRef();

  // Function to register for push notifications
  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      console.log('Push Notifications are not available on simulator');
      return;
    }

    try {
      // Request permissions first
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
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'your-project-id';
      const token = await Notifications.getExpoPushTokenAsync({
        projectId
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

  // Configure how notifications appear when app is in foreground
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  
    return () => {};
  }, []);

  // Set up notification listeners when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Set up notification handlers
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
        fetchNotifications();
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response received:', response);
        const url = response.notification.request.content.data?.url;
        if (url) {
          router.push(url);
        }
      });

      // Register for push notifications
      registerForPushNotifications();
      
      // Monitor app state changes to refresh notifications when app comes to foreground
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (
          appState.current.match(/inactive|background/) && 
          nextAppState === 'active'
        ) {
          console.log('App has come to the foreground, refreshing notifications');
          fetchNotifications();
        }
        
        appState.current = nextAppState;
      });

      return () => {
        Notifications.removeNotificationSubscription(notificationListener.current);
        Notifications.removeNotificationSubscription(responseListener.current);
        subscription.remove();
      };
    }
  }, [isAuthenticated]);

  // Fetch notification preferences
  const fetchNotificationPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await getNotificationSettings();
      if (response && response.preferences) {
        setNotificationPreferences(response.preferences);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  }, [isAuthenticated]);

  // Update notification preferences
  const updatePreferences = async (preferences) => {
    try {
      await updateNotificationPreferences(preferences);
      setNotificationPreferences(preferences);
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getNotifications();
      
      // Update notifications array with all notification types
      setNotifications(data.notifications || []);
      
      // Update unread count
      setUnreadCount(data.unread?.length || 0);
      
      // Update badge count for iOS
      await Notifications.setBadgeCountAsync(data.unread?.length || 0);
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
      fetchNotificationPreferences();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications, fetchNotificationPreferences]);

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
      
      // Update badge count for iOS
      if (Platform.OS === 'ios') {
        const newCount = Math.max(0, unreadCount - 1);
        await Notifications.setBadgeCountAsync(newCount);
      }
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
      
      // Reset badge count for iOS
      if (Platform.OS === 'ios') {
        await Notifications.setBadgeCountAsync(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

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
        notificationPreferences,
        updateNotificationPreferences: updatePreferences
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};