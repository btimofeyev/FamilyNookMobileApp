// app/components/shared/MediaPickerModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MediaService from '../../utils/mediaService';

/**
 * A simplified media picker modal component with automatic upload
 * 
 * @param {Object} props Component props
 * @param {boolean} props.visible Whether the modal is visible
 * @param {Function} props.onClose Function to call when modal is closed
 * @param {Function} props.onMediaSelected Function called with selected media after upload
 * @param {string} props.entityId ID of entity to associate media with (optional)
 * @param {string} props.entityType Type of entity (memory, post, etc.) (optional)
 * @param {boolean} props.allowMultiple Allow multiple media selection
 * @param {boolean} props.showVideos Allow video selection
 * @param {number} props.maxItems Maximum number of items to select
 * @param {boolean} props.uploadImmediately Upload immediately after selection (default: true)
 */
const MediaPickerModal = ({
  visible,
  onClose,
  onMediaSelected,
  entityId,
  entityType,
  allowMultiple = false,
  showVideos = true,
  maxItems = 4,
  uploadImmediately = true
}) => {
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadResults, setUploadResults] = useState([]);
  const [uploadError, setUploadError] = useState(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      // Wait for animation to complete before resetting state
      const timeout = setTimeout(() => {
        setSelectedMedia([]);
        setIsUploading(false);
        setUploadProgress({});
        setUploadResults([]);
        setUploadError(null);
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  /**
   * Launch and handle camera capture
   */
  const handleTakePhoto = async () => {
    try {
      const result = await MediaService.captureWithCamera({
        onPermissionMissing: () => {
          Alert.alert(
            "Permission Required",
            "Camera access is needed to take photos. Please enable it in your device settings."
          );
        }
      });
      
      if (!result) return;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Handle the media result
      if (uploadImmediately) {
        // Upload right away
        handleUploadMedia([result]);
      } else {
        // Add to selected media
        if (allowMultiple) {
          setSelectedMedia(prev => [...prev, result]);
        } else {
          setSelectedMedia([result]);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  /**
   * Handle taking a video with the camera
   */
  const handleRecordVideo = async () => {
    if (!showVideos) return;
    
    try {
      const result = await MediaService.captureWithCamera({
        captureVideo: true,
        onPermissionMissing: () => {
          Alert.alert(
            "Permission Required",
            "Camera access is needed to record videos. Please enable it in your device settings."
          );
        }
      });
      
      if (!result) return;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Handle the media result
      if (uploadImmediately) {
        // Upload right away
        handleUploadMedia([result]);
      } else {
        // Add to selected media
        if (allowMultiple) {
          setSelectedMedia(prev => [...prev, result]);
        } else {
          setSelectedMedia([result]);
        }
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video. Please try again.');
    }
  };

  /**
   * Handle selecting media from library
   */
  const handleChooseFromLibrary = async () => {
    try {
      const results = await MediaService.pickMedia({
        allowsMultipleSelection: allowMultiple,
        includeVideos: showVideos,
        onPermissionMissing: () => {
          Alert.alert(
            "Permission Required",
            "Media library access is needed to select photos and videos. Please enable it in your device settings."
          );
        }
      });
      
      if (!results || results.length === 0) return;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Limit number of items if maxItems is specified
      const limitedResults = allowMultiple
        ? results.slice(0, maxItems)
        : [results[0]];
      
      // Alert if we limited the selection
      if (results.length > maxItems) {
        Alert.alert(
          "Selection Limited",
          `You can only select up to ${maxItems} items at once.`
        );
      }

      // Handle the media results
      if (uploadImmediately) {
        // Upload right away
        handleUploadMedia(limitedResults);
      } else {
        // Add to selected media
        if (allowMultiple) {
          setSelectedMedia(prev => {
            const combined = [...prev, ...limitedResults];
            return combined.slice(0, maxItems);
          });
        } else {
          setSelectedMedia(limitedResults);
        }
      }
    } catch (error) {
      console.error('Error choosing from library:', error);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    }
  };

  /**
   * Remove a media item from selection
   */
  const handleRemoveMedia = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Upload media
   */
  const handleUploadMedia = async (mediaToUpload) => {
    const media = mediaToUpload || selectedMedia;
    
    if (!media || media.length === 0) return;
    
    try {
      setIsUploading(true);
      setUploadError(null);
      
      // Reset progress tracking
      setUploadProgress({});
      
      // Upload all selected media in parallel
      const results = await MediaService.uploadMultipleMedia(media, {
        onProgress: (index, progress) => {
          setUploadProgress(prev => ({ ...prev, [index]: progress }));
        },
        onItemComplete: (index, result) => {
          // Update progress to 100% when complete
          setUploadProgress(prev => ({ ...prev, [index]: 100 }));
        }
      });
      
      setUploadResults(results);
      
      // Filter successful uploads
      const successfulUploads = results.filter(r => r.success);
      
      if (successfulUploads.length === 0) {
        throw new Error('No media was uploaded successfully');
      }
      
      // Associate with entity if specified
      if (entityId && entityType) {
        const mediaUrls = successfulUploads.map(item => item.fileUrl);
        await MediaService.associateMediaWithEntity(mediaUrls, entityType, entityId);
      }
      
      // Provide upload results to parent component
      onMediaSelected(successfulUploads);
      
      // Auto-close modal on success
      onClose();
    } catch (error) {
      console.error('Error uploading media:', error);
      setUploadError(error.message || 'Failed to upload media. Please try again.');
    } finally {
      // Keep isUploading true if there was an error, to allow retry
      if (!uploadError) {
        setIsUploading(false);
      }
    }
  };

  /**
   * Render a single media item in preview
   */
  const renderMediaItem = ({ item, index }) => {
    const isVideo = MediaService.getMediaType(item) === 'video';
    const progress = uploadProgress[index] || 0;
    const isItemUploading = isUploading && progress < 100;
    
    return (
      <View style={styles.mediaItemContainer}>
        <Image source={{ uri: item.uri }} style={styles.mediaPreview} />
        
        {isVideo && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play-circle" size={24} color="rgba(255,255,255,0.8)" />
          </View>
        )}
        
        {isItemUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.uploadingText}>{progress.toFixed(0)}%</Text>
          </View>
        )}
        
        {!isUploading && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveMedia(index)}
          >
            <Ionicons name="close-circle" size={24} color="rgba(255,50,50,0.9)" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView 
          intensity={30} 
          tint="dark" 
          style={styles.blurContainer}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isUploading ? 'Uploading Media' : 'Add Photos & Videos'}
              </Text>
              <TouchableOpacity 
                onPress={onClose}
                disabled={isUploading}
                style={styles.closeButton}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={isUploading ? '#8E8E93' : '#FFFFFF'} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Upload Progress */}
            {isUploading && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="#3BAFBC" />
                <Text style={styles.uploadingStatusText}>
                  Uploading media... Please wait.
                </Text>
              </View>
            )}
            
            {/* Media Selection Buttons - Show only when not uploading */}
            {!isUploading && (
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleTakePhoto}
                >
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="camera" size={32} color="#F5F5F7" />
                  </View>
                  <Text style={styles.optionText}>Take Photo</Text>
                </TouchableOpacity>
                
                {showVideos && (
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleRecordVideo}
                  >
                    <View style={styles.optionIconContainer}>
                      <Ionicons name="videocam" size={32} color="#F5F5F7" />
                    </View>
                    <Text style={styles.optionText}>Record Video</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleChooseFromLibrary}
                >
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="images" size={32} color="#F5F5F7" />
                  </View>
                  <Text style={styles.optionText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Upload Error */}
            {uploadError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{uploadError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => handleUploadMedia()}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Selected Media Preview - Only show if not uploading immediately */}
            {!uploadImmediately && selectedMedia.length > 0 && !isUploading && (
              <View style={styles.previewContainer}>
                <FlatList
                  data={selectedMedia}
                  renderItem={renderMediaItem}
                  keyExtractor={(_, index) => `media-${index}`}
                  horizontal={selectedMedia.length <= 2}
                  numColumns={selectedMedia.length > 2 ? 2 : 1}
                  contentContainerStyle={styles.mediaListContainer}
                />
                
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => handleUploadMedia()}
                >
                  <LinearGradient
                    colors={['#3BAFBC', '#1E2B2F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.uploadButtonGradient}
                  >
                    <Text style={styles.uploadButtonText}>
                      Upload Selected Media
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 60, 67, 0.3)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    padding: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 60, 67, 0.2)',
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3BAFBC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  uploadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingStatusText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  previewContainer: {
    padding: 20,
  },
  mediaListContainer: {
    paddingBottom: 16,
  },
  mediaItemContainer: {
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    width: 150,
    height: 150,
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  uploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 16,
  },
  uploadButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  retryButton: {
    backgroundColor: '#FF453A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  }
});

export default MediaPickerModal;