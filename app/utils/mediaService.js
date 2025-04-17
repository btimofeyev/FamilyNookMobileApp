// app/utils/mediaService.js
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import apiClient from '../api/client';
import { API_URL } from '@env';

const API_ENDPOINT = API_URL || 'https://famlynook.com';

/**
 * Centralized media service for handling all media operations in the app
 */
class MediaService {
  /**
   * Request necessary permissions for media access
   * @returns {Promise<boolean>} True if permissions granted, false otherwise
   */
  async requestMediaPermissions() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media permissions:', error);
      return false;
    }
  }

  /**
   * Request camera permissions
   * @returns {Promise<boolean>} True if permissions granted, false otherwise
   */
  async requestCameraPermissions() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  /**
   * Launch image picker to select media from device
   * @param {Object} options Picker options
   * @param {boolean} options.allowsMultipleSelection Allow multiple selections
   * @param {boolean} options.includeVideos Include videos in picker
   * @param {boolean} options.allowsEditing Allow editing of selected media
   * @returns {Promise<Array|Object|null>} Selected media or null if cancelled
   */
  async pickMedia(options = {}) {
    const {
      allowsMultipleSelection = false,
      includeVideos = false,
      allowsEditing = true,
      quality = 0.7,
      aspect = [1, 1],
      onPermissionMissing = () => {}
    } = options;

    try {
      const hasPermission = await this.requestMediaPermissions();
      
      if (!hasPermission) {
        onPermissionMissing();
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your media library."
        );
        return null;
      }

      Haptics.selectionAsync();

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: includeVideos 
          ? ImagePicker.MediaTypeOptions.All 
          : ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        allowsMultipleSelection,
        aspect,
        quality,
        exif: false
      });

      if (result.canceled) {
        return null;
      }

      // Return array even for single selection for consistency
      return result.assets || null;
    } catch (error) {
      console.error('Error picking media:', error);
      return null;
    }
  }

  /**
   * Launch camera to capture photo or video
   * @param {Object} options Camera options
   * @param {boolean} options.captureVideo Capture video instead of photo
   * @returns {Promise<Object|null>} Captured media or null if cancelled
   */
  async captureWithCamera(options = {}) {
    const {
      captureVideo = false,
      allowsEditing = true,
      quality = 0.7,
      aspect = [1, 1],
      onPermissionMissing = () => {}
    } = options;

    try {
      const hasPermission = await this.requestCameraPermissions();
      
      if (!hasPermission) {
        onPermissionMissing();
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your camera."
        );
        return null;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: captureVideo 
          ? ImagePicker.MediaTypeOptions.Videos 
          : ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        aspect,
        quality,
        exif: false
      });

      if (result.canceled) {
        return null;
      }

      return result.assets?.[0] || null;
    } catch (error) {
      console.error('Error capturing with camera:', error);
      return null;
    }
  }

  /**
   * Generate a unique file name for media
   * @param {Object} fileInfo Original file info
   * @returns {string} Generated file name
   */
  generateUniqueFileName(fileInfo) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = this._getFileExtension(fileInfo);
    return `media_${timestamp}_${randomString}.${extension}`;
  }

  /**
   * Get file extension from media info
   * @param {Object} fileInfo File information
   * @returns {string} File extension
   */
  _getFileExtension(fileInfo) {
    // Try to get from URI first
    if (fileInfo.uri) {
      const uriParts = fileInfo.uri.split('.');
      const lastPart = uriParts[uriParts.length - 1];
      
      // Check if it's a valid extension
      if (lastPart && lastPart.length <= 6) {
        return lastPart.toLowerCase();
      }
    }
    
    // Try to get from type
    if (fileInfo.type) {
      const typeParts = fileInfo.type.split('/');
      if (typeParts.length > 1) {
        return typeParts[1].toLowerCase();
      }
    }
    
    // Default extensions based on type
    if (fileInfo.type) {
      if (fileInfo.type.startsWith('image/')) {
        return 'jpg';
      } else if (fileInfo.type.startsWith('video/')) {
        return 'mp4';
      }
    }
    
    // Final fallback
    return 'unknown';
  }

  /**
   * Gets a presigned URL for direct upload to R2 storage
   * @param {Object} fileInfo Object containing file information
   * @returns {Promise<Object>} Upload details including presigned URL
   */
  async getPresignedUploadUrl(fileInfo) {
    try {
      // Validate input
      if (!fileInfo || !fileInfo.uri) {
        throw new Error('Invalid file information');
      }

      // Extract filename and content type
      const fileName = fileInfo.fileName || this.generateUniqueFileName(fileInfo);
      const contentType = fileInfo.type || 'application/octet-stream';
      
      // Get file size if possible
      let fileSize = fileInfo.fileSize;
      if (!fileSize) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(fileInfo.uri, { size: true });
          fileSize = fileInfo.size;
        } catch (error) {
          console.log('Could not determine file size:', error);
        }
      }

      console.log(`Requesting presigned URL for: ${fileName} (${contentType}, ${fileSize} bytes)`);

      // Request a presigned URL from the server
      const response = await apiClient.post('/api/media/presigned-upload', {
        filename: fileName,
        contentType,
        fileSize
      });

      return response.data;
    } catch (error) {
      console.error('Error getting presigned upload URL:', error);
      throw error;
    }
  }

  /**
   * Uploads a file directly to R2 using a presigned URL
   * @param {string} presignedUrl The presigned URL for upload
   * @param {Object} fileInfo The file information object
   * @param {Function} onProgress Progress callback (0-100)
   * @returns {Promise<Object>} Upload result details
   */
  async uploadFileWithPresignedUrl(presignedUrl, fileInfo, onProgress) {
    try {
      // Get the file URI
      const fileUri = fileInfo.uri;
      if (!fileUri) {
        throw new Error('File URI is required');
      }
  
      // Create upload options
      const uploadOptions = {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': fileInfo.type || 'application/octet-stream'
        }
      };
  
      // Add progress callback if provided
      if (onProgress && typeof onProgress === 'function') {
        uploadOptions.sessionType = FileSystem.FileSystemSessionType.BACKGROUND;
        
        if (Platform.OS === 'android') {
          uploadOptions.progressInterval = 100; // Report progress every 100ms on Android
        }
      }
  
      // Start the upload
      console.log(`Starting direct upload to ${presignedUrl}`);
      const uploadResult = await FileSystem.uploadAsync(presignedUrl, fileUri, uploadOptions);
      
      // Check if upload was successful
      if (uploadResult.status !== 200 && uploadResult.status !== 201) {
        console.error('Upload failed with status:', uploadResult.status);
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }
  
      console.log('Upload completed successfully');
      return uploadResult;
    } catch (error) {
      console.error('Error uploading file with presigned URL:', error);
      throw error;
    }
  }

  /**
   * Confirm a completed upload
   * @param {string} uploadId The upload ID to confirm
   * @param {string} key The object key in R2
   * @returns {Promise<Object>} Confirmation details
   */
  async confirmUpload(uploadId, key) {
    try {
      const response = await apiClient.post('/api/media/confirm-upload', {
        uploadId,
        key
      });
      return response.data;
    } catch (error) {
      console.error('Error confirming upload:', error);
      throw error;
    }
  }

  /**
   * Upload a media file to R2 storage using the complete process
   * @param {Object} fileInfo Object containing file information
   * @param {Object} options Upload options
   * @returns {Promise<Object>} Upload result details
   */
  async uploadMedia(fileInfo, options = {}) {
    const { onProgress, onSuccess, onError } = options;
    
    try {
      // Step 1: Get a presigned URL
      const { presignedUrl, uploadId, key, fileUrl } = await this.getPresignedUploadUrl(fileInfo);
      
      // Step 2: Upload the file directly to R2
      await this.uploadFileWithPresignedUrl(presignedUrl, fileInfo, onProgress);
      
      // Step 3: Confirm the upload
      await this.confirmUpload(uploadId, key);
      
      // Call success callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess({
          uploadId,
          key,
          fileUrl
        });
      }
      
      return {
        success: true,
        uploadId,
        key,
        fileUrl
      };
    } catch (error) {
      console.error('Error in uploadMedia flow:', error);
      
      // Call error callback if provided
      if (onError && typeof onError === 'function') {
        onError(error);
      }
      
      throw error;
    }
  }

  /**
   * Upload multiple media files to R2 storage in parallel
   * @param {Array<Object>} fileInfoArray Array of file information objects
   * @param {Object} options Upload options
   * @returns {Promise<Array<Object>>} Array of upload result details
   */
  async uploadMultipleMedia(fileInfoArray, options = {}) {
    const { 
      onProgress, 
      onItemComplete,
      onAllComplete,
      onError,
      maxConcurrent = 2
    } = options;
    
    // Validation
    if (!Array.isArray(fileInfoArray) || fileInfoArray.length === 0) {
      throw new Error('No files to upload');
    }
    
    const results = [];
    const errors = [];
    
    // Helper to process uploads in batches
    const processBatch = async (batch, startIndex) => {
      const batchResults = await Promise.all(
        batch.map(async (fileInfo, idx) => {
          const itemIndex = startIndex + idx;
          
          try {
            // Upload the item
            const result = await this.uploadMedia(fileInfo, {
              onProgress: onProgress ? (progress) => onProgress(itemIndex, progress) : undefined
            });
            
            // Call item complete callback if provided
            if (onItemComplete && typeof onItemComplete === 'function') {
              onItemComplete(itemIndex, result);
            }
            
            return { success: true, index: itemIndex, ...result };
          } catch (error) {
            console.error(`Error uploading file at index ${itemIndex}:`, error);
            
            // Add to errors array
            errors.push({ index: itemIndex, error });
            
            // Call error callback if provided
            if (onError && typeof onError === 'function') {
              onError(itemIndex, error);
            }
            
            return { success: false, index: itemIndex, error };
          }
        })
      );
      
      return batchResults;
    };
    
    // Process files in batches for controlled concurrency
    for (let i = 0; i < fileInfoArray.length; i += maxConcurrent) {
      const batch = fileInfoArray.slice(i, i + maxConcurrent);
      const batchResults = await processBatch(batch, i);
      results.push(...batchResults);
    }
    
    // Call all complete callback if provided
    if (onAllComplete && typeof onAllComplete === 'function') {
      onAllComplete(results, errors);
    }
    
    return results;
  }

  /**
   * Associate uploaded media with a specific entity (post, memory, etc.)
   * @param {Array<string>} mediaUrls Array of media URLs
   * @param {string} entityType Type of entity (post, memory, etc.)
   * @param {string} entityId ID of the entity
   * @returns {Promise<Object>} Result of association
   */
  async associateMediaWithEntity(mediaUrls, entityType, entityId) {
    try {
      if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
        throw new Error('No media URLs provided');
      }
      
      if (!entityType || !entityId) {
        throw new Error('Entity type and ID are required');
      }
      
      const response = await apiClient.post(`/api/${entityType}/${entityId}/media`, {
        mediaUrls
      });
      
      return response.data;
    } catch (error) {
      console.error('Error associating media with entity:', error);
      throw error;
    }
  }

  /**
   * Add media content to a memory
   * @param {string} memoryId Memory ID
   * @param {Array<Object>} mediaItems Array of media items (with URLs)
   * @returns {Promise<Object>} Result of adding content
   */
  async addMediaToMemory(memoryId, mediaItems) {
    try {
      if (!memoryId) {
        throw new Error('Memory ID is required');
      }
      
      if (!mediaItems || !Array.isArray(mediaItems) || mediaItems.length === 0) {
        throw new Error('No media items provided');
      }
      
      // Convert media items to URLs
      const mediaUrls = mediaItems.map(item => item.fileUrl || item.url);
      
      return await this.associateMediaWithEntity(mediaUrls, 'memories', memoryId);
    } catch (error) {
      console.error('Error adding media to memory:', error);
      throw error;
    }
  }

  /**
   * Create a post with media
   * @param {string} familyId Family ID
   * @param {string} caption Post caption
   * @param {Array<Object>} mediaItems Array of media items
   * @returns {Promise<Object>} Created post
   */
  async createPostWithMedia(familyId, caption, mediaItems) {
    try {
      if (!familyId) {
        throw new Error('Family ID is required');
      }
      
      if (!mediaItems || !Array.isArray(mediaItems)) {
        mediaItems = [];
      }
      
      // Extract media URLs and types
      const mediaUrls = mediaItems.map(item => item.fileUrl || item.url);
      const mediaTypes = mediaItems.map(item => {
        if (item.type && item.type.startsWith('video/')) {
          return 'video';
        }
        return 'image';
      });
      
      // Create payload
      const payload = {
        caption,
        familyId,
        mediaUrls,
        mediaTypes
      };
      
      const response = await apiClient.post(`/api/family/${familyId}/posts/with-media`, payload);
      return response.data;
    } catch (error) {
      console.error('Error creating post with media:', error);
      throw error;
    }
  }

  /**
   * Get media type from file information
   * @param {Object} fileInfo File information
   * @returns {string} Media type ('image', 'video', or 'unknown')
   */
  getMediaType(fileInfo) {
    if (!fileInfo) return 'unknown';
    
    if (fileInfo.type) {
      if (fileInfo.type.startsWith('image/')) {
        return 'image';
      } else if (fileInfo.type.startsWith('video/')) {
        return 'video';
      }
    }
    
    // Try to determine from URI
    if (fileInfo.uri) {
      const ext = this._getFileExtension(fileInfo);
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return 'image';
      } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
        return 'video';
      }
    }
    
    return 'unknown';
  }
}

// Export a singleton instance
export default new MediaService();