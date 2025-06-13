// app/api/userService.js
import apiClient from './client';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

import { API_URL } from '@env';

const API_ENDPOINT = API_URL || 'https://famlynook.com';

export const getUserProfile = async (userId) => {
  try {
    // If no userId is provided, get the current user's profile
    const endpoint = userId ? `/api/dashboard/users/${userId}` : '/api/dashboard/profile';
    const response = await apiClient.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const getUserProfileInFamily = async (userId, familyId) => {
  try {
    const response = await apiClient.get(`/api/dashboard/users/${userId}/family/${familyId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile in family:', error);
    throw error;
  }
};

export const updateUserProfile = async (userData) => {
  try {
    const response = await apiClient.put('/api/dashboard/profile', userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};
// This is a simplified version for app/api/userService.js
export const uploadProfilePhoto = async (imageFile) => {
  try {
    console.log('Starting profile photo upload with file:', imageFile);
    
    // Step 1: Verify the file exists and get file info
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageFile.uri);
      console.log('File info:', fileInfo);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist at the specified URI');
      }
    } catch (fileError) {
      console.error('Error checking file:', fileError);
      // Continue anyway, as the URI might still be valid
    }
    
    // Step 2: Determine file type and name
    let fileType = imageFile.type || 'image/jpeg';
    const fileName = imageFile.fileName || `profile-${Date.now()}.${fileType.split('/')[1]}`;
    
    console.log('File details:', {
      uri: imageFile.uri,
      type: fileType,
      name: fileName
    });

    // Step 3: Get token and base URL
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Get the base URL 
    const baseUrl = API_URL || 'https://famlynook.com';
    console.log('Using configured API URL:', baseUrl);
    
    // Step 4: Read file as base64
    console.log('Reading file as base64...');
    const base64Data = await FileSystem.readAsStringAsync(imageFile.uri, {
      encoding: FileSystem.EncodingType.Base64
    });
    console.log('File read successfully, length:', base64Data.length);
    
    // Step 5: Upload using Base64 JSON approach
    console.log('Attempting upload with Base64 JSON...');
    const response = await fetch(`${baseUrl}/api/dashboard/profile/photo/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        image: base64Data,
        fileName: fileName,
        contentType: fileType
      })
    });
    
    console.log('Base64 upload response:', {
      status: response.status,
      ok: response.ok
    });
    
    if (response.ok) {
      const responseData = await response.json();
      console.log('Upload response:', responseData);
      return responseData;
    } else {
      const errorText = await response.text();
      console.error('Server error response (base64):', errorText);
      throw new Error(`Server error (base64): ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error in uploadProfilePhoto:', error);
    throw error;
  }
};
export const joinFamilyByPasskey = async (passkey) => {
  try {
    console.log(`Validating and joining family with passkey: ${passkey}`);
    const response = await apiClient.post('/api/dashboard/families/validate-passkey', { passkey });
    console.log('Join family response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error joining family with passkey:', error);
    throw error;
  }
};
export const inviteToFamily = async (familyId, email) => {
  try {
    const response = await apiClient.post('/api/invitations/invite', {
      familyId,
      email
    });
    
    return response.data;
  } catch (error) {
    console.error('Error inviting to family:', error);
    throw error;
  }
};

export const generateFamilyPasskey = async (familyId) => {
  try {
    const response = await apiClient.post(`/api/dashboard/families/${familyId}/passkey`);
    return response.data;
  } catch (error) {
    console.error('Error generating family passkey:', error);
    throw error;
  }
};

export const validateFamilyPasskey = async (passkey) => {
  try {
    const response = await apiClient.post('/api/dashboard/families/validate-passkey', { passkey });
    return response.data;
  } catch (error) {
    console.error('Error validating family passkey:', error);
    throw error;
  }
};

export const getFamilyMembers = async (familyId) => {
  try {
    const response = await apiClient.get(`/api/dashboard/families/${familyId}/members`);
    return response.data;
  } catch (error) {
    console.error('Error fetching family members:', error);
    throw error;
  }
};

export const removeFamilyMember = async (familyId, userId) => {
  try {
    const response = await apiClient.delete(`/api/dashboard/families/${familyId}/members/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing family member:', error);
    throw error;
  }
};

export const getUserPosts = async (userId, page = 1) => {
  try {
    const response = await apiClient.get(`/api/dashboard/users/${userId}/posts`, {
      params: { page }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user posts:', error);
    throw error;
  }
};

export const getNotificationSettings = async () => {
  try {
    const response = await apiClient.get('/api/dashboard/notification-settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    throw error;
  }
};

export const updateNotificationSettings = async (settings) => {
  try {
    const response = await apiClient.put('/api/dashboard/notification-settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
};

const UserServiceComponent = () => null;
export default UserServiceComponent;