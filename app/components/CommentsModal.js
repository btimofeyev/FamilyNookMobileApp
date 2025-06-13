import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import CommentSection from './CommentSection';
import GlassModal from './shared/GlassModal';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

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

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      title={`Comments (${commentCount})`}
      headerIcon="chatbubbles"
    >
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
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  postPreview: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.border,
    marginBottom: Spacing.sm,
  },
  postAuthor: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fonts.text,
  },
  postCaption: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
    fontFamily: Typography.fonts.text,
  },
});

export default CommentsModal;