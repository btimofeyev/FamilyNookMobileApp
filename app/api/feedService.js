// app/api/feedService.js

import apiClient from './client';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

// Custom error class for API-specific errors
class FeedServiceError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'FeedServiceError';
    this.code = code;
    this.originalError = originalError;
  }
}

// Error codes for specific error types
const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  FAMILY_ACCESS_DENIED: 'FAMILY_ACCESS_DENIED'
};

// Key for storing liked posts
const LIKED_POSTS_KEY = 'liked_posts_v2';

// Helper function to get current selected family ID
const getSelectedFamilyId = async () => {
  try {
    return await SecureStore.getItemAsync('selected_family_id');
  } catch (error) {
    console.error('Error getting selected family ID from storage:', error);
    return null;
  }
};

// Helper function to standardize error handling
const handleApiError = (error, customMessage = 'An error occurred') => {
  // Log detailed error information for debugging
  console.error('API Error Details:', {
    message: error.message,
    endpoint: error.config?.url,
    status: error.response?.status,
    data: error.response?.data,
    stack: error.stack
  });

  // Determine error type and create appropriate error object
  if (!error.response) {
    // Network error (no response from server)
    return new FeedServiceError(
      'Network connection issue. Please check your internet connection.',
      ErrorCodes.NETWORK_ERROR,
      error
    );
  }

  const status = error.response.status;
  const errorData = error.response.data;

  // Handle different error types based on status code
  switch (status) {
    case 401:
    case 403:
      // Check for family access denied errors
      if (errorData?.error?.includes('not a member of this family')) {
        return new FeedServiceError(
          'You do not have access to this family.',
          ErrorCodes.FAMILY_ACCESS_DENIED,
          error
        );
      }
      return new FeedServiceError(
        'Authentication error. Please log in again.',
        ErrorCodes.AUTHENTICATION_ERROR,
        error
      );
    
    case 404:
      return new FeedServiceError(
        'The requested resource was not found.',
        ErrorCodes.NOT_FOUND,
        error
      );
    
    case 422:
      return new FeedServiceError(
        errorData?.error || 'Validation error. Please check your input.',
        ErrorCodes.VALIDATION_ERROR,
        error
      );
    
    case 500:
    case 502:
    case 503:
    case 504:
      return new FeedServiceError(
        'Server error. Please try again later.',
        ErrorCodes.SERVER_ERROR,
        error
      );
    
    default:
      return new FeedServiceError(
        errorData?.error || customMessage,
        ErrorCodes.UNKNOWN_ERROR,
        error
      );
  }
};

// Function to get the map of liked posts from storage
const getLikedPostsMap = async () => {
  try {
    const likedPostsJson = await SecureStore.getItemAsync(LIKED_POSTS_KEY);
    if (likedPostsJson) {
      return JSON.parse(likedPostsJson);
    }
  } catch (error) {
    console.error('Error getting liked posts from storage:', error);
  }
  return {};
};

// Function to save a post's liked state
const saveLikedState = async (postId, isLiked) => {
  try {
    if (!postId) {
      console.warn('Attempted to save like state for undefined postId');
      return false;
    }

    const likedPosts = await getLikedPostsMap();
    
    if (isLiked) {
      likedPosts[postId.toString()] = true;
    } else {
      delete likedPosts[postId.toString()];
    }
    
    await SecureStore.setItemAsync(LIKED_POSTS_KEY, JSON.stringify(likedPosts));
    console.log('Saved like state:', { postId, isLiked });
    return true;
  } catch (error) {
    console.error('Error saving liked state:', error);
    return false;
  }
};

