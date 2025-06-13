import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createPost } from '../api/feedService';
import MediaPickerModal from './shared/MediaPickerModal';

const { width: screenWidth } = Dimensions.get('window');

// Liquid Glass Action Button with Dark Theme
const LiquidGlassButton = ({ 
  title, 
  icon, 
  onPress, 
  variant = 'primary', 
  disabled = false, 
  loading = false,
  style 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const isPrimary = variant === 'primary';
  
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      style={[styles.buttonContainer, style]}
    >
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.disabledContainer
        ]}
      >
        <BlurView intensity={90} tint="dark" style={styles.buttonBlur}>
          <LinearGradient
            colors={isPrimary 
              ? ['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.6)']
              : ['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.4)']
            }
            style={styles.buttonHighlight}
          />
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.buttonGlassHighlight}
          />
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator 
                size="small" 
                color="#FFFFFF"
              />
            ) : (
              <>
                {icon && (
                  <Ionicons 
                    name={icon} 
                    size={20} 
                    color="#FFFFFF"
                    style={title ? { marginRight: 8 } : {}}
                  />
                )}
                {title && (
                  <Text style={styles.buttonText}>
                    {title}
                  </Text>
                )}
              </>
            )}
          </View>
        </BlurView>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Media Preview Item
const MediaPreviewItem = ({ item, index, onRemove, loading }) => (
  <View style={styles.mediaPreviewItem}>
    <Image source={{ uri: item.mediaUrl }} style={styles.mediaImage} />
    {!loading && (
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(index)}
        activeOpacity={0.7}
      >
        <BlurView intensity={80} tint="light" style={styles.removeButtonBlur}>
          <Ionicons name="close" size={16} color="#FF3B30" />
        </BlurView>
      </TouchableOpacity>
    )}
    {item.mediaType === 'video' && (
      <View style={styles.videoIndicator}>
        <BlurView intensity={60} tint="dark" style={styles.videoIndicatorBlur}>
          <Ionicons name="play" size={20} color="white" />
        </BlurView>
      </View>
    )}
  </View>
);

const CreatePostForm = ({ familyId, onPostCreated, onCancel }) => {
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleMediaSelected = (selectedMedia) => {
    if (!selectedMedia || selectedMedia.length === 0) return;
    
    setMediaItems(prev => {
      const newItems = [...prev];
      selectedMedia.forEach(item => {
        if (item.success && item.fileUrl) {
          newItems.push({
            id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            mediaUrl: item.fileUrl,
            mediaType: item.type?.startsWith('video/') ? 'video' : 'image',
            mediaKey: item.key,
            uploadId: item.uploadId,
          });
        }
      });
      return newItems;
    });
  };

  const handleRemoveMedia = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!caption.trim() && mediaItems.length === 0) {
      setError('Please enter a caption or add media.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const postData = { caption: caption.trim() };

      if (mediaItems.length) {
        postData.media = mediaItems.map(m => ({
          uploadId: m.uploadId,
          url: m.mediaUrl,
          type: m.mediaType,
        }));
      }

      const response = await createPost(familyId, postData);

      if (onPostCreated) {
        onPostCreated(response);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const isPostDisabled = (!caption.trim() && mediaItems.length === 0) || loading;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View 
        style={[
          styles.formContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          }
        ]}
      >
        <BlurView intensity={95} tint="light" style={styles.card}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)']}
            style={styles.cardHighlight}
          />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Post</Text>
            <TouchableOpacity 
              onPress={onCancel} 
              disabled={loading}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <BlurView intensity={60} tint="light" style={styles.closeButtonBlur}>
                <Ionicons name="close" size={20} color="#1C1C1E" />
              </BlurView>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Caption Input */}
            <View style={styles.inputSection}>
              <BlurView 
                intensity={70} 
                tint="light" 
                style={[
                  styles.inputContainer,
                  isFocused && styles.inputFocused
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)']}
                  style={styles.inputHighlight}
                />
                <TextInput
                  placeholder="What's on your mind?"
                  placeholderTextColor="rgba(28, 28, 30, 0.5)"
                  value={caption}
                  onChangeText={setCaption}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  multiline={true}
                  style={styles.captionInput}
                  maxLength={500}
                />
              </BlurView>
              <Text style={styles.characterCount}>{caption.length}/500</Text>
            </View>

            {/* Media Preview */}
            {mediaItems.length > 0 && (
              <View style={styles.mediaSection}>
                <Text style={styles.sectionTitle}>Media ({mediaItems.length}/4)</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mediaPreviewContainer}
                >
                  {mediaItems.map((item, index) => (
                    <MediaPreviewItem
                      key={item.id || index}
                      item={item}
                      index={index}
                      onRemove={handleRemoveMedia}
                      loading={loading}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <BlurView intensity={80} tint="light" style={styles.errorBlur}>
                  <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                  <Text style={styles.errorText}>{error}</Text>
                </BlurView>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <LiquidGlassButton
                title={mediaItems.length > 0 ? 'Add More Media' : 'Add Photos & Videos'}
                icon="images-outline"
                onPress={() => setShowMediaPicker(true)}
                disabled={loading || mediaItems.length >= 4}
                variant="secondary"
                style={styles.mediaButton}
              />

              <LiquidGlassButton
                title="Post to Family"
                icon="send"
                onPress={handlePost}
                disabled={isPostDisabled}
                loading={loading}
                variant="primary"
                style={styles.postButton}
              />
            </View>
          </ScrollView>
        </BlurView>

        <MediaPickerModal
          visible={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onMediaSelected={handleMediaSelected}
          allowMultiple={true}
          showVideos={true}
          maxItems={4 - mediaItems.length}
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    maxHeight: '85%',
  },
  cardHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '40%',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonBlur: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  
  // Content
  scrollContent: {
    padding: 24,
  },
  
  // Input Section
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 120,
  },
  inputFocused: {
    borderColor: 'rgba(0, 122, 255, 0.4)',
    borderWidth: 1.5,
  },
  inputHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '30%',
  },
  captionInput: {
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    padding: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: 'rgba(28, 28, 30, 0.6)',
    textAlign: 'right',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  
  // Media Section
  mediaSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  mediaPreviewContainer: {
    paddingVertical: 8,
  },
  mediaPreviewItem: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  removeButtonBlur: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  videoIndicatorBlur: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Error
  errorContainer: {
    marginBottom: 24,
  },
  errorBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    marginLeft: 8,
    flex: 1,
  },
  
  // Actions
  actionsContainer: {
    gap: 16,
  },
  mediaButton: {
    marginBottom: 0,
  },
  postButton: {
    marginBottom: 0,
  },
  
  // Button Styles
  buttonContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonBlur: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  buttonHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  buttonGlassHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '40%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    color: '#FFFFFF',
  },
  disabledContainer: {
    opacity: 0.4,
  },
});

export default CreatePostForm;