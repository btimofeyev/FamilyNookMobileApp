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
    if (error.response?.status === 401 || error.response?.status === 403) {
      Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => logout() }]);
    } else {
      setError(error.message || 'An unexpected error occurred.');
    }
  }, [logout]);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    // Exit if we're already fetching or have no more data
    if ((loading || loadingMore) && !isRefresh) return;
    if (!selectedFamily?.family_id) {
        setPosts([]);
        setLoading(false);
        return;
    };

    const currentPage = isRefresh ? 1 : page;

    // Set the correct loading state
    if (isRefresh) {
        setRefreshing(true);
        setError(null);
    } else {
        setLoadingMore(true); // Use loadingMore for subsequent pages
    }

    try {
      const response = await getFamilyPosts(selectedFamily.family_id, currentPage);
      if (!isMounted) return;

      const newPosts = response.posts || [];
      setPosts(prevPosts => isRefresh ? newPosts : [...prevPosts, ...newPosts]);
      
      // Prepare for the next page
      setPage(currentPage + 1);
      // If API returns less items than a full page, we assume we've reached the end
      setHasMore(newPosts.length === response.limit || (response.totalPages && currentPage < response.totalPages));

    } catch (error) {
      if (!isMounted) return;
      handleApiError(error);
    } finally {
      if (!isMounted) return;
      // Reset the correct loading/refreshing state
      if(isRefresh) {
        setRefreshing(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [selectedFamily, page, isMounted, handleApiError, loading, loadingMore]);

  // Initial load or when family changes
  useEffect(() => {
    setLoading(true); // Show initial full-screen loader
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPosts(true).finally(() => setLoading(false));
  }, [selectedFamily]);


  const handleRefresh = () => {
    fetchPosts(true);
  };

  const handleLoadMore = () => {
    // The check for loading states is now at the top of fetchPosts
    if(hasMore) {
        fetchPosts(false);
    }
  };

  const handleToggleLike = useCallback(async (postId) => {
    const originalPosts = [...posts];
    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.post_id === postId
          ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
    try {
      await toggleLike(postId);
    } catch (error) {
      setPosts(originalPosts);
      Alert.alert("Error", "Failed to update like status. Please try again.");
    }
  }, [posts]);
  
  const handleDeletePost = useCallback(async (postId) => {
    const originalPosts = [...posts];
    setPosts(prevPosts => prevPosts.filter(p => p.post_id !== postId));
    try {
        await deletePostService(postId);
    } catch (error) {
        setPosts(originalPosts);
        Alert.alert("Error", "Failed to delete post. Please try again.");
    }
  }, [posts]);

  return {
    posts,
    loading,
    loadingMore, // Export the new state
    error,
    refreshing,
    handleRefresh,
    handleLoadMore,
    handleToggleLike,
    handleDeletePost,
    user,
    selectedFamily,
  };
};