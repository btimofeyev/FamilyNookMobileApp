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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getComments, addComment } from '../api/feedService';
import CommentItem from './CommentItem';
import { BlurView } from 'expo-blur';

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
        <BlurView intensity={100} tint="light" style={styles.inputBlurView}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="rgba(60, 60, 67, 0.6)"
              value={newComment}
              onChangeText={setNewComment}
              keyboardAppearance="light"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleAddComment} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#007AFF"/> : <Ionicons name="arrow-up-circle-fill" size={32} color="#007AFF" />}
            </TouchableOpacity>
        </BlurView>
      </View>

      {/* Comments List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.comment_id.toString()}
          renderItem={({ item }) => <CommentItem comment={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Be the first to comment.</Text>
          }
          contentContainerStyle={{ paddingTop: 10 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    wrapper: {
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
        paddingTop: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
        marginBottom: 10,
    },
    inputBlurView: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 15,
        fontSize: 16,
        color: '#000',
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    },
    sendButton: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: 'rgba(60, 60, 67, 0.6)',
        marginTop: 20,
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    }
});