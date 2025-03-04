import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNotifications } from '../../context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function NotificationsScreen() {
  const { notifications, fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead, loading } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      return () => {};
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification) => {
    // Mark notification as read and provide haptic feedback
    await markNotificationAsRead(notification.id);
    Haptics.selectionAsync();

    // Close modal first
    router.back();
    
    // Small delay to ensure modal is closed before navigation
    setTimeout(() => {
      // Navigate to the appropriate content based on notification type
      if (notification.type === 'like' || notification.type === 'comment') {
        if (notification.post_id) {
          // Navigate to the feed screen with a parameter to scroll to the specific post
          router.push({
            pathname: '/(tabs)/feed',
            params: { 
              highlightPostId: notification.post_id,
              timestamp: Date.now() // Include timestamp to force refresh
            }
          });
        }
      } else if (notification.type === 'memory' && notification.memory_id) {
        router.push({
          pathname: '/(tabs)/memories/[id]',
          params: { id: notification.memory_id }
        });
      } else if (notification.type === 'event') {
        router.push('/(tabs)/calendar');
      }
    }, 100);
  };

  const handleCloseModal = () => {
    router.back();
  };

  const renderNotificationItem = ({ item }) => (
    <BlurView intensity={10} tint="dark" style={[
      styles.notificationItem,
      !item.read && styles.unreadNotification
    ]}>
      <TouchableOpacity 
        style={styles.notificationTouchable}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.notificationIcon,
          getIconBackground(item.type)
        ]}>
          <Ionicons 
            name={getNotificationIcon(item.type)} 
            size={22} 
            color="#FFFFFF" 
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>{item.content || item.formatted_content}</Text>
          <Text style={styles.notificationTime}>
            {formatTimestamp(item.created_at)}
          </Text>
        </View>
        
        <View style={styles.notificationAction}>
          {!item.read && <View style={styles.unreadDot} />}
          {(item.type === 'like' || item.type === 'comment' || item.type === 'memory') && (
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          )}
        </View>
      </TouchableOpacity>
    </BlurView>
  );

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return 'heart';
      case 'comment':
        return 'chatbubble';
      case 'mention':
        return 'at';
      case 'memory':
        return 'images';
      case 'event':
        return 'calendar';
      default:
        return 'notifications';
    }
  };

  const getIconBackground = (type) => {
    switch (type) {
      case 'like':
        return styles.iconLike;
      case 'comment':
        return styles.iconComment;
      case 'memory':
        return styles.iconMemory;
      case 'event':
        return styles.iconEvent;
      default:
        return styles.iconDefault;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const notificationDate = new Date(timestamp);
    
    // Check if it's today
    if (notificationDate.toDateString() === now.toDateString()) {
      // Format as hours and minutes
      const hours = notificationDate.getHours();
      const minutes = notificationDate.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12; // Convert to 12-hour format
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      return `Today at ${formattedHours}:${formattedMinutes} ${ampm}`;
    }
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (notificationDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show date
    const options = { month: 'short', day: 'numeric' };
    
    // If it's a different year, include the year
    if (notificationDate.getFullYear() !== now.getFullYear()) {
      options.year = 'numeric';
    }
    
    return notificationDate.toLocaleDateString(undefined, options);
  };

  const renderSectionHeader = () => (
    <Text style={styles.sectionHeader}>Recent</Text>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modalHeader}>
        <TouchableOpacity 
          onPress={handleCloseModal} 
          style={styles.closeButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close" size={24} color="#8E8E93" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#F0C142" />
        </View>
      ) : notifications && notifications.length > 0 ? (
        <>
          <TouchableOpacity 
            style={styles.markAllReadButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              markAllNotificationsAsRead();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllReadText}>Mark all as read</Text>
          </TouchableOpacity>

          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#F0C142']}
                tintColor="#F0C142"
              />
            }
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderSectionHeader}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons 
              name="notifications" 
              size={48} 
              color="#F0C142" 
            />
          </View>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubText}>
            When you receive notifications, they'll appear here
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 60, 67, 0.3)',
    backgroundColor: '#1C1C1E',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  closeButton: {
    padding: 4,
  },
  headerRight: {
    width: 32, // Balance the header
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 10,
    marginLeft: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  listContent: {
    paddingBottom: 24,
  },
  notificationItem: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback
  },
  notificationTouchable: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  unreadNotification: {
    backgroundColor: 'rgba(44, 44, 46, 0.9)', // Slightly darker for unread
  },
  notificationIcon: {
    marginRight: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLike: {
    backgroundColor: '#FF453A', // Apple's red
  },
  iconComment: {
    backgroundColor: '#4CC2C4', // Teal from logo
  },
  iconMemory: {
    backgroundColor: '#32D74B', // Apple's green
  },
  iconEvent: {
    backgroundColor: '#F0C142', // Gold from logo
  },
  iconDefault: {
    backgroundColor: '#64D2FF', // Apple's blue
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CC2C4', // Teal from logo
    marginRight: 8,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  notificationTime: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  notificationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(240, 193, 66, 0.2)', // Transparent gold
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  emptySubText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    maxWidth: '80%',
  },
  markAllReadButton: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 60, 67, 0.3)',
    backgroundColor: '#1C1C1E',
  },
  markAllReadText: {
    color: '#4CC2C4', // Teal color from logo
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  separator: {
    height: 1,
    marginLeft: 62, // Aligns with the end of the icon
    backgroundColor: 'rgba(60, 60, 67, 0.15)',
  },
});