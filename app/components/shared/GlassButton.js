import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, createButtonStyle, BlurIntensity, Animations } from '../../theme';

const GlassButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconSize = 20,
  loading = false,
  disabled = false,
  style,
  textStyle,
  haptic = true,
  gradientColors,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const buttonStyle = createButtonStyle(variant, size);

  const handlePressIn = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scaleAnim, {
      toValue: Animations.scale.pressed,
      ...Animations.spring,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: Animations.scale.normal,
      ...Animations.spring,
    }).start();
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  const renderContent = () => {
    if (variant === 'glass') {
      return (
        <BlurView intensity={BlurIntensity.medium} tint="light" style={styles.blurView}>
          <ButtonContent />
        </BlurView>
      );
    }

    if (gradientColors || variant === 'primary' || variant === 'secondary') {
      const colors = gradientColors || 
        (variant === 'primary' ? [Colors.secondary, Colors.secondary] : 
         variant === 'secondary' ? [Colors.primary, Colors.primaryDark] : 
         Colors.accentGradient);
      
      return (
        <LinearGradient colors={colors} style={styles.gradient}>
          <ButtonContent />
        </LinearGradient>
      );
    }

    return <ButtonContent />;
  };

  const ButtonContent = () => (
    <>
      {icon && (
        <Ionicons 
          name={icon} 
          size={iconSize} 
          color={getTextColor()} 
          style={title ? { marginRight: 8 } : {}} 
        />
      )}
      {title && (
        <Text style={[getTextStyle(), textStyle]}>
          {title}
        </Text>
      )}
    </>
  );

  const getTextColor = () => {
    if (disabled) return Colors.text.tertiary;
    if (variant === 'glass') return Colors.text.dark;
    return variant === 'primary' ? Colors.text.dark : Colors.text.primary;
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      fontFamily: Typography.fonts.text,
      fontWeight: Typography.weights.semibold,
      color: getTextColor(),
    };

    const sizeStyles = {
      sm: { fontSize: Typography.sizes.sm },
      md: { fontSize: Typography.sizes.base },
      lg: { fontSize: Typography.sizes.lg },
    };

    return { ...baseTextStyle, ...sizeStyles[size] };
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        style={[buttonStyle, disabled && styles.disabled]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        {...props}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  blurView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GlassButton;