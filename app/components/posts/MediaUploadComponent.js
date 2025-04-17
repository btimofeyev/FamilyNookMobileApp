// app/components/posts/MediaUploadComponent.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform, 
  ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import mediaService from '../../api/mediaService';

const MediaUploadComponent = ({ onMediaUploaded, maxItems = 4 }) => {
  console.log('[MediaUploadComponent] rendered');
  const [selectedMedia, setSelectedMedia] = useState([]);
  // Track uploading state per media
  const [uploadingMap, setUploadingMap] = useState({});
  // Track last uploaded results to prevent infinite loop
  const lastUploadedRef = useRef(null);

  useEffect(() => {
    console.log('[MediaUploadComponent] mounted');
    return () => {
      console.log('[MediaUploadComponent] unmounted');
    };
  }, []);

  // Start upload for a single media item
  const startUpload = async (media) => {
    console.log('[MediaUploadComponent] startUpload called for', media.id);
    // Mark as uploading
    updateMediaStatus(media.id, { status: 'uploading', progress: 0 });
    try {
      const result = await mediaService.uploadMedia(
        {
          uri: media.uri,
          type: media.type || (media.isVideo ? 'video/mp4' : 'image/jpeg'),
          fileName: media.fileName || `media-${Date.now()}.${media.isVideo ? 'mp4' : 'jpg'}`,
          fileSize: media.fileSize
        },
        {
          onProgress: (progress) => {
            updateMediaStatus(media.id, { progress });
          }
        }
      );
      // Only mark as success if not canceled
      setSelectedMedia((prev) =>
        prev.map((m) =>
          m.id === media.id && m.status !== 'canceled'
            ? { ...m, status: 'success', progress: 100, uploadResult: result }
            : m
        )
      );
    } catch (error) {
      // Only mark as error if not canceled
      setSelectedMedia((prev) =>
        prev.map((m) =>
          m.id === media.id && m.status !== 'canceled'
            ? { ...m, status: 'error', error: error.message }
            : m
        )
      );
    }
  };

  // Helper to update a media item's status
  const updateMediaStatus = (id, updates) => {
    setSelectedMedia((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  // Remove/cancel media
  const removeMedia = (id) => {
    setSelectedMedia((prev) =>
      prev.map((m) =>
        m.id === id && m.status === 'uploading'
          ? { ...m, status: 'canceled' }
          : m
      ).filter((m) => m.id !== id || m.status === 'uploading') // keep uploading until finished, but mark as canceled
    );
  };

  // Effect: call onMediaUploaded when all uploads are done and at least one is successful
  useEffect(() => {
    console.log('[MediaUploadComponent] selectedMedia changed', selectedMedia);
    const allDone = selectedMedia.every(
      (m) =>
        m.status === 'success' ||
        m.status === 'error' ||
        m.status === 'canceled'
    );
    if (allDone && selectedMedia.some((m) => m.status === 'success')) {
      const results = selectedMedia
        .filter((m) => m.status === 'success')
        .map((media) => ({
          mediaUrl: media.uploadResult.fileUrl,
          mediaType: media.isVideo ? 'video' : 'image',
          mediaKey: media.uploadResult.key
        }));
      // Only call onMediaUploaded if results are different
      if (
        !lastUploadedRef.current ||
        JSON.stringify(lastUploadedRef.current) !== JSON.stringify(results)
      ) {
        lastUploadedRef.current = results;
        console.log('[MediaUploadComponent] onMediaUploaded called', results);
        if (onMediaUploaded) onMediaUploaded(results);
      }
    }
  }, [selectedMedia, onMediaUploaded]);

  const pickMedia = async () => {
    console.log('[MediaUploadComponent] pickMedia called');
    // No permissions needed for modern pickers!
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: maxItems - selectedMedia.length,
        quality: 0.8,
        videoMaxDuration: 60,
        orderedSelection: true, // Get latest selected items first
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Filter assets to ensure we don't exceed max
        const newAssets = result.assets.slice(0, maxItems - selectedMedia.length);
        // Only generate IDs for new assets, never for already-picked
        const now = Date.now();
        const mediaWithInfo = await Promise.all(
          newAssets.map(async (asset, idx) => {
            // Get file size for display
            const fileInfo = await FileSystem.getInfoAsync(asset.uri, { size: true });
            const sizeInMB = (fileInfo.size / (1024 * 1024)).toFixed(2);
            // Determine if it's a video based on type or extension
            const isVideo = asset.type?.startsWith('video') || 
                          asset.uri.endsWith('.mp4') || 
                          asset.uri.endsWith('.mov');
            return {
              ...asset,
              id: asset.assetId || asset.id || `${now}-${idx}-${Math.random()}`,
              progress: 0,
              fileSize: fileInfo.size,
              sizeFormatted: `${sizeInMB} MB`,
              isVideo,
              status: 'pending' // pending, uploading, success, error
            };
          })
        );
        // Add new media and start upload for each
        setSelectedMedia((prev) => {
          const updated = [...prev, ...mediaWithInfo];
          mediaWithInfo.forEach((media) => startUpload(media));
          return updated;
        });
      }
    } catch (error) {
      console.error("Error picking media:", error);
      alert("There was a problem selecting media. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Media Preview Section */}
      {selectedMedia.length > 0 && (
        <View style={styles.previewContainer}>
          {selectedMedia.map((media) => {
            if (media.status === 'canceled') return null; // Hide canceled
            return (
              <BlurView key={media.id} intensity={10} tint="dark" style={styles.previewItem}>
                <Image 
                  source={{ uri: media.uri }} 
                  style={styles.previewImage} 
                  resizeMode="cover"
                />
                {media.isVideo && (
                  <View style={styles.videoIndicator}>
                    <Ionicons name="videocam" size={16} color="#FFFFFF" />
                  </View>
                )}
                {/* File size badge */}
                <View style={styles.sizeBadge}>
                  <Text style={styles.sizeText}>{media.sizeFormatted}</Text>
                </View>
                {/* Status indicator */}
                {(media.status === 'pending' || media.status === 'uploading') && (
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeMedia(media.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF453A" />
                  </TouchableOpacity>
                )}
                {media.status === 'uploading' && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.uploadingText}>{`${Math.round(media.progress)}%`}</Text>
                  </View>
                )}
                {media.status === 'canceled' && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#FF453A" />
                    <Text style={styles.uploadingText}>Canceling...</Text>
                  </View>
                )}
                {media.status === 'success' && (
                  <View style={styles.successOverlay}>
                    <Ionicons name="checkmark-circle" size={24} color="#32D74B" />
                  </View>
                )}
                {media.status === 'error' && (
                  <TouchableOpacity 
                    style={styles.errorOverlay}
                    onPress={() => removeMedia(media.id)}
                  >
                    <Ionicons name="alert-circle" size={24} color="#FF453A" />
                    <Text style={styles.errorText}>Failed</Text>
                  </TouchableOpacity>
                )}
              </BlurView>
            );
          })}
          {/* Add more button if under limit */}
          {selectedMedia.filter((m) => m.status !== 'canceled').length < maxItems && (
            <TouchableOpacity 
              style={styles.addMoreButton}
              onPress={pickMedia}
              disabled={selectedMedia.some((m) => m.status === 'uploading')}
            >
              <Ionicons name="add-circle" size={24} color="#3BAFBC" />
              <Text style={styles.addMoreText}>Add More</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* Controls */}
      <View style={styles.controls}>
        {selectedMedia.length === 0 && (
          <TouchableOpacity style={styles.pickButton} onPress={pickMedia}>
            <Ionicons name="images" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Pick Media</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  previewItem: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
  },
  sizeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
  },
  sizeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  addMoreButton: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 8,
    backgroundColor: 'rgba(59, 175, 188, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.5)',
    borderStyle: 'dashed',
  },
  addMoreText: {
    color: '#3BAFBC',
    fontSize: 14,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3BAFBC',
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

export default MediaUploadComponent;