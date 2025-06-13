import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getComments, addComment } from '../api/feedService';
import CommentItem from './CommentItem';
import GlassInput from './shared/GlassInput';
import { Colors, Typography, Spacing } from '../theme';

export default function CommentSection({ postId, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await getComments(postId);
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || submitting) return;

    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await addComment(postId, newComment);
      setNewComment('');
      fetchComments(); // Refresh comments list
      if (onCommentAdded) onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Glass Input Field */}
      <View style={styles.inputContainer}>
        <GlassInput
          placeholder="Add a comment..."
          value={newComment}
          onChangeText={setNewComment}
          style={styles.commentInput}
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={handleAddComment} 
          disabled={submitting || !newComment.trim()}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons 
              name="arrow-up-circle-fill" 
              size={32} 
              color={newComment.trim() ? Colors.primary : Colors.text.tertiary} 
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Comments List */}
      {loading ? (
        <ActivityIndicator style={styles.loadingIndicator} color={Colors.primary} />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.comment_id.toString()}
          renderItem={({ item }) => <CommentItem comment={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Be the first to comment.</Text>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    marginTop: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    marginBottom: 0,
  },
  sendButton: {
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  loadingIndicator: {
    marginTop: Spacing.xl,
  },
  listContent: {
    paddingTop: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.text.secondary,
    marginTop: Spacing.xl,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.text,
  },
});