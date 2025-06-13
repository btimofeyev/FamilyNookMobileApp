// app/api/feedService.js
import apiClient from './client';
import * as SecureStore from 'expo-secure-store';

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
    return null;
  }
};

// Helper function to standardize error handling
const handleApiError = (error, customMessage = 'An error occurred') => {
  if (!error.response) {
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
    // Silent fail, return empty object
  }
  return {};
};

// Function to save a post's liked state
const saveLikedState = async (postId, isLiked) => {
  try {
    if (!postId) return false;

    const likedPosts = await getLikedPostsMap();
    
    if (isLiked) {
      likedPosts[postId.toString()] = true;
    } else {
      delete likedPosts[postId.toString()];
    }
    
    await SecureStore.setItemAsync(LIKED_POSTS_KEY, JSON.stringify(likedPosts));
    return true;
  } catch (error) {
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
    // Validate data before sending
      if (!data || (!data.caption && (!data.media || data.media.length === 0))) {
      throw new FeedServiceError(
        'Post must contain text or media',
        ErrorCodes.VALIDATION_ERROR
      );
    }
    
    // Create payload object with caption and familyId
    const payload = {
      caption: data.caption || '',
      familyId: familyId
    };
    
    // If we have media URLs that were already uploaded to R2
    if (data.media && data.media.length) {
      payload.media = data.media;
      
    }
    
    // New endpoint to create posts with already-uploaded media
    const response = await apiClient.post(`/api/family/${familyId}/posts/with-media`, payload);
    
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
    // Get the posts from the API
    const response = await apiClient.get(`/api/family/${familyId}/posts`, {
      params: { page },
      timeout: 30000
    });
    
    if (!response.data) {
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
      if (!post || !post.post_id) return null;
      
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
export const updatePost = async (postId, updateData) => {
  if (!postId) {
    throw new FeedServiceError(
      'Post ID is required',
      ErrorCodes.VALIDATION_ERROR
    );
  }
  
  try {
    // For the update operation, we only need caption and/or new media items
    const payload = {};
    
    if (updateData.caption !== undefined) {
      payload.caption = updateData.caption;
    }
    
    if (updateData.media && Array.isArray(updateData.media)) {
      payload.media = updateData.media;
    }
    
    const response = await apiClient.put(`/api/posts/${postId}`, payload);
    
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to update post');
  }
};

// Get a specific post
export const getPost = async (postId) => {
  if (!postId) {
    throw new FeedServiceError(
      'Post ID is required',
      ErrorCodes.VALIDATION_ERROR
    );
  }
  
  try {
    const response = await apiClient.get(`/api/posts/${postId}`);
    
    if (!response.data) {
      throw new FeedServiceError(
        'Post not found',
        ErrorCodes.NOT_FOUND
      );
    }
    
    // Get the liked state from local storage
    const likedPostsMap = await getLikedPostsMap();
    const isLocallyLiked = !!likedPostsMap[postId.toString()];
    
    // Return post with correct like state
    return {
      ...response.data,
      is_liked: isLocallyLiked,
      likes_count: parseInt(response.data.likes_count || 0, 10),
      comments_count: parseInt(response.data.comments_count || 0, 10)
    };
  } catch (error) {
    throw handleApiError(error, 'Failed to get post');
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

const FeedServiceComponent = () => null;
export default FeedServiceComponent;