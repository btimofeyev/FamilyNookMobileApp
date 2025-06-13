import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, Platform, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const FloatingCreateButton = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 25,
      }),
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 25,
      }),
      Animated.timing(rippleAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(screens)/create-post');
  };

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 0],
  });

  return (
    <View style={styles.buttonContainer}>
      <Animated.View 
        style={[
          styles.buttonWrapper,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        {/* Ripple Effect */}
        <Animated.View
          style={[
            styles.rippleEffect,
            {
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            }
          ]}
        />
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <BlurView intensity={95} tint="light" style={styles.buttonBlur}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)']}
              style={styles.buttonHighlight}
            />
            
            {/* Inner glow effect */}
            <LinearGradient
              colors={['rgba(0, 122, 255, 0.8)', 'rgba(0, 122, 255, 0.6)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBackground}
            >
              <Ionicons 
                name="add" 
                size={24} 
                color="#FFFFFF" 
                style={styles.icon} 
              />
            </LinearGradient>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    right: 24,
    width: 56,
    height: 56,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonWrapper: {
    position: 'relative',
  },
  rippleEffect: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  buttonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  buttonHighlight: {
    position: 'absolute',
    top: 1.5,
    left: 1.5,
    right: 1.5,
    height: '60%',
  },
  iconBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default FloatingCreateButton;