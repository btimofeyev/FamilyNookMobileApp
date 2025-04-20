// app/components/MediaViewer.js
import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Modal, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
  FlatList,
  Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { 
  PinchGestureHandler,
  PanGestureHandler,
  State,
  GestureHandlerRootView
} from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

export default function MediaViewer({ visible, media, initialIndex = 0, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const videoRef = useRef(null);
  
  // Image zoom and pan values
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  // Keep track of cumulative values for gestures
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  
  // For double tap detection
  const lastTapRef = useRef(0);
  const lastTapTimeoutRef = useRef(null);

  // Format media to array if it's a single item
  const mediaArray = Array.isArray(media) ? media : media ? [media] : [];

  // Reset to initial index when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      resetTransformations();
      
      // Wait for modal to be visible before scrolling
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const resetTransformations = () => {
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    lastScale.current = 1;
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  };

  const handleClose = () => {
    // Stop video if playing
    if (videoRef.current) {
      videoRef.current.stopAsync().catch(err => console.log('Error stopping video:', err));
    }
    
    // Play haptic feedback when closing the viewer
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  useEffect(() => {
    if (visible) {
      // Fade in animation when modal becomes visible
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    
    // Clear any pending timeouts when unmounting
    return () => {
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current);
      }
    };
  }, [visible, fadeAnim]);

  // Handle tap for zooming
  const handleImageTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Clear any pending timeout
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current);
        lastTapTimeoutRef.current = null;
      }
      
      // Double tap detected
      if (lastScale.current > 1) {
        // Reset zoom and position
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            friction: 7,
            tension: 40,
            useNativeDriver: true
          }),
          Animated.spring(translateX, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true
          }),
          Animated.spring(translateY, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true
          })
        ]).start();
        
        lastScale.current = 1;
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
      } else {
        // Zoom in to 2.5x
        Animated.spring(scale, {
          toValue: 2.5,
          friction: 7,
          tension: 40,
          useNativeDriver: true
        }).start();
        
        lastScale.current = 2.5;
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      lastTapRef.current = 0; // Reset tap timestamp
    } else {
      // Single tap
      lastTapRef.current = now;
      
      // Set a timeout to handle single tap actions
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current);
      }
      
      lastTapTimeoutRef.current = setTimeout(() => {
        // This will execute if no double-tap occurs
        // You can toggle UI elements here if needed
      }, DOUBLE_TAP_DELAY);
    }
  };

  // FIXED: Improved pinch gesture handling
  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        // Apply the new scale based on the base scale and the current gesture
        const newScale = lastScale.current * event.nativeEvent.scale;
        
        // Limit scale between 0.5 and 5
        if (newScale >= 0.5 && newScale <= 5) {
          scale.setValue(newScale);
        }
      }
    }
  );

  const onPinchHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // Update the last scale
      lastScale.current *= event.nativeEvent.scale;
      lastScale.current = Math.max(0.5, Math.min(5, lastScale.current));
      
      // If scaled below 1.1, snap back to 1
      if (lastScale.current < 1.1) {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            friction: 7,
            tension: 40,
            useNativeDriver: true
          }),
          Animated.spring(translateX, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true
          }),
          Animated.spring(translateY, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true
          })
        ]).start();
        
        lastScale.current = 1;
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
      }
      
      // Set the animated value to the accumulated scale
      scale.setValue(lastScale.current);
    }
  };

  // FIXED: Properly handling pan gestures 
  const onPanGestureEvent = Animated.event(
    [{ 
      nativeEvent: { 
        translationX: translateX,
        translationY: translateY 
      } 
    }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        if (lastScale.current <= 1) return; // Only allow panning when zoomed in
        
        // Calculate the maximum allowed pan distances based on current scale
        const maxTranslateX = (width * (lastScale.current - 1)) / 2;
        const maxTranslateY = (height * (lastScale.current - 1)) / 2;
        
        // Calculate new positions
        let newTranslateX = lastTranslateX.current + event.nativeEvent.translationX;
        let newTranslateY = lastTranslateY.current + event.nativeEvent.translationY;
        
        // Apply constraints
        newTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX));
        newTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY));
        
        // Update the animated values
        translateX.setValue(newTranslateX);
        translateY.setValue(newTranslateY);
      }
    }
  );

  const onPanHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // Only handle panning when zoomed in
      if (lastScale.current <= 1) return; 
      
      // Update the accumulated translations
      lastTranslateX.current += event.nativeEvent.translationX;
      lastTranslateY.current += event.nativeEvent.translationY;
      
      // Apply constraints
      const maxTranslateX = (width * (lastScale.current - 1)) / 2;
      const maxTranslateY = (height * (lastScale.current - 1)) / 2;
      
      lastTranslateX.current = Math.max(-maxTranslateX, Math.min(maxTranslateX, lastTranslateX.current));
      lastTranslateY.current = Math.max(-maxTranslateY, Math.min(maxTranslateY, lastTranslateY.current));
      
      // Reset the animated values for the next gesture
      translateX.setValue(lastTranslateX.current);
      translateY.setValue(lastTranslateY.current);
    } else if (event.nativeEvent.state === State.BEGAN) {
      // Reset translation values when starting a new pan gesture
      translateX.setValue(lastTranslateX.current);
      translateY.setValue(lastTranslateY.current);
    }
  };

  const renderImage = (item) => {
    return (
      <GestureHandlerRootView style={styles.mediaContainer}>
        <PinchGestureHandler
          onGestureEvent={onPinchGestureEvent}
          onHandlerStateChange={onPinchHandlerStateChange}
        >
          <Animated.View style={styles.mediaWrapper}>
            <PanGestureHandler
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanHandlerStateChange}
              enabled={lastScale.current > 1}
              avgTouches
            >
              <Animated.View style={styles.mediaWrapper}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={handleImageTap}
                  style={styles.touchableImage}
                >
                  <Animated.Image
                    source={{ uri: item.url }}
                    style={[
                      styles.media,
                      { 
                        transform: [
                          { scale },
                          { translateX },
                          { translateY }
                        ] 
                      }
                    ]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </GestureHandlerRootView>
    );
  };

  // FIXED: Improved video rendering and state management
  const renderItem = ({ item, index }) => {
    // Reset transformation when changing slides
    if (index !== currentIndex) {
      resetTransformations();
    }
    
    const isVideo = item.type === 'video' || item.url?.endsWith('.mp4') || item.url?.endsWith('.mov');
    
    if (isVideo) {
      return (
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.mediaContainer}
          onPress={() => {
            if (index === currentIndex && videoRef.current) {
              const newPlayingState = !isPlaying;
              if (newPlayingState) {
                videoRef.current.playAsync().catch(err => console.log('Error playing video:', err));
              } else {
                videoRef.current.pauseAsync().catch(err => console.log('Error pausing video:', err));
              }
              setIsPlaying(newPlayingState);
            }
          }}
        >
          <Video
            ref={videoRef}
            source={{ uri: item.url }}
            style={styles.media}
            resizeMode="contain"
            shouldPlay={false}
            isLooping={true}
            onPlaybackStatusUpdate={(status) => {
              if (index === currentIndex) {
                setIsPlaying(status.isPlaying);
              }
            }}
            useNativeControls={false}
          />
          {!isPlaying && (
            <View style={styles.playButtonContainer}>
              <Ionicons name="play-circle" size={72} color="rgba(255, 255, 255, 0.8)" />
            </View>
          )}
        </TouchableOpacity>
      );
    }
    
    // Image with zoom capabilities
    return renderImage(item);
  };

  // Handle scroll end to update current index
  const handleScrollEnd = (e) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      resetTransformations();
      
      // Stop video if playing when scrolling away
      if (isPlaying && videoRef.current) {
        videoRef.current.stopAsync().catch(err => console.log('Error stopping video:', err));
        setIsPlaying(false);
      }
      Haptics.selectionAsync();
    }
  };

  if (mediaArray.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View 
          style={[
            styles.container,
            { opacity: fadeAnim }
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleClose}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              
              {mediaArray.length > 1 && (
                <View style={styles.mediaCounter}>
                  <Text style={styles.mediaCounterText}>
                    {currentIndex + 1} / {mediaArray.length}
                  </Text>
                </View>
              )}
            </View>
            
            <FlatList
              ref={flatListRef}
              data={mediaArray}
              horizontal
              pagingEnabled
              scrollEnabled={lastScale.current <= 1}
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialIndex}
              getItemLayout={(data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              onMomentumScrollEnd={handleScrollEnd}
              renderItem={renderItem}
              keyExtractor={(item, index) => `media-${index}`}
              onScrollToIndexFailed={(info) => {
                const wait = new Promise(resolve => setTimeout(resolve, 500));
                wait.then(() => {
                  flatListRef.current?.scrollToIndex({ 
                    index: info.index, 
                    animated: false 
                  });
                });
              }}
            />
          </SafeAreaView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mediaCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  mediaContainer: {
    width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaWrapper: {
    width: width,
    height: height,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  touchableImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width * 0.98,
    height: height * 0.85,
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  playButtonContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});