
// components/memories/CreateMemoryModal.js
import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const CreateMemoryModal = ({ visible, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a title for this memory');
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setError('');
    setIsCreating(true);
    
    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await onCreate(title, description);
      // Reset form
      setTitle('');
      setDescription('');
    } catch (err) {
      setError('Failed to create memory');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Memory</Text>
              <TouchableOpacity onPress={handleCancel}>
                <Ionicons name="close" size={24} color="#AEAEB2" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter memory title"
                  placeholderTextColor="#8E8E93"
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What's this memory about?"
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={handleCancel}
                  disabled={isCreating}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.button, styles.createButton, isCreating && styles.buttonDisabled]} 
                  onPress={handleCreate}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={styles.createButtonText}>Create Memory</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </TouchableWithoutFeedback>
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
  formContainer: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    borderWidth: 1,
    borderColor: '#38383A',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#38383A',
  },
  createButton: {
    backgroundColor: '#F0C142', // Golden yellow from the logo
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  createButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  errorText: {
    color: '#FF453A', // iOS red color
    fontSize: 14,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  }
});

export default CreateMemoryModal;