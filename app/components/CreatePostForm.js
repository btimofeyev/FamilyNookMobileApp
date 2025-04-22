// app/components/CreatePostForm.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform,
  Alert,
  ScrollView,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { createPost } from '../api/feedService';
import MediaPickerModal from './shared/MediaPickerModal';

const CreatePostForm = ({ familyId, onPostCreated, onCancel }) => {
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [error, setError] = useState(null);

  const handleMediaSelected = (selectedMedia) => {
    if (!selectedMedia || selectedMedia.length === 0) return;
    
    // Add selected media to the state
    setMediaItems(prev => {
      const newItems = [...prev];
      
      // Add each item that was successfully uploaded
      selectedMedia.forEach(item => {
        if (item.success && item.fileUrl) {
          newItems.push({
            id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            mediaUrl: item.fileUrl,
            mediaType: item.type?.startsWith('video/') ? 'video' : 'image',
            mediaKey: item.key,
            uploadId : item.uploadId 
          });
        }
      });
      
      return newItems;
    });
  };

  const handleRemoveMedia = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!caption && mediaItems.length === 0) {
      setError('Please enter a caption or add media');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create post data object
      const postData = {
        caption,
      };

      // Only if we have uploaded media, add it to the post data
       if (mediaItems.length) {
         postData.media = mediaItems.map(m => ({
            uploadId : m.uploadId,
            url      : m.mediaUrl,
            type     : m.mediaType           // 'image' | 'video'
          }));
         }

      // Send to API
      const response = await createPost(familyId, postData);

      // Call the success callback
      if (onPostCreated) {
        onPostCreated(response);
      }
      
      // Provide haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BlurView intensity={20} tint="dark" style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="What's on your mind?"
            placeholderTextColor="#8E8E93"
            multiline
            value={caption}
            onChangeText={setCaption}
            editable={!loading}
          />
        </View>
        
        {/* Media Preview */}
        {mediaItems.length > 0 && (
          <View style={styles.mediaPreviewContainer}>
            <ScrollView 
              horizontal={true} 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaScrollContainer}
            >
              {mediaItems.map((item, index) => (
                <View key={item.id || index} style={styles.mediaPreviewItem}>
                  <Image source={{ uri: item.mediaUrl }} style={styles.mediaPreview} />
                  
                  {!loading && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveMedia(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="rgba(255, 69, 58, 0.9)" />
                    </TouchableOpacity>
                  )}
                  
                  {item.mediaType === 'video' && (
                    <View style={styles.videoIndicator}>
                      <Ionicons name="play-circle" size={32} color="rgba(255, 255, 255, 0.8)" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Media Selection Button */}
        <TouchableOpacity 
          style={styles.mediaButton}
          onPress={() => setShowMediaPicker(true)}
          disabled={loading}
        >
          <Ionicons name="images-outline" size={24} color="#3BAFBC" />
          <Text style={styles.mediaButtonText}>
            {mediaItems.length > 0 ? 'Add More Media' : 'Add Photos & Videos'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.postButton,
              (!caption && mediaItems.length === 0) && styles.disabledButton
            ]} 
            onPress={handlePost}
            disabled={loading || (!caption && mediaItems.length === 0)}
          >
            <LinearGradient
              colors={['#3BAFBC', '#1E2B2F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#F5F5F7" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Media Picker Modal */}
      <MediaPickerModal
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onMediaSelected={handleMediaSelected}
        allowMultiple={true}
        showVideos={true}
        maxItems={4}
      />
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback
  },
  scrollContent: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    borderRadius: 12,
    padding: 16,
    color: '#F5F5F7',
    minHeight: 100,
    fontSize: 16,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  mediaPreviewContainer: {
    marginBottom: 16,
  },
  mediaScrollContainer: {
    paddingBottom: 8,
  },
  mediaPreviewItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
  },
  videoIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 175, 188, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  mediaButtonText: {
    color: '#3BAFBC',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#AEAEB2',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  postButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  gradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: {
    color: '#F5F5F7',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

export default CreatePostForm;