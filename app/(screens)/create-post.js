import React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import CreatePostForm from '../components/CreatePostForm';
import { useFamily } from '../../context/FamilyContext';

const CreatePostScreen = () => {
  const router = useRouter();
  const { familyId: currentFamilyId } = useFamily();
  const params = useLocalSearchParams();
  const familyId = params.familyId || currentFamilyId;

  const handlePostCreated = (newPost) => {
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar style="dark" />
        
        {/* Soft blue background matching login/register and feed themes */}
        <LinearGradient
          colors={[
            '#f0f9ff', // Very light blue
            '#e0f2fe', // Light sky blue (from login)
            '#bae6fd', // Medium blue (from login)
          ]}
          style={styles.background}
        />
        
        <CreatePostForm
          familyId={familyId}
          onPostCreated={handlePostCreated}
          onCancel={handleCancel}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff', // Soft blue background
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default CreatePostScreen;