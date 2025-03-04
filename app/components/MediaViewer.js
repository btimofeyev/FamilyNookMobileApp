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
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function MediaViewer({ visible, media, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef(null);

  const handleClose = () => {
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

  const renderContent = () => {
    if (!media) return null;

    if (media.type === 'video' || media.url?.endsWith('.mp4')) {
      return (
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.videoContainer}
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
            ref={videoRef}
            source={{ uri: media.url }}
            style={styles.video}
            resizeMode="contain"
            shouldPlay={false}
            isLooping={true}
            onPlaybackStatusUpdate={status => setIsPlaying(status.isPlaying)}
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
        source={{ uri: media.url }}
        style={styles.image}
        resizeMode="contain"
      />
    );
  };

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
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleClose}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.contentContainer}>
            {renderContent()}
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  safeArea: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width,
    height: height * 0.8,
  },
  videoContainer: {
    width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButtonContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});