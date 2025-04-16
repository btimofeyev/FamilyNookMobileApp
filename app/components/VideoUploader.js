// app/components/VideoUploader.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import mediaService from '../api/mediaService';

/**
 * Video Uploader Component with direct-to-R2 uploading
 * Updated to use system photo picker and avoid permission requests
 */
const VideoUploader = ({
  memoryId,
  onUploadStart,
  onUploadComplete,
  onUploadCancel,
  onError,
  style
}) => {
  // State
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [video, setVideo] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [uploadDetails, setUploadDetails] = useState(null);
  
  // Refs for tracking uploads
  const uploadRef = useRef(null);
  const cancelTokenRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Cancel upload if in progress
      if (uploadRef.current && cancelTokenRef.current) {
        cancelUpload();
      }
    };
  }, []);

  /**
   * Generate a thumbnail from a video
   */
  const generateThumbnail = async (videoUri) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(
        videoUri,
        {
          time: 1000, // Get thumbnail from 1 second in
          quality: 0.7
        }
      );
      
      if (!isMountedRef.current) return null;
      
      return uri;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  };
  
  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };
  
  /**
   * Pick a video from the library or camera using system picker
   */
  const pickVideo = async (source = 'library') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      let result;
      if (source === 'camera') {
        // Request camera permission only (not storage)
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Camera access is needed to record videos.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 1,
          videoMaxDuration: 60 * 5, // 5 minutes max
          presentationStyle: 1, // Use CURRENT_CONTEXT to avoid storage permissions
        });
      } else {
        // Use system photo picker - no permissions needed
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 1,
          videoMaxDuration: 60 * 5, // 5 minutes max
          presentationStyle: 1, // Use CURRENT_CONTEXT to avoid storage permissions
        });
      }
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      
      const videoAsset = result.assets[0];
      
      // Check file size - warn if larger than 50MB
      let fileSize = videoAsset.fileSize;
      
      // If fileSize is not provided, try to get it
      if (!fileSize) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(videoAsset.uri, { size: true });
          fileSize = fileInfo.size;
        } catch (error) {
          console.warn('Could not determine file size:', error);
        }
      }
      
      const fileSizeMB = fileSize ? fileSize / (1024 * 1024) : 0;
      
      if (fileSizeMB > 50) {
        // Show warning for large files
        Alert.alert(
          'Large Video File',
          `This video is ${fileSizeMB.toFixed(1)}MB which may take a while to upload. Continue?`,
          [
            { 
              text: 'Cancel', 
              style: 'cancel'
            },
            {
              text: 'Continue',
              onPress: () => processSelectedVideo(videoAsset, fileSize)
            }
          ]
        );
      } else {
        processSelectedVideo(videoAsset, fileSize);
      }
    } catch (err) {
      console.error('Error picking video:', err);
      if (onError) onError(err);
      
      Alert.alert(
        'Video Selection Error',
        'There was a problem selecting your video. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  /**
   * Process a selected video
   */
  const processSelectedVideo = async (videoAsset, fileSize) => {
    try {
      // Generate thumbnail
      const thumbnailUri = await generateThumbnail(videoAsset.uri);
      
      // Check if component is still mounted
      if (!isMountedRef.current) return;
      
      // Create file info object with size
      const enhancedVideoAsset = {
        ...videoAsset,
        fileSize: fileSize,
        fileName: videoAsset.fileName || `video-${Date.now()}.mp4`,
        type: videoAsset.mimeType || 'video/mp4'
      };
      
      setVideo(enhancedVideoAsset);
      setThumbnail(thumbnailUri);
      
      // Show confirmation
      Alert.alert(
        'Upload Video',
        'Do you want to upload this video now?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Upload',
            onPress: () => uploadVideo(enhancedVideoAsset)
          }
        ]
      );
    } catch (error) {
      console.error('Error processing video:', error);
      if (onError) onError(error);
    }
  };
  
  /**
   * Cancel a video upload in progress
   */
  const cancelUpload = async () => {
    if (!uploadDetails) return;
    
    try {
      setUploading(false);
      
      // Cancel any active upload
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Upload canceled by user');
      }
      
      // Notify backend to clean up
      await mediaService.cancelUpload(uploadDetails.uploadId, uploadDetails.key);
      
      // Reset state
      setProgress(0);
      setUploadDetails(null);
      
      // Notify parent
      if (onUploadCancel) onUploadCancel();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error canceling upload:', error);
      if (onError) onError(error);
    }
  };
  
  /**
   * Upload the video using presigned URL
   */
  const uploadVideo = async (videoAsset) => {
    if (!videoAsset || !videoAsset.uri) {
      console.error('No video to upload');
      return;
    }
    
    try {
      setUploading(true);
      setProgress(0);
      
      if (onUploadStart) onUploadStart();
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Create a new upload track
      const uploadTrack = {};
      uploadRef.current = uploadTrack;
      
      // Step 1: Get presigned URL
      const uploadDetails = await mediaService.getPresignedUploadUrl(videoAsset);
      setUploadDetails(uploadDetails);
      
      // Step 2: Upload the file directly to R2
      const onProgressUpdate = (progressData) => {
        const percent = Math.round((progressData.loaded / progressData.total) * 100);
        if (percent !== progress) {
          setProgress(percent);
        }
      };
      
      // Create cancellation token
      cancelTokenRef.current = { cancel: (reason) => console.log('Upload cancelled:', reason) };
      
      await mediaService.uploadFileWithPresignedUrl(
        uploadDetails.presignedUrl, 
        videoAsset, 
        onProgressUpdate
      );
      
      // Step 3: Confirm the upload
      await mediaService.confirmUpload(uploadDetails.uploadId, uploadDetails.key);
      
      // Step 4: If memory ID provided, add to memory
      if (memoryId) {
        const result = await mediaService.addMediaToMemory(
          memoryId, 
          uploadDetails.uploadId, 
          uploadDetails.key
        );
        
        if (onUploadComplete) {
          onUploadComplete({
            ...uploadDetails,
            memoryContent: result.content
          });
        }
      } else if (onUploadComplete) {
        onUploadComplete(uploadDetails);
      }
      
      // Reset upload state
      setUploading(false);
      setProgress(100);
      
      // Clear video after successful upload
      setTimeout(() => {
        if (isMountedRef.current) {
          setVideo(null);
          setThumbnail(null);
          setProgress(0);
        }
      }, 2000);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error uploading video:', error);
      setUploading(false);
      
      if (onError) onError(error);
      
      Alert.alert(
        'Upload Failed',
        'There was a problem uploading your video. Please try again.',
        [{ text: 'OK' }]
      );
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  
  /**
   * Render the progress bar
   */
  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${progress}%` }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>{progress}%</Text>
    </View>
  );
  
  /**
   * Render the video thumbnail
   */
  const renderThumbnail = () => (
    <View style={styles.thumbnailContainer}>
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="videocam" size={40} color="#8E8E93" />
        </View>
      )}
      
      {video && (
        <View style={styles.videoInfoContainer}>
          <Text style={styles.videoName} numberOfLines={1}>
            {video.fileName || 'Video'}
          </Text>
          {video.fileSize && (
            <Text style={styles.videoSize}>
              {formatFileSize(video.fileSize)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
  
  /**
   * Render the component's UI
   */
  return (
    <View style={[styles.container, style]}>
      {!video && !uploading ? (
        <BlurView intensity={20} tint="dark" style={styles.selectButtonsContainer}>
          <Text style={styles.title}>Upload Video</Text>
          
          <View style={styles.selectButtons}>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => pickVideo('library')}
            >
              <LinearGradient
                colors={['#3BAFBC', '#1E2B2F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="images" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Gallery</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => pickVideo('camera')}
            >
              <LinearGradient
                colors={['#1E2B2F', '#3BAFBC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Camera</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.helperText}>
            You can upload videos up to 500MB in size.
          </Text>
        </BlurView>
      ) : (
        <BlurView intensity={20} tint="dark" style={styles.uploadContainer}>
          {renderThumbnail()}
          
          {uploading ? (
            <>
              {renderProgressBar()}
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelUpload}
              >
                <Text style={styles.cancelButtonText}>Cancel Upload</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setVideo(null);
                  setThumbnail(null);
                }}
              >
                <Text style={styles.actionButtonText}>Change Video</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => uploadVideo(video)}
              >
                <Text style={styles.primaryButtonText}>Upload</Text>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
      )}
    </View>
  );
};

// Default props
VideoUploader.defaultProps = {
  onUploadStart: () => {},
  onUploadComplete: () => {},
  onUploadCancel: () => {},
  onError: () => {}
};

// Styles
const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  selectButtonsContainer: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  selectButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  selectButton: {
    flex: 1,
    marginHorizontal: 10,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  helperText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  uploadContainer: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  thumbnailContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  videoInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  videoName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  videoSize: {
    fontSize: 14,
    color: '#AEAEB2',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(58, 58, 60, 0.7)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3BAFBC',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF453A',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FF453A',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8E8E93',
    marginHorizontal: 5,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  primaryButton: {
    backgroundColor: '#3BAFBC',
    borderColor: '#3BAFBC',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

export default VideoUploader;