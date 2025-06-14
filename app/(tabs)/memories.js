//my-app/app/(tabs)/memories.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamily } from '../../context/FamilyContext';
import { getMemories, createMemory } from '../api/memoriesService';
import LoadingIndicator from '../components/LoadingIndicator';
import EmptyState from '../components/EmptyState';
import FloatingCreateButton from '../components/FloatingCreateButton';

import CreateMemoryModal from '../components/memories/CreateMemoryModal';

export default function MemoriesScreen() {
  const router = useRouter();
  const { selectedFamily } = useFamily();
  const topInset = useSafeAreaInsets().top;
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
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#f0f9ff', '#e0f2fe', '#f8faff']}
          style={styles.backgroundGradient}
        />
        <EmptyState
          icon="people-outline"
          title="No Family Selected"
          message="Please select a family to view memories."
          iconColor="#7dd3fc"
          titleColor="#1C1C1E"
          messageColor="rgba(28, 28, 30, 0.6)"
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
      iconColor="#7dd3fc"
      titleColor="#1C1C1E"
      messageColor="rgba(28, 28, 30, 0.6)"
      buttonColor="#7dd3fc"
      buttonTextColor="#FFFFFF"
    />
  );

  const renderErrorState = () => (
    <EmptyState
      icon="alert-circle-outline"
      title="Something went wrong"
      message={error}
      buttonText="Try Again"
      onButtonPress={fetchMemories}
      iconColor="#FF3B30"
      titleColor="#1C1C1E"
      messageColor="rgba(28, 28, 30, 0.6)"
      buttonColor="#7dd3fc"
      buttonTextColor="#FFFFFF"
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#f0f9ff', '#e0f2fe', '#f8faff']}
        style={styles.backgroundGradient}
      />
      
      <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={[
        styles.header,
        { paddingTop: topInset + 16 }
      ]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.8)', 
            'rgba(255, 255, 255, 0.4)'
          ]}
          style={styles.headerHighlight}
        />
        <Text style={styles.headerTitle}>Family Memories</Text>
      </BlurView>

      {error ? (
        renderErrorState()
      ) : memories.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item.memory_id.toString()}
          renderItem={({ item }) => (
            <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.memoryCardContainer}>
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.8)', 
                  'rgba(255, 255, 255, 0.4)'
                ]}
                style={styles.cardHighlight}
              />
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
                    <Ionicons name="images-outline" size={40} color="#7dd3fc" />
                  </View>
                )}
              </TouchableOpacity>
            </BlurView>
          )}
          contentContainerStyle={[
            styles.list,
            { paddingTop: topInset + 80 }
          ]}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#7dd3fc"
              colors={["#7dd3fc"]}
              progressViewOffset={topInset + 80}
            />
          }
          showsVerticalScrollIndicator={false}
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
    backgroundColor: 'transparent',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 100,
    borderRadius: 24,
    margin: 16,
    marginTop: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#7dd3fc',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(125, 211, 252, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  memoryCardContainer: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  memoryCard: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  memoryContent: {
    marginBottom: 12,
  },
  memoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.3,
  },
  memoryDate: {
    fontSize: 14,
    color: 'rgba(28, 28, 30, 0.6)',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
  },
  memoryDescription: {
    fontSize: 16,
    color: 'rgba(28, 28, 30, 0.8)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    lineHeight: 22,
  },
  previewContainer: {
    flexDirection: 'row',
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    flex: 1,
    height: 100,
    marginHorizontal: 2,
    borderRadius: 12,
  },
  noImagesContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(125, 211, 252, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.2)',
  },
});