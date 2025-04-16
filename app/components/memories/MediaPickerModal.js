// components/memories/MediaPickerModal.js
import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

const MediaPickerModal = ({ visible, onClose, onSelectMedia }) => {
  const handleTakePhoto = async () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera access is required to take photos');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      onSelectMedia(result.assets[0].uri);
    }
    
    onClose();
  };
  
  const handleChooseFromLibrary = async () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Photo library access is required to select photos');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      onSelectMedia(result.assets[0].uri);
    }
    
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to Memory</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#AEAEB2" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={styles.option} 
              onPress={handleTakePhoto}
            >
              <View style={styles.iconBackground}>
                <Ionicons name="camera" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.option} 
              onPress={handleChooseFromLibrary}
            >
              <View style={styles.iconBackground}>
                <Ionicons name="images" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)', // Fallback for BlurView
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20, // Extra padding for iPhone X and newer
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#38383A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  optionsContainer: {
    padding: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#2C2C2E',
  },
  iconBackground: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CC2C4', // Teal color
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  cancelButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  }
});

export default MediaPickerModal;