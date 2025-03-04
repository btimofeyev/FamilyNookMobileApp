// app/components/CommentItem.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TimeAgo from './TimeAgo';
import { useAuth } from '../../context/AuthContext';
import { BlurView } from 'expo-blur';

// Maximum nesting level for comments
const MAX_NESTING_LEVEL = 3;

const CommentItem = ({ comment, onReply, level = 0, opacity = 1, postId, onUpdate }) => {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(level === 0);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isCurrentUser = user?.id === (comment.author_id || comment.user_id);
  const commentId = comment.id || comment.comment_id;
  
  // Get comment text from different possible fields
  const commentText = comment.text || comment.comment_text;
  // Get author name from different possible fields
  const authorName = comment.author_name || comment.user_name;
  
  // Calculate left margin based on nesting level
  const nestingMargin = level * 16;
  
  const handlePressReply = () => {
    onReply && onReply(comment);
  };
  
  const toggleReplies = () => {
    if (hasReplies) {
      setShowReplies(!showReplies);
      // Give haptic feedback on toggle
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
              // Call API to delete comment (to be implemented)
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
        { opacity, marginLeft: nestingMargin }
      ]}
    >
      <BlurView intensity={15} tint="dark" style={styles.commentContainer}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{authorName}</Text>
          <TimeAgo date={new Date(comment.created_at)} style={styles.commentTime} />
        </View>
        
        <Text style={styles.commentText}>{commentText}</Text>
        
        <View style={styles.commentActions}>
          {level < MAX_NESTING_LEVEL && (
            <TouchableOpacity 
              onPress={handlePressReply} 
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <Ionicons name="return-down-forward-outline" size={14} color="#4CC2C4" style={styles.actionIcon} />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          )}
          
          {hasReplies && (
            <TouchableOpacity 
              onPress={toggleReplies} 
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showReplies ? "chevron-up" : "chevron-down"} 
                size={14} 
                color="#4CC2C4" 
                style={styles.actionIcon} 
              />
              <Text style={[styles.actionText, showReplies && styles.activeAction]}>
                {showReplies ? 'Hide Replies' : `${comment.replies.length} ${comment.replies.length === 1 ? 'Reply' : 'Replies'}`}
              </Text>
            </TouchableOpacity>
          )}
          
          {isCurrentUser && (
            <TouchableOpacity 
              onPress={handleDelete} 
              style={styles.deleteButton}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color="#FF453A" style={styles.actionIcon} />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
      
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
      
      {level > 0 && (
        <View style={[
          styles.threadLine, 
          { 
            left: -8, 
            height: '100%', 
            top: 0,
            backgroundColor: '#4CC2C4' // Teal color from logo
          }
        ]} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  commentContainer: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)', // Dark background with some transparency
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 2,
    borderLeftColor: '#4CC2C4', // Teal color from logo
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  commentTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  commentText: {
    fontSize: 15,
    color: '#EBEBF5',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#4CC2C4', // Teal color from logo
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  activeAction: {
    color: '#F0C142', // Gold color from logo
  },
  deleteButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 13,
    color: '#FF453A', // Apple's red color
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  repliesContainer: {
    marginTop: 10,
    paddingLeft: 12,
  },
  threadLine: {
    position: 'absolute',
    width: 1.5,
    backgroundColor: '#4CC2C4',
    opacity: 0.7,
  },
});

export default CommentItem;