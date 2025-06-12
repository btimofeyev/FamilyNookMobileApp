import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Platform, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import TimeAgo from './TimeAgo';
import { BlurView } from 'expo-blur';
import MemberAvatar from './MemberAvatar';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

export const CARD_WIDTH = screenWidth * 0.88;
const CARD_ASPECT_RATIO = 3 / 4.5;
export const CARD_HEIGHT = CARD_WIDTH / CARD_ASPECT_RATIO;
export const ITEM_LAYOUT_HEIGHT = CARD_HEIGHT + 40;

const PostCard = ({ post, onToggleLike }) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const likeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (post.is_liked) {
      likeAnim.setValue(1.2);
      Animated.spring(likeAnim, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [post.is_liked]);

  const getPostMediaItems = (p) => {
    if (!p) return [];
    const media = p.media || p.media_urls || p.media_items || [];
    if (!Array.isArray(media)) return [];
    return media.map(item => ({
      url: typeof item === 'string' ? item : item.url,
      type: (typeof item === 'string' ? item : item.url)?.match(/\.(mp4|mov)$/) ? 'video' : 'image'
    })).filter(item => item.url);
  };

  const mediaItems = getPostMediaItems(post);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveMediaIndex(viewableItems[0].index);
  }).current;

  const renderMediaItem = ({ item }) => (
    <View style={styles.mediaItemContainer}>
      {item.type === 'video' ? (
        <Video source={{ uri: item.url }} style={styles.media} resizeMode={ResizeMode.COVER} isLooping isMuted shouldPlay />
      ) : (
        <Image source={{ uri: item.url }} style={styles.media} resizeMode="cover" />
      )}
    </View>
  );

  const renderContent = () => {
    if (mediaItems.length > 0) {
      return (
        <View style={{flex: 1}}>
          <FlatList
            data={mediaItems} renderItem={renderMediaItem}
            keyExtractor={(item, index) => `${item.url}-${index}`}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          />
          {mediaItems.length > 1 && (
            <View style={styles.pagination}>
              {mediaItems.map((_, i) => <View key={i} style={[styles.dot, i === activeMediaIndex && styles.activeDot]} />)}
            </View>
          )}
          {post.caption ? (
            <BlurView intensity={75} tint="light" style={styles.captionContainer}>
                <Text style={styles.captionText} numberOfLines={2}>{post.caption}</Text>
            </BlurView>
          ) : null}
        </View>
      );
    }
    if (post?.caption) {
      return (
        <View style={styles.textPostContainer}>
          <Text style={styles.textPostCaption}>{post.caption}</Text>
        </View>
      );
    }
    return <View />;
  };

  if (!post) return null;

  return (
    <View style={styles.cardShadow}>
      <BlurView intensity={95} tint="light" style={styles.card}>
        <LinearGradient
            colors={['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.cardHighlight}
        />
        <View style={styles.header}>
          <MemberAvatar member={post} size={42} />
          <View style={styles.headerText}>
            <Text style={styles.authorName}>{post.author_name}</Text>
            <TimeAgo date={new Date(post.created_at)} style={styles.timestamp} />
          </View>
          <TouchableOpacity style={styles.menuButton}><Ionicons name="ellipsis-horizontal" size={24} color="#3C3C43" /></TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>{renderContent()}</View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => onToggleLike && onToggleLike(post.post_id)}>
            <Animated.View style={[styles.actionButton, { transform: [{ scale: likeAnim }] }]}>
              <Ionicons name={post.is_liked ? 'heart' : 'heart-outline'} size={22} color={post.is_liked ? '#FF3B30' : '#1C1C1E'} />
              <Text style={styles.actionText}>{post.likes_count}</Text>
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity><View style={styles.actionButton}><Ionicons name="chatbubble-outline" size={22} color="#1C1C1E" /><Text style={styles.actionText}>{post.comments_count}</Text></View></TouchableOpacity>
          <TouchableOpacity><View style={[styles.actionButton, { paddingHorizontal: 10 }]}><Ionicons name="share-outline" size={22} color="#1C1C1E" /></View></TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    padding: 16,
    overflow: 'hidden',
  },
  cardHighlight: {
    position: 'absolute',
    top: 1.5, left: 1.5, right: 1.5,
    height: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: { flex: 1, marginLeft: 12 },
  authorName: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    fontWeight: '700',
    color: '#000000',
  },
  timestamp: {
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.7)',
  },
  menuButton: { padding: 4 },
  contentContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 10,
  },
  mediaItemContainer: {
    width: CARD_WIDTH - 32,
    height: '100%',
  },
  media: { width: '100%', height: '100%' },
  textPostContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  textPostCaption: {
    fontSize: 26,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Rounded' : 'System',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captionText: {
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.8)',
    fontWeight: '500',
  },
  pagination: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 4,
  },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.6)', marginHorizontal: 3 },
  activeDot: { backgroundColor: '#FFFFFF' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    marginRight: 8,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '700',
  },
});

export default PostCard;