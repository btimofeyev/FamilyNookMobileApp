import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Keyboard,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { getComments, addComment } from '../api/feedService';
import CommentItem from './CommentItem';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity, Animations } from '../theme';

export default function CommentSection({ postId, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Animation refs for liquid glass effects
  const inputRef = useRef(null);
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

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

    // Haptic feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Ripple animation
    Animated.sequence([
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rippleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await addComment(postId, newComment);
      setNewComment('');
      fetchComments(); // Refresh comments list
      if (onCommentAdded) onCommentAdded();
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error adding comment:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    Animated.spring(focusAnim, {
      toValue: 1,
      ...Animations.spring,
    }).start();
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    Animated.spring(focusAnim, {
      toValue: 0,
      ...Animations.spring,
    }).start();
  };

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      ...Animations.spring,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      ...Animations.spring,
    }).start();
  };

  // Animated values for liquid glass effects
  const inputBorderRadius = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [25, 30],
  });

  const inputShadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 0],
  });

  return (
    <View style={styles.wrapper}>
      {/* Liquid Glass Input Container */}
      <View style={styles.inputSection}>
        <Animated.View style={[
          styles.inputContainer,
          {
            shadowOpacity: inputShadowOpacity,
            borderRadius: inputBorderRadius,
          }
        ]}>
          {/* Heavy blur background for liquid glass effect */}
          <BlurView intensity={BlurIntensity.heavy} tint="systemUltraThinMaterialLight" style={styles.inputBlur}>
            {/* Subtle gradient overlay for depth */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.inputGradient}
            />
            
            {/* Input field with proper layering */}
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                style={styles.liquidInput}
                placeholder="Add a comment..."
                placeholderTextColor={Colors.text.placeholder}
                value={newComment}
                onChangeText={setNewComment}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                multiline={true}
                maxLength={500}
                keyboardAppearance="light"
                returnKeyType="send"
                onSubmitEditing={handleAddComment}
                selectionColor={Colors.primary}
              />
              
              {/* Send button with liquid animation */}
              <Animated.View style={[styles.sendButtonContainer, { transform: [{ scale: buttonScale }] }]}>
                <TouchableOpacity
                  onPress={handleAddComment}
                  onPressIn={handleButtonPressIn}
                  onPressOut={handleButtonPressOut}
                  disabled={submitting || !newComment.trim()}
                  style={styles.sendButton}
                  activeOpacity={1}
                >
                  {/* Ripple effect overlay */}
                  <Animated.View style={[
                    styles.rippleEffect,
                    {
                      transform: [{ scale: rippleScale }],
                      opacity: rippleOpacity,
                    }
                  ]} />
                  
                  {/* Button background with adaptive blur */}
                  <BlurView intensity={80} tint="light" style={styles.sendButtonBlur}>
                    <LinearGradient
                      colors={newComment.trim() ? [Colors.primary, Colors.primaryDark] : ['rgba(142, 142, 147, 0.3)', 'rgba(142, 142, 147, 0.1)']}
                      style={styles.sendButtonGradient}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color={Colors.text.primary} />
                      ) : (
                        <Ionicons
                          name="arrow-up"
                          size={20}
                          color={newComment.trim() ? Colors.text.primary : Colors.text.tertiary}
                          style={styles.sendIcon}
                        />
                      )}
                    </LinearGradient>
                  </BlurView>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </BlurView>
        </Animated.View>
      </View>

      {/* Comments List with proper material separation */}
      <View style={styles.commentsSection}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading comments...</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.comment_id.toString()}
            renderItem={({ item }) => <CommentItem comment={item} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <BlurView intensity={30} tint="systemUltraThinMaterialLight" style={styles.emptyBlur}>
                  <Ionicons name="chatbubbles-outline" size={48} color={Colors.text.secondary} />
                  <Text style={styles.emptyTitle}>Start the conversation</Text>
                  <Text style={styles.emptySubtitle}>Be the first to share your thoughts</Text>
                </BlurView>
              </View>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollIndicatorInsets={{ right: 1 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  
  // Input Section - Liquid Glass Material
  inputSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    zIndex: 10, // Elevated above comments
  },
  
  inputContainer: {
    // Liquid Glass shadow with vitality
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
    // Dynamic border radius handled by animation
  },
  
  inputBlur: {
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'transparent',
  },
  
  inputGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  
  liquidInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.text,
    fontWeight: Typography.weights.medium,
    color: Colors.text.dark,
    lineHeight: Typography.sizes.base * 1.4,
    maxHeight: 120,
    marginRight: Spacing.md,
    // Remove default text input styling
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  
  // Send Button - Floating with Liquid Animation
  sendButtonContainer: {
    position: 'relative',
  },
  
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  
  rippleEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    zIndex: -1,
  },
  
  sendButtonBlur: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  sendIcon: {
    fontWeight: '600',
  },
  
  // Comments Section - Material Separation
  commentsSection: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['6xl'],
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.text,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
  },
  
  // Empty State - Liquid Glass Card
  emptyContainer: {
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing.xl,
  },
  
  emptyBlur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.display,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.dark,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.text,
    fontWeight: Typography.weights.normal,
    color: Colors.text.placeholder,
    marginTop: Spacing.xs,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * 1.4,
  },
});