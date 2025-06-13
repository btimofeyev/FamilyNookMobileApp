// app/components/CreatePostForm.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { createPost } from '../api/feedService';
import MediaPickerModal from './shared/MediaPickerModal';
import GlassCard from './shared/GlassCard';
import GlassInput from './shared/GlassInput';
import GlassButton from './shared/GlassButton';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

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
    <GlassCard style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GlassInput
          placeholder="What's on your mind?"
          value={caption}
          onChangeText={setCaption}
          multiline={true}
          numberOfLines={4}
          style={styles.captionInput}
        />
        
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
                      <Ionicons name="close-circle" size={24} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                  
                  {item.mediaType === 'video' && (
                    <View style={styles.videoIndicator}>
                      <Ionicons name="play-circle" size={32} color={Colors.text.primary} />
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
        <GlassButton
          title={mediaItems.length > 0 ? 'Add More Media' : 'Add Photos & Videos'}
          icon="images-outline"
          variant="glass"
          onPress={() => setShowMediaPicker(true)}
          disabled={loading}
          style={styles.mediaButton}
        />
        
        <View style={styles.buttonContainer}>
          <GlassButton
            title="Cancel"
            variant="glass"
            onPress={onCancel}
            disabled={loading}
            style={styles.cancelButton}
          />
          
          <GlassButton
            title="Post"
            variant="primary"
            onPress={handlePost}
            loading={loading}
            disabled={!caption && mediaItems.length === 0}
            gradientColors={[Colors.primary, Colors.primaryDark]}
            style={styles.postButton}
          />
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
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: Spacing.lg,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  captionInput: {
    marginBottom: Spacing.lg,
  },
  mediaPreviewContainer: {
    marginBottom: Spacing.lg,
  },
  mediaScrollContainer: {
    paddingBottom: Spacing.sm,
  },
  mediaPreviewItem: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    zIndex: 2,
    backgroundColor: Colors.glass.medium,
    borderRadius: 12,
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
    backgroundColor: `${Colors.error}20`,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: `${Colors.error}40`,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.text,
  },
  mediaButton: {
    marginBottom: Spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  postButton: {
    flex: 1,
  },
});

export default CreatePostForm;