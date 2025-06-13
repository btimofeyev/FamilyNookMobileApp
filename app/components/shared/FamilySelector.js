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
        ...Animations.spring,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: screenHeight,
        ...Animations.spring,
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
    >
      {/* Backdrop */}
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleBackdropPress}
      >
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableOpacity>

      {/* Modal Content */}
      <Animated.View 
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <BlurView intensity={BlurIntensity.heavy} tint="systemUltraThinMaterialLight" style={styles.modalBlur}>
          {/* Gradient highlight */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.modalHighlight}
          />

          {/* Handle indicator */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Family</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <BlurView intensity={40} tint="light" style={styles.closeButtonBlur}>
                <Ionicons name="close" size={20} color={Colors.text.dark} />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Family List */}
          <ScrollView 
            style={styles.familyList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.familyListContent}
          >
            {families.map((family) => {
              const isSelected = selectedFamily?.family_id === family.family_id;
              
              return (
                <TouchableOpacity
                  key={family.family_id}
                  style={styles.familyItem}
                  onPress={() => handleFamilySelect(family)}
                  activeOpacity={1}
                >
                  <BlurView 
                    intensity={isSelected ? 60 : 30} 
                    tint="light" 
                    style={[
                      styles.familyItemBlur,
                      isSelected && styles.selectedFamilyBlur
                    ]}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={[`${Colors.primary}30`, `${Colors.primary}10`]}
                        style={styles.selectedGradient}
                      />
                    )}
                    
                    <View style={styles.familyContent}>
                      <View style={[
                        styles.familyIcon,
                        isSelected && styles.selectedFamilyIcon
                      ]}>
                        <Ionicons 
                          name="people" 
                          size={24} 
                          color={isSelected ? Colors.primary : Colors.text.secondary} 
                        />
                      </View>
                      
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
                      
                      {isSelected && (
                        <View style={styles.checkIcon}>
                          <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                        </View>
                      )}
                    </View>
                  </BlurView>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Empty State */}
          {families.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.text.secondary} />
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
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  
  modalBlur: {
    flex: 1,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomWidth: 0,
  },
  
  modalHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
  },
  
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.text.placeholder,
    borderRadius: 2,
    opacity: 0.6,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.display,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.dark,
    letterSpacing: -0.3,
  },
  
  closeButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  
  closeButtonBlur: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  familyList: {
    flex: 1,
  },
  
  familyListContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  
  familyItem: {
    marginBottom: Spacing.md,
  },
  
  familyItemBlur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  selectedFamilyBlur: {
    borderColor: `${Colors.primary}40`,
  },
  
  selectedGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  familyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    position: 'relative',
    zIndex: 1,
  },
  
  familyIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  
  selectedFamilyIcon: {
    backgroundColor: `${Colors.primary}20`,
  },
  
  familyInfo: {
    flex: 1,
  },
  
  familyName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.text,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.dark,
    letterSpacing: -0.2,
    marginBottom: Spacing.xs,
  },
  
  selectedFamilyName: {
    color: Colors.primary,
  },
  
  familyMembers: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.text,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
    letterSpacing: -0.1,
  },
  
  checkIcon: {
    marginLeft: Spacing.md,
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing.xl,
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
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * 1.4,
  },
});

export default FamilySelector;