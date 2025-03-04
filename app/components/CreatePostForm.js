// app/components/CreatePostForm.js
import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Image, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createPost } from '../api/feedService';
import { BlurView } from 'expo-blur';

export default function CreatePostForm({ familyId, onPostCreated, onCancel }) {
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia({
        uri: result.assets[0].uri,
        type: 'image/jpeg', // Assuming JPEG format
        fileName: result.assets[0].uri.split('/').pop()
      });
    }
  };

  const handleSubmit = async () => {
    if (!caption.trim() && !media) {
      Alert.alert('Error', 'Please add a caption or image to your post');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPost(familyId, { caption, media });
      onPostCreated();
      // Reset form
      setCaption('');
      setMedia(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBackground = () => {
    // If we're on iOS, we can use BlurView for the Apple-like frosted glass effect
    if (Platform.OS === 'ios') {
      return (
        <BlurView 
          intensity={20} 
          tint="dark" 
          style={StyleSheet.absoluteFill} 
        />
      );
    }
    // For other platforms, just use the background color
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2C2C2E' }]} />;
  };

  return (
    <View style={styles.container}>
      {renderBackground()}
      
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        placeholderTextColor="#8E8E93"
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={500}
        selectionColor="#4CC2C4"
      />
      
      {media && (
        <View style={styles.mediaPreview}>
          <Image source={{ uri: media.uri }} style={styles.previewImage} />
          <TouchableOpacity 
            style={styles.removeMediaButton}
            onPress={() => setMedia(null)}
          >
            <Ionicons name="close-circle-sharp" size={24} color="#FF453A" />
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.actions}>
        <View style={styles.mediaButtons}>
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={pickImage}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Ionicons name="image-outline" size={20} color="#4CC2C4" />
            <Text style={styles.mediaButtonText}>Photo</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.submitButtons}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.postButton, 
              (!caption.trim() && !media) || isSubmitting ? styles.disabledButton : null
            ]}
            onPress={handleSubmit}
            disabled={(!caption.trim() && !media) || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
    overflow: 'hidden', // For BlurView to work correctly
    position: 'relative', // For absolute positioning of the BlurView
  },
  input: {
    minHeight: 100,
    fontSize: 17,
    color: '#FFFFFF',
    textAlignVertical: 'top',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    zIndex: 1, // Ensure input is above the BlurView
  },
  mediaPreview: {
    position: 'relative',
    marginBottom: 16,
    zIndex: 1, // Ensure preview is above the BlurView
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#38383A',
    zIndex: 1, // Ensure actions are above the BlurView
  },
  mediaButtons: {
    flexDirection: 'row',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  mediaButtonText: {
    fontSize: 15,
    color: '#4CC2C4', // Teal from the logo
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
  },
  submitButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 16,
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#AEAEB2',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
  },
  postButton: {
    backgroundColor: '#F0C142', // Golden yellow from the logo
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: 'rgba(240, 193, 66, 0.5)', // Faded version of the golden color
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});