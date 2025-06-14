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

// Ultra-Clean Header Component - iPhone Style
const CleanFamilyHeader = ({ selectedFamily, onFamilySelectorPress, scrollY, topInset }) => {
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.98],
    extrapolate: 'clamp',
  });

  const headerTransform = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -2],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View 
      style={[
        styles.headerContainer,
        {
          paddingTop: topInset + (Platform.OS === 'android' ? 8 : 12),
          opacity: headerOpacity,
          transform: [{ translateY: headerTransform }],
        }
      ]}
    >
      <BlurView intensity={Platform.OS === 'ios' ? 95 : 80} tint="systemUltraThinMaterialLight" style={styles.headerBlur}>
        <LinearGradient
          colors={[
            'rgba(224, 242, 254, 0.95)',
            'rgba(186, 230, 253, 0.90)',
            'rgba(125, 211, 252, 0.85)'
          ]}
          style={styles.headerHighlight}
        />
        
        <TouchableOpacity 
          style={styles.familySelector}
          onPress={onFamilySelectorPress}
          activeOpacity={0.8}
        >
          <Text style={styles.familyName}>
            {selectedFamily?.family_name || 'Select Family'}
          </Text>
          <View style={styles.chevronContainer}>
            <Ionicons 
              name="chevron-down" 
              size={16} 
              color="rgba(28, 28, 30, 0.8)" 
            />
          </View>
        </TouchableOpacity>
      </BlurView>
    </Animated.View>
  );
};

// Clean Empty State Component
const CleanEmptyState = () => (
  <View style={styles.emptyStateContainer}>
    <BlurView intensity={Platform.OS === 'ios' ? 95 : 85} tint="systemUltraThinMaterialLight" style={styles.emptyCard}>
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.9)', 
          'rgba(255, 255, 255, 0.8)',
          'rgba(255, 255, 255, 0.6)'
        ]}
        style={styles.emptyCardHighlight}
      />
      <View style={styles.emptyContent}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="heart-outline" size={32} color="#7dd3fc" />
        </View>
        <Text style={styles.emptyTitle}>No Family Moments Yet</Text>
        <Text style={styles.emptySubtitle}>
          Be the first to share a special moment with your family!
        </Text>
      </View>
    </BlurView>
  </View>
);

export default function FeedScreen() {
  const topInset = useSafeAreaInsets().top;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showFamilySelector, setShowFamilySelector] = useState(false);
  
  const {
    posts,
    selectedFamily,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    refetch,
    loadNextPage,
    toggleLike,
    updatePost,
  } = useFeedManager();

  // Handle family selector press
  const handleFamilySelectorPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowFamilySelector(true);
  };

  const handleCloseFamilySelector = () => {
    setShowFamilySelector(false);
  };

  // Handle scroll events for header animation
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // Handle end reached with better logging
  const handleEndReached = useCallback(() => {
    console.log('🔍 End reached triggered', {
      hasMore,
      loadingMore,
      loading,
      postsCount: posts.length
    });
    
    if (hasMore && !loadingMore && !loading) {
      console.log('✅ Loading next page...');
      loadNextPage();
    } else {
      console.log('❌ Not loading because:', {
        hasMore,
        loadingMore,
        loading
      });
    }
  }, [hasMore, loadingMore, loading, loadNextPage, posts.length]);

  // Render individual post item
  const renderPost = useCallback(({ item }) => (
    <View style={styles.postContainer}>
      <PostCard 
        post={item} 
        onToggleLike={toggleLike}
        onPostUpdate={updatePost}
      />
    </View>
  ), [toggleLike, updatePost]);

  // Enhanced Footer loader component
  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <BlurView intensity={80} tint="systemUltraThinMaterialLight" style={styles.footerLoaderBlur}>
            <ActivityIndicator size="small" color="#7dd3fc" />
            <Text style={styles.loadingMoreText}>Loading more posts...</Text>
          </BlurView>
        </View>
      );
    }
    
    if (!hasMore && posts.length > 0) {
      return (
        <View style={styles.endOfFeedContainer}>
          <BlurView intensity={80} tint="systemUltraThinMaterialLight" style={styles.endOfFeedBlur}>
            <Ionicons name="checkmark-circle" size={20} color="#7dd3fc" />
            <Text style={styles.endOfFeedText}>You're all caught up!</Text>
          </BlurView>
        </View>
      );
    }
    
    return null;
  }, [loadingMore, hasMore, posts.length]);

  // Loading state
  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <BlurView intensity={Platform.OS === 'ios' ? 95 : 85} tint="systemUltraThinMaterialLight" style={styles.loadingCard}>
          <LinearGradient
            colors={[
              'rgba(224, 242, 254, 0.95)', 
              'rgba(186, 230, 253, 0.85)',
              'rgba(125, 211, 252, 0.75)'
            ]}
            style={styles.loadingHighlight}
          />
          <ActivityIndicator size="large" color="#7dd3fc" />
          <Text style={styles.loadingText}>Loading your family moments...</Text>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={[
          '#f0f9ff',
          '#e0f2fe',
          '#f8faff'
        ]}
        style={styles.backgroundGradient}
      />

      <CleanFamilyHeader
        selectedFamily={selectedFamily}
        onFamilySelectorPress={handleFamilySelectorPress}
        scrollY={scrollY}
        topInset={topInset}
      />

      <AnimatedFlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.post_id || item.id}
        contentContainerStyle={[
          styles.listContainer,
          { 
            paddingTop: topInset + (Platform.OS === 'android' ? 85 : 95),
            paddingBottom: 120
          }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onRefresh={refetch}
        refreshing={refreshing}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5} // Increased threshold for better triggering
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading ? <CleanEmptyState /> : null}
        // Remove getItemLayout for dynamic content
        removeClippedSubviews={false}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={5}
        // Add debug info
        onScrollBeginDrag={() => console.log('📱 User started scrolling')}
        onMomentumScrollEnd={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const distanceFromEnd = contentSize.height - (contentOffset.y + layoutMeasurement.height);
          console.log('📏 Distance from end:', distanceFromEnd);
        }}
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
    backgroundColor: '#f0f9ff',
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
    paddingHorizontal: Platform.OS === 'android' ? 20 : 16,
    paddingBottom: 8,
    zIndex: 100,
  },
  headerBlur: {
    borderRadius: Platform.OS === 'android' ? 16 : 20,
    overflow: 'hidden',
    borderWidth: Platform.OS === 'android' ? 0.5 : 0,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  headerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  familySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  familyName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.4,
  },
  chevronContainer: {
    marginLeft: 8,
    padding: 2,
  },

  // Loading States
  loadingContainer: {
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
    borderColor: 'rgba(255, 255, 255, 0.8)',
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

  // List Styles
  listContainer: {
    flexGrow: 1,
  },
  postContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },

  // Footer Loader Styles
  footerLoader: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  footerLoaderBlur: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // End of Feed Styles
  endOfFeedContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  endOfFeedBlur: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  endOfFeedText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // Empty State Styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    maxWidth: 320,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  emptyCardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(125, 211, 252, 0.2)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});