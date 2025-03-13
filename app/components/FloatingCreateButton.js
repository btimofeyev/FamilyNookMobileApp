// components/FloatingCreateButton.js
import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

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
          <LinearGradient
            colors={['#1E2B2F', '#3BAFBC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <BlurView intensity={10} tint="dark" style={styles.blurEffect}>
              <View style={styles.iconContainer}>
                <Ionicons name={iconName} size={26} color="#F5F5F7" />
              </View>
            </BlurView>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={['#1E2B2F', '#3BAFBC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={26} color="#F5F5F7" />
            </View>
          </LinearGradient>
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
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurEffect: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  }
});

export default FloatingCreateButton;