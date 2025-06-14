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
      {/* Subtle background blur - much lighter than before */}
      <BlurView intensity={Platform.OS === 'ios' ? 95 : 80} tint="systemUltraThinMaterialLight" style={styles.headerBlur}>
        {/* Soft blue accent highlight */}
        <LinearGradient
          colors={[
            'rgba(224, 242, 254, 0.95)', // Soft blue from login (e0f2fe)
            'rgba(186, 230, 253, 0.90)', // Medium blue from login (bae6fd) 
            'rgba(125, 211, 252, 0.85)'  // Brighter blue from login (7dd3fc)
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
    error,
    loadNextPage,
    refetch,
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

  // Footer loader component
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#7dd3fc" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  // Loading state
  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <BlurView intensity={Platform.OS === 'ios' ? 95 : 85} tint="systemUltraThinMaterialLight" style={styles.loadingCard}>
        {/* Soft blue accent highlight */}
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
      
      {/* Soft blue background gradient - matching login/register theme */}
      <LinearGradient
        colors={[
          '#f0f9ff', // Very light blue
          '#e0f2fe', // Light sky blue (from login)
          '#f8faff'  // Almost white with blue tint
        ]}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <CleanFamilyHeader
        selectedFamily={selectedFamily}
        onFamilySelectorPress={handleFamilySelectorPress}
        scrollY={scrollY}
        topInset={topInset}
      />

      {/* Posts List */}
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
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading ? <CleanEmptyState /> : null}
        getItemLayout={(data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        removeClippedSubviews={false}
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
    backgroundColor: '#f0f9ff', // Soft blue background
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  // Header Styles - Ultra Clean
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
    borderWidth: Platform.OS === 'android' ? 0.5 : 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'android' ? 2 : 4 },
    shadowOpacity: Platform.OS === 'android' ? 0.04 : 0.06,
    shadowRadius: Platform.OS === 'android' ? 8 : 12,
    elevation: Platform.OS === 'android' ? 2 : 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: Platform.OS === 'android' ? 16 : 20,
  },
  familySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    paddingVertical: Platform.OS === 'android' ? 12 : 16,
    minHeight: Platform.OS === 'android' ? 48 : 56,
  },
  familyName: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    textAlign: 'center',
    letterSpacing: Platform.OS === 'android' ? 0.2 : 0,
  },
  chevronContainer: {
    padding: 2,
    opacity: 0.8,
  },

  // List Styles - More spacing for Android
  listContainer: {
    paddingHorizontal: 0,
  },
  postContainer: {
    marginBottom: Platform.OS === 'android' ? 28 : 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  // Loading States - Lighter
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f9ff', // Soft blue background
    paddingHorizontal: 20,
  },
  loadingCard: {
    paddingVertical: Platform.OS === 'android' ? 28 : 32,
    paddingHorizontal: Platform.OS === 'android' ? 24 : 28,
    borderRadius: Platform.OS === 'android' ? 20 : 24,
    alignItems: 'center',
    borderWidth: Platform.OS === 'android' ? 0.5 : 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'android' ? 4 : 8 },
    shadowOpacity: Platform.OS === 'android' ? 0.04 : 0.06,
    shadowRadius: Platform.OS === 'android' ? 12 : 16,
    elevation: Platform.OS === 'android' ? 4 : 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  loadingHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: Platform.OS === 'android' ? 20 : 24,
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
    color: '#7dd3fc', // Soft blue accent
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // Empty State Styles - Lighter
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
    paddingVertical: Platform.OS === 'android' ? 40 : 48,
    paddingHorizontal: Platform.OS === 'android' ? 28 : 32,
    borderRadius: Platform.OS === 'android' ? 24 : 32,
    alignItems: 'center',
    borderWidth: Platform.OS === 'android' ? 0.5 : 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'android' ? 4 : 8 },
    shadowOpacity: Platform.OS === 'android' ? 0.04 : 0.06,
    shadowRadius: Platform.OS === 'android' ? 12 : 16,
    elevation: Platform.OS === 'android' ? 4 : 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyCardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: Platform.OS === 'android' ? 24 : 32,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    marginBottom: 24,
    width: Platform.OS === 'android' ? 72 : 80,
    height: Platform.OS === 'android' ? 72 : 80,
    borderRadius: Platform.OS === 'android' ? 36 : 40,
    backgroundColor: 'rgba(125, 211, 252, 0.12)', // Soft blue accent
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 22,
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