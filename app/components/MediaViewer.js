// app/components/MediaViewer.js
import React, { useRef, useState } from 'react';
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
  
  // For pinch gesture base
  const pinchBase = useRef(1);
  
  // For double tap detection
  const lastTapRef = useRef(0);
  const lastTapTimeoutRef = useRef(null);

  // Format media to array if it's a single item
  const mediaArray = Array.isArray(media) ? media : media ? [media] : [];

  // Reset to initial index when modal opens
  React.useEffect(() => {
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
      videoRef.current.stopAsync();
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

  React.useEffect(() => {
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

  // Handle pinch gesture
  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        // Apply the new scale based on the pinch gesture
        const newScale = pinchBase.current * event.nativeEvent.scale;
        
        // Limit scale between 0.5 and 5
        if (newScale >= 0.5 && newScale <= 5) {
          scale.setValue(newScale);
        }
      }
    }
  );

  const onPinchHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.BEGAN) {
      // Save the current scale as the base for this pinch gesture
      pinchBase.current = lastScale.current;
    }
    else if (event.nativeEvent.oldState === State.ACTIVE) {
      // Update the last scale
      const newScale = pinchBase.current * event.nativeEvent.scale;
      lastScale.current = Math.max(0.5, Math.min(5, newScale));
      
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
    }
  };

  // Handle pan gesture
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
        // Only apply translation if zoomed in
        if (lastScale.current > 1) {
          // Calculate the new translations
          const newTranslateX = lastTranslateX.current + event.nativeEvent.translationX;
          const newTranslateY = lastTranslateY.current + event.nativeEvent.translationY;
          
          // Calculate boundaries based on scale
          const maxTranslateX = (width * (lastScale.current - 1)) / 2;
          const maxTranslateY = (height * (lastScale.current - 1)) / 2;
          
          // Apply boundaries
          if (Math.abs(newTranslateX) <= maxTranslateX) {
            translateX.setValue(event.nativeEvent.translationX);
          }
          
          if (Math.abs(newTranslateY) <= maxTranslateY) {
            translateY.setValue(event.nativeEvent.translationY);
          }
        }
      }
    }
  );

  const onPanHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // Update the last translations
      lastTranslateX.current += event.nativeEvent.translationX;
      lastTranslateY.current += event.nativeEvent.translationY;
      
      // Calculate boundaries based on scale
      const maxTranslateX = (width * (lastScale.current - 1)) / 2;
      const maxTranslateY = (height * (lastScale.current - 1)) / 2;
      
      // Enforce boundaries
      if (Math.abs(lastTranslateX.current) > maxTranslateX) {
        lastTranslateX.current = lastTranslateX.current > 0 ? maxTranslateX : -maxTranslateX;
        Animated.spring(translateX, {
          toValue: lastTranslateX.current,
          friction: 7,
          tension: 40,
          useNativeDriver: true
        }).start();
      }
      
      if (Math.abs(lastTranslateY.current) > maxTranslateY) {
        lastTranslateY.current = lastTranslateY.current > 0 ? maxTranslateY : -maxTranslateY;
        Animated.spring(translateY, {
          toValue: lastTranslateY.current,
          friction: 7,
          tension: 40,
          useNativeDriver: true
        }).start();
      }
      
      // Reset the animated values for the next gesture
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
                          { translateX },
                          { translateY },
                          { scale }
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

  const renderItem = ({ item, index }) => {
    // Reset transformation when changing slides
    if (index !== currentIndex) {
      resetTransformations();
    }
    
    if (item.type === 'video' || item.url?.endsWith('.mp4')) {
      return (
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.mediaContainer}
          onPress={() => {
            if (videoRef.current) {
              if (isPlaying) {
                videoRef.current.pauseAsync();
              } else {
                videoRef.current.playAsync();
              }
              setIsPlaying(!isPlaying);
            }
          }}
        >
          <Video
            ref={index === currentIndex ? videoRef : null}
            source={{ uri: item.url }}
            style={styles.media}
            resizeMode="contain"
            shouldPlay={false}
            isLooping={true}
            onPlaybackStatusUpdate={status => {
              if (index === currentIndex) {
                setIsPlaying(status.isPlaying);
              }
            }}
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
      if (videoRef.current) {
        videoRef.current.stopAsync();
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