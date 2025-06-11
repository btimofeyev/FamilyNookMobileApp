// app/(screens)/edit-post.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  ActivityIndicator, 
  Alert,
  Platform,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../api/client';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import EnhancedMediaPicker from '../components/shared/MediaPickerModal';

const EditPostScreen = () => {
  const { postId } = useLocalSearchParams();
  const { user } = useAuth();
  const { selectedFamily } = useFamily();
  
  const [post, setPost] = useState(null);
  const [caption, setCaption] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [selectedMediaForRemoval, setSelectedMediaForRemoval] = useState(null);
  
  // Function to validate media URLs
  const validateMediaUrl = async (url) => {
    if (!url) return false;
    
    try {
      // Check if the media still exists
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.log(`Error validating media URL ${url}:`, error);
      return false;
    }
  };

  // Function to validate all media items
  const validateMediaItems = async () => {
    const validatedItems = [...mediaItems];
    let hasChanges = false;
    
    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i];
      
      if (item.needsValidation) {
        const isValid = await validateMediaUrl(item.url);
        
        if (!isValid) {
          // Mark the item as invalid
          validatedItems[i] = {
            ...item,
            isValid: false,
            needsValidation: false
          };
          hasChanges = true;
        } else {
          // Mark the item as valid
          validatedItems[i] = {
            ...item,
            isValid: true,
            needsValidation: false
          };
          hasChanges = true;
        }
      }
    }
    
    if (hasChanges) {
      setMediaItems(validatedItems);
    }
  };
  
  // Run validation when media items change
  useEffect(() => {
    if (mediaItems.some(item => item.needsValidation)) {
      validateMediaItems();
    }
  }, [mediaItems]);

  // Load post data
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        router.back();
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch post details
        const response = await apiClient.get(`/api/posts/${postId}`);
        const postData = response.data;
        
        if (!postData) {
          setError('Post not found');
          return;
        }
        
        // Check if user is the author
        if (postData.author_id !== user.id) {
          setError('You do not have permission to edit this post');
          return;
        }
        
        setPost(postData);
        setCaption(postData.caption || '');
        
        // Set up media items
        if (postData.media_urls && Array.isArray(postData.media_urls)) {
          // Filter out empty URLs and prepare for validation
          const validUrls = postData.media_urls.filter(url => url && url.trim() !== '');
          
          if (validUrls.length > 0) {
            // We'll validate each URL and filter out any that return 404
            const mediaList = [];
            
            for (let index = 0; index < validUrls.length; index++) {
              const url = validUrls[index];
              try {
                // Add with a placeholder that it needs validation
                mediaList.push({
                  id: `existing-${index}`,
                  url,
                  type: url.toLowerCase().match(/\.(mp4|mov)$/) ? 'video' : 'image',
                  isExisting: true,
                  needsValidation: true
                });
              } catch (error) {
                console.log(`Skipping invalid media URL: ${url}`);
              }
            }
            
            setMediaItems(mediaList);
          }
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [postId, user.id]);
  
  // Handle media selection from the media picker
  const handleMediaSelection = (newMedia) => {
    if (!newMedia || !Array.isArray(newMedia)) return;
    
    const processedMedia = newMedia.map(item => ({
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: item.url,
      type: item.type || 'image',
      isExisting: false,
      uploadId: item.uploadId
    }));
    
    setMediaItems([...mediaItems, ...processedMedia]);
  };
  
  // Handle removing media
  const confirmMediaRemoval = (item) => {
    // Set the media item for removal confirmation
    setSelectedMediaForRemoval(item);
    
    // Show confirmation dialog
    Alert.alert(
      'Remove Media',
      'Are you sure you want to remove this item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSelectedMediaForRemoval(null)
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Filter out the selected media item
            setMediaItems(mediaItems.filter(media => media.id !== item.id));
            setSelectedMediaForRemoval(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };
  
  // Save changes
  const handleSaveChanges = async () => {
    if (saving) return;
    
    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Identify media URLs that need to be removed (invalid ones)
      const urlsToRemove = mediaItems
        .filter(item => item.isExisting && item.isValid === false)
        .map(item => item.url);
      
      // Check if all existing media is invalid
      const allExistingInvalid = mediaItems
        .filter(item => item.isExisting)
        .every(item => item.isValid === false);
      
      // Prepare the payload
      const payload = {
        caption,
        // Include URLs to remove
        removeMediaUrls: urlsToRemove,
        // If all existing media is invalid and we have new media, replace all
        replaceAllMedia: allExistingInvalid && 
                         mediaItems.some(item => !item.isExisting),
        // Only include new media items that need to be linked to the post
        media: mediaItems
          .filter(item => !item.isExisting)
          .map(item => ({
            url: item.url,
            type: item.type,
            uploadId: item.uploadId
          }))
      };
      
      // Update the post
      const response = await apiClient.put(`/api/posts/${postId}`, payload);
      
      if (response.data) {
        // Success message
        Alert.alert(
          'Success',
          'Post updated successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // If still loading
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Edit Post',
            headerStyle: {
              backgroundColor: '#121212'
            },
            headerTintColor: '#F5F5F7',
            headerShown: true
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3BAFBC" />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // If there was an error
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Edit Post',
            headerStyle: {
              backgroundColor: '#121212'
            },
            headerTintColor: '#F5F5F7',
            headerShown: true
          }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF453A" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Post',
          headerStyle: {
            backgroundColor: '#121212'
          },
          headerTintColor: '#F5F5F7',
          headerShown: true
        }}
      />
      
      <ScrollView style={styles.scrollContainer}>
        <BlurView intensity={20} tint="dark" style={styles.formContainer}>
          {/* Text Input Section */}
          <Text style={styles.label}>Post Content</Text>
          <TextInput
            style={styles.textInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="What's on your mind?"
            placeholderTextColor="#8E8E93"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          {/* Media Preview Section */}
          {mediaItems.length > 0 && (
            <View style={styles.mediaPreviewSection}>
              <Text style={styles.label}>Media</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {mediaItems.map((item, index) => (
                  <View key={item.id} style={styles.mediaPreviewContainer}>
                    {item.needsValidation ? (
                      // Show loading state while validating
                      <View style={styles.validatingMedia}>
                        <ActivityIndicator size="small" color="#3BAFBC" />
                        <Text style={styles.validatingText}>Checking...</Text>
                      </View>
                    ) : item.isValid === false ? (
                      // Show placeholder for invalid/missing media
                      <View style={styles.invalidMedia}>
                        <Ionicons name="alert-circle" size={32} color="#FF453A" />
                        <Text style={styles.invalidMediaText}>Media unavailable</Text>
                      </View>
                    ) : item.type === 'video' ? (
                      // Show video preview
                      <View style={styles.videoPreview}>
                        <Image
                          source={{ uri: item.url }}
                          style={styles.mediaPreview}
                          resizeMode="cover"
                          onError={() => {
                            // Handle image load error by marking as invalid
                            const updatedItems = [...mediaItems];
                            updatedItems[index] = { ...item, isValid: false };
                            setMediaItems(updatedItems);
                          }}
                        />
                        <View style={styles.videoIndicator}>
                          <Ionicons name="play-circle" size={32} color="white" />
                        </View>
                      </View>
                    ) : (
                      // Show image preview
                      <Image
                        source={{ uri: item.url }}
                        style={styles.mediaPreview}
                        resizeMode="cover"
                        onError={() => {
                          // Handle image load error by marking as invalid
                          const updatedItems = [...mediaItems];
                          updatedItems[index] = { ...item, isValid: false };
                          setMediaItems(updatedItems);
                        }}
                      />
                    )}
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={() => confirmMediaRemoval(item)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF453A" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Add Media Button */}
          <TouchableOpacity
            style={styles.addMediaButton}
            onPress={() => setMediaPickerVisible(true)}
          >
            <Ionicons name="images-outline" size={24} color="#3BAFBC" />
            <Text style={styles.addMediaButtonText}>Add Photos/Videos</Text>
          </TouchableOpacity>
          
          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveChanges}
              disabled={saving}
            >
              <LinearGradient
                colors={['#3BAFBC', '#1E2B2F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </ScrollView>
      
      {/* Media Picker Modal */}
      <EnhancedMediaPicker
        visible={mediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onMediaSelected={handleMediaSelection}
        allowMultiple={true}
        showVideos={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  validatingMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validatingText: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  invalidMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 8,
  },
  invalidMediaText: {
    color: '#FF453A',
    fontSize: 10,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#F5F5F7',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  formContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  textInput: {
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: 12,
    padding: 12,
    color: '#F5F5F7',
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  mediaPreviewSection: {
    marginBottom: 20,
  },
  mediaPreviewContainer: {
    width: 100,
    height: 100,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    position: 'relative',
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
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: 12,
    marginBottom: 20,
  },
  addMediaButtonText: {
    color: '#3BAFBC',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#F5F5F7',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 8,
  },
  saveButtonGradient: {
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  button: {
    backgroundColor: '#3BAFBC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

export default EditPostScreen;