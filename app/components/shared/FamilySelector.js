import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFamily } from '../../../context/FamilyContext';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity, Animations } from '../../theme';

const { height: screenHeight } = Dimensions.get('window');

const FamilySelector = ({ visible, onClose }) => {
  const { families, selectedFamily, switchFamily, loading } = useFamily();
  const [slideAnim] = useState(new Animated.Value(screenHeight));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 30,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleFamilySelect = async (family) => {
    if (family.family_id === selectedFamily?.family_id) {
      onClose();
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await switchFamily(family);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Error switching family:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleBackdropPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Backdrop - Much lighter */}
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleBackdropPress}
      >
        <BlurView 
          intensity={Platform.OS === 'ios' ? 25 : 20} 
          tint="dark" 
          style={StyleSheet.absoluteFill} 
        />
      </TouchableOpacity>

      {/* Modal Content - iPhone Style */}
      <Animated.View 
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <BlurView 
          intensity={Platform.OS === 'ios' ? 95 : 90} 
          tint="systemUltraThinMaterialLight" 
          style={styles.modalBlur}
        >
          {/* Soft blue accent highlight */}
          <LinearGradient
            colors={[
              'rgba(224, 242, 254, 0.95)', // Soft blue from login theme
              'rgba(186, 230, 253, 0.90)',
              'rgba(125, 211, 252, 0.85)'
            ]}
            style={styles.modalHighlight}
          />

          {/* Handle indicator - more subtle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header - cleaner */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Family</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <BlurView 
                intensity={Platform.OS === 'ios' ? 85 : 80} 
                tint="light" 
                style={styles.closeButtonBlur}
              >
                <Ionicons 
                  name="close" 
                  size={Platform.OS === 'android' ? 18 : 20} 
                  color="rgba(28, 28, 30, 0.8)" 
                />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Family List - much cleaner items */}
          <ScrollView 
            style={styles.familyList}
            contentContainerStyle={styles.familyListContent}
            showsVerticalScrollIndicator={false}
          >
            {families.map((family, index) => {
              const isSelected = family.family_id === selectedFamily?.family_id;
              
              return (
                <TouchableOpacity
                  key={family.family_id}
                  style={styles.familyItem}
                  onPress={() => handleFamilySelect(family)}
                  activeOpacity={0.8}
                >
                  <BlurView 
                    intensity={Platform.OS === 'ios' ? 90 : 85} 
                    tint="systemUltraThinMaterialLight" 
                    style={[
                      styles.familyItemBlur,
                      isSelected && styles.selectedFamilyBlur
                    ]}
                  >
                    {/* Soft blue selection gradient */}
                    {isSelected && (
                      <LinearGradient
                        colors={[
                          'rgba(125, 211, 252, 0.12)', // Soft blue accent
                          'rgba(186, 230, 253, 0.08)',
                          'rgba(224, 242, 254, 0.06)'
                        ]}
                        style={styles.selectedGradient}
                      />
                    )}
                    
                    <View style={styles.familyContent}>
                      {/* Family Icon - cleaner */}
                      <View style={[
                        styles.familyIcon,
                        isSelected && styles.selectedFamilyIcon
                      ]}>
                        <Ionicons 
                          name="people" 
                          size={Platform.OS === 'android' ? 22 : 24} 
                          color={isSelected ? Colors.primary : 'rgba(142, 142, 147, 0.8)'} 
                        />
                      </View>
                      
                      {/* Family Info */}
                      <View style={styles.familyInfo}>
                        <Text style={[
                          styles.familyName,
                          isSelected && styles.selectedFamilyName
                        ]}>
                          {family.family_name}
                        </Text>
                        <Text style={styles.familyMembers}>
                          {family.member_count || 0} members
                        </Text>
                      </View>
                      
                      {/* Check Icon - more subtle */}
                      {isSelected && (
                        <View style={styles.checkIcon}>
                          <BlurView 
                            intensity={Platform.OS === 'ios' ? 85 : 80} 
                            tint="light" 
                            style={styles.checkIconBlur}
                          >
                            <Ionicons 
                              name="checkmark" 
                              size={Platform.OS === 'android' ? 16 : 18} 
                              color="#7dd3fc" // Soft blue checkmark
                            />
                          </BlurView>
                        </View>
                      )}
                    </View>
                  </BlurView>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Empty State - cleaner */}
          {families.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons 
                  name="people-outline" 
                  size={Platform.OS === 'android' ? 40 : 48} 
                  color="rgba(142, 142, 147, 0.6)" 
                />
              </View>
              <Text style={styles.emptyTitle}>No Families Yet</Text>
              <Text style={styles.emptySubtitle}>Create or join a family to get started</Text>
            </View>
          )}
        </BlurView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: screenHeight * 0.7,
    borderTopLeftRadius: Platform.OS === 'android' ? 20 : 24,
    borderTopRightRadius: Platform.OS === 'android' ? 20 : 24,
    overflow: 'hidden',
  },
  
  modalBlur: {
    flex: 1,
    borderTopLeftRadius: Platform.OS === 'android' ? 20 : 24,
    borderTopRightRadius: Platform.OS === 'android' ? 20 : 24,
    borderWidth: Platform.OS === 'android' ? 0.5 : 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderBottomWidth: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  modalHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderTopLeftRadius: Platform.OS === 'android' ? 20 : 24,
    borderTopRightRadius: Platform.OS === 'android' ? 20 : 24,
  },
  
  handleContainer: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 10 : 12,
    paddingBottom: Platform.OS === 'android' ? 8 : 10,
  },
  
  handle: {
    width: Platform.OS === 'android' ? 36 : 40,
    height: Platform.OS === 'android' ? 3 : 4,
    backgroundColor: 'rgba(142, 142, 147, 0.4)',
    borderRadius: Platform.OS === 'android' ? 1.5 : 2,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingBottom: Platform.OS === 'android' ? 16 : 20,
  },
  
  title: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: Platform.OS === 'android' ? 0.2 : -0.3,
  },
  
  closeButton: {
    borderRadius: Platform.OS === 'android' ? 14 : 16,
    overflow: 'hidden',
  },
  
  closeButtonBlur: {
    width: Platform.OS === 'android' ? 28 : 32,
    height: Platform.OS === 'android' ? 28 : 32,
    borderRadius: Platform.OS === 'android' ? 14 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: Platform.OS === 'android' ? 0.5 : 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  familyList: {
    flex: 1,
  },
  
  familyListContent: {
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingBottom: Platform.OS === 'android' ? 32 : 40,
  },
  
  familyItem: {
    marginBottom: Platform.OS === 'android' ? 10 : 12,
  },
  
  familyItemBlur: {
    borderRadius: Platform.OS === 'android' ? 16 : 20,
    overflow: 'hidden',
    borderWidth: Platform.OS === 'android' ? 0.5 : 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  selectedFamilyBlur: {
    borderColor: 'rgba(125, 211, 252, 0.4)', // Soft blue border
  },
  
  selectedGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Platform.OS === 'android' ? 16 : 20,
  },
  
  familyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS === 'android' ? 16 : 20,
    position: 'relative',
    zIndex: 1,
  },
  
  familyIcon: {
    width: Platform.OS === 'android' ? 44 : 48,
    height: Platform.OS === 'android' ? 44 : 48,
    borderRadius: Platform.OS === 'android' ? 22 : 24,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'android' ? 12 : 16,
  },
  
  selectedFamilyIcon: {
    backgroundColor: 'rgba(125, 211, 252, 0.15)', // Soft blue background
  },
  
  familyInfo: {
    flex: 1,
  },
  
  familyName: {
    fontSize: Platform.OS === 'android' ? 16 : 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: Platform.OS === 'android' ? 0.1 : -0.2,
    marginBottom: Platform.OS === 'android' ? 3 : 4,
  },
  
  selectedFamilyName: {
    color: '#7dd3fc', // Soft blue text color
  },
  
  familyMembers: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
    color: 'rgba(28, 28, 30, 0.6)',
    letterSpacing: Platform.OS === 'android' ? 0.1 : -0.1,
  },
  
  checkIcon: {
    marginLeft: Platform.OS === 'android' ? 12 : 16,
  },
  
  checkIconBlur: {
    width: Platform.OS === 'android' ? 24 : 28,
    height: Platform.OS === 'android' ? 24 : 28,
    borderRadius: Platform.OS === 'android' ? 12 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: Platform.OS === 'android' ? 0.5 : 1,
    borderColor: 'rgba(125, 211, 252, 0.4)', // Soft blue border
    backgroundColor: 'rgba(125, 211, 252, 0.08)', // Soft blue background
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 40 : 48,
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
  },
  
  emptyIconContainer: {
    width: Platform.OS === 'android' ? 64 : 72,
    height: Platform.OS === 'android' ? 64 : 72,
    borderRadius: Platform.OS === 'android' ? 32 : 36,
    backgroundColor: 'rgba(142, 142, 147, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 16 : 20,
  },
  
  emptyTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: Platform.OS === 'android' ? 8 : 12,
    textAlign: 'center',
  },
  
  emptySubtitle: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '400',
    color: 'rgba(28, 28, 30, 0.6)',
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 20 : 22,
  },
});

export default FamilySelector;