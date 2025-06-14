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
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function NotificationsScreen() {
  const { notifications, fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead, loading } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const topInset = useSafeAreaInsets().top;

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
    <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={[
      styles.notificationItem,
      !item.read && styles.unreadNotification
    ]}>
      <LinearGradient
        colors={!item.read 
          ? ['rgba(125, 211, 252, 0.15)', 'rgba(125, 211, 252, 0.05)']
          : ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)']
        }
        style={styles.notificationHighlight}
      />
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
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#f0f9ff', '#e0f2fe', '#f8faff']}
        style={styles.backgroundGradient}
      />
      
      <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={[
        styles.modalHeader,
        { paddingTop: topInset + 12 }
      ]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.8)', 
            'rgba(255, 255, 255, 0.4)'
          ]}
          style={styles.headerHighlight}
        />
        <TouchableOpacity 
          onPress={handleCloseModal} 
          style={styles.closeButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <BlurView intensity={80} tint="light" style={styles.closeButtonBlur}>
            <Ionicons name="close" size={20} color="#1C1C1E" />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </BlurView>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.loadingCard}>
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.9)', 
                'rgba(255, 255, 255, 0.6)'
              ]}
              style={styles.loadingHighlight}
            />
            <ActivityIndicator size="large" color="#7dd3fc" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </BlurView>
        </View>
      ) : notifications && notifications.length > 0 ? (
        <>
          <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.markAllReadButton}>
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.8)', 
                'rgba(255, 255, 255, 0.4)'
              ]}
              style={styles.markAllHighlight}
            />
            <TouchableOpacity 
              style={styles.markAllReadTouchable}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                markAllNotificationsAsRead();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllReadText}>Mark all as read</Text>
            </TouchableOpacity>
          </BlurView>

          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#7dd3fc']}
                tintColor="#7dd3fc"
                progressViewOffset={topInset + 120}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderSectionHeader}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.emptyCard}>
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.9)', 
                'rgba(255, 255, 255, 0.6)'
              ]}
              style={styles.emptyHighlight}
            />
            <View style={styles.emptyIconContainer}>
              <Ionicons 
                name="notifications" 
                size={48} 
                color="#7dd3fc" 
              />
            </View>
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubText}>
              When you receive notifications, they'll appear here
            </Text>
          </BlurView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderRadius: 24,
    margin: 16,
    marginTop: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.3,
  },
  closeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  closeButtonBlur: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRight: {
    width: 32, // Balance the header
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    minWidth: 200,
  },
  loadingHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 10,
    marginLeft: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.2,
  },
  listContent: {
    paddingBottom: 120,
    paddingTop: 20,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  notificationHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  notificationTouchable: {
    flexDirection: 'row',
    padding: 18,
    alignItems: 'center',
  },
  unreadNotification: {
    borderColor: 'rgba(125, 211, 252, 0.4)',
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
    backgroundColor: '#FF3B30',
  },
  iconComment: {
    backgroundColor: '#7dd3fc',
  },
  iconMemory: {
    backgroundColor: '#30D158',
  },
  iconEvent: {
    backgroundColor: '#FF9500',
  },
  iconDefault: {
    backgroundColor: '#007AFF',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7dd3fc',
    marginRight: 8,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    lineHeight: 22,
  },
  notificationTime: {
    fontSize: 14,
    color: 'rgba(28, 28, 30, 0.6)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
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
    padding: 40,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    maxWidth: 320,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  emptyHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(125, 211, 252, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  emptySubText: {
    fontSize: 16,
    color: 'rgba(28, 28, 30, 0.6)',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    lineHeight: 22,
    fontWeight: '500',
  },
  markAllReadButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  markAllHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  markAllReadTouchable: {
    paddingVertical: 16,
  },
  markAllReadText: {
    color: '#7dd3fc',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  separator: {
    height: 1,
    marginLeft: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});