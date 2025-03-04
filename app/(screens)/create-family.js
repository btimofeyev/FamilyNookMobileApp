// app/(screens)/create-family.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { createFamily } from '../api/familyService';
import { useFamily } from '../../context/FamilyContext';

export default function CreateFamilyScreen() {
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshFamilies } = useFamily();
  
  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Please enter a family name.');
      return;
    }
    
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const response = await createFamily({ familyName });
      
      // Refresh the family list
      await refreshFamilies();
      
      // Show success message
      Alert.alert(
        'Success',
        'Your family has been created!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to the profile screen
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating family:', error);
      Alert.alert('Error', 'Failed to create family. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Create Family',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.container}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={24} color="#4A90E2" />
            <Text style={styles.infoText}>
              Create a family to share photos, memories, and messages with your loved ones.
            </Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Family Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter family name"
              value={familyName}
              onChangeText={setFamilyName}
              maxLength={50}
            />
          </View>
          
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>What happens next?</Text>
            <View style={styles.helpItem}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#4A90E2" style={styles.helpIcon} />
              <Text style={styles.helpText}>Your family will be created immediately</Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="person-add-outline" size={24} color="#4A90E2" style={styles.helpIcon} />
              <Text style={styles.helpText}>Invite family members through the profile page</Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="share-social-outline" size={24} color="#4A90E2" style={styles.helpIcon} />
              <Text style={styles.helpText}>Start sharing posts and memories with your family</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.createButton, !familyName.trim() && styles.disabledButton]}
            onPress={handleCreateFamily}
            disabled={loading || !familyName.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Family</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E5F2FF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#1C1C1E',
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  helpContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 30,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 15,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  helpIcon: {
    marginRight: 10,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});