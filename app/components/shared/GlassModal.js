import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../theme';

const { height: screenHeight } = Dimensions.get('window');

const GlassModal = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  headerIcon,
  closeIcon = 'close',
  animationType = 'slide',
  height = 0.75,
  showHeader = true,
  style,
  contentStyle,
  ...props
}) => {
  const modalHeight = screenHeight * height;

  return (
    <Modal
      animationType={animationType}
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      {...props}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={BlurIntensity.max} tint="dark" style={styles.backdrop}>
          <TouchableOpacity
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={onClose}
          />
        </BlurView>

        <SafeAreaView style={[styles.modalContent, { height: modalHeight }, style]}>
          {showHeader && (
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {headerIcon && (
                  <Ionicons 
                    name={headerIcon} 
                    size={24} 
                    color={Colors.text.primary} 
                  />
                )}
                <View style={headerIcon ? styles.headerTextWithIcon : {}}>
                  <Text style={styles.headerTitle}>{title}</Text>
                  {subtitle && (
                    <Text style={styles.headerSubtitle}>{subtitle}</Text>
                  )}
                </View>
              </View>
              
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name={closeIcon} size={28} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.contentContainer, contentStyle]}>
            {children}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropTouch: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: Colors.background.modal,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.glass.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.border,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextWithIcon: {
    marginLeft: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fonts.display,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    fontFamily: Typography.fonts.text,
  },
  closeButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
});

export default GlassModal;