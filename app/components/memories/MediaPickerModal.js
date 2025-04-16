// components/memories/MediaPickerModal.js
// app/components/memories/EnhancedMediaPicker.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import mediaService from '../../api/mediaService';
import VideoUploader from '../VideoUploader';

const { width } = Dimensions.get('window');

/**
 * Enhanced Media Picker Modal with Direct-to-R2 Uploads
 * 
 * @param {Object} props Component props
 * @param {boolean} props.visible Whether the modal is visible
 * @param {Function} props.onClose Function to close the modal
 * @param {Function} props.onSelectMedia Function called when media is selected
 * @param {string} props.memoryId Optional memory ID to add media to directly
 * @param {boolean} props.allowMultiple Whether to allow multiple selection
 * @param {boolean} props.showVideos Whether to display video upload option
 */
const EnhancedMediaPicker = ({
  visible,
  onClose,
  onSelectMedia,
  memoryId,
  allowMultiple = false,
  showVideos = true
}) => {
  // State
  const [hasPermission, setHasPermission] = useState(null);
  const [mediaItems, setMediaItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentTab, setCurrentTab] = useState('photos'); // 'photos', 'videos'
  const [isEndReached, setIsEndReached] = useState(false);
  
  // Refs
  const isMountedRef = useRef(true);
  const paginationRef = useRef({
    hasNextPage: true,
    endCursor: null,
    numColumns: 3,
    pageSize: 60, // Load 60 items at a time
  });
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Request permissions and load media when modal becomes visible
  useEffect(() => {
    if (visible) {
      requestPermissions();
    } else {
      // Reset selections when modal closes
      setSelectedItems([]);
      setCurrentTab('photos');
    }
  }, [visible]);
  
  // Load media items when permissions are granted
  useEffect(() => {
    if (hasPermission === true && currentTab === 'photos') {
      loadMediaItems();
    }
  }, [hasPermission, currentTab]);
  
  /**
   * Request media library permissions
   */
  const requestPermissions = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Media library permissions are needed to select photos and videos.',
          [{ text: 'OK' }]
        );
      }
      
      setHasPermission(status === 'granted');
    } catch (err) {
      console.error('Error requesting permissions:', err);
      setHasPermission(false);
    }
  };
  
  /**
   * Load media items from the device's media library
   */
  const loadMediaItems = async (isLoadMore = false) => {
    if (loadingMedia || !hasPermission || (isLoadMore && !paginationRef.current.hasNextPage)) {
      return;
    }
    
    try {
      setLoadingMedia(true);
      
      // Configure media query based on tab
      const mediaType = currentTab === 'photos' ? 
        [MediaLibrary.MediaType.photo] : 
        [MediaLibrary.MediaType.video];
      
      // Load media items with pagination
      const options = {
        mediaType,
        first: paginationRef.current.pageSize,
        sortBy: [MediaLibrary.SortBy.creationTime],
      };
      
      // Add after cursor for pagination
      if (isLoadMore && paginationRef.current.endCursor) {
        options.after = paginationRef.current.endCursor;
      }
      
      const { assets, endCursor, hasNextPage } = await MediaLibrary.getAssetsAsync(options);
      
      // Update pagination info
      paginationRef.current.endCursor = endCursor;
      paginationRef.current.hasNextPage = hasNextPage;
      setIsEndReached(!hasNextPage);
      
      if (isLoadMore) {
        // Append new items to existing list
        setMediaItems(prevItems => [...prevItems, ...assets]);
      } else {
        // Replace list with new items
        setMediaItems(assets);
      }
    } catch (err) {
      console.error('Error loading media items:', err);
      Alert.alert(
        'Error Loading Media',
        'There was a problem loading your media. Please try again.'
      );
    } finally {
      setLoadingMedia(false);
    }
  };
  
  /**
   * Handle end reached for pagination
   */
  const handleEndReached = () => {
    if (!loadingMedia && paginationRef.current.hasNextPage) {
      loadMediaItems(true);
    }
  };
  
  /**
   * Handle media item selection
   */
  const handleSelectItem = (item) => {
    Haptics.selectionAsync();
    
    if (allowMultiple) {
      // Multiple selection mode
      const isSelected = selectedItems.some(selected => selected.id === item.id);
      
      if (isSelected) {
        // Remove from selection
        setSelectedItems(prevItems => 
          prevItems.filter(selected => selected.id !== item.id)
        );
      } else {
        // Add to selection (limited to 10 items for performance)
        if (selectedItems.length < 10) {
          setSelectedItems(prevItems => [...prevItems, item]);
        } else {
          Alert.alert(
            'Selection Limit',
            'You can select up to 10 items at once.'
          );
        }
      }
    } else {
      // Single selection mode - immediately upload
      handleUploadMedia([item]);
    }
  };
  
  /**
   * Handle taking a photo with the camera
   */
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is needed to take photos.'
        );
        return;
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      
      // Process the captured photo
      handleUploadMedia([{
        uri: result.assets[0].uri,
        fileName: `photo-${Date.now()}.jpg`,
        type: 'image/jpeg'
      }]);
    } catch (err) {
      console.error('Error taking photo:', err);
      Alert.alert(
        'Camera Error',
        'There was a problem taking the photo. Please try again.'
      );
    }
  };
  
  /**
   * Handle uploading selected media
   */
  const handleUploadMedia = async (itemsToUpload = selectedItems) => {
    if (itemsToUpload.length === 0) {
      Alert.alert('Please select at least one item');
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Process each item one by one for better error handling
      const results = [];
      
      for (let i = 0; i < itemsToUpload.length; i++) {
        const item = itemsToUpload[i];
        const progressPercent = Math.round((i / itemsToUpload.length) * 100);
        setUploadProgress(progressPercent);
        
        try {
          // Prepare media info
          const assetInfo = await MediaLibrary.getAssetInfoAsync(item.id);
          
          const mediaInfo = {
            uri: assetInfo.localUri || assetInfo.uri,
            fileName: assetInfo.filename || `media-${Date.now()}.jpg`,
            type: assetInfo.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4',
            fileSize: assetInfo.fileSize
          };
          
          // Use mediaService to handle the upload
          const uploadResult = await mediaService.uploadMedia(mediaInfo, {
            memoryId,
            onProgress: (progress) => {
              // Calculate overall progress
              const itemProgress = progress * (1 / itemsToUpload.length);
              const overallProgress = progressPercent + itemProgress;
              setUploadProgress(Math.min(overallProgress, 99));
            }
          });
          
          results.push(uploadResult);
        } catch (itemError) {
          console.error(`Error uploading item ${i}:`, itemError);
          // Continue with other items
        }
      }
      
      // All uploads completed
      setUploadProgress(100);
      
      // Send results back to parent
      if (results.length > 0) {
        onSelectMedia(results);
      }
      
      // Close modal after short delay to show completion
      setTimeout(() => {
        if (isMountedRef.current) {
          onClose();
        }
      }, 1000);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error uploading media:', err);
      Alert.alert(
        'Upload Error',
        'There was a problem uploading your media. Please try again.'
      );
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
      }
    }
  };
  
  /**
   * Render a grid item
   */
  const renderItem = ({ item }) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    const itemSize = width / paginationRef.current.numColumns - 8;
    
    return (
      <TouchableOpacity
        style={[
          styles.mediaItem,
          { width: itemSize, height: itemSize },
          isSelected && styles.selectedItem
        ]}
        onPress={() => handleSelectItem(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.mediaItemImage}
          resizeMode="cover"
        />
        
        {item.mediaType === 'video' && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play-circle" size={24} color="white" />
          </View>
        )}
        
        {allowMultiple && isSelected && (
          <View style={styles.selectionIndicator}>
            <View style={styles.selectionCircle}>
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  /**
   * Render the media grid
   */
  const renderMediaGrid = () => (
    <FlatList
      data={mediaItems}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={paginationRef.current.numColumns}
      contentContainerStyle={styles.gridContainer}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMedia && !isEndReached ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#3BAFBC" />
          </View>
        ) : null
      }
      ListEmptyComponent={
        !loadingMedia ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyText}>No media found</Text>
          </View>
        ) : (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3BAFBC" />
          </View>
        )
      }
    />
  );
  
  /**
   * Render the video uploader
   */
  const renderVideoUploader = () => (
    <VideoUploader
      memoryId={memoryId}
      onUploadComplete={(result) => {
        onSelectMedia([result]);
        
        // Close modal after successful upload
        setTimeout(() => {
          if (isMountedRef.current) {
            onClose();
          }
        }, 1000);
      }}
      onError={(error) => {
        console.error('Video upload error:', error);
      }}
      style={styles.videoUploader}
    />
  );
  
  /**
   * Render the bottom action bar
   */
  const renderActionBar = () => (
    <View style={styles.actionBar}>
      {allowMultiple && currentTab === 'photos' && (
        <TouchableOpacity
          style={[
            styles.uploadButton,
            selectedItems.length === 0 && styles.disabledButton
          ]}
          onPress={() => handleUploadMedia()}
          disabled={selectedItems.length === 0 || uploading}
        >
          <LinearGradient
            colors={['#3BAFBC', '#1E2B2F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.uploadButtonGradient}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="white" />
                <Text style={styles.uploadButtonText}>
                  Upload {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}
      
      {currentTab === 'photos' && (
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handleTakePhoto}
          disabled={uploading}
        >
          <Ionicons name="camera" size={24} color="#3BAFBC" />
        </TouchableOpacity>
      )}
    </View>
  );
  
  /**
   * Render the tab selector
   */
  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      <TouchableOpacity
        style={[
          styles.tab,
          currentTab === 'photos' && styles.activeTab
        ]}
        onPress={() => setCurrentTab('photos')}
      >
        <Ionicons 
          name={currentTab === 'photos' ? "images" : "images-outline"} 
          size={22} 
          color={currentTab === 'photos' ? "#3BAFBC" : "#8E8E93"} 
        />
        <Text style={[
          styles.tabText,
          currentTab === 'photos' && styles.activeTabText
        ]}>Photos</Text>
      </TouchableOpacity>
      
      {showVideos && (
        <TouchableOpacity
          style={[
            styles.tab,
            currentTab === 'videos' && styles.activeTab
          ]}
          onPress={() => setCurrentTab('videos')}
        >
          <Ionicons 
            name={currentTab === 'videos' ? "videocam" : "videocam-outline"} 
            size={22} 
            color={currentTab === 'videos' ? "#3BAFBC" : "#8E8E93"} 
          />
          <Text style={[
            styles.tabText,
            currentTab === 'videos' && styles.activeTabText
          ]}>Videos</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  /**
   * Render upload progress overlay
   */
  const renderUploadProgress = () => (
    uploading && (
      <View style={styles.progressOverlay}>
        <BlurView intensity={40} tint="dark" style={styles.progressBlur}>
          <ActivityIndicator size="large" color="#3BAFBC" />
          <Text style={styles.progressText}>Uploading...</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${uploadProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressPercent}>{uploadProgress}%</Text>
        </BlurView>
      </View>
    )
  );
  
  // Main render
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <BlurView intensity={15} tint="dark" style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {currentTab === 'photos' ? 'Select Photos' : 'Upload Video'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          {renderTabSelector()}
          
          <View style={styles.content}>
            {currentTab === 'photos' ? renderMediaGrid() : renderVideoUploader()}
          </View>
          
          {currentTab === 'photos' && renderActionBar()}
          {renderUploadProgress()}
        </BlurView>
      </View>
    </Modal>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'rgba(18, 18, 18, 0.85)', // Fallback color
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 60, 67, 0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  tabSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 60, 67, 0.3)',
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3BAFBC',
  },
  tabText: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  activeTabText: {
    color: '#3BAFBC',
    fontWeight: '500',
  },
  gridContainer: {
    padding: 4,
  },
  mediaItem: {
    margin: 4,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedItem: {
    borderColor: '#3BAFBC',
    borderWidth: 2,
  },
  mediaItemImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3BAFBC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(60, 60, 67, 0.3)',
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  uploadButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cameraButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 175, 188, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  loaderContainer: {
    padding: 20,
    alignItems: 'center',
  },
  videoUploader: {
    flex: 1,
    margin: 16,
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  progressBlur: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginVertical: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  progressBar: {
    width: 200,
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
  progressPercent: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

export default EnhancedMediaPicker;