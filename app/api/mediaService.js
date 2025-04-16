// app/api/mediaService.js
import * as FileSystem from 'expo-file-system';
import apiClient from './client';

/**
 * Gets a presigned URL for direct upload to R2 storage
 * @param {Object} fileInfo Object containing file information
 * @returns {Promise<Object>} Upload details including presigned URL
 */
export const getPresignedUploadUrl = async (fileInfo) => {
  try {
    // Validate input
    if (!fileInfo || !fileInfo.uri) {
      throw new Error('Invalid file information');
    }

    // Extract filename and content type
    const uriParts = fileInfo.uri.split('/');
    const fileName = fileInfo.fileName || uriParts[uriParts.length - 1] || `file-${Date.now()}`;
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
};

/**
 * Uploads a file directly to R2 using a presigned URL
 * @param {string} presignedUrl The presigned URL for upload
 * @param {Object} fileInfo The file information object
 * @param {Function} onProgress Progress callback (0-100)
 * @returns {Promise<Object>} Upload result details
 */
export const uploadFileWithPresignedUrl = async (presignedUrl, fileInfo, onProgress) => {
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
      uploadOptions.uploadType = FileSystem.FileSystemUploadType.BINARY_CONTENT;
      
      // Unfortunately, iOS doesn't support progress for uploadAsync
      // Apply platform-specific settings
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
};

/**
 * Confirm a completed upload
 * @param {string} uploadId The upload ID to confirm
 * @param {string} key The object key in R2
 * @returns {Promise<Object>} Confirmation details
 */
export const confirmUpload = async (uploadId, key) => {
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
};

/**
 * Cancel an upload and delete the file if it exists
 * @param {string} uploadId The upload ID to cancel
 * @param {string} key The object key in R2
 * @returns {Promise<Object>} Cancellation details
 */
export const cancelUpload = async (uploadId, key) => {
  try {
    const response = await apiClient.post('/api/media/cancel-upload', {
      uploadId,
      key
    });
    return response.data;
  } catch (error) {
    console.error('Error cancelling upload:', error);
    throw error;
  }
};

/**
 * Add an uploaded file to a specific memory
 * @param {string} memoryId The memory ID to add media to
 * @param {string} uploadId The upload ID of the completed upload
 * @param {string} key The object key in R2
 * @returns {Promise<Object>} Added media details
 */
export const addMediaToMemory = async (memoryId, uploadId, key) => {
  try {
    const response = await apiClient.post(`/api/media/memories/${memoryId}/media`, {
      uploadId,
      key
    });
    return response.data;
  } catch (error) {
    console.error('Error adding media to memory:', error);
    throw error;
  }
};

/**
 * Upload a media file to R2 storage and optionally add it to a memory
 * This is a convenience method that handles the full upload workflow
 * 
 * @param {Object} fileInfo Object containing file information
 * @param {Object} options Upload options
 * @param {string} options.memoryId Optional memory ID to add media to
 * @param {Function} options.onProgress Optional progress callback
 * @param {Function} options.onSuccess Optional success callback
 * @param {Function} options.onError Optional error callback
 * @returns {Promise<Object>} Upload result details
 */
export const uploadMedia = async (fileInfo, options = {}) => {
  const { memoryId, onProgress, onSuccess, onError } = options;
  
  try {
    // Step 1: Get a presigned URL
    const { presignedUrl, uploadId, key, fileUrl } = await getPresignedUploadUrl(fileInfo);
    
    // Step 2: Upload the file directly to R2
    await uploadFileWithPresignedUrl(presignedUrl, fileInfo, onProgress);
    
    // Step 3: Confirm the upload
    await confirmUpload(uploadId, key);
    
    // Step 4: Add to memory if specified
    let memoryContent = null;
    if (memoryId) {
      const result = await addMediaToMemory(memoryId, uploadId, key);
      memoryContent = result.content;
    }
    
    // Call success callback if provided
    if (onSuccess && typeof onSuccess === 'function') {
      onSuccess({
        uploadId,
        key,
        fileUrl,
        memoryContent
      });
    }
    
    return {
      success: true,
      uploadId,
      key,
      fileUrl,
      memoryContent
    };
  } catch (error) {
    console.error('Error in uploadMedia flow:', error);
    
    // Call error callback if provided
    if (onError && typeof onError === 'function') {
      onError(error);
    }
    
    throw error;
  }
};

export default {
  getPresignedUploadUrl,
  uploadFileWithPresignedUrl,
  confirmUpload,
  cancelUpload,
  addMediaToMemory,
  uploadMedia
};