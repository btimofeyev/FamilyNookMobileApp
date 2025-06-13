import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import CreatePostForm from '../components/CreatePostForm';
import { useFamily } from '../../context/FamilyContext';
import * as Haptics from 'expo-haptics';

export default function CreatePostScreen() {
  const { selectedFamily } = useFamily();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePostCreated = async (newPost) => {
    try {
      setIsSubmitting(true);
      
      // Give success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate back to feed
      router.back();
      
      // Optional: Show success message
      setTimeout(() => {
        Alert.alert('Success', 'Your post has been created!');
      }, 500);
      
    } catch (error) {
      console.error('Error handling post creation:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Ensure we have a selected family
  if (!selectedFamily) {
    Alert.alert('No Family Selected', 'Please select a family first.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f2027', '#203a43', '#2c5364']}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style="light" />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>
          <CreatePostForm
            familyId={selectedFamily.family_id}
            onPostCreated={handlePostCreated}
            onCancel={handleCancel}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
});