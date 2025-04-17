// app/(screens)/memory-detail.js
// app/(screens)/memory-detail.js - Updated with presigned uploads
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import {
  getMemoryContent,
  getMemoryComments,
  addCommentToMemory,
  deleteMemory,
} from "../api/memoriesService";
import LoadingIndicator from "../components/LoadingIndicator";
import CommentSection from "../components/CommentSection";
import MediaViewer from "../components/MediaViewer";
import FloatingCreateButton from "../components/FloatingCreateButton";
import EnhancedMediaPicker from "../components/shared/MediaPickerModal"; // Use our new component

export default function MemoryDetailScreen() {
  const { memoryId, title } = useLocalSearchParams();
  const router = useRouter();

  const [content, setContent] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const fetchMemoryData = useCallback(async () => {
    try {
      const [contentData, commentsData] = await Promise.all([
        getMemoryContent(memoryId),
        getMemoryComments(memoryId),
      ]);

      setContent(contentData);
      setComments(commentsData);
    } catch (error) {
      console.error("Error fetching memory data:", error);
      Alert.alert("Error", "Failed to load memory data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memoryId]);

  useEffect(() => {
    fetchMemoryData();
  }, [fetchMemoryData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMemoryData();
  }, [fetchMemoryData]);

  const handleAddContent = () => {
    // Show the enhanced media picker
    setMediaPickerVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleMediaSelected = async (mediaResults) => {
    // Media has been uploaded directly to R2 and associated with this memory
    // No need to do anything here except refresh the content
    console.log('Media successfully uploaded:', mediaResults);
    fetchMemoryData();
  };

  const handleDeleteMemory = () => {
    Alert.alert(
      "Delete Memory",
      "Are you sure you want to delete this memory? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteMemory(memoryId);
              router.back();
            } catch (error) {
              console.error("Error deleting memory:", error);
              Alert.alert(
                "Error",
                "Failed to delete the memory. Please try again."
              );
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCommentAdded = () => {
    // Refresh comments when a new one is added
    fetchMemoryData();
  };

  const handleOpenMedia = (item) => {
    // Determine if it's a video or image based on mime type
    const isVideo =
      item.content_type &&
      (item.content_type.startsWith("video/") ||
        item.file_path.endsWith(".mp4") ||
        item.file_path.endsWith(".mov"));

    setSelectedMedia({
      url: item.file_path,
      type: isVideo ? "video" : "image",
    });
    setMediaViewerVisible(true);
  };

  const handleCloseMediaViewer = () => {
    setMediaViewerVisible(false);
    setSelectedMedia(null);
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : null}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={handleDeleteMemory}>
            <Ionicons name="trash-outline" size={24} color="#FF453A" />
          </TouchableOpacity>
        </View>

        {/* Content and Comments */}
        <FlatList
          data={content}
          keyExtractor={(item) => item.content_id.toString()}
          ListHeaderComponent={() => (
            <View style={styles.contentHeader}>
              <Text style={styles.sectionTitle}>Photos & Videos</Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <BlurView intensity={20} tint="dark" style={styles.emptyContent}>
              <Ionicons name="images-outline" size={48} color="#4CC2C4" />
              <Text style={styles.emptyText}>
                No photos or videos added yet
              </Text>
            </BlurView>
          )}
          renderItem={({ item }) => (
            <BlurView
              intensity={20}
              tint="dark"
              style={styles.contentItemContainer}
            >
              <TouchableOpacity
                style={styles.contentItem}
                onPress={() => handleOpenMedia(item)}
                activeOpacity={0.9}
              >
                {item.content_type && item.content_type.startsWith("image/") ? (
                  <Image
                    source={{ uri: item.file_path }}
                    style={styles.contentImage}
                    resizeMode="cover"
                  />
                ) : item.content_type &&
                  item.content_type.startsWith("video/") ? (
                  <View style={styles.videoContent}>
                    <Image
                      source={{ uri: item.file_path }}
                      style={styles.contentImage}
                      resizeMode="cover"
                    />
                    <View style={styles.videoIndicator}>
                      <Ionicons
                        name="play-circle"
                        size={48}
                        color="rgba(255, 255, 255, 0.9)"
                      />
                    </View>
                  </View>
                ) : (
                  // Handle other content types
                  <View style={styles.unsupportedContent}>
                    <Ionicons
                      name="document-outline"
                      size={32}
                      color="#4CC2C4"
                    />
                    <Text style={styles.unsupportedText}>
                      Unsupported content type
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </BlurView>
          )}
          ListFooterComponent={() => (
            <View style={styles.commentsSection}>
              <CommentSection
                postId={memoryId}
                initialComments={comments}
                onCommentAdded={handleCommentAdded}
                darkMode={true}
              />
            </View>
          )}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4CC2C4"
              colors={["#4CC2C4"]}
            />
          }
        />
      </KeyboardAvoidingView>
      
      {/* Floating Action Button */}
      <FloatingCreateButton
        onPress={handleAddContent}
        allowedScreens={["/memory-detail"]}
        iconName="camera"
        disabled={uploadingMedia}
      />
      
      {/* Enhanced Media Picker Modal */}
      <EnhancedMediaPicker
        visible={mediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onSelectMedia={handleMediaSelected}
        memoryId={memoryId}
        allowMultiple={true}
        showVideos={true}
      />
      
      {/* Media Viewer Modal for viewing content */}
      {selectedMedia && (
        <MediaViewer
          visible={mediaViewerVisible}
          onClose={handleCloseMediaViewer}
          media={selectedMedia}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(30, 30, 30, 0.7)",
    borderBottomWidth: 1,
    borderBottomColor: "#38383A",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80, // Extra padding for keyboard
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  emptyContent: {
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "rgba(30, 30, 30, 0.7)", // Fallback color
  },
  emptyText: {
    fontSize: 16,
    color: "#AEAEB2",
    marginTop: 8,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  contentItemContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(30, 30, 30, 0.7)", // Fallback color
  },
  contentItem: {
    width: "100%",
  },
  contentImage: {
    width: "100%",
    height: 300,
  },
  unsupportedContent: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(30, 30, 30, 0.7)",
  },
  unsupportedText: {
    fontSize: 14,
    color: "#AEAEB2",
    marginTop: 8,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  videoContent: {
    width: "100%",
    height: 300,
    position: "relative",
  },
  videoIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  commentsSection: {
    marginTop: 16,
  },
});