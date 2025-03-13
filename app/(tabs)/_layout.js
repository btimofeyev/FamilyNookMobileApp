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
          tabBarActiveTintColor: '#3BAFBC', // Teal Glow for active tabs
          tabBarInactiveTintColor: '#8E8E93', // Slate Gray for inactive tabs
          tabBarStyle: {
            backgroundColor: '#121212', // Onyx Black for tab bar
            paddingBottom: Platform.OS === 'ios' ? 28 : 5,
            height: Platform.OS === 'ios' ? 90 : 60,
            borderTopWidth: 1,
            borderTopColor: 'rgba(59, 175, 188, 0.2)', // Subtle Teal Glow border
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
            elevation: 5,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
            fontWeight: '500',
            marginBottom: Platform.OS === 'ios' ? 6 : 0,
            letterSpacing: -0.2, // Apple-style tight letter spacing
          },
          headerStyle: {
            backgroundColor: '#121212', // Onyx Black for header
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(59, 175, 188, 0.2)', // Subtle Teal Glow border
          },
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            color: '#F5F5F7', // Soft White for header title
            fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
            letterSpacing: -0.3, // Apple-style tight letter spacing
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
            headerShown: false,
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
    borderColor: '#121212', // Onyx Black border for notification badge
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  }
});