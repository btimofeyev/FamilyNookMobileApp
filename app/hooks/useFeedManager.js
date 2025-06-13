import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { getFamilyPosts, toggleLike, deletePost as deletePostService } from '../api/feedService';
import { Alert } from 'react-native';

export const useFeedManager = () => {
  const { user, logout } = useAuth();
  const { selectedFamily } = useFamily();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false); // For initial load/refresh
  const [loadingMore, setLoadingMore] = useState(false); // NEW: For subsequent pages
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleApiError = useCallback(async (error) => {
    // Be more specific about when to force logout
    if (error.response?.status === 401 && error.response?.data?.error?.includes('token')) {
      Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => logout() }]);
    } else if (error.response?.status === 403) {
      Alert.alert("Access Denied", "You don't have permission to access this content.", [{ text: "OK" }]);
    } else {
      setError(error.message || 'An unexpected error occurred.');
    }
  }, [logout]);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    // Exit if we're already fetching or have no more data
    if ((loading || loadingMore) && !isRefresh) {
      console.log('Skipping fetch - already loading or loading more');
      return;
    }
    
    if (!hasMore && !isRefresh) {
      console.log('Skipping fetch - no more data to load');
      return;
    }
    
    if (!selectedFamily?.family_id) {
        setPosts([]);
        setLoading(false);
        return;
    };

    const currentPage = isRefresh ? 1 : page;
    console.log(`Fetching posts - Page: ${currentPage}, isRefresh: ${isRefresh}`);

    // Set the correct loading state
    if (isRefresh) {
        setRefreshing(true);
        setError(null);
        setLoading(true);
    } else {
        setLoadingMore(true);
    }

    try {
      const response = await getFamilyPosts(selectedFamily.family_id, currentPage);
      if (!isMounted) return;

      const newPosts = response.posts || [];
      console.log(`Received ${newPosts.length} posts for page ${currentPage}`);
      
      setPosts(prevPosts => {
        if (isRefresh) {
          return newPosts;
        } else {
          return [...prevPosts, ...newPosts];
        }
      });
      
      // Update pagination state
      if (!isRefresh) {
        setPage(currentPage + 1);
      } else {
        setPage(2); // Next page after refresh will be page 2
      }
      
      // Determine if there are more posts based on API response
      const hasMoreData = response.totalPages ? currentPage < response.totalPages : newPosts.length === 10;
      
      setHasMore(hasMoreData);
      console.log(`hasMore set to: ${hasMoreData} (currentPage: ${currentPage}, totalPages: ${response.totalPages}, newPostsLength: ${newPosts.length})`);
      
    } catch (error) {
      console.error('Error fetching posts:', error);
      if (isMounted) {
        await handleApiError(error);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [selectedFamily?.family_id, page, loading, loadingMore, hasMore, handleApiError, isMounted]);

  const handleRefresh = useCallback(async () => {
    await fetchPosts(true);
  }, [fetchPosts]);

  const handleLoadMore = useCallback(async () => {
    console.log(`handleLoadMore called - hasMore: ${hasMore}, loadingMore: ${loadingMore}, loading: ${loading}`);
    
    if (!loadingMore && !loading && hasMore) {
      console.log('Triggering fetchPosts for load more');
      await fetchPosts(false);
    } else {
      console.log('Skipping load more - conditions not met');
    }
  }, [fetchPosts, loadingMore, loading, hasMore]);

  const handleToggleLike = useCallback(async (postId) => {
    try {
      const optimisticUpdate = posts.map(post => 
        post.id === postId ? { 
          ...post, 
          liked: !post.liked,
          likes_count: post.liked ? post.likes_count - 1 : post.likes_count + 1
        } : post
      );
      setPosts(optimisticUpdate);

      await toggleLike(postId);
    } catch (error) {
      // Revert optimistic update on error
      setPosts(posts);
      await handleApiError(error);
    }
  }, [posts, handleApiError]);

  const handleDeletePost = useCallback(async (postId) => {
    try {
      await deletePostService(postId);
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    } catch (error) {
      await handleApiError(error);
    }
  }, [handleApiError]);

  // Load initial posts when family changes
  useEffect(() => {
    if (selectedFamily?.family_id && isMounted) {
      setPage(1);
      setHasMore(true);
      fetchPosts(true);
    }
  }, [selectedFamily?.family_id, isMounted]);

  return {
    posts,
    loading,
    loadingMore,
    error,
    refreshing,
    hasMore,
    selectedFamily,
    handleRefresh,
    handleLoadMore,
    handleToggleLike,
    handleDeletePost,
    fetchPosts
  };
};

// Add default export for React Router compatibility
export default useFeedManager;