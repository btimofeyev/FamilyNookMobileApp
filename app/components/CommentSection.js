// app/components/CommentSection.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  FlatList,
  Keyboard,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getComments, addComment } from '../api/feedService';
import TimeAgo from './TimeAgo';
import CommentItem from './CommentItem';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function CommentSection({ postId, initialComments = [], onCommentAdded }) {
  const [comments, setComments] = useState(initialComments || []);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const inputRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate comment section sliding in
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (!initialComments || initialComments.length === 0) {
      fetchComments();
    }
  }, [postId]);

  const fetchComments = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await getComments(postId);
      
      // Process the comments to create a tree structure
      const commentsMap = new Map();
      const rootComments = [];
      
      // First pass: Create a map of all comments
      data.forEach(comment => {
        commentsMap.set(comment.id || comment.comment_id, {
          ...comment,
          replies: []
        });
      });
      
      // Second pass: Build the tree structure
      data.forEach(comment => {
        const commentId = comment.id || comment.comment_id;
        const parentId = comment.parent_comment_id;
        
        if (parentId && commentsMap.has(parentId)) {
          // This is a reply, add it to its parent's replies
          const parent = commentsMap.get(parentId);
          parent.replies.push(commentsMap.get(commentId));
        } else {
          // This is a root comment
          if (commentsMap.has(commentId)) {
            rootComments.push(commentsMap.get(commentId));
          }
        }
      });
      
      setComments(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchComments(true);
  };

  const focusInput = () => {
    inputRef.current?.focus();
    Haptics.selectionAsync(); // Haptic feedback when focusing input
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    Keyboard.dismiss();
    setSubmitting(true);
    
    try {
      // Add parentId if replying to a comment
      const parentCommentId = replyingTo ? replyingTo.id || replyingTo.comment_id : null;
      
      const result = await addComment(postId, newComment, parentCommentId);
      
      if (replyingTo) {
        // If it's a reply, we need to update the parent comment's replies
        setComments(prevComments => {
          return prevComments.map(comment => {
            if ((comment.id || comment.comment_id) === (replyingTo.id || replyingTo.comment_id)) {
              // Add the reply to the parent comment
              return {
                ...comment,
                replies: [...(comment.replies || []), result]
              };
            }
            return comment;
          });
        });
        
        // Clear reply state
        setReplyingTo(null);
      } else {
        // Add the new comment to the top level comments
        setComments(prevComments => [
          { ...result, replies: [] },
          ...prevComments
        ]);
      }
      
      setNewComment('');
      
      // Provide success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Notify parent component about the added comment
      onCommentAdded && onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
    setNewComment(`@${comment.author_name || comment.user_name} `);
    inputRef.current?.focus();
    Haptics.selectionAsync();
  };
  
  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
    Haptics.selectionAsync();
  };
  
  const renderComment = ({ item }) => (
    <CommentItem 
      comment={item}
      onReply={handleReply}
      opacity={slideAnim}
      level={0}
      postId={postId}
      onUpdate={fetchComments}
    />
  );

  const renderHeader = () => (
    <Text style={styles.sectionTitle}>
      Comments {comments.length > 0 ? `(${comments.length})` : ''}
    </Text>
  );

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          opacity: slideAnim,
          transform: [{ translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0]
          })}]
        }
      ]}
    >
      <View style={styles.commentInputWrapper}>
        {replyingTo && (
          <BlurView intensity={10} tint="dark" style={styles.replyingToContainer}>
            <Ionicons name="return-down-forward-outline" size={16} color="#3BAFBC" />
            <Text style={styles.replyingToText}>
              Replying to <Text style={styles.replyingToName}>{replyingTo.author_name || replyingTo.user_name}</Text>
            </Text>
            <TouchableOpacity 
              onPress={cancelReply} 
              style={styles.cancelReplyButton}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="close-circle" size={18} color="#8E8E93" />
            </TouchableOpacity>
          </BlurView>
        )}
        
        <View style={styles.inputContainer}>
          <BlurView intensity={10} tint="dark" style={styles.inputBlur}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              placeholderTextColor="#8E8E93"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={1000}
              selectionColor="#3BAFBC"
              returnKeyType="default"
              keyboardAppearance="dark"
            />
          </BlurView>
          <TouchableOpacity 
            onPress={handleAddComment} 
            disabled={submitting || !newComment.trim()}
            style={styles.submitButtonContainer}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={!newComment.trim() || submitting ? ['rgba(30, 43, 47, 0.5)', 'rgba(59, 175, 188, 0.5)'] : ['#1E2B2F', '#3BAFBC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButton}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#F5F5F7" />
              ) : (
                <Ionicons name="paper-plane" size={18} color="#F5F5F7" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator style={styles.loading} color="#3BAFBC" size="small" />
          <Text style={styles.loadingText}>Loading comments...</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => 
            item.id?.toString() || 
            item.comment_id?.toString() || 
            `${item.author_name}-${item.created_at}`
          }
          contentContainerStyle={styles.commentsList}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No comments yet</Text>
              <TouchableOpacity 
                onPress={focusInput} 
                style={styles.emptyButton}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyButtonText}>Be the first to comment</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 175, 188, 0.1)', // Very subtle Teal Glow border
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F7', // Soft White
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.3, // Apple-style tight letter spacing
  },
  commentInputWrapper: {
    marginBottom: 20,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(18, 18, 18, 0.7)', // Onyx Black with opacity
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.15)', // Subtle Teal Glow border
  },
  replyingToText: {
    fontSize: 13,
    color: '#F5F5F7', // Soft White
    flex: 1,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
  replyingToName: {
    fontWeight: '600',
    color: '#3BAFBC', // Teal Glow
  },
  cancelReplyButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputBlur: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 18, 18, 0.7)', // Onyx Black with opacity
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.15)', // Subtle Teal Glow border
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 42,
    maxHeight: 100,
    color: '#F5F5F7', // Soft White
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
  submitButtonContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  submitButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loading: {
    marginBottom: 8,
  },
  loadingText: {
    color: '#8E8E93', // Slate Gray
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
  commentsList: {
    paddingBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93', // Slate Gray
    fontSize: 15,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
  emptyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 175, 188, 0.1)', // Transparent teal
    borderWidth: 1,
    borderColor: '#3BAFBC', // Teal Glow
  },
  emptyButtonText: {
    color: '#3BAFBC', // Teal Glow
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2, // Apple-style tight letter spacing
  },
});