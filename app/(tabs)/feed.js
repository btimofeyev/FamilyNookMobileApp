// app/(tabs)/feed.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useFamily } from "../../context/FamilyContext";
import { getFamilyPosts } from "../api/feedService";
import PostItem from "../components/PostItem";
import CreatePostForm from "../components/CreatePostForm";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import FloatingCreateButton from "../components/FloatingCreateButton";

export default function FeedScreen() {
  const { user } = useAuth();
  const {
    selectedFamily,
    families,
    switchFamily,
    loading: familyLoading,
  } = useFamily();

  // Use expo-router's useLocalSearchParams instead of useRoute
  const params = useLocalSearchParams();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFamilySelector, setShowFamilySelector] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState(null);

  // Refs
  const flatListRef = useRef(null);
  const allLoadedPosts = useRef([]);
  const highlightTimerRef = useRef(null);

  // Check if we should open the create post modal based on navigation params
  useEffect(() => {
    if (params.openCreatePost === "true") {
      setShowCreatePostModal(true);
    }
  }, [params.openCreatePost]);

  // Handle highlighting a specific post from notification
  useEffect(() => {
    if (params.highlightPostId) {
      const postId = params.highlightPostId.toString();
      console.log(`Highlighting post with ID: ${postId}`);
      setHighlightedPostId(postId);

      // Clear the highlight after 2 seconds
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      highlightTimerRef.current = setTimeout(() => {
        setHighlightedPostId(null);
      }, 2000);

      // Start search for the post
      findAndScrollToPost(postId);
    }

    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, [params.highlightPostId, params.timestamp]);

  // Function to find and scroll to a specific post
  const findAndScrollToPost = async (postId) => {
    if (!postId || !selectedFamily) return;

    // Check if the post is already loaded
    const existingPostIndex = allLoadedPosts.current.findIndex(
      (post) => post.post_id?.toString() === postId
    );

    if (existingPostIndex !== -1) {
      // Post is already loaded, scroll to it
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: existingPostIndex,
            animated: true,
            viewPosition: 0.3,
          });
        }
      }, 300);
      return;
    }

    // Post not found in current list, need to load more posts or fetch specifically
    console.log(
      "Post not found in current list, loading more posts to find it..."
    );
    setLoading(true);

    try {
      // Try to fetch all posts to find the one we need
      // This is a simplified approach - in a real app, you might want to
      // implement an API endpoint to fetch a specific post by ID
      const familyId = selectedFamily.family_id;
      let currentPage = 1;
      let foundPost = false;

      while (!foundPost) {
        const response = await getFamilyPosts(familyId, currentPage);
        const newPosts = response.posts || [];

        // Check if the post we're looking for is in this batch
        if (newPosts.some((post) => post.post_id?.toString() === postId)) {
          foundPost = true;
        }

        // If we've reached the end or found our post, stop searching
        if (foundPost || currentPage >= (response.totalPages || 5)) {
          break;
        }

        currentPage++;
      }

      // Refresh the feed with all posts
      await loadPosts(true);

      // After loading, try to find the post index again
      setTimeout(() => {
        const updatedIndex = allLoadedPosts.current.findIndex(
          (post) => post.post_id?.toString() === postId
        );

        if (updatedIndex !== -1 && flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: updatedIndex,
            animated: true,
            viewPosition: 0.3,
          });
        } else {
          // If we still can't find it, show an alert
          Alert.alert(
            "Post Not Found",
            "The post you're looking for couldn't be found. It may have been deleted."
          );
        }
      }, 500);
    } catch (error) {
      console.error("Error finding post:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debug info
  console.log("Selected Family:", selectedFamily);
  console.log("Available Families:", JSON.stringify(families));

  const loadPosts = useCallback(
    async (refresh = false) => {
      if (!selectedFamily) {
        console.log("No family selected, cannot load posts");
        setLoading(false);
        if (families.length > 0) {
          setError("Please select a family to view its feed.");
        } else {
          setError(
            "You are not a member of any family yet. Create or join a family to view posts."
          );
        }
        return;
      }

      // Reset pagination when refreshing
      const currentPage = refresh ? 1 : page;

      if (refresh) {
        setRefreshing(true);
        setPage(1);
        setHasMorePages(true);
      } else if (currentPage === 1) {
        setLoading(true);
      } else {
        setLoadingMorePosts(true);
      }

      setError(null);

      const familyId = selectedFamily.family_id;
      console.log(
        `Attempting to fetch posts for family ID: ${familyId}, page: ${currentPage}`
      );

      try {
        const response = await getFamilyPosts(familyId, currentPage);
        console.log("Posts API Response:", JSON.stringify(response));

        const newPosts = response.posts || [];

        if (refresh || currentPage === 1) {
          setPosts(newPosts);
          allLoadedPosts.current = newPosts;
        } else {
          // Append new posts to existing ones for pagination
          setPosts((prevPosts) => {
            const updatedPosts = [...prevPosts, ...newPosts];
            allLoadedPosts.current = updatedPosts;
            return updatedPosts;
          });
        }

        // Check if there are more pages to load
        if (response.totalPages) {
          setHasMorePages(currentPage < response.totalPages);
        } else {
          // If API doesn't return pagination info, assume no more pages if empty array returned
          setHasMorePages(newPosts.length > 0);
        }
      } catch (error) {
        console.error("Error loading posts:", error);
        setError(`Failed to load posts: ${error.message}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMorePosts(false);
      }
    },
    [selectedFamily, families, page]
  );

  // Load posts when family changes or on first render
  useEffect(() => {
    if (!familyLoading) {
      loadPosts(true);
    }
  }, [familyLoading, selectedFamily]);

  // Refresh posts when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!familyLoading && selectedFamily) {
        loadPosts(true);
      }
      return () => {};
    }, [familyLoading, selectedFamily])
  );

  // Move the render helper functions inside the component
  const renderFamilySelector = () => (
    <Modal
      visible={showFamilySelector}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFamilySelector(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Family</Text>
            <TouchableOpacity onPress={() => setShowFamilySelector(false)}>
              <Ionicons name="close" size={24} color="#AEAEB2" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={families}
            keyExtractor={(item) => item.family_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.familyItem,
                  selectedFamily?.family_id === item.family_id &&
                    styles.selectedFamilyItem,
                ]}
                onPress={() => handleFamilySelect(item)}
              >
                <Text style={styles.familyName}>{item.family_name}</Text>
                {selectedFamily?.family_id === item.family_id && (
                  <Ionicons name="checkmark-circle" size={20} color="#4CC2C4" />
                )}
              </TouchableOpacity>
            )}
          />
        </BlurView>
      </View>
    </Modal>
  );

  const renderCreatePostModal = () => (
    <Modal
      visible={showCreatePostModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCreatePostModal(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView
          intensity={20}
          tint="dark"
          style={styles.createPostModalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Post</Text>
            <TouchableOpacity onPress={() => setShowCreatePostModal(false)}>
              <Ionicons name="close" size={24} color="#AEAEB2" />
            </TouchableOpacity>
          </View>

          {selectedFamily && (
            <CreatePostForm
              familyId={selectedFamily.family_id}
              onPostCreated={handlePostCreated}
              onCancel={() => setShowCreatePostModal(false)}
            />
          )}
        </BlurView>
      </View>
    </Modal>
  );

  const renderPostItem = ({ item, index }) => {
    const isHighlighted = item.post_id?.toString() === highlightedPostId;

    return (
      <View
        style={[
          styles.postItemContainer,
          isHighlighted && styles.highlightedPostContainer,
        ]}
      >
        <PostItem
          post={item}
          onPostUpdated={loadPosts}
          isCurrentUser={user && item.author_id === user.id}
        />
      </View>
    );
  };

  const handleFamilySelect = (family) => {
    switchFamily(family);
    setShowFamilySelector(false);
    Haptics.selectionAsync();
  };

  const handlePostCreated = () => {
    setShowCreatePostModal(false);
    loadPosts(true);
  };

  const handleRefresh = () => {
    loadPosts(true);
  };

  const handleLoadMore = () => {
    if (!loadingMorePosts && hasMorePages) {
      setPage((prevPage) => prevPage + 1);
      loadPosts(false);
    }
  };

  const handleScrollToIndexFailed = (info) => {
    console.log("Scroll to index failed:", info);
    // Workaround for scroll to index failure
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: info.averageItemLength * info.index,
          animated: true,
        });
      }
    }, 100);
  };

  const renderLoadMoreButton = () => {
    if (!hasMorePages) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        disabled={loadingMorePosts}
        activeOpacity={0.8}
      >
        {loadingMorePosts ? (
          <ActivityIndicator size="small" color="#000000" />
        ) : (
          <Text style={styles.loadMoreButtonText}>Load More Posts</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (familyLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F0C142" />
          <Text style={styles.loadingText}>Loading your families...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family Feed</Text>
        {families.length > 0 && (
          <TouchableOpacity
            style={styles.familySelector}
            onPress={() => {
              setShowFamilySelector(true);
              Haptics.selectionAsync();
            }}
          >
            <Text style={styles.selectedFamilyName} numberOfLines={1}>
              {selectedFamily ? selectedFamily.family_name : "Select Family"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#4CC2C4" />
          </TouchableOpacity>
        )}
      </View>

      {renderFamilySelector()}
      {renderCreatePostModal()}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F0C142" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          {!selectedFamily && families.length > 0 ? (
            <>
              <Ionicons name="people-outline" size={48} color="#4CC2C4" />
              <Text style={styles.errorText}>
                Select a family to view posts
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowFamilySelector(true)}
              >
                <Text style={styles.actionButtonText}>Select Family</Text>
              </TouchableOpacity>
            </>
          ) : families.length === 0 ? (
            <>
              <Ionicons name="home-outline" size={48} color="#4CC2C4" />
              <Text style={styles.errorText}>
                You're not part of any family yet
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  /* Navigate to create family screen */
                }}
              >
                <Text style={styles.actionButtonText}>Create Family</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={48} color="#FF453A" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRefresh}
              >
                <Text style={styles.actionButtonText}>Retry</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={48}
                color="#8E8E93"
              />
              <Text style={styles.emptyText}>
                No posts in this family feed yet
              </Text>
              <Text style={styles.emptySubText}>
                Be the first to share something!
              </Text>
              <TouchableOpacity
                style={[styles.actionButton, styles.emptyActionButton]}
                onPress={() => setShowCreatePostModal(true)}
              >
                <Text style={styles.actionButtonText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contentContainer}>
              <FlatList
                ref={flatListRef}
                data={posts}
                renderItem={renderPostItem}
                keyExtractor={(item) =>
                  item.post_id?.toString() || Math.random().toString()
                }
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={["#F0C142"]}
                    tintColor="#F0C142"
                    progressBackgroundColor="#2C2C2E"
                  />
                }
                onScrollToIndexFailed={handleScrollToIndexFailed}
                ListFooterComponent={renderLoadMoreButton}
              />
              <FloatingCreateButton
                onPress={() => setShowCreatePostModal(true)}
              />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    padding: 16,
    backgroundColor: "#1C1C1E",
    borderBottomWidth: 1,
    borderBottomColor: "#38383A",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F0C142",
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  familySelector: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  selectedFamilyName: {
    fontSize: 16,
    color: "#4CC2C4",
    fontWeight: "500",
    marginRight: 4,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  contentContainer: {
    flex: 1,
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#121212",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#AEAEB2",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#121212",
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  actionButton: {
    backgroundColor: "#F0C142",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#121212",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 16,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  emptySubText: {
    fontSize: 14,
    color: "#AEAEB2",
    marginTop: 8,
    marginBottom: 16,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  emptyActionButton: {
    marginTop: 16,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "rgba(30, 30, 30, 0.9)", // Fallback for BlurView
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 36 : 20, // Extra padding for iPhone X and newer
    maxHeight: "60%",
    overflow: "hidden",
  },
  createPostModalContent: {
    backgroundColor: "rgba(30, 30, 30, 0.9)", // Fallback for BlurView
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#38383A",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  familyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#38383A",
  },
  selectedFamilyItem: {
    backgroundColor: "rgba(76, 194, 196, 0.15)", // Teal with opacity
  },
  familyName: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  loadMoreButton: {
    backgroundColor: "#F0C142",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 16,
    alignSelf: "center",
    minWidth: 180,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loadMoreButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  highlightedPostContainer: {
    backgroundColor: "rgba(76, 194, 196, 0.15)", // Teal highlight with opacity
    borderRadius: 12,
    marginVertical: 4,
    shadowColor: "#4CC2C4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  postItemContainer: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  createPostButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0C142", // Golden yellow from the logo
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
