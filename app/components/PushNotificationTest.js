// app/components/PushNotificationTest.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNotifications } from '../../context/NotificationContext';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { API_URL } from '@env';

// Define API endpoint with fallback
const API_ENDPOINT = API_URL || 'https://famlynook.com';

const PushNotificationTest = () => {
  const { expoPushToken, testPushNotification } = useNotifications();

  const fullPushTest = async () => {
    console.log('====== PUSH NOTIFICATION FULL TEST ======');
    
    try {
      // 1. Check if we're on a physical device
      console.log('Device check:', Device.isDevice ? 'Physical device ✓' : 'Simulator/Emulator ✗');
      
      if (!Device.isDevice) {
        Alert.alert('Device Check', 'Push notifications only work on physical devices, not simulators/emulators');
        return;
      }
      
      // 2. Check permissions
      const { status } = await Notifications.getPermissionsAsync();
      console.log('Permission status:', status);
      
      // 3. Request permissions if needed
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log('New permission status:', newStatus);
        if (newStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Push notifications require permission');
          return;
        }
      }
      
      // 4. Get authentication token
      const authToken = await SecureStore.getItemAsync('auth_token');
      console.log('Auth token available:', !!authToken);
      
      if (!authToken) {
        Alert.alert('Auth Error', 'No authentication token found');
        return;
      }
      
      // 5. Get push token
      console.log('Getting Expo push token...');
      let tokenData;
      
      // Try with projectId if available
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      console.log('Project ID from config:', projectId);
      
      if (projectId) {
        console.log('Getting token with projectId');
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId
        });
      } else {
        console.log('Getting token without projectId');
        tokenData = await Notifications.getExpoPushTokenAsync();
      }
      
      const pushToken = tokenData.data;
      console.log('Push token generated:', pushToken);
      
      // 6. Send to server
      console.log('Sending token to server...');
      try {
        const response = await fetch(`${API_ENDPOINT}/api/notifications/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ token: pushToken })
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Server response:', result);
        
        Alert.alert(
          'Push Token Registration', 
          'Token successfully registered with server!',
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Server registration error:', error);
        Alert.alert('Server Error', `Failed to register with server: ${error.message}`);
      }
      
      console.log('====== TEST COMPLETED ======');
    } catch (error) {
      console.error('====== TEST FAILED ======');
      console.error(error);
      Alert.alert('Test Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={testPushNotification}
      >
        <Text style={styles.buttonText}>Test Push Registration</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.fullTestButton]} 
        onPress={fullPushTest}
      >
        <Text style={styles.buttonText}>Full Push Test</Text>
      </TouchableOpacity>
      
      {expoPushToken ? (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Current Token:</Text>
          <Text style={styles.tokenText}>{expoPushToken.substring(0, 15)}...</Text>
        </View>
      ) : (
        <Text style={styles.noTokenText}>No token registered</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 12,
    margin: 16,
  },
  button: {
    backgroundColor: '#4CC2C4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  fullTestButton: {
    backgroundColor: '#F0C142',
  },
  buttonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 16,
  },
  tokenContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  tokenLabel: {
    color: '#AEAEB2',
    fontSize: 14,
    marginBottom: 4,
  },
  tokenText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  noTokenText: {
    color: '#AEAEB2',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default PushNotificationTest;