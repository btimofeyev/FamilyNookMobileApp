// app/notification-settings.js (root level)

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';
import { BlurView } from 'expo-blur';

export default function NotificationSettingsScreen() {
  const { notificationPreferences, updateNotificationPreferences } = useNotifications();
  const [preferences, setPreferences] = useState(notificationPreferences);
  const [loading, setLoading] = useState(false);
  const [saveEnabled, setSaveEnabled] = useState(false);
  
  // Initialize preferences with context values
  useEffect(() => {
    setPreferences(notificationPreferences);
  }, [notificationPreferences]);
  
  // Compare preferences to determine if save should be enabled
  useEffect(() => {
    const isDifferent = Object.keys(preferences).some(
      key => preferences[key] !== notificationPreferences[key]
    );
    setSaveEnabled(isDifferent);
  }, [preferences, notificationPreferences]);
  
  const handleToggle = (type) => {
    setPreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  const handleSave = async () => {
    setLoading(true);
    try {
      const success = await updateNotificationPreferences(preferences);
      if (success) {
        Alert.alert('Success', 'Notification preferences updated successfully.');
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      Alert.alert('Error', 'Failed to update notification preferences. Please try again.');
      // Reset to original values
      setPreferences(notificationPreferences);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Notification Settings',
          headerStyle: {
            backgroundColor: '#1E2B2F',
          },
          headerTintColor: '#F5F5F7',
          headerShown: true,
        }}
      />
      
      <ScrollView style={styles.scrollView}>
        <BlurView intensity={20} tint="dark" style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <Text style={styles.sectionDescription}>
            Control which notifications you receive from FamlyNook.
          </Text>
          
          <View style={styles.toggleContainer}>
            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Ionicons name="heart" size={22} color="#FF453A" style={styles.icon} />
                <Text style={styles.toggleLabel}>Likes</Text>
              </View>
              <Switch
                value={preferences.like}
                onValueChange={() => handleToggle('like')}
                trackColor={{ false: "#3A3A3C", true: "#4CC2C4" }}
                thumbColor={Platform.OS === 'ios' ? '' : preferences.like ? "#FFFFFF" : "#F4F3F4"}
                ios_backgroundColor="#3A3A3C"
              />
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Ionicons name="chatbubble" size={22} color="#4CC2C4" style={styles.icon} />
                <Text style={styles.toggleLabel}>Comments</Text>
              </View>
              <Switch
                value={preferences.comment}
                onValueChange={() => handleToggle('comment')}
                trackColor={{ false: "#3A3A3C", true: "#4CC2C4" }}
                thumbColor={Platform.OS === 'ios' ? '' : preferences.comment ? "#FFFFFF" : "#F4F3F4"}
                ios_backgroundColor="#3A3A3C"
              />
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Ionicons name="images" size={22} color="#32D74B" style={styles.icon} />
                <Text style={styles.toggleLabel}>Memories</Text>
              </View>
              <Switch
                value={preferences.memory}
                onValueChange={() => handleToggle('memory')}
                trackColor={{ false: "#3A3A3C", true: "#4CC2C4" }}
                thumbColor={Platform.OS === 'ios' ? '' : preferences.memory ? "#FFFFFF" : "#F4F3F4"}
                ios_backgroundColor="#3A3A3C"
              />
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Ionicons name="calendar" size={22} color="#F0C142" style={styles.icon} />
                <Text style={styles.toggleLabel}>Events</Text>
              </View>
              <Switch
                value={preferences.event}
                onValueChange={() => handleToggle('event')}
                trackColor={{ false: "#3A3A3C", true: "#4CC2C4" }}
                thumbColor={Platform.OS === 'ios' ? '' : preferences.event ? "#FFFFFF" : "#F4F3F4"}
                ios_backgroundColor="#3A3A3C"
              />
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Ionicons name="create" size={22} color="#5E5CE6" style={styles.icon} />
                <Text style={styles.toggleLabel}>New Posts</Text>
              </View>
              <Switch
                value={preferences.post}
                onValueChange={() => handleToggle('post')}
                trackColor={{ false: "#3A3A3C", true: "#4CC2C4" }}
                thumbColor={Platform.OS === 'ios' ? '' : preferences.post ? "#FFFFFF" : "#F4F3F4"}
                ios_backgroundColor="#3A3A3C"
              />
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Ionicons name="mail" size={22} color="#64D2FF" style={styles.icon} />
                <Text style={styles.toggleLabel}>Invitations</Text>
              </View>
              <Switch
                value={preferences.invitation}
                onValueChange={() => handleToggle('invitation')}
                trackColor={{ false: "#3A3A3C", true: "#4CC2C4" }}
                thumbColor={Platform.OS === 'ios' ? '' : preferences.invitation ? "#FFFFFF" : "#F4F3F4"}
                ios_backgroundColor="#3A3A3C"
              />
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <Ionicons name="at" size={22} color="#FF9F0A" style={styles.icon} />
                <Text style={styles.toggleLabel}>Mentions</Text>
              </View>
              <Switch
                value={preferences.mention}
                onValueChange={() => handleToggle('mention')}
                trackColor={{ false: "#3A3A3C", true: "#4CC2C4" }}
                thumbColor={Platform.OS === 'ios' ? '' : preferences.mention ? "#FFFFFF" : "#F4F3F4"}
                ios_backgroundColor="#3A3A3C"
              />
            </View>
          </View>
        </BlurView>
        
        <TouchableOpacity 
          style={[
            styles.saveButton, 
            !saveEnabled && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={loading || !saveEnabled}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  toggleContainer: {
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(60, 60, 67, 0.3)',
    marginLeft: 50,
  },
  saveButton: {
    backgroundColor: '#4CC2C4',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(76, 194, 196, 0.5)',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});