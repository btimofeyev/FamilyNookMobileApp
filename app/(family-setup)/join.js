import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../api/client';
import { useAuth } from '../../context/AuthContext';
import * as SecureStore from 'expo-secure-store';

export default function JoinFamilyScreen() {
  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  
  const router = useRouter();
  const { user, updateUserInfo } = useAuth();

  const validatePasskey = () => {
    if (!passkey.trim()) {
      setPasskeyError('Family passkey is required');
      return false;
    } else {
      setPasskeyError('');
      return true;
    }
  };

  const handleJoinFamily = async () => {
    if (!validatePasskey()) return;
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Attempting to validate passkey:', passkey.trim());
      
      // Validate the passkey
      const validateResponse = await apiClient.post('/api/dashboard/families/validate-passkey', {
        passkey: passkey.trim()
      });
      
      // If successful, add the user to the family
      if (validateResponse.data && validateResponse.data.valid) {
        const familyId = validateResponse.data.familyId;
        const familyName = validateResponse.data.familyName;
        
        console.log('Passkey validated successfully for family:', familyName, '(ID:', familyId, ')');
        
        try {
          // First update secure storage directly
          const userData = await SecureStore.getItemAsync('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            parsedUser.family_id = familyId;
            
            // Update the user data in storage with the new family_id
            await SecureStore.setItemAsync('user', JSON.stringify(parsedUser));
            console.log('Updated user data in SecureStore with family_id:', familyId);
            
            // Also store the selected family ID
            await SecureStore.setItemAsync('selected_family_id', familyId.toString());
            console.log('Stored selected_family_id in SecureStore:', familyId);
            
            // Clear is_new_account flag in secure storage
            await SecureStore.setItemAsync('is_new_account', 'false');
            console.log('Cleared is_new_account flag in SecureStore');
            
            // Then update the user state in AuthContext
            await updateUserInfo({ family_id: familyId });
            console.log('Updated user info in AuthContext');
            
            console.log('Joined family and user updated with family ID:', familyId);
          }
          
          // The server should have already added the user to the family
          
          // Wait a moment before redirecting to ensure state is updated
          setTimeout(() => {
            console.log('Navigating to feed page...');
            
            // Navigate to the main app
            router.replace('/(tabs)/feed');
          }, 1000); // Increased timeout to ensure everything is updated
        } catch (storageError) {
          console.error('Error updating user storage after joining family:', storageError);
          setError('Failed to save family information. Please try again.');
        }
      } else {
        setPasskeyError('Invalid passkey. Please check and try again.');
      }
    } catch (err) {
      console.error('Failed to join family:', err);
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
            <Text style={styles.iconText}>🔑</Text>
          </View>
          <Text style={styles.headerTitle}>Join Existing Family</Text>
          <Text style={styles.headerSubtitle}>
            Enter the passkey provided by your family member
          </Text>
        </View>

        <BlurView intensity={15} tint="dark" style={styles.formContainer}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Enter Family Passkey</Text>
            <Text style={styles.sectionDescription}>
              A family passkey is a unique code that allows you to join an existing family group
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Family Passkey</Text>
              <TextInput
                style={[styles.input, passkeyError ? styles.inputError : null]}
                placeholder="Enter family passkey"
                placeholderTextColor="#8E8E93"
                value={passkey}
                onChangeText={setPasskey}
                selectionColor="#3BAFBC"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {passkeyError ? <Text style={styles.errorText}>{passkeyError}</Text> : null}
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.buttonContainer} 
            onPress={handleJoinFamily}
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
                <Text style={styles.buttonText}>Join Family</Text>
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