export const createPost = async (familyId, data) => {
  // If no family ID passed, try to get from storage
  if (!familyId) {
    try {
      familyId = await getSelectedFamilyId();
      
      if (!familyId) {
        throw new FeedServiceError(
          'No family selected. Please select a family first.',
          ErrorCodes.VALIDATION_ERROR
        );
      }
    } catch (error) {
      throw handleApiError(error, 'Failed to determine family ID');
    }
  }
  
  try {
    console.log(`Creating post for family ${familyId}`);
    
    // Validate data before sending
    if (!data || (!data.caption && !data.mediaItems && !data.media)) {
      throw new FeedServiceError(
        'Post must contain text or media',
        ErrorCodes.VALIDATION_ERROR
      );
    }
    
    const formData = new FormData();
    formData.append('caption', data.caption || '');
    formData.append('familyId', familyId);
    
    // Handle multiple media items
    if (data.mediaItems && data.mediaItems.length > 0) {
      console.log(`Adding ${data.mediaItems.length} media items to post`);
      
      // Send all media items as an array under the 'media' key
      data.mediaItems.forEach((mediaItem, index) => {
        if (!mediaItem.uri) {
          throw new FeedServiceError(
            `Media item ${index + 1} must have a valid URI`,
            ErrorCodes.VALIDATION_ERROR
          );
        }
        
        formData.append('media', {
          uri: mediaItem.uri,
          name: mediaItem.fileName || `media-${Date.now()}-${index}.${mediaItem.type.split('/')[1] || 'jpg'}`,
          type: mediaItem.type || 'image/jpeg'
        });
      });
    }
    // Legacy single media support
    else if (data.media) {
      console.log('Adding single media to post');
      
      if (!data.media.uri) {
        throw new FeedServiceError(
          'Media must have a valid URI',
          ErrorCodes.VALIDATION_ERROR
        );
      }
      
      formData.append('media', {
        uri: data.media.uri,
        name: data.media.fileName || `photo-${Date.now()}.jpg`,
        type: data.media.type || 'image/jpeg'
      });
    }
    
    // Set a longer timeout for uploads
    const response = await apiClient.post(`/api/family/${familyId}/posts`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000 // 60 seconds timeout for media upload
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create post');
  }
};

export const getFamilyPosts = async (familyId, page = 1) => {
  if (!familyId) {
    try {
      familyId = await getSelectedFamilyId();
      
      if (!familyId) {
        throw new FeedServiceError(
          'No family selected. Please select a family first.',
          ErrorCodes.VALIDATION_ERROR
        );
      }
    } catch (error) {
      if (error instanceof FeedServiceError) {
        throw error;
      }
      throw handleApiError(error, 'Failed to determine family ID');
    }
  }
  
  try {
    console.log(`Fetching family posts for family ${familyId}, page ${page}`);
    
    // Get the posts from the API
    const response = await apiClient.get(`/api/family/${familyId}/posts`, {
      params: { page },
      timeout: 30000
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

    // Get our local like state
    const likedPostsMap = await getLikedPostsMap();
    
    // Process each post to ensure it has the correct like state
    const posts = response.data.posts || response.data || [];
    const processedPosts = posts.map(post => {
      if (!post || !post.post_id) {
        console.warn('Received invalid post data:', post);
        return null;
      }
      
      // Get post ID as string for consistency
      const postId = post.post_id.toString();
      
      // Check if this post is liked in our local storage
      const isLocallyLiked = !!likedPostsMap[postId];
      
      return {
        ...post,
        // Override the API's is_liked with our local state
        is_liked: isLocallyLiked,
        // Ensure counts are numbers
        likes_count: parseInt(post.likes_count || 0, 10),
        comments_count: parseInt(post.comments_count || 0, 10)
      };
    }).filter(Boolean); // Remove any null entries
    
    return {
      posts: processedPosts,
      currentPage: response.data.currentPage || page,
      totalPages: response.data.totalPages || 1,
      totalPosts: response.data.totalPosts || processedPosts.length
    };
  } catch (error) {
    throw handleApiError(error, 'Failed to load posts');
  }
};

export const toggleLike = async (postId) => {
  if (!postId) {
    throw new FeedServiceError(
      'Post ID is required',
      ErrorCodes.VALIDATION_ERROR
    );
  }
  
  try {
    console.log(`Toggling like for post ${postId}`);
    
    // Make the API call to toggle like
    const response = await apiClient.post(`/api/posts/${postId}/like`);
    
    // Get the action and count from the response
    const action = response.data.action;
    const likesCount = parseInt(response.data.likes_count || 0, 10);
    
    // Determine if the post is now liked
    const isNowLiked = action === 'liked';
    
    // Save to local storage
    await saveLikedState(postId, isNowLiked);
    
    // Return enhanced result
    return {
      ...response.data,
      is_liked: isNowLiked,
      likes_count: likesCount
    };
  } catch (error) {
    // If network error, try to update local state anyway to preserve user action
    if (!error.response) {
      const currentLikedState = (await getLikedPostsMap())[postId.toString()];
      const newLikedState = !currentLikedState;
      
      // Update local state
      await saveLikedState(postId, newLikedState);
      
      throw new FeedServiceError(
        'Network issue. Like was saved locally and will sync when connection is restored.',
        ErrorCodes.NETWORK_ERROR,
        error
      );
    }
    
    throw handleApiError(error, 'Failed to toggle like');
  }
};

export const getComments = async (postId) => {
  if (!postId) {
    throw new FeedServiceError(
      'Post ID is required',
      ErrorCodes.VALIDATION_ERROR
    );
  }
  
  try {
    const response = await apiClient.get(`/api/posts/${postId}/comments`);
    return response.data || [];
  } catch (error) {
    throw handleApiError(error, 'Failed to load comments');
  }
};

export const addComment = async (postId, text, parentCommentId = null) => {
  if (!postId) {
    throw new FeedServiceError(
      'Post ID is required',
      ErrorCodes.VALIDATION_ERROR
    );
  }
  
  if (!text || text.trim() === '') {
    throw new FeedServiceError(
      'Comment text is required',
      ErrorCodes.VALIDATION_ERROR
    );
  }
  
  try {
    const payload = { text };
    
    if (parentCommentId) {
      payload.parentCommentId = parentCommentId;
    }
    
    const response = await apiClient.post(`/api/posts/${postId}/comment`, payload);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to add comment');
  }
};

export const deleteComment = async (postId, commentId) => {
  if (!postId || !commentId) {
    throw new FeedServiceError(
      'Post ID and Comment ID are required',
      ErrorCodes.VALIDATION_ERROR
    );
  }
  
  try {
    console.log(`Deleting comment ${commentId} from post ${postId}`);
    const response = await apiClient.delete(`/api/posts/${postId}/comments/${commentId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to delete comment');
  }
};

export const deletePost = async (postId) => {
  if (!postId) {
    throw new FeedServiceError(
      'Post ID is required',
      ErrorCodes.VALIDATION_ERROR
    );
  }
  
  try {
    console.log(`Deleting post ${postId}`);
    const response = await apiClient.delete(`/api/posts/${postId}`);
    
    // Also remove from liked posts storage
    const likedPosts = await getLikedPostsMap();
    if (likedPosts[postId]) {
      delete likedPosts[postId.toString()];
      await SecureStore.setItemAsync(LIKED_POSTS_KEY, JSON.stringify(likedPosts));
    }
    
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to delete post');
  }
};

// Export error types for consumers of this service
export const Errors = {
  FeedServiceError,
  ErrorCodes
};