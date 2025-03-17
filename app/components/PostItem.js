// app/components/PostItem.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Animated,
  Dimensions,
  Platform,
  Linking,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Video } from 'expo-av';
import TimeAgo from './TimeAgo';
import { toggleLike, deletePost } from '../api/feedService';
import CommentSection from './CommentSection';
import MediaViewer from './MediaViewer';
import { BlurView } from 'expo-blur';
import YoutubePlayer from 'react-native-youtube-iframe';

const { width } = Dimensions.get('window');

export default function PostItem({ post, onUpdate, isCurrentUser }) {
  const [liked, setLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaItem, setMediaItem] = useState(null);
  const [heartScale] = useState(new Animated.Value(0));
  const [youtubeVideoId, setYoutubeVideoId] = useState(null);
  const [youtubeModalVisible, setYoutubeModalVisible] = useState(false);
  const [isYoutubePlayerReady, setIsYoutubePlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [processedCaption, setProcessedCaption] = useState(post.caption || '');

  // Process caption and extract YouTube links if needed
  useEffect(() => {
    // First check if we have a link preview that's YouTube
    if (post.link_preview && post.link_preview.url && isYouTubeLink(post.link_preview.url)) {
      const videoId = extractYouTubeVideoId(post.link_preview.url);
      setYoutubeVideoId(videoId);
      
      // If the caption contains only the YouTube URL, hide it completely
      if (post.caption) {
        // Check if caption is just the URL (allowing for whitespace)
        const urlRegex = new RegExp(`^\\s*(${escapeRegExp(post.link_preview.url)})\\s*$`);
        if (urlRegex.test(post.caption)) {
          setProcessedCaption(''); // Hide caption if it's just the URL
        } else {
          // If caption contains the URL plus other text, remove just the URL
          const cleanedCaption = post.caption.replace(post.link_preview.url, '').trim();
          setProcessedCaption(cleanedCaption);
        }
      }
    } 
    // If no link preview but caption contains a YouTube link
    else if (post.caption) {
      const youtubeMatch = findYouTubeLink(post.caption);
      if (youtubeMatch) {
        const videoId = extractYouTubeVideoId(youtubeMatch);
        if (videoId) {
          setYoutubeVideoId(videoId);
          
          // Remove the YouTube URL from caption
          const cleanedCaption = post.caption.replace(youtubeMatch, '').trim();
          setProcessedCaption(cleanedCaption);
        }
      } else {
        setProcessedCaption(post.caption);
      }
    }
  }, [post]);

  // Helper function to escape special characters in regex
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Find YouTube links in text
  const findYouTubeLink = (text) => {
    const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)[a-zA-Z0-9_-]{11})/;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  };

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
  const lastTap = useRef(0);
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

  const handleLinkPress = () => {
    if (post.link_preview && post.link_preview.url) {
      // Check if it's a YouTube link
      if (isYouTubeLink(post.link_preview.url)) {
        handleYoutubePress();
      } else {
        // For regular links, just open in browser
        Linking.openURL(post.link_preview.url)
          .catch((err) => console.error('Error opening link:', err));
      }
    }
  };
  
  const handleYoutubePress = () => {
    if (youtubeVideoId) {
      // Show the YouTube player modal
      setYoutubeModalVisible(true);
      setPlaying(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const onYoutubeStateChange = useCallback((state) => {
    if (state === 'ended') {
      setPlaying(false);
    }
    if (state === 'playing') {
      setPlaying(true);
    }
    if (state === 'paused') {
      setPlaying(false);
    }
  }, []);

  // Helper function to check for YouTube links
  const isYouTubeLink = (url) => {
    return /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
  };

  // Extract YouTube video ID from URL
  const extractYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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

  const renderYoutubeModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={youtubeModalVisible}
        onRequestClose={() => {
          setYoutubeModalVisible(false);
          setPlaying(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={styles.blurView}>
            <View style={styles.youtubeModalContent}>
              <View style={styles.youtubePlayerContainer}>
                {youtubeVideoId && (
                  <YoutubePlayer
                    height={220}
                    width={width - 48}
                    play={playing}
                    videoId={youtubeVideoId}
                    onChangeState={onYoutubeStateChange}
                    onReady={() => setIsYoutubePlayerReady(true)}
                    initialPlayerParams={{
                      preventFullScreen: false,
                      cc_lang_pref: "en",
                      showClosedCaptions: true,
                    }}
                  />
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setYoutubeModalVisible(false);
                  setPlaying(false);
                }}
              >
                <Ionicons name="close-circle" size={32} color="#F5F5F7" />
              </TouchableOpacity>
              
              {post.link_preview && (
                <View style={styles.videoInfoContainer}>
                  <Text style={styles.videoTitle}>{post.link_preview.title}</Text>
                  {post.link_preview.description && (
                    <Text style={styles.videoDescription}>{post.link_preview.description}</Text>
                  )}
                  <TouchableOpacity 
                    style={styles.openInYoutubeButton}
                    onPress={() => {
                      setYoutubeModalVisible(false);
                      const url = post.link_preview.url || `https://youtu.be/${youtubeVideoId}`;
                      Linking.openURL(url).catch(err => console.error(err));
                    }}
                  >
                    <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                    <Text style={styles.openInYoutubeText}>Open in YouTube</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </BlurView>
        </View>
      </Modal>
    );
  };

  const renderLinkPreview = () => {
    if (!youtubeVideoId) return null;
    
    // YouTube preview
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={handleYoutubePress}
        style={styles.youtubePreviewContainer}
      >
        <Image 
          source={{ uri: `https://img.youtube.com/vi/${youtubeVideoId}/0.jpg` }} 
          style={styles.youtubeThumbnail}
          resizeMode="cover"
        />
        <View style={styles.youtubeOverlay}>
          <View style={styles.youtubePlayButton}>
            <Ionicons name="logo-youtube" size={30} color="#FF0000" />
          </View>
        </View>
        {post.link_preview && post.link_preview.title && (
          <View style={styles.youtubeTitleContainer}>
            <Text style={styles.youtubeTitle} numberOfLines={2}>
              {post.link_preview.title}
            </Text>
          </View>
        )}
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
      
      {processedCaption ? (
        <Text style={styles.caption}>{processedCaption}</Text>
      ) : null}
      
      {renderPostMedia()}
      {renderLinkPreview()}
      
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
      
      {renderYoutubeModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212', // Onyx Black background
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 0,
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
    color: '#F5F5F7', // Soft White
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.2,
  },
  timeAgo: {
    fontSize: 12,
    color: '#8E8E93', // Slate Gray
    marginTop: 3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 175, 188, 0.08)', // Very subtle teal
  },
  caption: {
    fontSize: 15,
    color: '#F5F5F7', // Soft White
    marginBottom: 14,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
  },
  image: {
    width: '100%',
    height: width * 0.7,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#1E2B2F', // Midnight Green
  },
  videoContainer: {
    width: '100%',
    height: width * 0.7,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#1E2B2F', // Midnight Green
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
  
  // YouTube-specific styles
  youtubePreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#1E2B2F', // Midnight Green
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.2)', // Subtle teal border
  },
  youtubeThumbnail: {
    width: '100%',
    height: width * 0.5, // 16:9 aspect ratio
    backgroundColor: '#121212', // Onyx Black
  },
  youtubeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    height: width * 0.5, // Same as thumbnail height
  },
  youtubePlayButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeTitleContainer: {
    padding: 12,
  },
  youtubeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F7', // Soft White
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
  },
  
  // YouTube modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeModalContent: {
    width: width - 32,
    backgroundColor: '#121212', // Onyx Black
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  youtubePlayerContainer: {
    width: '100%',
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    padding: 8,
  },
  videoInfoContainer: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F7', // Soft White
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.2,
  },
  videoDescription: {
    fontSize: 14,
    color: '#8E8E93', // Slate Gray
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    lineHeight: 20,
  },
  openInYoutubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Very subtle red
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  openInYoutubeText: {
    color: '#FF0000', // YouTube red
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  
  // Post actions section
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 175, 188, 0.1)', // Very subtle teal border
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
    color: '#8E8E93', // Slate Gray
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
  },
  likedText: {
    color: '#FF453A', // iOS system red
  },
  commentActiveText: {
    color: '#3BAFBC', // Teal Glow
  }
});