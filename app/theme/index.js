// app/theme/index.js - FamilyNook Design System
import { Platform } from 'react-native';

export const Colors = {
  // Primary Colors
  primary: '#4CC2C4',        // Teal - Main brand color
  primaryDark: '#3BAFBC',    // Darker teal for interactions
  secondary: '#F0C142',      // Golden Yellow - Secondary brand
  
  // Accent Colors
  accent: '#00d2ff',         // Bright cyan for highlights
  accentGradient: ['#00d2ff', '#3a7bd5'], // Gradient colors
  
  // Feedback Colors
  success: '#30D158',        // Green
  warning: '#FFD60A',        // Yellow
  error: '#FF453A',          // Red (iOS standard)
  love: '#FF3B30',          // Red for hearts/likes
  
  // Text Colors
  text: {
    primary: '#F5F5F7',      // Primary white text
    secondary: '#AEAEB2',    // Secondary gray text
    tertiary: '#8E8E93',     // Tertiary gray text
    dark: '#1C1C1E',         // Dark text for light backgrounds
    placeholder: 'rgba(60, 60, 67, 0.6)',
  },
  
  // Background Colors
  background: {
    primary: '#121212',      // Main dark background
    secondary: '#1E1E1E',    // Secondary dark background
    card: 'rgba(18, 18, 18, 0.9)', // Card background
    modal: 'rgba(28, 28, 30, 0.95)', // Modal background
    gradient: ['#0f2027', '#203a43', '#2c5364'], // Main gradient
  },
  
  // Glass Morphism Colors
  glass: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.2)',
    strong: 'rgba(255, 255, 255, 0.3)',
    border: 'rgba(255, 255, 255, 0.15)',
    highlight: ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.1)'],
  },
  
  // Surface Colors
  surface: {
    primary: 'rgba(44, 44, 46, 0.8)',
    secondary: 'rgba(58, 58, 60, 0.8)',
    elevated: 'rgba(68, 68, 70, 0.9)',
    border: 'rgba(84, 84, 88, 0.5)',
  }
};

export const Typography = {
  fonts: {
    display: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    text: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    rounded: Platform.OS === 'ios' ? 'SF Pro Rounded' : 'System',
  },
  
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
    '6xl': 42,
  },
  
  weights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  }
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 50,
  card: 35, // Signature PostCard radius
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
  },
  colored: {
    shadowColor: '#00a2ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 16,
  }
};

export const BlurIntensity = {
  subtle: 10,
  light: 20,
  medium: 60,
  strong: 80,
  heavy: 95,
  max: 100,
};

export const Animations = {
  spring: {
    useNativeDriver: true,
    bounciness: 6,
    speed: 10,
  },
  timing: {
    useNativeDriver: true,
    duration: 200,
  },
  scale: {
    pressed: 0.95,
    normal: 1.0,
    emphasized: 1.05,
  }
};

// Helper functions for consistent styling
export const createGlassStyle = (intensity = BlurIntensity.medium, tint = 'light') => ({
  overflow: 'hidden',
  backgroundColor: 'transparent',
});

export const createCardStyle = (variant = 'default') => {
  const baseStyle = {
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.glass.border,
  };
  
  switch (variant) {
    case 'elevated':
      return { ...baseStyle, ...Shadows.xl };
    case 'subtle':
      return { ...baseStyle, ...Shadows.sm };
    default:
      return { ...baseStyle, ...Shadows.lg };
  }
};

export const createButtonStyle = (variant = 'primary', size = 'md') => {
  const baseStyle = {
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  };
  
  const sizeStyles = {
    sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
    md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
    lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing['2xl'] },
  };
  
  const variantStyles = {
    primary: {
      backgroundColor: Colors.secondary,
    },
    secondary: {
      backgroundColor: Colors.primary,
    },
    glass: {
      backgroundColor: Colors.glass.medium,
      borderWidth: 1,
      borderColor: Colors.glass.border,
    },
  };
  
  return {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...Shadows.md,
  };
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  BlurIntensity,
  Animations,
  createGlassStyle,
  createCardStyle,
  createButtonStyle,
};