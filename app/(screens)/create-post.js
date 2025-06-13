import React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
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
        
        {/* Clean Background matching feed screen */}
        <LinearGradient
          colors={[
            '#F8FAFF',
            '#F0F7FF',
            '#E8F4FF',
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
    backgroundColor: '#F8FAFF',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default CreatePostScreen;