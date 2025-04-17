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
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import MediaUploadComponent from './posts/MediaUploadComponent';
import { createPost } from '../api/feedService';

const CreatePostForm = ({ familyId, onPostCreated, onCancel }) => {
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState([]);

  const handleMediaUploaded = (media) => {
    // This receives media that has already been uploaded to R2
    setUploadedMedia(media);
  };

  const handlePost = async () => {
    if (!caption && uploadedMedia.length === 0) {
      Alert.alert('Error', 'Please enter a caption or add media');
      return;
    }

    try {
      setLoading(true);

      // Create post data object
      const postData = {
        caption,
        familyId,
      };

      // Only if we have uploaded media, add it to the post data
      if (uploadedMedia.length > 0) {
        // Format media for the backend API
        postData.mediaUrls = uploadedMedia.map(media => media.mediaUrl);
        postData.mediaKeys = uploadedMedia.map(media => media.mediaKey);
        postData.mediaTypes = uploadedMedia.map(media => media.mediaType);
      }

      // Send to API
      const response = await createPost(familyId, postData);

      // Call the success callback
      if (onPostCreated) {
        onPostCreated(response);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BlurView intensity={20} tint="dark" style={styles.container}>
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
      
      {/* Media Upload Component */}
      <MediaUploadComponent 
        onMediaUploaded={handleMediaUploaded}
        maxItems={4}
      />
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.postButton} 
          onPress={handlePost}
          disabled={loading || (!caption && uploadedMedia.length === 0)}
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
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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