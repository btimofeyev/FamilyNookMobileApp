// app/(screens)/create-post.js
import React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

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
        <LinearGradient
          colors={['#0f2027', '#203a43', '#2c5364']}
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
    justifyContent: 'center', // This line vertically centers the content
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default CreatePostScreen;