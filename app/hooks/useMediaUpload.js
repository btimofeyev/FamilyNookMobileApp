// app/hooks/useMediaUpload.js
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import apiClient from '../api/client';

export default function useMediaUpload(contentType = null) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  
  // Get presigned URL for upload
  const getPresignedUrl = async (file, options = {}) => {
    try {
      // Determine content type
      const fileType = file.type || file.mimeType || 'image/jpeg';
      const fileName = file.fileName || file.name || `upload-${Date.now()}.jpg`;
      const fileSize = file.fileSize || file.size || 0;
      
      // Request a presigned URL
      const response = await apiClient.post('/api/media/presigned-upload', {
        contentType: fileType,
        filename: fileName,
        fileSize,
        memoryId: options.memoryId,
        postId: options.postId
      });
      
      return { 
        presignedUrl: response.data.presignedUrl,
        key: response.data.key,
        fileUrl: response.data.fileUrl,
        uploadId: response.data.uploadId
      };
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      throw error;
    }
  };
  
  // Upload file to presigned URL
  const uploadToPresignedUrl = async (presignedUrl, file) => {
    try {
      // Get blob from local uri
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Upload the file
      await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': file.type || 'image/jpeg'
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to upload to presigned URL:', error);
      throw error;
    }
  };
  
  // Confirm upload completed
  const confirmUpload = async (uploadId, key, options = {}) => {
    try {
      const response = await apiClient.post('/api/media/confirm-upload', {
        uploadId,
        key,
        memoryId: options.memoryId,
        postId: options.postId
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to confirm upload:', error);
      throw error;
    }
  };
  
  // Pick and upload a file
  const pickAndUploadFile = async (options = {}) => {
    try {
      setUploading(true);
      setError(null);
      setProgress(0);
      
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setError('Permission to access media library was denied');
        return null;
      }
      
      // Launch image picker
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: options.showVideos 
          ? ImagePicker.MediaTypeOptions.All 
          : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: !options.allowMultiple,
        aspect: options.aspect || [4, 3],
        quality: 0.8,
        allowsMultipleSelection: options.allowMultiple || false,
        selectionLimit: options.selectionLimit || 4
      });
      
      if (pickerResult.canceled) {
        setUploading(false);
        return null;
      }
      
      // Handle selection
      const assets = pickerResult.assets || [];
      
      // Process multiple assets
      const uploadedMedia = [];
      
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        setProgress(Math.floor((i / assets.length) * 50)); // First 50% is for processing
        
        try {
          // Get pre-signed URL
          const { presignedUrl, key, fileUrl, uploadId } = await getPresignedUrl(asset, {
            postId: options.postId,
            memoryId: options.memoryId
          });
          
          // Upload file to S3/R2
          await uploadToPresignedUrl(presignedUrl, asset);
          
          setProgress(50 + Math.floor((i / assets.length) * 40)); // Next 40% is for uploads
          
          // Confirm upload
          await confirmUpload(uploadId, key, {
            postId: options.postId,
            memoryId: options.memoryId
          });
          
          // Determine media type
          const isVideo = asset.type && asset.type.startsWith('video');
          
          // Add to uploaded media
          uploadedMedia.push({
            url: fileUrl,
            type: isVideo ? 'video' : 'image',
            uploadId,
            key
          });
          
          // Provide haptic feedback for each successful upload
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
          console.error(`Error uploading asset ${i}:`, err);
        }
      }
      
      setProgress(100);
      setUploading(false);
      
      return uploadedMedia;
    } catch (err) {
      setError(err.message || 'Failed to upload media');
      setUploading(false);
      return null;
    }
  };
  
  // Process media from the enhanced media picker
  const processMediaPickerResults = async (pickerResults, options = {}) => {
    if (!pickerResults || !Array.isArray(pickerResults)) {
      return [];
    }
    
    return pickerResults.map(item => ({
      url: item.url,
      type: item.type || 'image',
      uploadId: item.uploadId,
      isUploaded: true
    }));
  };
  
  return {
    uploading,
    error,
    progress,
    pickAndUploadFile,
    processMediaPickerResults,
    getPresignedUrl,
    uploadToPresignedUrl,
    confirmUpload
  };
}