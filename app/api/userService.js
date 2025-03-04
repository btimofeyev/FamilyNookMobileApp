// app/api/userService.js
import apiClient from './client';

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

export const uploadProfilePhoto = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append('profilePhoto', {
      uri: imageFile.uri,
      name: imageFile.fileName || `profile-${Date.now()}.jpg`,
      type: imageFile.type || 'image/jpeg'
    });
    
    const response = await apiClient.post('/api/dashboard/profile/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading profile photo:', error);
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