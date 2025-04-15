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
  Modal,
  FlatList
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
  const [likesCount, setLikesCount] = useState(parseInt(post.likes_count || 0, 10));
  const [showComments, setShowComments] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [heartScale] = useState(new Animated.Value(0));
  const [youtubeVideoId, setYoutubeVideoId] = useState(null);
  const [youtubeModalVisible, setYoutubeModalVisible] = useState(false);
  const [isYoutubePlayerReady, setIsYoutubePlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [processedCaption, setProcessedCaption] = useState(post.caption || '');
  
  // Refs for touch handling
  const touchStartTimeRef = useRef(null);
  const touchMoveDetectedRef = useRef(false);
  const lastTouchPositionRef = useRef({ x: 0, y: 0 });
  const isPerformingActionRef = useRef(false);
  
  // Update state when post prop changes
  useEffect(() => {
    // Make sure we handle boolean or string 'true'
    const isLikedValue = post.is_liked === true || post.is_liked === 'true';
    console.log(`PostItem update effect for post ${post.post_id}: is_liked=${isLikedValue}, likes_count=${post.likes_count}`);
    setLiked(isLikedValue);
    setLikesCount(parseInt(post.likes_count || 0, 10));
  }, [post, post.is_liked, post.likes_count]);

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

  // Track touch start for the like button
  const handleTouchStart = (event) => {
    touchStartTimeRef.current = Date.now();
    touchMoveDetectedRef.current = false;
    
    // Store initial touch position
    lastTouchPositionRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY
    };
  };
  
  // Detect if user is moving/scrolling
  const handleTouchMove = (event) => {
    if (isPerformingActionRef.current) return;
    
    const currentPosition = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY
    };
    
    // Calculate distance moved
    const dx = Math.abs(currentPosition.x - lastTouchPositionRef.current.x);
    const dy = Math.abs(currentPosition.y - lastTouchPositionRef.current.y);
    
    // If moved more than threshold, mark as scrolling
    if (dx > 5 || dy > 5) {
      touchMoveDetectedRef.current = true;
    }
  };
  
  // Only register like if it was a deliberate tap, not scrolling
  const handleTouchEnd = useCallback((event) => {
    if (isPerformingActionRef.current) return;
    
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - (touchStartTimeRef.current || 0);
    
    // If touch was a tap (less than 300ms) and no movement was detected
    if (touchDuration < 300 && !touchMoveDetectedRef.current) {
      handleLike();
    }
    
    // Reset refs
    touchStartTimeRef.current = null;
    touchMoveDetectedRef.current = false;
  }, [handleLike]);

  const handleLike = async () => {
    if (isLoading || isPerformingActionRef.current) return;
    
    isPerformingActionRef.current = true;
    setIsLoading(true);
    
    try {
      // Optimistic UI update with proper integer conversion
      const newLikedState = !liked;
      setLiked(newLikedState);
      
      // Ensure likesCount is treated as a number for arithmetic operations
      const currentCount = parseInt(likesCount, 10) || 0;
      const newCount = newLikedState ? currentCount + 1 : Math.max(0, currentCount - 1);
      setLikesCount(newCount);
      
      // Haptic feedback
      if (newLikedState) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        animateHeart();
      }
      
      console.log(`Making like API call for post ${post.post_id}, expecting like state to be ${newLikedState}`);
      
      // Make API call
      const result = await toggleLike(post.post_id);
      
      // Update with server response
      const serverLiked = result.action === 'liked';
      const serverCount = parseInt(result.likes_count, 10) || 0;
      
      console.log(`Server response for post ${post.post_id}: liked=${serverLiked}, count=${serverCount}`);
      
      // Only update if different from our optimistic update
      if (serverLiked !== newLikedState) {
        console.log(`Correcting like state mismatch for post ${post.post_id}: client=${newLikedState}, server=${serverLiked}`);
        setLiked(serverLiked);
      }
      
      if (serverCount !== newCount) {
        console.log(`Correcting like count mismatch for post ${post.post_id}: client=${newCount}, server=${serverCount}`);
        setLikesCount(serverCount);
      }
      
      // Notify parent component about the update
      if (onUpdate) {
        onUpdate({
          is_liked: serverLiked,
          likes_count: serverCount
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert on error
      setLiked(post.is_liked || false);
      setLikesCount(parseInt(post.likes_count || 0, 10));
    } finally {
      setIsLoading(false);
      
      // Add a small delay before allowing another action
      setTimeout(() => {
        isPerformingActionRef.current = false;
      }, 300);
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

  // Helper: get all media items from post (supporting legacy and new format)
  const getPostMediaItems = (post) => {
    // New posts: array of media URLs
    if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
      // Use media_type to determine type for all, or guess by extension
      return post.media_urls.map(url => ({
        url,
        type: post.media_type || (url.endsWith('.mp4') ? 'video' : 'image'),
      }));
    }
    // Support for older posts
    if (Array.isArray(post.media_items) && post.media_items.length > 0) {
      return post.media_items;
    }
    if (post.media_url || post.signed_image_url) {
      return [{
        url: post.signed_image_url || post.media_url,
        type: post.media_type || 'image',
      }];
    }
    return [];
  };

  // Calculate grid layout based on number of items
  const getGridLayout = (numItems) => {
    if (numItems === 1) return { rows: 1, cols: 1 };
    if (numItems === 2) return { rows: 1, cols: 2 };
    if (numItems === 3) return { rows: 2, cols: 2 }; // 2x2 grid with one empty space
    if (numItems === 4) return { rows: 2, cols: 2 };
    return { rows: 2, cols: 2 }; // Max 4 items shown in grid, rest viewable in MediaViewer
  };

  // Handle media item click
  const handleMediaPress = (index) => {
    setSelectedMediaIndex(index);
    setMediaViewerVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Render the media grid
  const renderPostMedia = () => {
    const mediaItems = getPostMediaItems(post);
    if (!mediaItems.length) return null;

    const gridPadding = 40; // matches your margin calculations
    const gridGutter = 4;   // gutter between items
    const gridWidth = width - gridPadding;
    const itemSize = (gridWidth - gridGutter) / 2;
    const gridItems = mediaItems.slice(0, 4); // Show max 4 items in grid
    const hasMore = mediaItems.length > 4;

    // SINGLE IMAGE: take full width, large height
    if (mediaItems.length === 1) {
      return (
        <View style={[styles.mediaGrid, { width: gridWidth, alignSelf: 'center' }]}> 
          <TouchableOpacity
            style={{
              width: gridWidth,
              height: gridWidth * 0.75, // 4:3 aspect ratio
              borderRadius: 14,
              overflow: 'hidden',
            }}
            activeOpacity={0.9}
            onPress={() => handleMediaPress(0)}
          >
            {mediaItems[0].type === 'video' || mediaItems[0].url?.endsWith('.mp4') ? (
              <View style={styles.videoGridItem}>
                <Video
                  source={{ uri: mediaItems[0].url }}
                  style={styles.gridMedia}
                  resizeMode="cover"
                  shouldPlay={false}
                  isMuted={true}
                />
                <View style={styles.playIconContainer}>
                  <Ionicons name="play-circle" size={24} color="rgba(255, 255, 255, 0.8)" />
                </View>
              </View>
            ) : (
              <Image
                source={{ uri: mediaItems[0].url }}
                style={styles.gridMedia}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // MULTIPLE IMAGES: current grid logic
    return (
      <View style={[styles.mediaGrid, { width: gridWidth, alignSelf: 'center' }]}> 
        {gridItems.map((item, index) => {
          const isLastItem = index === 3 && hasMore;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.gridItem,
                {
                  width: itemSize,
                  height: itemSize,
                  marginRight: (index % 2 === 0) ? gridGutter : 0, // Right margin except for last in row
                  marginBottom: (index < 2) ? gridGutter : 0,      // Bottom margin for first row only
                }
              ]}
              activeOpacity={0.9}
              onPress={() => handleMediaPress(index)}
            >
              {item.type === 'video' || item.url?.endsWith('.mp4') ? (
                <View style={styles.videoGridItem}>
                  <Video
                    source={{ uri: item.url }}
                    style={styles.gridMedia}
                    resizeMode="cover"
                    shouldPlay={false}
                    isMuted={true}
                  />
                  <View style={styles.playIconContainer}>
                    <Ionicons name="play-circle" size={24} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                </View>
              ) : (
                <Image
                  source={{ uri: item.url }}
                  style={styles.gridMedia}
                  resizeMode="cover"
                />
              )}
              {isLastItem && (
                <View style={styles.moreOverlay}>
                  <Text style={styles.moreText}>+{mediaItems.length - 3}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
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

  // Check and log if like state was received properly
  useEffect(() => {
    console.log(`PostItem mounted: ID=${post.post_id}, is_liked=${post.is_liked}, likes_count=${post.likes_count}`);
    
    return () => {
      console.log(`PostItem unmounting: ID=${post.post_id}, final state: liked=${liked}, count=${likesCount}`);
    };
  }, []);
  
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
          onPressIn={handleTouchStart}
          onTouchMove={handleTouchMove}
          onPressOut={handleTouchEnd}
          disabled={isLoading || isPerformingActionRef.current}
          style={[
            styles.actionButton,
            styles.likeButtonContainer
          ]}
          activeOpacity={0.7}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 0 }}
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
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 0 }}
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
        media={getPostMediaItems(post)}
        initialIndex={selectedMediaIndex}
        onClose={() => {
          setMediaViewerVisible(false);
          setSelectedMediaIndex(0);
        }}
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
    width: width - 32, // Account for container padding
    height: width * 0.7,
    borderRadius: 12,
    backgroundColor: '#1E2B2F',
  },
  videoContainer: {
    width: width - 32, // Account for container padding
    height: width * 0.7,
    borderRadius: 12,
    backgroundColor: '#1E2B2F',
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
  likeButtonContainer: {
    minWidth: 80, // Give more touch area
    paddingHorizontal: 2,
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
  },
  
  // Multi-image carousel styles
  multiMediaCarouselContainer: {
    width: '100%',
    height: width * 0.7, // Maintain aspect ratio
    backgroundColor: '#18181A',
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  multiMediaItem: {
    width: width - 32, // Account for container padding
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiMediaList: {
    alignItems: 'center',
  },
  mediaCountContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaCountText: {
    color: '#F5F5F7',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
    // width and alignSelf now set inline
  },
  gridItem: {
    overflow: 'hidden',
    // No flex properties! Sizing is handled inline
  },
  gridMedia: {
    width: '100%',
    height: '100%',
  },
  videoGridItem: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
});