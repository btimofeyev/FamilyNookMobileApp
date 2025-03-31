// context/NotificationContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getNotifications, markAllAsRead, markAsRead, subscribeToPushNotifications, updateNotificationPreferences } from '../app/api/notificationService';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState, Alert } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';

// Define API endpoint with fallback
const API_ENDPOINT = API_URL || 'https://famlynook.com';

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
  
  console.log('NotificationContext rendering, auth state:', isAuthenticated, 'user:', user?.id);
  
  const appState = React.useRef(AppState.currentState);
  const notificationListener = React.useRef();
  const responseListener = React.useRef();
  const registrationAttempted = React.useRef(false);

  // Enhanced version of registerForPushNotifications
  const registerForPushNotifications = async () => {
    console.log('Starting push notification registration...');
    
    if (!Device.isDevice) {
      console.log('Push Notifications are not available on simulator/emulator');
      return;
    }

    if (!isAuthenticated) {
      console.log('User not authenticated, skipping push registration');
      return;
    }

    if (registrationAttempted.current) {
      console.log('Push registration already attempted, skipping');
      return;
    }

    registrationAttempted.current = true;

    try {
      // Request permissions first
      console.log('Checking notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Current permission status:', existingStatus);
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        console.log('Requesting permission...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('New permission status:', finalStatus);
      }

      if (finalStatus !== 'granted') {
        console.log('Permission not granted for push notifications');
        return;
      }

      console.log('Permissions granted, getting push token...');
      
      // Get the token - try different approaches
      let tokenData;
      
      try {
        // First try with projectId if available
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        console.log('Project ID from config:', projectId);
        
        if (projectId) {
          console.log('Getting push token with projectId:', projectId);
          tokenData = await Notifications.getExpoPushTokenAsync({
            projectId
          });
        } else {
          // Fallback to basic token request
          console.log('No projectId found, getting basic push token');
          tokenData = await Notifications.getExpoPushTokenAsync();
        }
      } catch (tokenError) {
        console.error('Error getting token with projectId:', tokenError);
        // Last resort fallback
        console.log('Trying fallback token request');
        tokenData = await Notifications.getExpoPushTokenAsync();
      }
      
      const token = tokenData.data;
      console.log('EXPO PUSH TOKEN GENERATED:', token);
      setExpoPushToken(token);

      // Send token to backend
      if (isAuthenticated && token) {
        console.log('User is authenticated, sending token to server...');
        try {
          // Get auth token from secure storage
          const authToken = await SecureStore.getItemAsync('auth_token');
          console.log('Auth token available:', !!authToken);
          
          if (!authToken) {
            console.error('No auth token available, cannot register push token');
            return;
          }
          
          console.log(`Sending request to ${API_ENDPOINT}/api/notifications/push/subscribe`);
          const response = await fetch(`${API_ENDPOINT}/api/notifications/push/subscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ token })
          });
          
          if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
          }
          
          const result = await response.json();
          console.log('Server response from token registration:', result);
          
          // Alert for debugging purposes - remove in production
          Alert.alert(
            'Push Token Registered', 
            `Token: ${token.substring(0, 12)}...`,
            [{ text: 'OK' }]
          );
        } catch (serverError) {
          console.error('Failed to register token with server:', serverError);
          
          // Alert for debugging - remove in production
          Alert.alert(
            'Push Registration Error', 
            serverError.message,
            [{ text: 'OK' }]
          );
        }
      } else {
        console.log('User not authenticated or no token, skipping server registration');
      }

      // Set up Android channel
      if (Platform.OS === 'android') {
        console.log('Setting up Android notification channel...');
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        console.log('Android notification channel set up');
      }
      
      console.log('Push notification registration completed successfully');
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      
      // Alert for debugging - remove in production
      Alert.alert(
        'Push Setup Error', 
        error.message,
        [{ text: 'OK' }]
      );
    }
  };

  // Configure how notifications appear when app is in foreground
  useEffect(() => {
    console.log('Setting up notification handler');
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
    console.log('NotificationContext useEffect triggered, auth state:', isAuthenticated, 'user ID:', user?.id);

    if (isAuthenticated && user?.id) {
      console.log('Setting up notification listeners for authenticated user');
      
      // Set up notification handlers
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received in foreground:', notification);
        // Refresh notifications when we receive a new one
        fetchNotifications();
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('User tapped on notification:', response);
        const url = response.notification.request.content.data?.url;
        if (url) {
          console.log('Navigating to:', url);
          router.push(url);
        }
      });

      // Register for push notifications
      console.log('Calling registerForPushNotifications...');
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
        console.log('Cleaning up notification listeners');
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
        subscription.remove();
      };
    }
  }, [isAuthenticated, user?.id]);

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

  // Add manual push notification test
  const testPushNotification = async () => {
    console.log('Testing push notification registration...');
    registrationAttempted.current = false; // Reset the flag to force a new attempt
    await registerForPushNotifications();
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
        updateNotificationPreferences: updatePreferences,
        testPushNotification // Add the test function to the context
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};