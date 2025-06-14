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
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import EnhancedMediaPicker from '../components/shared/MediaPickerModal';

const EditPostScreen = () => {
  const { postId } = useLocalSearchParams();
  const { user } = useAuth();
  const { selectedFamily } = useFamily();
  const topInset = useSafeAreaInsets().top;
  
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
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#f0f9ff', '#e0f2fe', '#f8faff']}
          style={styles.backgroundGradient}
        />
        <Stack.Screen
          options={{
            title: 'Edit Post',
            headerStyle: {
              backgroundColor: 'transparent'
            },
            headerTintColor: '#1C1C1E',
            headerShown: true,
            headerTransparent: true
          }}
        />
        <View style={[styles.loadingContainer, { paddingTop: topInset + 60 }]}>
          <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.loadingCard}>
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.9)', 
                'rgba(255, 255, 255, 0.6)'
              ]}
              style={styles.loadingHighlight}
            />
            <ActivityIndicator size="large" color="#7dd3fc" />
            <Text style={styles.loadingText}>Loading post...</Text>
          </BlurView>
        </View>
      </SafeAreaView>
    );
  }
  
  // If there was an error
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#f0f9ff', '#e0f2fe', '#f8faff']}
          style={styles.backgroundGradient}
        />
        <Stack.Screen
          options={{
            title: 'Edit Post',
            headerStyle: {
              backgroundColor: 'transparent'
            },
            headerTintColor: '#1C1C1E',
            headerShown: true,
            headerTransparent: true
          }}
        />
        <View style={[styles.errorContainer, { paddingTop: topInset + 60 }]}>
          <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.errorCard}>
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.9)', 
                'rgba(255, 255, 255, 0.6)'
              ]}
              style={styles.errorHighlight}
            />
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.back()}>
              <LinearGradient
                colors={['#7dd3fc', '#60a5fa']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#f0f9ff', '#e0f2fe', '#f8faff']}
        style={styles.backgroundGradient}
      />
      <Stack.Screen
        options={{
          title: 'Edit Post',
          headerStyle: {
            backgroundColor: 'transparent'
          },
          headerTintColor: '#1C1C1E',
          headerShown: true,
          headerTransparent: true
        }}
      />
      
      <ScrollView style={[
        styles.scrollContainer,
        { paddingTop: topInset + 60 }
      ]}>
        <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.formContainer}>
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.8)', 
              'rgba(255, 255, 255, 0.4)'
            ]}
            style={styles.formHighlight}
          />
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
                        <ActivityIndicator size="small" color="#7dd3fc" />
                        <Text style={styles.validatingText}>Checking...</Text>
                      </View>
                    ) : item.isValid === false ? (
                      // Show placeholder for invalid/missing media
                      <View style={styles.invalidMedia}>
                        <Ionicons name="alert-circle" size={32} color="#FF3B30" />
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
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
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
            <Ionicons name="images-outline" size={24} color="#7dd3fc" />
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
                colors={['#7dd3fc', '#60a5fa']}
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
    backgroundColor: 'transparent',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    minWidth: 200,
  },
  loadingHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
    textAlign: 'center',
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
    color: 'rgba(28, 28, 30, 0.6)',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
  },
  invalidMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 12,
  },
  invalidMediaText: {
    color: '#FF3B30',
    fontSize: 10,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    maxWidth: 320,
  },
  errorHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    lineHeight: 22,
  },
  formContainer: {
    margin: 16,
    padding: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  formHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
  },
  textInput: {
    backgroundColor: 'rgba(240, 247, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    color: '#1C1C1E',
    fontSize: 16,
    minHeight: 120,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    textAlignVertical: 'top',
  },
  mediaPreviewSection: {
    marginBottom: 24,
  },
  mediaPreviewContainer: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
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
    padding: 16,
    backgroundColor: 'rgba(125, 211, 252, 0.1)',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.3)',
  },
  addMediaButtonText: {
    color: '#7dd3fc',
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
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  cancelButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  saveButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: 12,
    shadowColor: 'rgba(125, 211, 252, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(125, 211, 252, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

export default EditPostScreen;