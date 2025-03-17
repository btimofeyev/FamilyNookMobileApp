// app/components/CreatePostForm.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Image, 
  ActivityIndicator,
  Alert,
  Platform,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createPost } from '../api/feedService';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import * as Haptics from 'expo-haptics';

export default function CreatePostForm({ familyId, onPostCreated, onCancel }) {
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [youtubePreview, setYoutubePreview] = useState(null);
  const videoRef = useRef(null);

  // Check caption for YouTube links on change
  useEffect(() => {
    detectYouTubeLink(caption);
  }, [caption]);

  const detectYouTubeLink = (text) => {
    // Reset YouTube preview if caption is empty
    if (!text || text.trim() === '') {
      setYoutubePreview(null);
      return;
    }

    // Look for YouTube links in text
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = text.match(youtubeRegex);
    
    if (match) {
      const url = match[0];
      const videoId = extractYouTubeVideoId(url);
      
      if (videoId) {
        // Set preview data
        setYoutubePreview({
          videoId,
          url,
          thumbnail: `https://img.youtube.com/vi/${videoId}/0.jpg`
        });
        
        // Provide haptic feedback to indicate link detection
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setYoutubePreview(null);
      }
    } else {
      setYoutubePreview(null);
    }
  };

  const extractYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setMedia({
          uri: result.assets[0].uri,
          type: 'image/jpeg', // Assuming JPEG format
          fileName: result.assets[0].uri.split('/').pop(),
          isVideo: false
        });
        setShowMediaOptions(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        videoMaxDuration: 60, // Limit videos to 60 seconds
      });

      if (!result.canceled) {
        // Check video duration if possible
        if (result.assets[0].duration && result.assets[0].duration > 60000) {
          Alert.alert('Video Too Long', 'Please select a video shorter than 60 seconds');
          return;
        }

        setMedia({
          uri: result.assets[0].uri,
          type: 'video/mp4', // Assuming MP4 format
          fileName: result.assets[0].uri.split('/').pop(),
          isVideo: true
        });
        setShowMediaOptions(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const toggleMediaOptions = () => {
    setShowMediaOptions(!showMediaOptions);
    Haptics.selectionAsync();
  };

  const handleSubmit = async () => {
    if (!caption.trim() && !media && !youtubePreview) {
      Alert.alert('Error', 'Please add a caption, media, or link to your post');
      return;
    }

    setIsSubmitting(true);
    try {
      // If we're posting a YouTube link, make sure the full URL is in the caption
      // This ensures the backend can detect and process it correctly
      let finalCaption = caption;
      
      // Don't include any modifications for submission - let the backend handle it
      // The full URL is needed for proper link preview generation

      await createPost(familyId, { 
        caption: finalCaption, 
        media,
        mediaType: media ? (media.isVideo ? 'video' : 'image') : null 
      });
      
      onPostCreated();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reset form
      setCaption('');
      setMedia(null);
      setYoutubePreview(null);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBackground = () => {
    // If we're on iOS, we can use BlurView for the Apple-like frosted glass effect
    if (Platform.OS === 'ios') {
      return (
        <BlurView 
          intensity={10} 
          tint="dark" 
          style={StyleSheet.absoluteFill} 
        />
      );
    }
    // For other platforms, just use the background color
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#121212' }]} />;
  };

  const renderMediaPreview = () => {
    if (!media) return null;

    return (
      <View style={styles.mediaPreview}>
        {media.isVideo ? (
          <Video
            ref={videoRef}
            source={{ uri: media.uri }}
            style={styles.previewVideo}
            useNativeControls
            resizeMode="cover"
            isLooping={false}
            isMuted={false}
            shouldPlay={false}
          />
        ) : (
          <Image source={{ uri: media.uri }} style={styles.previewImage} />
        )}
        <TouchableOpacity 
          style={styles.removeMediaButton}
          onPress={() => {
            setMedia(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons name="close-circle-sharp" size={24} color="#FF453A" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderYoutubePreview = () => {
    if (!youtubePreview) return null;

    return (
      <View style={styles.youtubePreview}>
        <Image 
          source={{ uri: youtubePreview.thumbnail }}
          style={styles.youtubeThumbnail}
          resizeMode="cover"
        />
        
        <View style={styles.youtubeOverlay}>
          <View style={styles.youtubePlayIcon}>
            <Ionicons name="logo-youtube" size={28} color="#FF0000" />
          </View>
        </View>
        
        <View style={styles.youtubeInfo}>
          <Text style={styles.youtubeLabel}>YouTube Video</Text>
          <TouchableOpacity 
            style={styles.removeYoutubeButton}
            onPress={() => {
              // Remove the YouTube link from the caption
              const updatedCaption = caption.replace(youtubePreview.url, '').trim();
              setCaption(updatedCaption);
              setYoutubePreview(null);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={styles.removeYoutubeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderBackground()}
      
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        placeholderTextColor="#8E8E93"
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={500}
        selectionColor="#3BAFBC"
      />
      
      {renderMediaPreview()}
      {renderYoutubePreview()}
      
      {showMediaOptions && (
        <View style={styles.mediaOptionsContainer}>
          <Pressable 
            style={styles.mediaOptionButton}
            onPress={pickImage}
            android_ripple={{ color: 'rgba(59, 175, 188, 0.2)' }}
          >
            <Ionicons name="image-outline" size={24} color="#3BAFBC" />
            <Text style={styles.mediaOptionText}>Photo</Text>
          </Pressable>
          
          <Pressable 
            style={styles.mediaOptionButton}
            onPress={pickVideo}
            android_ripple={{ color: 'rgba(59, 175, 188, 0.2)' }}
          >
            <Ionicons name="videocam-outline" size={24} color="#3BAFBC" />
            <Text style={styles.mediaOptionText}>Video</Text>
          </Pressable>
        </View>
      )}
      
      <View style={styles.actions}>
        <View style={styles.mediaButtons}>
          <TouchableOpacity 
            style={[
              styles.mediaButton,
              showMediaOptions && styles.mediaButtonActive
            ]}
            onPress={toggleMediaOptions}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color="#3BAFBC" />
            <Text style={styles.mediaButtonText}>Add Media</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.submitButtons}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.postButtonContainer}
            onPress={handleSubmit}
            disabled={(!caption.trim() && !media && !youtubePreview) || isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={(!caption.trim() && !media && !youtubePreview) || isSubmitting ? 
                ['rgba(30, 43, 47, 0.5)', 'rgba(59, 175, 188, 0.5)'] : 
                ['#1E2B2F', '#3BAFBC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.postButton}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#F5F5F7" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  input: {
    minHeight: 100,
    fontSize: 17,
    color: '#F5F5F7', // Soft White for text
    textAlignVertical: 'top',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2, // Apple-style tight letter spacing
    zIndex: 1, // Ensure input is above the BlurView
  },
  mediaPreview: {
    position: 'relative',
    marginBottom: 16,
    zIndex: 1, // Ensure preview is above the BlurView
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#1E2B2F', // Midnight Green for image placeholder
  },
  previewVideo: {
    width: '100%',
    height: 200,
    backgroundColor: '#1E2B2F', // Midnight Green for video placeholder
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(18, 18, 18, 0.7)', // Onyx Black with opacity
    borderRadius: 12,
    padding: 2,
  },
  mediaOptionsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    zIndex: 1,
    backgroundColor: 'rgba(18, 18, 18, 0.8)', // Subtle dark background
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.15)', // Subtle Teal Glow border
  },
  mediaOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  mediaOptionText: {
    fontSize: 15,
    color: '#3BAFBC', // Teal Glow
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
  // YouTube preview styles
  youtubePreview: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E2B2F', // Midnight Green
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.2)', // Subtle Teal Glow border
    zIndex: 1,
  },
  youtubeThumbnail: {
    width: '100%',
    height: 180, // 16:9 aspect ratio approximately
    backgroundColor: '#121212', // Fallback background
  },
  youtubeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 2,
    height: 180, // Match thumbnail height
  },
  youtubePlayIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  youtubeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F7', // Soft White
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  removeYoutubeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 69, 58, 0.1)', // Very subtle red
    borderRadius: 4,
  },
  removeYoutubeText: {
    fontSize: 12,
    color: '#FF453A', // iOS system red
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 175, 188, 0.1)', // Very subtle Teal Glow border
    zIndex: 1, // Ensure actions are above the BlurView
  },
  mediaButtons: {
    flexDirection: 'row',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  mediaButtonActive: {
    backgroundColor: 'rgba(59, 175, 188, 0.1)', // Teal Glow with opacity
  },
  mediaButtonText: {
    fontSize: 15,
    color: '#3BAFBC', // Teal Glow
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
  submitButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 16,
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#8E8E93', // Slate Gray
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
  postButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  postButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F5F7', // Soft White for text
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
});