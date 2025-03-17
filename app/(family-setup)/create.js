import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../api/client';
import { useAuth } from '../../context/AuthContext';
import * as SecureStore from 'expo-secure-store';

export default function CreateFamilyScreen() {
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [familyNameError, setFamilyNameError] = useState('');
  
  const router = useRouter();
  const { user, updateUserInfo } = useAuth();

  const validateFamilyName = () => {
    if (!familyName.trim()) {
      setFamilyNameError('Family name is required');
      return false;
    } else {
      setFamilyNameError('');
      return true;
    }
  };

  const handleCreateFamily = async () => {
    if (!validateFamilyName()) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Create a new family
      const response = await apiClient.post('/api/dashboard/families', {
        familyName: familyName.trim()
      });
      
      if (response.data && response.data.familyId) {
        try {
          // First update the secure storage directly
          const userData = await SecureStore.getItemAsync('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            parsedUser.family_id = response.data.familyId;
            
            // Update the user data in storage with the new family_id
            await SecureStore.setItemAsync('user', JSON.stringify(parsedUser));
            
            // Then update the user state in context 
            await updateUserInfo({ family_id: response.data.familyId });
            
            // Also store the selected family ID
            await SecureStore.setItemAsync('selected_family_id', response.data.familyId.toString());
            
            console.log('Family created and user updated with family ID:', response.data.familyId);
          }
        } catch (storageError) {
          console.error('Error updating user storage after family creation:', storageError);
        }
        
        // Wait a moment before redirecting to ensure state is updated
        setTimeout(() => {
          // Navigate to the main app
          router.replace('/(tabs)/feed');
        }, 500);
      } else {
        setError('Failed to create family. Please try again.');
      }
    } catch (err) {
      console.error('Failed to create family:', err);
      setError(err.response?.data?.error || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>✨</Text>
          </View>
          <Text style={styles.headerTitle}>Create New Family</Text>
          <Text style={styles.headerSubtitle}>
            Start a new group for your family
          </Text>
        </View>

        <BlurView intensity={15} tint="dark" style={styles.formContainer}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Name Your Family</Text>
            <Text style={styles.sectionDescription}>
              Choose a name that represents your family. You'll be able to invite other members later.
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Family Name</Text>
              <TextInput
                style={[styles.input, familyNameError ? styles.inputError : null]}
                placeholder="Enter family name"
                placeholderTextColor="#8E8E93"
                value={familyName}
                onChangeText={setFamilyName}
                selectionColor="#3BAFBC"
                autoCapitalize="words"
              />
              {familyNameError ? <Text style={styles.errorText}>{familyNameError}</Text> : null}
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.buttonContainer} 
            onPress={handleCreateFamily}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1E2B2F', '#3BAFBC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#F5F5F7" />
              ) : (
                <Text style={styles.buttonText}>Create Family</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </BlurView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2B2F', // Midnight Green background
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 175, 188, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(59, 175, 188, 0.5)',
  },
  iconText: {
    fontSize: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
    textAlign: 'center',
    maxWidth: '80%',
  },
  formContainer: {
    marginHorizontal: 16,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.8)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  sectionDescription: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#F5F5F7',
    marginBottom: 8,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.6)',
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.1,
  },
  inputError: {
    borderColor: '#FF453A', // Apple's system red color
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  buttonContainer: {
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonGradient: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#F5F5F7',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});