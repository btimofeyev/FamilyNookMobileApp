// app/api/feedService.js
import apiClient from './client';
import * as SecureStore from 'expo-secure-store';

// Helper function to get current selected family ID
const getSelectedFamilyId = async () => {
  try {
    return await SecureStore.getItemAsync('selected_family_id');
  } catch (error) {
    console.error('Error getting selected family ID from storage:', error);
    return null;
  }
};

export const getFamilyPosts = async (familyId, page = 1) => {
  // If no family ID passed, try to get from storage
  if (!familyId) {
    familyId = await getSelectedFamilyId();
    
    if (!familyId) {
      throw new Error('No family ID provided and no selected family found in storage');
    }
  }
  
  try {
 
    // Add a longer timeout for post loading to handle potentially larger responses
    const response = await apiClient.get(`/api/family/${familyId}/posts`, {
      params: { page },
      timeout: 30000 // 30 second timeout
    });
    
    if (!response.data) {
      console.warn('API returned empty response data');
      return { 
        posts: [], 
        currentPage: page, 
        totalPages: 1, 
        totalPosts: 0 
      };
    }

    
    return {
      posts: response.data.posts || response.data || [], // Handle different response structures
      currentPage: response.data.currentPage || page,
      totalPages: response.data.totalPages || 1,
      totalPosts: response.data.totalPosts || (response.data.posts || response.data || []).length
    };
  } catch (error) {
    console.error('Error in getFamilyPosts:', error);
    
    if (error.response?.status === 401) {
      console.error('Authentication error when fetching posts - token may be expired');
    } else if (error.response?.status === 403) {
      console.error('Permission error when fetching posts - user may not be a member of this family');
    }
    
    // Let the calling component handle the error with our enhanced error handling
    throw error;
  }
};

export const createPost = async (familyId, data) => {
  // If no family ID passed, try to get from storage
  if (!familyId) {
    familyId = await getSelectedFamilyId();
    
    if (!familyId) {
      throw new Error('No family ID provided and no selected family found in storage');
    }
  }
  
  try {
    console.log(`Creating post for family ${familyId}:`, data);
    
    const formData = new FormData();
    formData.append('caption', data.caption);
    formData.append('familyId', familyId);
    
    if (data.media) {
      // Check if we're dealing with a video file
      const isVideo = data.media.isVideo || data.media.type?.startsWith('video/');
      
      console.log('Adding media to post:', {
        uri: data.media.uri,
        type: data.media.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        name: data.media.fileName || `${isVideo ? 'video' : 'photo'}-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`
      });
      
      formData.append('media', {
        uri: data.media.uri,
        // Ensure we have a proper type
        type: data.media.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        // Ensure proper file name with extension
        name: data.media.fileName || `${isVideo ? 'video' : 'photo'}-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`
      });
      
      // Add the mediaType field to help the server identify what kind of media this is
      formData.append('mediaType', isVideo ? 'video' : 'image');
    }
    
    console.log('Form data prepared:', formData);
    
    const response = await apiClient.post(`/api/family/${familyId}/posts`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Increase timeout for media upload - videos can take longer
      timeout: 120000 // 2 minutes
    });

    console.log('Post creation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating post:', error);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    
    throw error;
  }
};

export const toggleLike = async (postId) => {
  try {

    const response = await apiClient.post(`/api/posts/${postId}/like`);

    return response.data;
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

export const getComments = async (postId) => {
  try {
    const response = await apiClient.get(`/api/posts/${postId}/comments`);
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

export const addComment = async (postId, text, parentCommentId = null) => {
  try {
    
    const payload = { text };
    
    // Add parent comment ID if we are replying to a comment
    if (parentCommentId) {
      payload.parentCommentId = parentCommentId;
    }
    
    const response = await apiClient.post(`/api/posts/${postId}/comment`, payload);
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const deleteComment = async (postId, commentId) => {
  try {
    console.log(`Deleting comment ${commentId} from post ${postId}`);
    const response = await apiClient.delete(`/api/posts/${postId}/comments/${commentId}`);
    console.log('Delete comment response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export const deletePost = async (postId) => {
  try {
    console.log(`Deleting post ${postId}`);
    const response = await apiClient.delete(`/api/posts/${postId}`);
    console.log('Delete post response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};