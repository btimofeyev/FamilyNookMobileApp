// app/components/PostItem.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Video } from 'expo-av';
import TimeAgo from './TimeAgo';
import { toggleLike, deletePost } from '../api/feedService';
import CommentSection from './CommentSection';
import MediaViewer from './MediaViewer';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function PostItem({ post, onUpdate, isCurrentUser }) {
  const [liked, setLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaItem, setMediaItem] = useState(null);
  const [heartScale] = useState(new Animated.Value(0));

  useEffect(() => {
    // Update state if post props change
    setLiked(post.is_liked || false);
    setLikesCount(post.likes_count || 0);
  }, [post]);

  const handleLike = async () => {
    setIsLoading(true);
    try {
      // Optimistic UI update
      const newLikedState = !liked;
      setLiked(newLikedState);
      setLikesCount(prevCount => newLikedState ? prevCount + 1 : prevCount - 1);
      
      // Haptic feedback
      if (newLikedState) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        animateHeart();
      }
      
      // Make API call
      const result = await toggleLike(post.post_id);
      
      // Update with server response
      setLiked(result.action === 'liked');
      setLikesCount(result.likes_count);
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert on error
      setLiked(post.is_liked || false);
      setLikesCount(post.likes_count || 0);
    } finally {
      setIsLoading(false);
    }
  };

  const animateHeart = () => {
    heartScale.setValue(0);
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.5,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

  // Set up double tap detection
  const lastTap = React.useRef(0);
  const handleDoubleTapLike = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (!liked) {
        handleLike();
      }
    }
    lastTap.current = now;
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deletePost(post.post_id);
              onUpdate && onUpdate();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ],
      { userInterfaceStyle: 'dark' } // Force dark mode for the alert
    );
  };

  const handleMediaPress = () => {
    // Determine media type
    let mediaType = 'image';
    let mediaUrl = '';
    
    if (post.media_type === 'video') {
      mediaType = 'video';
      mediaUrl = post.media_url || post.signed_image_url;
    } else if (post.media_url) {
      mediaUrl = post.media_url;
    } else if (post.signed_image_url) {
      mediaUrl = post.signed_image_url;
    }
    
    if (mediaUrl) {
      setMediaItem({
        type: mediaType,
        url: mediaUrl
      });
      setMediaViewerVisible(true);
    }
  };

  const renderPostMedia = () => {
    if (!post.media_url && !post.signed_image_url) {
      return null;
    }
    
    const mediaUrl = post.signed_image_url || post.media_url;
    
    if (post.media_type === 'video') {
      return (
        <TouchableOpacity activeOpacity={0.9} onPress={handleMediaPress}>
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: mediaUrl }}
              style={styles.video}
              useNativeControls={false}
              resizeMode="cover"
              shouldPlay={false}
              isMuted={true}
              posterSource={{ uri: mediaUrl.replace('.mp4', '.jpg') }}
            />
            <View style={styles.playIconContainer}>
              <Ionicons name="play-circle" size={48} color="rgba(255, 255, 255, 0.8)" />
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={handleMediaPress}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        delayLongPress={300}
        onPressIn={() => { lastTap.current = Date.now(); }}
        onPressOut={() => { handleDoubleTapLike(); }}
      >
        <Image 
          source={{ uri: mediaUrl }} 
          style={styles.image} 
          resizeMode="cover" 
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.user}>
          <Text style={styles.author}>{post.author_name || "Unknown User"}</Text>
          <TimeAgo date={new Date(post.created_at)} style={styles.timeAgo} />
        </View>
        
        {isCurrentUser && (
          <TouchableOpacity 
            onPress={handleDelete} 
            style={styles.deleteButton}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>
      
      {post.caption && (
        <Text style={styles.caption}>{post.caption}</Text>
      )}
      
      {renderPostMedia()}
      
      {post.link_preview && (
        <TouchableOpacity activeOpacity={0.9}>
          <View style={styles.linkPreview}>
            {post.link_preview.image && (
              <Image source={{ uri: post.link_preview.image }} style={styles.linkImage} />
            )}
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle} numberOfLines={2}>{post.link_preview.title}</Text>
              <Text style={styles.linkDescription} numberOfLines={2}>{post.link_preview.description}</Text>
              <Text style={styles.linkUrl} numberOfLines={1}>{post.link_preview.url}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      
      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={handleLike} 
          style={styles.actionButton}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: liked ? heartScale : 1 }] }}>
            <Ionicons 
              name={liked ? "heart" : "heart-outline"} 
              size={22} 
              color={liked ? "#FF453A" : "#8E8E93"} 
            />
          </Animated.View>
          <Text style={[styles.actionText, liked && styles.likedText]}>
            {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => {
            setShowComments(!showComments);
            if (!showComments) {
              Haptics.selectionAsync(); // Haptic feedback when opening comments
            }
          }} 
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={showComments ? "chatbubble" : "chatbubble-outline"} 
            size={20} 
            color={showComments ? "#3BAFBC" : "#8E8E93"} 
          />
          <Text style={[styles.actionText, showComments && styles.commentActiveText]}>
            {post.comments_count || 0} {post.comments_count === 1 ? 'Comment' : 'Comments'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {showComments && (
        <CommentSection 
          postId={post.post_id} 
          initialComments={post.comments} 
          onCommentAdded={() => {
            // Update comment count
            onUpdate && onUpdate();
          }}
        />
      )}
      
      <MediaViewer 
        visible={mediaViewerVisible} 
        media={mediaItem}
        onClose={() => setMediaViewerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212', // Back to Onyx Black background
    borderRadius: 16,
    padding: 16,
    marginBottom: 0, // Remove bottom margin since the PostItemContainer already has margins
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 0, // Remove border
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  user: {
    flexDirection: 'column',
  },
  author: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F7', // Soft White for author name
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
  timeAgo: {
    fontSize: 12,
    color: '#8E8E93', // Slate Gray for time
    marginTop: 3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 175, 188, 0.08)', // Very subtle teal background
  },
  caption: {
    fontSize: 15,
    color: '#F5F5F7', // Soft White for caption
    marginBottom: 14,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
  image: {
    width: '100%',
    height: width * 0.7, // Slightly taller aspect ratio
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#1E2B2F', // Midnight Green for image placeholder
  },
  videoContainer: {
    width: '100%',
    height: width * 0.7,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#1E2B2F', // Midnight Green for video placeholder
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  linkPreview: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.2)', // Subtle Teal Glow border
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#1E2B2F', // Midnight Green for link preview
  },
  linkImage: {
    width: 90,
    height: 90,
    backgroundColor: '#121212', // Onyx Black for image placeholder
  },
  linkContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F7', // Soft White for link title
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
  },
  linkDescription: {
    fontSize: 12,
    color: '#8E8E93', // Slate Gray for link description
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    lineHeight: 16,
  },
  linkUrl: {
    fontSize: 11,
    color: '#8E8E93', // Slate Gray for URL
    opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 175, 188, 0.1)', // Very subtle Teal Glow border
    paddingTop: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#8E8E93', // Slate Gray for action text
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
  },
  likedText: {
    color: '#FF453A', // Keep the iOS system red for likes
  },
  commentActiveText: {
    color: '#3BAFBC', // Teal Glow for comment active state
  }
});