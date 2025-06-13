import React, { useRef, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Dimensions, 
  TouchableOpacity, 
  Animated, 
  Platform 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFeedManager } from '../hooks/useFeedManager';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import PostCard, { ITEM_LAYOUT_HEIGHT } from '../components/PostCard';
import FloatingCreateButton from '../components/FloatingCreateButton';
import FamilySelector from '../components/shared/FamilySelector';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const ITEM_HEIGHT = ITEM_LAYOUT_HEIGHT;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// Clean Header Component (no notification bell)
const CleanFamilyHeader = ({ selectedFamily, onFamilySelectorPress, scrollY, topInset }) => {
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.98],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View 
      style={[
        styles.headerContainer,
        {
          paddingTop: topInset + 12,
          opacity: headerOpacity,
        }
      ]}
    >
      <BlurView intensity={85} tint="light" style={styles.headerBlur}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)']}
          style={styles.headerHighlight}
        />
        <TouchableOpacity 
          style={styles.familySelector}
          onPress={onFamilySelectorPress}
          activeOpacity={0.7}
        >
          <Text style={styles.familyName} numberOfLines={1}>
            {selectedFamily?.name || 'Select Family'}
          </Text>
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-down" size={18} color="#1C1C1E" />
          </View>
        </TouchableOpacity>
      </BlurView>
    </Animated.View>
  );
};

// Clean Empty State
const CleanEmptyState = () => (
  <View style={styles.emptyStateContainer}>
    <BlurView intensity={80} tint="light" style={styles.emptyCard}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)']}
        style={styles.emptyCardHighlight}
      />
      <View style={styles.emptyContent}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="people-outline" size={48} color="#007AFF" />
        </View>
        <Text style={styles.emptyTitle}>Welcome to your Family Feed</Text>
        <Text style={styles.emptySubtitle}>
          Share moments and memories with your loved ones
        </Text>
      </View>
    </BlurView>
  </View>
);

export default function FeedScreen() {
  const { 
    posts, 
    loading, 
    loadingMore, 
    error, 
    handleRefresh, 
    handleLoadMore, 
    handleToggleLike, 
    selectedFamily, 
    hasMore 
  } = useFeedManager();
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showFamilySelector, setShowFamilySelector] = useState(false);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  const handleFamilySelectorPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowFamilySelector(true);
  };

  const handleCloseFamilySelector = () => {
    setShowFamilySelector(false);
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  // Fixed handleLike function that properly updates the post in the list
  const handleLike = useCallback(async (postId) => {
    try {
      // Add haptic feedback immediately for responsiveness
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Call the hook's handleToggleLike function
      await handleToggleLike(postId);
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [handleToggleLike]);

  // Handle post updates (like comment count changes)
  const handlePostUpdate = useCallback((postId) => {
    // This could trigger a refresh or update specific post
    // For now, we'll rely on the comment modal updating the local state
    console.log('Post updated:', postId);
  }, []);

  const renderItem = useCallback(({ item, index }) => (
    <View style={styles.postContainer}>
      <PostCard 
        post={item} 
        onToggleLike={handleLike}
        onPostUpdate={() => handlePostUpdate(item.post_id || item.id)}
      />
    </View>
  ), [handleLike, handlePostUpdate]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingMoreText}>Loading more posts...</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <BlurView intensity={85} tint="light" style={styles.loadingCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)']}
              style={styles.loadingHighlight}
            />
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading your family feed...</Text>
          </BlurView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Clean Background */}
      <LinearGradient
        colors={[
          '#F8FAFF',
          '#F0F7FF',
          '#E8F4FF',
        ]}
        style={styles.backgroundGradient}
      />

      <CleanFamilyHeader 
        selectedFamily={selectedFamily}
        onFamilySelectorPress={handleFamilySelectorPress}
        scrollY={scrollY}
        topInset={insets.top}
      />

      <AnimatedFlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => (item.post_id || item.id)?.toString()}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContainer,
          { 
            paddingTop: insets.top + 85, // Account for header
            paddingBottom: 140, // Account for floating button
          }
        ]}
        onRefresh={handleRefresh}
        refreshing={loading}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading ? <CleanEmptyState /> : null}
        getItemLayout={(data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        removeClippedSubviews={false} // Helps with rendering issues
        maxToRenderPerBatch={5}
        windowSize={10}
      />

      <FloatingCreateButton />

      <FamilySelector
        visible={showFamilySelector}
        onClose={handleCloseFamilySelector}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  // Header Styles
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 100,
  },
  headerBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '50%',
  },
  familySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  familyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    textAlign: 'center',
  },
  chevronContainer: {
    padding: 2,
  },

  // List Styles
  listContainer: {
    paddingHorizontal: 0,
  },
  postContainer: {
    marginBottom: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 20,
  },
  loadingCard: {
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '40%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // Empty State Styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 60,
    backgroundColor: 'transparent',
  },
  emptyCard: {
    width: screenWidth * 0.85,
    paddingVertical: 48,
    paddingHorizontal: 32,
    borderRadius: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyCardHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '40%',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    marginBottom: 24,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(28, 28, 30, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});