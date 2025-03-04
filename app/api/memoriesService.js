// app/api/memoriesService.js
import apiClient from './client';
import * as FileSystem from 'expo-file-system';

export const getMemories = async (familyId) => {
  try {
    const response = await apiClient.get(`/api/memories/${familyId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching memories:', error);
    throw error;
  }
};

export const createMemory = async (familyId, title, description) => {
  try {
    const response = await apiClient.post('/api/memories/create', {
      familyId,
      title,
      description
    });
    return response.data;
  } catch (error) {
    console.error('Error creating memory:', error);
    throw error;
  }
};

export const getMemoryContent = async (memoryId) => {
  try {
    const response = await apiClient.get(`/api/memories/${memoryId}/content`);
    return response.data;
  } catch (error) {
    console.error('Error fetching memory content:', error);
    throw error;
  }
};

export const getMemoryComments = async (memoryId) => {
  try {
    const response = await apiClient.get(`/api/memories/${memoryId}/comments`);
    return response.data;
  } catch (error) {
    console.error('Error fetching memory comments:', error);
    throw error;
  }
};

export const addCommentToMemory = async (memoryId, commentText) => {
  try {
    const response = await apiClient.post(`/api/memories/${memoryId}/comment`, {
      commentText
    });
    return response.data;
  } catch (error) {
    console.error('Error adding comment to memory:', error);
    throw error;
  }
};

export const addContentToMemory = async (memoryId, imageUri) => {
  try {
    // Create a FormData object to handle file upload
    const formData = new FormData();
    
    // Get file name and type from URI
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // Append the file to the form data
    formData.append('content', {
      uri: imageUri,
      name: filename,
      type
    });
    
    const response = await apiClient.post(`/api/memories/${memoryId}/content`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error adding content to memory:', error);
    throw error;
  }
};

export const deleteMemory = async (memoryId) => {
  try {
    const response = await apiClient.delete(`/api/memories/${memoryId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting memory:', error);
    throw error;
  }
};