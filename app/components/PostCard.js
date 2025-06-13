import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  Platform, 
  FlatList, 
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import TimeAgo from './TimeAgo';
import { BlurView } from 'expo-blur';
import MemberAvatar from './MemberAvatar';
import { LinearGradient } from 'expo-linear-gradient';
import CommentsModal from './CommentsModal';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

export const CARD_WIDTH = screenWidth * 0.9;
const CARD_ASPECT_RATIO = 3 / 4.5;
export const CARD_HEIGHT = CARD_WIDTH / CARD_ASPECT_RATIO;
export const ITEM_LAYOUT_HEIGHT = CARD_HEIGHT + 40;

// Clean Action Button with proper functionality
const CleanActionButton = ({ 
  icon, 
  count, 
  isActive = false, 
  onPress, 
  color = '#1C1C1E',
  activeColor = '#FF3B30',
  style,
  disabled = false
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 25,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 25,
    }).start();
  };

  const handlePress = () => {
    if (disabled || !onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.actionButtonContainer, style]}
      activeOpacity={1}
      disabled={disabled}
    >
      <Animated.View 
        style={[
          styles.actionButtonWrapper,
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.disabledButton
        ]}
      >
        <BlurView 
          intensity={75} 
          tint="light" 
          style={[
            styles.actionButton,
            isActive && styles.activeActionButton
          ]}
        >
          <LinearGradient
            colors={isActive 
              ? ['rgba(255, 59, 48, 0.15)', 'rgba(255, 59, 48, 0.05)']
              : ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)']
            }
            style={styles.actionButtonHighlight}
          />
          <View style={styles.actionButtonContent}>
            <Ionicons 
              name={icon} 
              size={20} 
              color={isActive ? activeColor : color} 
            />
            {count !== undefined && count !== null && (
              <Text style={[
                styles.actionText,
                { color: isActive ? activeColor : color }
              ]}>
                {count}
              </Text>
            )}
          </View>
        </BlurView>
      </Animated.View>
    </TouchableOpacity>
  );
};

const PostCard = ({ post, onToggleLike, onPostUpdate }) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post?.comments_count || 0);
  const [likesCount, setLikesCount] = useState(post?.likes_count || 0);
  const [isLiked, setIsLiked] = useState(post?.is_liked || false);
  const [isLiking, setIsLiking] = useState(false);
  const likeAnim = useRef(new Animated.Value(1)).current;

  // Update local state when post prop changes
  useEffect(() => {
    setCommentsCount(post?.comments_count || 0);
    setLikesCount(post?.likes_count || 0);
    setIsLiked(post?.is_liked || false);
  }, [post?.comments_count, post?.likes_count, post?.is_liked]);

  // Like animation effect
  useEffect(() => {
    if (isLiked) {
      Animated.sequence([
        Animated.timing(likeAnim, { 
          toValue: 1.2, 
          duration: 150, 
          useNativeDriver: true 
        }),
        Animated.spring(likeAnim, { 
          toValue: 1, 
          useNativeDriver: true,
          tension: 300,
          friction: 25,
        })
      ]).start();
    }
  }, [isLiked]);

  const handleLike = async () => {
    if (isLiking || !onToggleLike) return;
    
    setIsLiking(true);
    
    // Optimistic update
    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    
    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);
    
    try {
      // Call the parent's toggle like function with the post ID
      await onToggleLike(post.post_id || post.id);
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(!newIsLiked);
      setLikesCount(likesCount);
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentPress = () => {
    setShowCommentsModal(true);
  };

  const handleCommentAdded = () => {
    setCommentsCount(prev => prev + 1);
    if (onPostUpdate) {
      onPostUpdate();
    }
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Implement share functionality
    console.log('Share post:', post.post_id || post.id);
  };

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
        <Video
          source={{ uri: item.url }}
          style={styles.media}
          useNativeControls
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={false}
        />
      ) : (
        <Image source={{ uri: item.url }} style={styles.media} resizeMode="cover" />
      )}
    </View>
  );

  const renderContent = () => {
    if (mediaItems.length > 0) {
      return (
        <View style={styles.mediaContainer}>
          <FlatList
            data={mediaItems}
            renderItem={renderMediaItem}
            keyExtractor={(item, index) => `media-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          />
          
          {mediaItems.length > 1 && (
            <View style={styles.pagination}>
              {mediaItems.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activeMediaIndex && styles.activeDot
                  ]}
                />
              ))}
            </View>
          )}
          
          {post?.caption && (
            <BlurView intensity={85} tint="light" style={styles.captionContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)']}
                style={styles.captionHighlight}
              />
              <Text style={styles.captionText} numberOfLines={2}>
                {post.caption}
              </Text>
            </BlurView>
          )}
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
    <View style={styles.cardContainer}>
      <BlurView 
        intensity={90} 
        tint="light" 
        style={styles.card}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.3)']}
          style={styles.cardHighlight}
        />
        
        {/* Header */}
        <View style={styles.header}>
          <MemberAvatar member={post} size={40} />
          <View style={styles.headerText}>
            <Text style={styles.authorName}>{post.author_name}</Text>
            <TimeAgo date={new Date(post.created_at)} style={styles.timestamp} />
          </View>
          <TouchableOpacity style={styles.menuButton} activeOpacity={0.6}>
            <Ionicons name="ellipsis-horizontal" size={18} color="rgba(28, 28, 30, 0.6)" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {renderContent()}
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
            <CleanActionButton
              icon={isLiked ? 'heart' : 'heart-outline'}
              count={likesCount}
              isActive={isLiked}
              onPress={handleLike}
              activeColor="#FF3B30"
              disabled={isLiking}
            />
          </Animated.View>
          
          <CleanActionButton
            icon="chatbubble-outline"
            count={commentsCount}
            onPress={handleCommentPress}
            style={{ marginLeft: 12 }}
          />
          
          <CleanActionButton
            icon="share-outline"
            onPress={handleShare}
            style={{ marginLeft: 12, paddingHorizontal: 16 }}
          />
        </View>
      </BlurView>

      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        postId={post.post_id || post.id}
        post={post}
        onCommentAdded={handleCommentAdded}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    padding: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '40%',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: { 
    flex: 1, 
    marginLeft: 12 
  },
  authorName: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: 'rgba(28, 28, 30, 0.6)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  menuButton: { 
    padding: 8,
    borderRadius: 16,
  },
  
  // Content Styles
  contentContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  mediaContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  mediaItemContainer: {
    width: CARD_WIDTH - 40,
    height: '100%',
    backgroundColor: 'transparent',
  },
  media: { 
    width: '100%', 
    height: '100%',
    borderRadius: 20,
  },
  
  // Text Post Styles
  textPostContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(240, 247, 255, 0.6)',
    borderRadius: 20,
  },
  textPostCaption: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Rounded' : 'System',
    fontWeight: '600',
    textAlign: 'center',
    color: '#1C1C1E',
    lineHeight: 30,
  },
  
  // Caption Overlay Styles
  captionContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  captionHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  captionText: {
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
    lineHeight: 20,
  },
  
  // Pagination Styles
  pagination: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dot: { 
    height: 4, 
    width: 4, 
    borderRadius: 2, 
    backgroundColor: 'rgba(255, 255, 255, 0.6)', 
    marginHorizontal: 2 
  },
  activeDot: { 
    backgroundColor: '#FFFFFF',
    width: 8,
  },
  
  // Footer Action Styles
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonContainer: {
    backgroundColor: 'transparent',
  },
  actionButtonWrapper: {
    backgroundColor: 'transparent',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeActionButton: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

export default PostCard;