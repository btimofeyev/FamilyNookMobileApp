import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import CommentSection from './CommentSection';

const { height: screenHeight } = Dimensions.get('window');

const CommentsModal = ({ visible, onClose, postId, post, onCommentAdded }) => {
  const [commentCount, setCommentCount] = useState(post?.comments_count || 0);

  useEffect(() => {
    if (post?.comments_count !== undefined) {
      setCommentCount(post.comments_count);
    }
  }, [post?.comments_count]);

  const handleCommentAdded = () => {
    setCommentCount(prev => prev + 1);
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={100} tint="dark" style={styles.backdrop}>
          <TouchableOpacity
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={onClose}
          />
        </BlurView>

        <SafeAreaView style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="chatbubbles" size={24} color="#F5F5F7" />
              <Text style={styles.headerTitle}>
                Comments ({commentCount})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#F5F5F7" />
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            {post && (
              <View style={styles.postPreview}>
                <Text style={styles.postAuthor}>{post.author_name}</Text>
                {post.caption && (
                  <Text style={styles.postCaption} numberOfLines={2}>
                    {post.caption}
                  </Text>
                )}
              </View>
            )}

            <CommentSection
              postId={postId}
              onCommentAdded={handleCommentAdded}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropTouch: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.75,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F5F7',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  closeButton: {
    padding: 4,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  postPreview: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  postCaption: {
    fontSize: 15,
    color: 'rgba(245, 245, 247, 0.8)',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

export default CommentsModal;