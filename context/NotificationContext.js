// context/NotificationContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getNotifications, markAllAsRead, markAsRead, subscribeToPushNotifications, updateNotificationPreferences } from '../app/api/notificationService';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';

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
  
  const appState = React.useRef(AppState.currentState);
  const notificationListener = React.useRef();
  const responseListener = React.useRef();
  const registrationAttempted = React.useRef(false);

  const registerForPushNotifications = async () => {
    if (!Device.isDevice || !isAuthenticated || registrationAttempted.current) {
      return;
    }

    registrationAttempted.current = true;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return;
      }
      
      let tokenData;
      
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        
        if (projectId) {
          tokenData = await Notifications.getExpoPushTokenAsync({
            projectId
          });
        } else {
          tokenData = await Notifications.getExpoPushTokenAsync();
        }
      } catch (tokenError) {
        tokenData = await Notifications.getExpoPushTokenAsync();
      }
      
      const token = tokenData.data;
      setExpoPushToken(token);

      if (isAuthenticated && token) {
        try {
          const authToken = await SecureStore.getItemAsync('auth_token');
          
          if (!authToken) {
            return;
          }
          
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
          
          await response.json();
        } catch (serverError) {
          // Continue even if token registration fails
        }
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      // Continue even if push notification registration fails
    }
  };

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

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      notificationListener.current = Notifications.addNotificationReceivedListener(() => {
        fetchNotifications();
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const url = response.notification.request.content.data?.url;
        if (url) {
          router.push(url);
        }
      });

      registerForPushNotifications();
      
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (
          appState.current.match(/inactive|background/) && 
          nextAppState === 'active'
        ) {
          fetchNotifications();
        }
        
        appState.current = nextAppState;
      });

      return () => {
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

  const fetchNotificationPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await getNotificationSettings();
      if (response && response.preferences) {
        setNotificationPreferences(response.preferences);
      }
    } catch (error) {
      // Use default preferences on error
    }
  }, [isAuthenticated]);

  const updatePreferences = async (preferences) => {
    try {
      await updateNotificationPreferences(preferences);
      setNotificationPreferences(preferences);
      return true;
    } catch (error) {
      return false;
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getNotifications();
      
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread?.length || 0);
      await Notifications.setBadgeCountAsync(data.unread?.length || 0);
    } catch (error) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchNotificationPreferences();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications, fetchNotificationPreferences]);

  const markNotificationAsRead = async (notificationId) => {
    if (!notificationId) {
      return;
    }
    
    try {
      await markAsRead(notificationId);
      
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (Platform.OS === 'ios') {
        const newCount = Math.max(0, unreadCount - 1);
        await Notifications.setBadgeCountAsync(newCount);
      }
    } catch (error) {
      // Continue if marking as read fails
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await markAllAsRead();
      
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      setUnreadCount(0);
      
      if (Platform.OS === 'ios') {
        await Notifications.setBadgeCountAsync(0);
      }
    } catch (error) {
      // Continue if marking all as read fails
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
        updateNotificationPreferences: updatePreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};