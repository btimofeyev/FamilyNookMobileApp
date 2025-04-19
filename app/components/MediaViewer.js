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
  Text,
  PanResponder,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function MediaViewer({ visible, media, initialIndex = 0, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const videoRef = useRef(null);
  
  // State for zooming
  const [scale, setScale] = useState(1);
  const [lastTap, setLastTap] = useState(null);
  const [panEnabled, setPanEnabled] = useState(false);
  
  // Animated values for zooming
  const pan = useRef(new Animated.ValueXY()).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  
  // Reset scale and pan when switching items or closing modal
  React.useEffect(() => {
    resetZoom();
  }, [currentIndex, visible]);
  
  // Reset zoom state
  const resetZoom = () => {
    setScale(1);
    setPanEnabled(false);
    pinchScale.setValue(1);
    pan.setValue({ x: 0, y: 0 });
  };
  
  // Handle double tap to zoom
  const handleImageTap = (event) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (scale > 1) {
        // Zoom out
        Animated.parallel([
          Animated.spring(pinchScale, { 
            toValue: 1, 
            friction: 3,
            tension: 40,
            useNativeDriver: true 
          }),
          Animated.spring(pan, { 
            toValue: { x: 0, y: 0 },
            friction: 3,
            tension: 40,
            useNativeDriver: true 
          })
        ]).start();
        setScale(1);
        setPanEnabled(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        // Zoom in
        Animated.spring(pinchScale, { 
          toValue: 2, 
          friction: 3,
          tension: 40,
          useNativeDriver: true 
        }).start();
        setScale(2);
        setPanEnabled(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setLastTap(null);
    } else {
      // Single tap (or first tap of double tap)
      setLastTap(now);
      
      // If it's a video or we're not zoomed in, handle regular tap
      if (media[currentIndex].type === 'video' || media[currentIndex].url?.endsWith('.mp4') || scale === 1) {
        // Toggle play/pause for video, or show/hide UI for images
        if (media[currentIndex].type === 'video' || media[currentIndex].url?.endsWith('.mp4')) {
          if (videoRef.current) {
            if (isPlaying) {
              videoRef.current.pauseAsync();
            } else {
              videoRef.current.playAsync();
            }
            setIsPlaying(!isPlaying);
          }
        }
      }
      
      // To prevent single tap from closing instantly when zoomed
      if (scale === 1) {
        setTimeout(() => {
          if (lastTap && (Date.now() - lastTap) >= DOUBLE_TAP_DELAY) {
            setLastTap(null);
          }
        }, DOUBLE_TAP_DELAY);
      }
    }
  };
  
  // Set up pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => panEnabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only handle moves when zoomed in
        return panEnabled && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2);
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        
        // Restrict panning beyond image bounds
        const maxPanX = Math.max(0, (width * scale - width) / 2);
        const maxPanY = Math.max(0, (height * scale - height) / 2);
        
        let newX = pan.x._value;
        let newY = pan.y._value;
        
        // Limit X bounds
        if (Math.abs(newX) > maxPanX) {
          newX = newX > 0 ? maxPanX : -maxPanX;
        }
        
        // Limit Y bounds
        if (Math.abs(newY) > maxPanY) {
          newY = newY > 0 ? maxPanY : -maxPanY;
        }
        
        // Animate to valid position if needed
        if (newX !== pan.x._value || newY !== pan.y._value) {
          Animated.spring(pan, {
            toValue: { x: newX, y: newY },
            friction: 5,
            tension: 40,
            useNativeDriver: true
          }).start();
        }
        
        // If panning was minimal and we're not zoomed, allow FlatList to scroll
        if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10 && scale === 1) {
          flatListRef.current?.setNativeProps({ scrollEnabled: true });
        }
      }
    })
  ).current;

  // Reset to initial index when modal opens
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      // Wait for modal to be visible before scrolling
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false
        });
      }, 100);
    }
  }, [visible, initialIndex]);

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
  }, [visible, fadeAnim]);

  const renderItem = ({ item, index }) => {
    // Create the transform style for zooming and panning
    const imageTransform = [
      { translateX: pan.x },
      { translateY: pan.y },
      { scale: pinchScale }
    ];
    
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
    
    // Default to image with zoom capability
    return (
      <View 
        style={styles.mediaContainer}
        {...(index === currentIndex ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.zoomableContainer}
          onPress={handleImageTap}
        >
          <Animated.Image
            source={{ uri: item.url }}
            style={[
              styles.media,
              { transform: index === currentIndex ? imageTransform : [] }
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    );
  };

  // Handle scroll end to update current index
  const handleScrollEnd = (e) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      // Stop video if playing when scrolling away
      if (videoRef.current) {
        videoRef.current.stopAsync();
        setIsPlaying(false);
      }
      Haptics.selectionAsync();
    }
  };

  if (!Array.isArray(media)) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" />
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
            
            <View style={styles.mediaCounter}>
              <Text style={styles.mediaCounterText}>
                {currentIndex + 1} / {media.length}
              </Text>
            </View>
          </View>
          
          <FlatList
            ref={flatListRef}
            data={media}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            scrollEnabled={scale === 1} // Disable scrolling when zoomed
            onMomentumScrollEnd={handleScrollEnd}
            renderItem={renderItem}
            keyExtractor={(item, index) => `media-${index}`}
          />
          
          {/* Zoom instruction indicator */}
          {media[currentIndex]?.type !== 'video' && !media[currentIndex]?.url?.endsWith('.mp4') && (
            <View style={styles.zoomInstructionContainer}>
              <Text style={styles.zoomInstructionText}>
                Double-tap to zoom
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Animated.View>
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
    overflow: 'hidden',
  },
  zoomableContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width * 0.98,
    height: height * 0.85,
    alignSelf: 'center',
    resizeMode: 'contain',
    borderRadius: 18,
    backgroundColor: '#000',
  },
  playButtonContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomInstructionContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  zoomInstructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  }
});