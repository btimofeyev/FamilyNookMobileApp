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

const { width, height } = Dimensions.get('window');

export default function MediaViewer({ visible, media, initialIndex = 0, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const videoRef = useRef(null);

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
    
    // Default to image
    return (
      <Image
        source={{ uri: item.url }}
        style={styles.media}
        resizeMode="contain"
      />
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
            onMomentumScrollEnd={handleScrollEnd}
            renderItem={renderItem}
            keyExtractor={(item, index) => `media-${index}`}
          />
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
});