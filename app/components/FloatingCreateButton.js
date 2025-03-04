// components/FloatingCreateButton.js
import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const FloatingCreateButton = ({ onPress, allowedScreens = ['/feed'], iconName = 'add' }) => {
  const pathname = usePathname();
  
  // Only render button on allowed screens
  const shouldShow = allowedScreens.some(screen => pathname.includes(screen));
  if (!shouldShow) {
    return null;
  }
  
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onPress) {
      onPress();
    }
  };

  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity 
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={10} tint="light" style={styles.blurEffect}>
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={26} color="#000000" />
            </View>
          </BlurView>
        ) : (
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={26} color="#000000" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    zIndex: 1000,
    elevation: 10, // For Android
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#F0C142',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  blurEffect: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 193, 66, 0.85)', // Slightly transparent gold color
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : undefined,
  }
});

export default FloatingCreateButton;