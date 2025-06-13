import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, Dimensions, TouchableOpacity, Animated, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useFeedManager } from '../hooks/useFeedManager';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import PostCard, { ITEM_LAYOUT_HEIGHT } from '../components/PostCard';
import FloatingCreateButton from '../components/FloatingCreateButton';
import FamilySelector from '../components/shared/FamilySelector';

const { height: screenHeight } = Dimensions.get('window');
const ITEM_HEIGHT = ITEM_LAYOUT_HEIGHT;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function FeedScreen() {
  const { posts, loading, loadingMore, error, handleRefresh, handleLoadMore, handleToggleLike, selectedFamily, hasMore } = useFeedManager();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showFamilySelector, setShowFamilySelector] = useState(false);
  const flatListRef = useRef(null);

  const handleFamilySelectorPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowFamilySelector(true);
  };

  const handleCloseFamilySelector = () => {
    setShowFamilySelector(false);
  };

  // This component will be the new animated background
  const AnimatedGradient = () => {
    return (
        <LinearGradient
            colors={['#0f2027', '#203a43', '#2c5364']}
            style={StyleSheet.absoluteFill}
        />
    );
  };

  // Improved onEndReached handler with debugging
  const onEndReached = useCallback(() => {
    console.log('FeedScreen onEndReached called');
    console.log('Current state:', { 
      postsLength: posts.length, 
      loadingMore, 
      loading, 
      hasMore 
    });
    
    if (!loadingMore && !loading && hasMore && posts.length > 0) {
      console.log('Triggering handleLoadMore');
      handleLoadMore();
    } else {
      console.log('onEndReached conditions not met - skipping load');
    }
  }, [handleLoadMore, loadingMore, loading, hasMore, posts.length]);

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading more posts...</Text>
        </View>
      );
    }
    
    if (!hasMore && posts.length > 0) {
      return (
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>You've seen all the posts!</Text>
        </View>
      );
    }
    
    return <View style={{ height: 50 }} />; // Some padding at the end
  }, [loadingMore, hasMore, posts.length]);

  const renderContent = () => {
    if (loading && posts.length === 0) {
      return (
        <View style={styles.centeredMessageContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.centeredMessageContainer}>
          <Ionicons name="cloud-offline-outline" size={60} color="rgba(255, 255, 255, 0.7)" />
          <Text style={styles.messageText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (posts.length === 0) {
      return (
        <View style={styles.centeredMessageContainer}>
          <Ionicons name="sparkles-outline" size={60} color="rgba(255, 255, 255, 0.7)" />
          <Text style={styles.messageText}>A Blank Canvas</Text>
          <Text style={styles.messageSubText}>Share the first memory with your family.</Text>
        </View>
      );
    }

    return (
      <AnimatedFlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item) => item.post_id.toString()}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }], 
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
            paddingTop: screenHeight / 2 - ITEM_HEIGHT / 2,
            paddingBottom: screenHeight / 2 - ITEM_HEIGHT / 2 + 85,
        }}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3} // Reduced threshold for better triggering
        ListFooterComponent={renderFooter}
        getItemLayout={(_, index) => ({ 
          length: ITEM_HEIGHT, 
          offset: ITEM_HEIGHT * index, 
          index 
        })}
        renderItem={({ item, index }) => {
            const inputRange = [
              (index - 1) * ITEM_HEIGHT, 
              index * ITEM_HEIGHT, 
              (index + 1) * ITEM_HEIGHT
            ];
            const scale = scrollY.interpolate({ 
              inputRange, 
              outputRange: [0.85, 1, 0.85], 
              extrapolate: 'clamp' 
            });
            const opacity = scrollY.interpolate({ 
              inputRange, 
              outputRange: [0.6, 1, 0.6], 
              extrapolate: 'clamp' 
            });
            
            return (
                <Animated.View style={{ 
                  height: ITEM_HEIGHT, 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  opacity, 
                  transform: [{ scale }] 
                }}>
                  <PostCard 
                    post={item} 
                    onToggleLike={handleToggleLike} 
                    onPostUpdate={handleRefresh} 
                  />
                </Animated.View>
            );
        }}
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <AnimatedGradient />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        {renderContent()}
        {selectedFamily && <FloatingCreateButton />}
      </SafeAreaView>
      
      <BlurView style={styles.header} intensity={80} tint="dark">
        <Text style={styles.headerTitle} numberOfLines={1}>
          {selectedFamily ? selectedFamily.family_name : 'Select Family'}
        </Text>
        <TouchableOpacity 
          style={styles.familySelectorButton} 
          onPress={handleFamilySelectorPress}
        >
          <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </BlurView>

      <FamilySelector 
        visible={showFamilySelector} 
        onClose={handleCloseFamilySelector} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  familySelectorButton: {
    marginLeft: 10,
    padding: 4,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  messageText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  messageSubText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  endMessage: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endMessageText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});