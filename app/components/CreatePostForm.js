// app/components/CreatePostForm.js - Fixed version for multiple uploads
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
  Pressable,
  ScrollView,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createPost } from '../api/feedService';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';

export default function CreatePostForm({ familyId, onPostCreated, onCancel }) {
  const [caption, setCaption] = useState('');
  const [mediaItems, setMediaItems] = useState([]); // Array of media items instead of single media
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [youtubePreview, setYoutubePreview] = useState(null);
  const videoRef = useRef(null);

  // Max number of media items allowed
  const MAX_MEDIA_ITEMS = 4;

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

  const pickImages = async () => {
    // Check if we can add more images
    if (mediaItems.length >= MAX_MEDIA_ITEMS) {
      Alert.alert('Maximum Reached', `You can only add up to ${MAX_MEDIA_ITEMS} media items.`);
      return;
    }

    try {
      // Calculate how many more images we can add
      const remainingSlots = MAX_MEDIA_ITEMS - mediaItems.length;
      
      // Use MediaTypeOptions.All instead of Images to match the deprecated enum
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Convert selected assets to media items
        const newMediaItems = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          fileName: asset.uri.split('/').pop(),
          isVideo: false,
          width: asset.width,
          height: asset.height
        }));
        
        // Add new items to existing media array
        setMediaItems([...mediaItems, ...newMediaItems].slice(0, MAX_MEDIA_ITEMS));
        setShowMediaOptions(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Show warning if some items were not added due to limit
        if (result.assets.length > remainingSlots) {
          Alert.alert('Maximum Reached', `Only ${remainingSlots} out of ${result.assets.length} selected images were added.`);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const pickVideo = async () => {
    // Check if we can add a video
    if (mediaItems.length >= MAX_MEDIA_ITEMS) {
      Alert.alert('Maximum Reached', `You can only add up to ${MAX_MEDIA_ITEMS} media items.`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        videoMaxDuration: 60, // Limit videos to 60 seconds
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Check video duration if possible
        if (result.assets[0].duration && result.assets[0].duration > 60000) {
          Alert.alert('Video Too Long', 'Please select a video shorter than 60 seconds');
          return;
        }

        // Get file info to determine correct MIME type
        const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
        
        // Determine video mime type based on extension or default to mp4
        let videoType = 'video/mp4';
        const fileExt = result.assets[0].uri.split('.').pop().toLowerCase();
        if (fileExt === 'mov') videoType = 'video/quicktime';
        else if (fileExt === 'avi') videoType = 'video/x-msvideo';
        else if (fileExt === 'wmv') videoType = 'video/x-ms-wmv';

        const newVideo = {
          uri: result.assets[0].uri,
          type: videoType,
          fileName: `video_${Date.now()}.${fileExt || 'mp4'}`,
          isVideo: true,
          width: result.assets[0].width,
          height: result.assets[0].height
        };
        
        // Add video to media items
        setMediaItems([...mediaItems, newVideo]);
        setShowMediaOptions(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const removeMediaItem = (index) => {
    const updatedMedia = [...mediaItems];
    updatedMedia.splice(index, 1);
    setMediaItems(updatedMedia);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleMediaOptions = () => {
    setShowMediaOptions(!showMediaOptions);
    Haptics.selectionAsync();
  };

  const handleSubmit = async () => {
    if (!caption.trim() && mediaItems.length === 0 && !youtubePreview) {
      Alert.alert('Error', 'Please add a caption, media, or link to your post');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Submitting post with media items:", mediaItems.length);
      
      // Send all media items to the API
      const result = await createPost(familyId, { 
        caption,
        mediaItems: mediaItems.length > 0 ? mediaItems : null
      });
      
      onPostCreated();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reset form
      setCaption('');
      setMediaItems([]);
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
    if (mediaItems.length === 0) return null;

    return (
      <View style={styles.mediaPreviewContainer}>
        <FlatList
          data={mediaItems}
          horizontal={mediaItems.length > 1}
          showsHorizontalScrollIndicator={true}
          keyExtractor={(item, index) => `media-${index}`}
          renderItem={({ item, index }) => (
            <View style={[
              styles.mediaPreview,
              mediaItems.length === 1 ? styles.singleMediaPreview : styles.multipleMediaPreview
            ]}>
              {item.isVideo ? (
                <Video
                  source={{ uri: item.uri }}
                  style={mediaItems.length === 1 ? styles.singlePreviewVideo : styles.multiplePreviewVideo}
                  useNativeControls
                  resizeMode="cover"
                  isLooping={false}
                  isMuted={true}
                  shouldPlay={false}
                />
              ) : (
                <Image 
                  source={{ uri: item.uri }} 
                  style={mediaItems.length === 1 ? styles.singlePreviewImage : styles.multiplePreviewImage} 
                  resizeMode="cover"
                />
              )}
              <TouchableOpacity 
                style={styles.removeMediaButton}
                onPress={() => removeMediaItem(index)}
              >
                <Ionicons name="close-circle-sharp" size={24} color="#FF453A" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={mediaItems.length > 1 ? styles.mediaPreviewList : null}
        />
        
        {/* Show count indicator if multiple media items */}
        {mediaItems.length > 1 && (
          <View style={styles.mediaCountContainer}>
            <Text style={styles.mediaCountText}>{mediaItems.length} / {MAX_MEDIA_ITEMS}</Text>
          </View>
        )}
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
            onPress={pickImages}
            android_ripple={{ color: 'rgba(59, 175, 188, 0.2)' }}
          >
            <Ionicons name="images-outline" size={24} color="#3BAFBC" />
            <Text style={styles.mediaOptionText}>Photos</Text>
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
              showMediaOptions && styles.mediaButtonActive,
              mediaItems.length >= MAX_MEDIA_ITEMS && styles.mediaButtonDisabled
            ]}
            onPress={toggleMediaOptions}
            disabled={isSubmitting || mediaItems.length >= MAX_MEDIA_ITEMS}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color={mediaItems.length >= MAX_MEDIA_ITEMS ? "#8E8E93" : "#3BAFBC"} />
            <Text style={[
              styles.mediaButtonText,
              mediaItems.length >= MAX_MEDIA_ITEMS && styles.mediaButtonTextDisabled
            ]}>
              {mediaItems.length === 0 ? "Add Media" : `Add More (${mediaItems.length}/${MAX_MEDIA_ITEMS})`}
            </Text>
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
            disabled={(!caption.trim() && mediaItems.length === 0 && !youtubePreview) || isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={(!caption.trim() && mediaItems.length === 0 && !youtubePreview) || isSubmitting ? 
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
  mediaPreviewContainer: {
    marginBottom: 16,
    zIndex: 1,
  },
  mediaPreviewList: {
    paddingRight: 16,
  },
  mediaPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  singleMediaPreview: {
    width: '100%',
    marginBottom: 8,
  },
  multipleMediaPreview: {
    marginRight: 8,
    marginBottom: 8,
  },
  singlePreviewImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#1E2B2F',
  },
  multiplePreviewImage: {
    width: 150,
    height: 150,
    backgroundColor: '#1E2B2F',
  },
  singlePreviewVideo: {
    width: '100%',
    height: 200,
    backgroundColor: '#1E2B2F',
  },
  multiplePreviewVideo: {
    width: 150,
    height: 150,
    backgroundColor: '#1E2B2F',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(18, 18, 18, 0.7)',
    borderRadius: 12,
    padding: 2,
  },
  mediaCountContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(18, 18, 18, 0.7)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  mediaCountText: {
    color: '#F5F5F7',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  mediaOptionsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    zIndex: 1,
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.15)',
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
    color: '#3BAFBC',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  // YouTube preview styles
  youtubePreview: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E2B2F',
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.2)',
    zIndex: 1,
  },
  youtubeThumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#121212',
  },
  youtubeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 2,
    height: 180,
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
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  removeYoutubeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderRadius: 4,
  },
  removeYoutubeText: {
    fontSize: 12,
    color: '#FF453A',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 175, 188, 0.1)',
    zIndex: 1,
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
    backgroundColor: 'rgba(59, 175, 188, 0.1)',
  },
  mediaButtonDisabled: {
    opacity: 0.5,
  },
  mediaButtonText: {
    fontSize: 15,
    color: '#3BAFBC',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  mediaButtonTextDisabled: {
    color: '#8E8E93',
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
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    letterSpacing: -0.2,
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
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
  },
});