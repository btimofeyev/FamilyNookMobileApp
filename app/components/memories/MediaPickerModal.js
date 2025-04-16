// components/memories/MediaPickerModal.js
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
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import mediaService from '../../api/mediaService';
import VideoUploader from '../VideoUploader';

const { width } = Dimensions.get('window');

/**
 * Enhanced Media Picker Modal with Direct-to-R2 Uploads
 * Using Android Photo Picker API to avoid permission requests
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
  const [mediaItems, setMediaItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentTab, setCurrentTab] = useState('photos'); // 'photos', 'videos'
  
  // Refs
  const isMountedRef = useRef(true);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Reset selections when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedItems([]);
      setCurrentTab('photos');
    }
  }, [visible]);
  
  /**
   * Launch system photo picker - avoiding permissions
   */
  const launchImagePicker = async (isMultiple = false) => {
    try {
      setLoadingMedia(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultiple: isMultiple,
        quality: 0.8,
        presentationStyle: 1, // Use CURRENT_CONTEXT for system photo picker
        aspect: [4, 3]
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Map the assets to our format
        const newMediaItems = result.assets.map(asset => ({
          id: asset.assetId || `temp-${Date.now()}-${Math.random()}`,
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          mediaType: 'photo',
          fileName: asset.fileName || `photo-${Date.now()}.jpg`,
          fileSize: asset.fileSize,
          type: asset.type || 'image/jpeg'
        }));
        
        setMediaItems(newMediaItems);
        
        // If not multiple selection, immediately upload the first item
        if (!isMultiple) {
          handleUploadMedia([newMediaItems[0]]);
        } else {
          // Otherwise, make all items selected
          setSelectedItems(newMediaItems);
        }
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert(
        'Error',
        'There was a problem loading your media. Please try again.'
      );
    } finally {
      setLoadingMedia(false);
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
          const mediaInfo = {
            uri: item.uri,
            fileName: item.fileName || `media-${Date.now()}.jpg`,
            type: item.type || 'image/jpeg',
            fileSize: item.fileSize
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
   * Render the image selection content
   */
  const renderPhotoSelection = () => (
    <View style={styles.photoSelectionContainer}>
      {mediaItems.length > 0 ? (
        <FlatList
          data={mediaItems}
          renderItem={({ item }) => {
            const isSelected = selectedItems.some(selected => selected.id === item.id);
            const itemSize = width / 3 - 8;
            
            return (
              <TouchableOpacity
                style={[
                  styles.mediaItem,
                  { width: itemSize, height: itemSize },
                  isSelected && styles.selectedItem
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  
                  if (allowMultiple) {
                    // Toggle selection
                    if (isSelected) {
                      setSelectedItems(prev => prev.filter(s => s.id !== item.id));
                    } else {
                      setSelectedItems(prev => [...prev, item]);
                    }
                  } else {
                    // Direct upload for single selection
                    handleUploadMedia([item]);
                  }
                }}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={styles.mediaItemImage}
                  resizeMode="cover"
                />
                
                {allowMultiple && isSelected && (
                  <View style={styles.selectionIndicator}>
                    <View style={styles.selectionCircle}>
                      <Ionicons name="checkmark" size={16} color="white" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
        />
      ) : (
        <View style={styles.selectActionsContainer}>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => launchImagePicker(allowMultiple)}
          >
            <LinearGradient
              colors={['#3BAFBC', '#1E2B2F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.browseButtonGradient}
            >
              <Ionicons name="images" size={24} color="white" />
              <Text style={styles.browseButtonText}>Browse Photos</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleTakePhoto}
          >
            <View style={styles.cameraButtonInner}>
              <Ionicons name="camera" size={24} color="#3BAFBC" />
              <Text style={styles.cameraButtonText}>Take Photo</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
  
  /**
   * Render the bottom action bar
   */
  const renderActionBar = () => (
    <View style={styles.actionBar}>
      {allowMultiple && currentTab === 'photos' && mediaItems.length > 0 && (
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
          style={styles.secondaryButton}
          onPress={() => {
            if (mediaItems.length > 0) {
              // Clear selection
              setMediaItems([]);
              setSelectedItems([]);
            } else {
              // Take photo
              handleTakePhoto();
            }
          }}
          disabled={uploading}
        >
          <Ionicons 
            name={mediaItems.length > 0 ? "refresh" : "camera"} 
            size={22} 
            color="#3BAFBC" 
          />
          <Text style={styles.secondaryButtonText}>
            {mediaItems.length > 0 ? "Clear" : "Camera"}
          </Text>
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
            {currentTab === 'photos' ? renderPhotoSelection() : (
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
            )}
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
  photoSelectionContainer: {
    flex: 1,
  },
  selectActionsContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  browseButton: {
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  browseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 18,
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  cameraButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.3)',
    overflow: 'hidden',
  },
  cameraButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(59, 175, 188, 0.1)',
  },
  cameraButtonText: {
    color: '#3BAFBC',
    fontWeight: '600',
    fontSize: 18,
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
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
    marginRight: 10,
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 175, 188, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.3)',
  },
  secondaryButtonText: {
    color: '#3BAFBC',
    fontWeight: '500',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  disabledButton: {
    opacity: 0.5,
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