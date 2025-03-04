// app/(tabs)/_layout.js
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useNotifications } from '../../context/NotificationContext';
import { BlurView } from 'expo-blur';


export default function TabsLayout() {
  const { unreadCount } = useNotifications();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#F0C142', // Golden color from logo
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            backgroundColor: '#1C1C1E',
            paddingBottom: Platform.OS === 'ios' ? 28 : 5,
            height: Platform.OS === 'ios' ? 90 : 60,
            borderTopWidth: 1,
            borderTopColor: '#38383A',
            // Removed position: 'absolute' to prevent overlapping
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
            fontWeight: '500',
            marginBottom: Platform.OS === 'ios' ? 6 : 0,
          },
          headerStyle: {
            backgroundColor: '#1C1C1E',
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            color: '#FFFFFF',
            fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
          },
          headerShadowVisible: false,
          headerTransparent: false,
          headerBlurEffect: 'dark',
        }}
        tabBarPosition="bottom"
      >
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Family Feed',
            tabBarLabel: 'Feed',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons 
                  name={focused ? "home" : "home-outline"} 
                  size={size} 
                  color={color} 
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="memories"
          options={{
            title: 'Memories',
            tabBarLabel: 'Memories',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons 
                  name={focused ? "images" : "images-outline"} 
                  size={size} 
                  color={color} 
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons 
                  name={focused ? "person" : "person-outline"} 
                  size={size} 
                  color={color} 
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            tabBarLabel: 'Updates',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={styles.notificationIconContainer}>
                <Ionicons 
                  name={focused ? "notifications" : "notifications-outline"} 
                  size={size} 
                  color={color} 
                />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  notificationIconContainer: {
    position: 'relative',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#FF453A', // iOS red color for dark mode
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  }
});