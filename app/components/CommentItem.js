// app/components/CommentItem.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import TimeAgo from './TimeAgo';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity, Animations } from '../theme';

// Maximum nesting level for comments
const MAX_NESTING_LEVEL = 3;

const CommentItem = ({ comment, onReply, level = 0, opacity = 1, postId, onUpdate }) => {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(level === 0);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isCurrentUser = user?.id === (comment.author_id || comment.user_id);
  const commentId = comment.id || comment.comment_id;
  
  // Animation refs for liquid glass micro-animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const replyButtonScale = useRef(new Animated.Value(1)).current;
  
  // Get comment text from different possible fields
  const commentText = comment.text || comment.comment_text;
  // Get author name from different possible fields
  const authorName = comment.author_name || comment.user_name;
  
  // Calculate left margin based on nesting level with liquid flow
  const nestingMargin = level * 24;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: level * 100, // Cascade effect
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: level * 100,
        ...Animations.spring,
      }),
    ]).start();
  }, []);
  
  const handlePressReply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Button animation
    Animated.sequence([
      Animated.spring(replyButtonScale, {
        toValue: 0.9,
        ...Animations.spring,
      }),
      Animated.spring(replyButtonScale, {
        toValue: 1,
        ...Animations.spring,
      }),
    ]).start();
    
    onReply && onReply(comment);
  };
  
  const toggleReplies = () => {
    if (hasReplies) {
      setShowReplies(!showReplies);
      Haptics.selectionAsync();
    }
  };
  
  const handleDelete = () => {
    // Only allow deletion of own comments
    if (!isCurrentUser) return;
    
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              // TODO: Implement delete comment API call
              // await deleteComment(postId, commentId);
              
              // Refresh comments
              onUpdate && onUpdate();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          opacity: fadeAnim, 
          marginLeft: nestingMargin,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      {/* Liquid Glass Comment Bubble */}
      <BlurView intensity={BlurIntensity.strong} tint="dark" style={styles.commentContainer}>
        {/* Subtle gradient highlight for depth */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.05)']}
          style={styles.commentHighlight}
        />
        
        {/* Comment Content */}
        <View style={styles.commentContent}>
          {/* Header with elegant typography */}
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{authorName}</Text>
            <TimeAgo date={new Date(comment.created_at)} style={styles.commentTime} />
          </View>
          
          {/* Comment text with proper contrast */}
          <View style={styles.textContainer}>
            <Text style={styles.commentText}>{commentText}</Text>
          </View>
          
          {/* Action buttons with liquid glass styling */}
          <View style={styles.commentActions}>
            {level < MAX_NESTING_LEVEL && (
              <Animated.View style={{ transform: [{ scale: replyButtonScale }] }}>
                <TouchableOpacity 
                  onPress={handlePressReply} 
                  style={styles.actionButton}
                  activeOpacity={1}
                >
                  <BlurView intensity={60} tint="dark" style={styles.actionBlur}>
                    <Ionicons name="corner-up-left" size={14} color={Colors.primary} />
                    <Text style={styles.actionText}>Reply</Text>
                  </BlurView>
                </TouchableOpacity>
              </Animated.View>
            )}
            
            {hasReplies && (
              <TouchableOpacity 
                onPress={toggleReplies} 
                style={styles.actionButton}
                activeOpacity={1}
              >
                <BlurView intensity={60} tint="dark" style={styles.actionBlur}>
                  <Ionicons 
                    name={showReplies ? "chevron-up" : "chevron-down"} 
                    size={14} 
                    color={Colors.primary}
                  />
                  <Text style={[styles.actionText, showReplies && styles.activeAction]}>
                    {showReplies ? 'Hide' : `${comment.replies.length}`}
                  </Text>
                </BlurView>
              </TouchableOpacity>
            )}
            
            {isCurrentUser && (
              <TouchableOpacity 
                onPress={handleDelete} 
                style={styles.deleteButton}
                activeOpacity={1}
              >
                <BlurView intensity={60} tint="dark" style={styles.deleteBlur}>
                  <Ionicons name="trash-outline" size={14} color={Colors.error} />
                </BlurView>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </BlurView>
      
      {/* Thread connection line with liquid flow */}
      {level > 0 && (
        <View style={[styles.threadLine, { left: -12 }]}>
          <LinearGradient
            colors={[Colors.primary, `${Colors.primary}40`]}
            style={styles.threadGradient}
          />
        </View>
      )}
      
      {/* Nested replies with proper spacing */}
      {hasReplies && showReplies && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id || reply.comment_id || `${reply.created_at}-${reply.author_id || reply.user_id}`}
              comment={reply}
              onReply={onReply}
              level={level + 1}
              postId={postId}
              onUpdate={onUpdate}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  
  // Liquid Glass Comment Bubble
  commentContainer: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(28, 28, 30, 0.4)',
    // Liquid glass shadow with vitality
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  
  commentHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderRadius: BorderRadius.xl,
  },
  
  commentContent: {
    padding: Spacing.lg,
    position: 'relative',
    zIndex: 1,
  },
  
  // Typography with SF Pro hierarchy
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  
  commentAuthor: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.display,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  
  commentTime: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.text,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
    letterSpacing: -0.1,
  },
  
  textContainer: {
    marginBottom: Spacing.md,
  },
  
  commentText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.text,
    fontWeight: Typography.weights.normal,
    color: Colors.text.primary,
    lineHeight: Typography.sizes.base * 1.5,
    letterSpacing: -0.2,
  },
  
  // Action buttons with liquid glass styling
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  
  actionButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  
  actionBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
  },
  
  actionText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.text,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
    letterSpacing: -0.1,
  },
  
  activeAction: {
    color: Colors.secondary,
  },
  
  deleteButton: {
    marginLeft: 'auto',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  
  deleteBlur: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.4)',
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
  },
  
  // Thread connections with gradient flow
  threadLine: {
    position: 'absolute',
    width: 2,
    top: 0,
    bottom: 0,
    borderRadius: 1,
    overflow: 'hidden',
    opacity: 0.6,
  },
  
  threadGradient: {
    flex: 1,
    width: '100%',
  },
  
  // Nested replies with proper material separation
  repliesContainer: {
    marginTop: Spacing.md,
    paddingLeft: Spacing.xl,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(59, 175, 188, 0.2)',
    marginLeft: Spacing.md,
  },
});

export default CommentItem;