// app/api/feedService.js - Better like state persistence
import apiClient from './client';
import * as SecureStore from 'expo-secure-store';

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
    const likedPosts = await getLikedPostsMap();
    
    if (isLiked) {
      likedPosts[postId.toString()] = true;
    } else {
      delete likedPosts[postId.toString()];
    }
    
    await SecureStore.setItemAsync(LIKED_POSTS_KEY, JSON.stringify(likedPosts));
    console.log('Saved like state:', { postId, isLiked, likedPosts });
    return true;
  } catch (error) {
    console.error('Error saving liked state:', error);
    return false;
  }
};

export const getFamilyPosts = async (familyId, page = 1) => {
  if (!familyId) {
    familyId = await getSelectedFamilyId();
    
    if (!familyId) {
      throw new Error('No family ID provided and no selected family found in storage');
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
    console.log('Local liked posts:', likedPostsMap);
    
    // Process each post to ensure it has the correct like state
    const posts = response.data.posts || response.data || [];
    const processedPosts = posts.map(post => {
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
    });
    
    return {
      posts: processedPosts,
      currentPage: response.data.currentPage || page,
      totalPages: response.data.totalPages || 1,
      totalPosts: response.data.totalPosts || processedPosts.length
    };
  } catch (error) {
    console.error('Error in getFamilyPosts:', error);
    throw error;
  }
};

export const toggleLike = async (postId) => {
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
    
    // Also remove from liked posts storage
    const likedPosts = await getLikedPostsMap();
    if (likedPosts[postId]) {
      delete likedPosts[postId.toString()];
      await SecureStore.setItemAsync(LIKED_POSTS_KEY, JSON.stringify(likedPosts));
    }
    
    return response.data;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};