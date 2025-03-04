//my-app/app/(tabs)/memories.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFamily } from '../../context/FamilyContext';
import { getMemories, createMemory } from '../api/memoriesService';
import LoadingIndicator from '../components/LoadingIndicator';
import EmptyState from '../components/EmptyState';
import FloatingCreateButton from '../components/FloatingCreateButton';

import CreateMemoryModal from '../components/memories/CreateMemoryModal';

export default function MemoriesScreen() {
  const router = useRouter();
  const { selectedFamily } = useFamily();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchMemories = useCallback(async () => {
    if (!selectedFamily) return;
    try {
      setError(null);
      const data = await getMemories(selectedFamily.family_id);
      setMemories(data);
    } catch (err) {
      console.error('Failed to fetch memories:', err);
      setError('Failed to load memories. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFamily]);

  useEffect(() => {
    if (selectedFamily) {
      fetchMemories();
    } else {
      setLoading(false);
    }
  }, [selectedFamily, fetchMemories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMemories();
  }, [fetchMemories]);

  const handleCreateMemory = async (title, description) => {
    try {
      if (!selectedFamily) {
        Alert.alert('Error', 'No family selected.');
        return;
      }
      
      setModalVisible(false);
      setLoading(true);
      
      await createMemory(selectedFamily.family_id, title, description);
      
      // Refresh memories list
      fetchMemories();
      
      Alert.alert('Success', 'Memory created successfully!');
    } catch (err) {
      console.error('Failed to create memory:', err);
      Alert.alert('Error', 'Failed to create memory. Please try again.');
      setLoading(false);
    }
  };

  const navigateToMemoryDetail = (memory) => {
    router.push({
      pathname: '/memory-detail',
      params: { memoryId: memory.memory_id, title: memory.title }
    });
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  if (!selectedFamily) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="people-outline"
          title="No Family Selected"
          message="Please select a family to view memories."
          iconColor="#4CC2C4"
          titleColor="#FFFFFF"
          messageColor="#AEAEB2"
        />
      </View>
    );
  }

  const renderEmptyState = () => (
    <EmptyState
      icon="images-outline"
      title="No Memories Yet"
      message="Create your first family memory by tapping the + button."
      buttonText="Create Memory"
      onButtonPress={() => setModalVisible(true)}
      iconColor="#4CC2C4"
      titleColor="#FFFFFF"
      messageColor="#AEAEB2"
      buttonColor="#F0C142"
      buttonTextColor="#000000"
    />
  );

  const renderErrorState = () => (
    <EmptyState
      icon="alert-circle-outline"
      title="Something went wrong"
      message={error}
      buttonText="Try Again"
      onButtonPress={fetchMemories}
      iconColor="#FF453A"
      titleColor="#FFFFFF"
      messageColor="#AEAEB2"
      buttonColor="#4CC2C4"
      buttonTextColor="#000000"
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family Memories</Text>
      </View>

      {error ? (
        renderErrorState()
      ) : memories.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item.memory_id.toString()}
          renderItem={({ item }) => (
            <BlurView intensity={30} tint="dark" style={styles.memoryCardContainer}>
              <TouchableOpacity 
                style={styles.memoryCard}
                onPress={() => navigateToMemoryDetail(item)}
              >
                <View style={styles.memoryContent}>
                  <Text style={styles.memoryTitle}>{item.title}</Text>
                  <Text style={styles.memoryDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                  {item.description && (
                    <Text style={styles.memoryDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
                
                {item.preview_images && item.preview_images.length > 0 ? (
                  <View style={styles.previewContainer}>
                    {item.preview_images.slice(0, Math.min(3, item.preview_images.length)).map((image, index) => (
                      <Image
                        key={index}
                        source={{ uri: image }}
                        style={styles.previewImage}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.noImagesContainer}>
                    <Ionicons name="images-outline" size={40} color="#4CC2C4" />
                  </View>
                )}
              </TouchableOpacity>
            </BlurView>
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#4CC2C4"
              colors={["#4CC2C4"]}
            />
          }
        />
      )}
 <FloatingCreateButton 
      onPress={() => setModalVisible(true)} 
      allowedScreens={['/memories']} 
    />
      <CreateMemoryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreateMemory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: '#38383A',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  createButton: {
    backgroundColor: '#F0C142', // Golden yellow from the logo
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  list: {
    padding: 16,
  },
  memoryCardContainer: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  memoryCard: {
    padding: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback
  },
  memoryContent: {
    marginBottom: 12,
  },
  memoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  memoryDate: {
    fontSize: 14,
    color: '#AEAEB2',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  memoryDescription: {
    fontSize: 16,
    color: '#E5E5EA',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  previewContainer: {
    flexDirection: 'row',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    flex: 1,
    height: 100,
    marginHorizontal: 2,
  },
  noImagesContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
    borderRadius: 8,
  },
});