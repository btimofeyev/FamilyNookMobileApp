import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// This is a simplified version for demonstration.
// A full implementation of the "press and hold" arc animation would require
// react-native-reanimated and react-native-gesture-handler for a fluid feel.
// For now, this provides the visual redesign and standard tap functionality.

const ActionOrb = ({ post, onToggleLike }) => {

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleLike(post.post_id);
  };

  const handleComment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // router.push(`/post/${post.post_id}/comments`);
    console.log("Navigate to comments");
  };

  const handleShare = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Logic for sharing
      console.log("Open share sheet");
  };

  return (
    <View style={styles.container}>
        {/* Secondary Actions */}
        <TouchableOpacity style={[styles.secondaryButton, styles.commentButton]} onPress={handleComment}>
             <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, styles.shareButton]} onPress={handleShare}>
             <Ionicons name="share-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Main Like Orb */}
        <TouchableOpacity style={styles.orbContainer} onPress={handleLike}>
            <BlurView style={styles.orb} intensity={80} tint='light'>
                <Ionicons
                    name={post.is_liked ? 'heart' : 'heart-outline'}
                    size={30}
                    color={post.is_liked ? '#FF2D55' : '#000000'}
                />
            </BlurView>
        </TouchableOpacity>

        <View style={styles.likeCountContainer}>
            <Text style={styles.likeCountText}>{post.likes_count}</Text>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orbContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  orb: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  secondaryButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.25)',
      marginHorizontal: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
  },
  commentButton: {},
  shareButton: {},
  likeCountContainer: {
      position: 'absolute',
      left: -25,
      top: 20,
      backgroundColor: 'rgba(0,0,0,0.15)',
      paddingHorizontal: 8,
      borderRadius: 10,
  },
  likeCountText: {
      color: '#000',
      fontSize: 16,
      fontWeight: '700',
  }
});

export default ActionOrb;