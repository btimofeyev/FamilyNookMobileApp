import React, { useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, Dimensions, TouchableOpacity, Animated, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFeedManager } from '../hooks/useFeedManager';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import PostCard, { ITEM_LAYOUT_HEIGHT } from '../components/PostCard';
import FloatingCreateButton from '../components/FloatingCreateButton';

const { height: screenHeight } = Dimensions.get('window');
const ITEM_HEIGHT = ITEM_LAYOUT_HEIGHT;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function FeedScreen() {
  const { posts, loading, loadingMore, error, handleRefresh, handleLoadMore, handleToggleLike, selectedFamily } = useFeedManager();
  const scrollY = useRef(new Animated.Value(0)).current;

  // This component will be the new animated background
  const AnimatedGradient = () => {
    // In a real-world scenario, you might animate these colors over time.
    // For this example, we use a rich, deep gradient as the base.
    return (
        <LinearGradient
            colors={['#0f2027', '#203a43', '#2c5364']}
            style={StyleSheet.absoluteFill}
        />
    );
  };

  const renderFooter = () => loadingMore ? <ActivityIndicator style={{ margin: 20 }} color="#FFFFFF" /> : null;

  const renderContent = () => {
    if (loading && posts.length === 0) {
      return <View style={styles.centeredMessageContainer}><ActivityIndicator size="large" color="#FFFFFF" /></View>;
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
        data={posts}
        keyExtractor={(item) => item.post_id.toString()}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={{
            paddingTop: screenHeight / 2 - ITEM_HEIGHT / 2,
            paddingBottom: screenHeight / 2 - ITEM_HEIGHT / 2 + 85,
        }}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.7}
        ListFooterComponent={renderFooter}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        renderItem={({ item, index }) => {
            const inputRange = [(index - 1) * ITEM_HEIGHT, index * ITEM_HEIGHT, (index + 1) * ITEM_HEIGHT];
            const scale = scrollY.interpolate({ inputRange, outputRange: [0.85, 1, 0.85], extrapolate: 'clamp' });
            const opacity = scrollY.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
            return (
                <Animated.View style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center', opacity, transform: [{ scale }] }}>
                  <PostCard post={item} onToggleLike={handleToggleLike} onPostUpdate={handleRefresh} />
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
          {selectedFamily ? selectedFamily.family_name : 'FamlyNook'}
        </Text>
        <TouchableOpacity>
          <Ionicons name="chevron-down-circle" size={28} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

// Styles remain largely the same, ensuring layout is consistent
const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    centeredMessageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    messageText: {
        fontSize: 22, fontWeight: '700', color: '#FFFFFF',
        marginTop: 16, textAlign: 'center',
    },
    messageSubText: {
        fontSize: 16, color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 8,
    },
    retryButton: {
      marginTop: 24, paddingVertical: 12, paddingHorizontal: 32,
      backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 25,
      borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    retryButtonText: {
      color: '#FFFFFF', fontWeight: 'bold', fontSize: 16,
    },
    header: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 12, paddingHorizontal: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28, fontWeight: 'bold', color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: {width: 0, height: 2},
        textShadowRadius: 4,
    },
});