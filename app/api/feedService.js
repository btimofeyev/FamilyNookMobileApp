// app/api/feedService.js
import apiClient from './client';

export const getFamilyPosts = async (familyId, page = 1) => {
  console.log(`getFamilyPosts called for family ID: ${familyId}, page: ${page}`);
  
  try {
    console.log(`Making API request to: /api/family/${familyId}/posts`);
    
    const response = await apiClient.get(`/api/family/${familyId}/posts`, {
      params: { page }
    });
    
    console.log('API Response:', response.status);
    
    return {
      posts: response.data.posts || response.data, // Handle both structures
      currentPage: response.data.currentPage || page,
      totalPages: response.data.totalPages || 1
    };
  } catch (error) {
    console.error('Error in getFamilyPosts:', error);
    console.log('Error config:', JSON.stringify(error.config));
    console.log('Error response:', error.response ? {
      status: error.response.status,
      data: JSON.stringify(error.response.data)
    } : 'No response');
    
    throw error;
  }
};

export const createPost = async (familyId, data) => {
  try {
    const formData = new FormData();
    formData.append('caption', data.caption);
    formData.append('familyId', familyId);
    
    if (data.media) {
      formData.append('media', {
        uri: data.media.uri,
        name: data.media.fileName || `photo-${Date.now()}.jpg`,
        type: data.media.type || 'image/jpeg'
      });
    }
    
    const response = await apiClient.post(`/api/family/${familyId}/posts`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating post:', error);
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
    const response = await apiClient.delete(`/api/posts/${postId}/comments/${commentId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export const deletePost = async (postId) => {
  try {
    const response = await apiClient.delete(`/api/posts/${postId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};