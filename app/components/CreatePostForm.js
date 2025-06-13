// app/components/CreatePostForm.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { createPost } from '../api/feedService';
import MediaPickerModal from './shared/MediaPickerModal';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.9;
const CARD_ASPECT_RATIO = 3 / 4;
const CARD_HEIGHT = CARD_WIDTH / CARD_ASPECT_RATIO;

const CreatePostForm = ({ familyId, onPostCreated, onCancel }) => {
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [error, setError] = useState(null);

  const handleMediaSelected = (selectedMedia) => {
    if (!selectedMedia || selectedMedia.length === 0) return;
    
    setMediaItems(prev => {
      const newItems = [...prev];
      selectedMedia.forEach(item => {
        if (item.success && item.fileUrl) {
          newItems.push({
            id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            mediaUrl: item.fileUrl,
            mediaType: item.type?.startsWith('video/') ? 'video' : 'image',
            mediaKey: item.key,
            uploadId: item.uploadId,
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
      setError('Please enter a caption or add media.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const postData = { caption };

      if (mediaItems.length) {
        postData.media = mediaItems.map(m => ({
          uploadId: m.uploadId,
          url: m.mediaUrl,
          type: m.mediaType,
        }));
      }

      const response = await createPost(familyId, postData);

      if (onPostCreated) {
        onPostCreated(response);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.cardShadow}>
      <BlurView intensity={95} tint="light" style={styles.card}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.1)']}
          style={styles.cardHighlight}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create a New Post</Text>
            <TouchableOpacity onPress={onCancel} disabled={loading}>
              <Ionicons name="close-circle" size={32} color={Colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="What's on your mind?"
              placeholderTextColor={Colors.text.placeholder}
              value={caption}
              onChangeText={setCaption}
              multiline={true}
              style={styles.captionInput}
            />
          </View>

          {mediaItems.length > 0 && (
            <View style={styles.mediaPreviewContainer}>
              {mediaItems.map((item, index) => (
                <View key={item.id || index} style={styles.mediaPreviewItem}>
                  <Image source={{ uri: item.mediaUrl }} style={styles.mediaImage} />
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
                      <Ionicons name="play-circle" size={32} color="white" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.mediaButton} onPress={() => setShowMediaPicker(true)} disabled={loading}>
            <Ionicons name="images-outline" size={22} color={Colors.text.dark} />
            <Text style={styles.mediaButtonText}>{mediaItems.length > 0 ? 'Add More Media' : 'Add Photos & Videos'}</Text>
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.postButton, (!caption && mediaItems.length === 0) && styles.disabledButton]}
            onPress={handlePost}
            disabled={loading || (!caption && mediaItems.length === 0)}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.postButtonText}>Post to Family</Text>}
          </TouchableOpacity>
        </ScrollView>

        <MediaPickerModal
          visible={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onMediaSelected={handleMediaSelected}
          allowMultiple={true}
          showVideos={true}
          maxItems={4}
        />
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    alignSelf: 'center',
    // marginTop: Spacing['5xl'], // This was removed
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  cardHighlight: {
    position: 'absolute',
    top: 1.5,
    left: 1.5,
    right: 1.5,
    height: '60%',
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.text.dark,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 120,
    marginBottom: Spacing.lg,
  },
  captionInput: {
    fontSize: Typography.sizes.base,
    color: Colors.text.dark,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  mediaPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  mediaPreviewItem: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    margin: Spacing.xs,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  videoIndicator: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    height: 50,
    borderRadius: 25,
    marginBottom: Spacing.lg,
  },
  mediaButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.dark,
    marginLeft: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  postButton: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.text.tertiary,
  },
  postButtonText: {
    color: 'white',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
});

export default CreatePostForm;