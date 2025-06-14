import { Platform } from 'react-native';

export const Colors = {
  primary: '#7dd3fc',        // Soft blue - our main brand color
  primaryDark: '#60a5fa',    // Darker variant for depth
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  background: {
    primary: '#f0f9ff',       // Very light blue
    secondary: '#e0f2fe',     // Light sky blue
    tertiary: '#bae6fd',      // Medium blue
    quaternary: '#f8faff',    // Alternative very light blue
    dark: '#1E2B2F',
    modal: 'rgba(255, 255, 255, 0.95)',
  },
  
  text: {
    primary: '#1C1C1E',
    secondary: 'rgba(28, 28, 30, 0.7)',
    tertiary: 'rgba(28, 28, 30, 0.5)',
    placeholder: 'rgba(31, 41, 55, 0.5)',
    dark: '#0f172a',          // Slightly softer dark
    light: '#FFFFFF',
  },
  
  glass: {
    // Core glass colors for borders and overlays
    border: 'rgba(255, 255, 255, 0.3)',
    borderFocused: 'rgba(255, 255, 255, 0.4)',
    borderActive: 'rgba(125, 211, 252, 0.4)',
    
    // Highlight gradients for liquid glass effect
    highlight: [
      'rgba(255, 255, 255, 0.4)',
      'rgba(255, 255, 255, 0.1)',
      'rgba(255, 255, 255, 0.3)'
    ],
    highlightStrong: [
      'rgba(255, 255, 255, 0.8)',
      'rgba(255, 255, 255, 0.4)'
    ],
    highlightSubtle: [
      'rgba(255, 255, 255, 0.3)',
      'rgba(255, 255, 255, 0.05)'
    ],
    
    // Background overlays
    overlay: 'rgba(255, 255, 255, 0.1)',
    overlayStrong: 'rgba(255, 255, 255, 0.4)',
    overlaySubtle: 'rgba(255, 255, 255, 0.05)',
    
    // Shadow colors for depth
    shadow: 'rgba(0, 0, 0, 0.08)',
    shadowStrong: 'rgba(0, 0, 0, 0.1)',
    shadowColored: 'rgba(125, 211, 252, 0.3)',
    shadowButton: 'rgba(15, 23, 42, 0.3)',
  },
  
  // Semantic colors
  like: '#FF3B30',
  comment: '#1C1C1E',
  share: '#1C1C1E',
  notification: '#FF3B30',
  
  // Liquid glass gradients
  accentGradient: ['#7dd3fc', '#60a5fa'],
  primaryGradient: ['#7dd3fc', '#60a5fa'],
  secondaryGradient: ['#5856D6', '#AF52DE'],
  backgroundGradient: ['#e0f2fe', '#bae6fd', '#7dd3fc'],
  cardGradient: [
    'rgba(255, 255, 255, 0.4)',
    'rgba(255, 255, 255, 0.1)', 
    'rgba(255, 255, 255, 0.3)'
  ],
  buttonGradient: [
    'rgba(15, 23, 42, 0.9)', 
    'rgba(30, 41, 59, 0.9)'
  ],
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
  input: 25, // Standard input radius
  button: 22, // Standard button radius
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
  },
  
  // Liquid Glass specific shadows
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  glassStrong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
  },
  glassColored: {
    shadowColor: '#7dd3fc',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  glassButton: {
    shadowColor: 'rgba(15, 23, 42, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  }
};

export const BlurIntensity = {
  subtle: 10,
  light: 20,
  medium: 60,
  strong: 80,
  heavy: 95,
  max: 100,
  
  // Liquid Glass specific intensities
  glassSubtle: 80,
  glass: 90,
  glassStrong: 100,
  glassHeavy: 120,
  
  // Input and component specific
  input: 80,
  inputFocused: 120,
  card: 90,
  modal: 100,
  backdrop: 25,
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
  timingSlow: {
    useNativeDriver: true,
    duration: 300,
  },
  timingFast: {
    useNativeDriver: true,
    duration: 150,
  },
  scale: {
    pressed: 0.95,
    normal: 1.0,
    emphasized: 1.05,
  },
  
  // Liquid Glass specific animations
  liquid: {
    useNativeDriver: false, // For border radius and shadow animations
    duration: 200,
    easing: 'ease-out',
  },
  liquidSpring: {
    useNativeDriver: true,
    tension: 300,
    friction: 25,
  }
};

// Helper functions for consistent styling
export const createGlassStyle = (intensity = BlurIntensity.glass, tint = 'light') => ({
  overflow: 'hidden',
  backgroundColor: 'transparent',
  borderWidth: 1.5,
  borderColor: Colors.glass.border,
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
      return { ...baseStyle, ...Shadows.glassStrong };
    case 'subtle':
      return { ...baseStyle, ...Shadows.glass };
    case 'colored':
      return { 
        ...baseStyle, 
        ...Shadows.glassColored,
        borderColor: Colors.glass.borderActive,
      };
    default:
      return { ...baseStyle, ...Shadows.glass };
  }
};

export const createInputStyle = (focused = false, error = false) => ({
  borderRadius: BorderRadius.input,
  overflow: 'hidden',
  borderWidth: 1.5,
  borderColor: error 
    ? Colors.error 
    : focused 
      ? Colors.glass.borderFocused 
      : Colors.glass.border,
  ...Shadows.glass,
});

export const createButtonStyle = (variant = 'primary') => {
  const baseStyle = {
    borderRadius: BorderRadius.button,
    overflow: 'hidden',
    borderWidth: 1.5,
  };
  
  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        borderColor: Colors.glass.borderActive,
        ...Shadows.glassColored,
      };
    case 'secondary':
      return {
        ...baseStyle,
        borderColor: Colors.glass.border,
        ...Shadows.glass,
      };
    case 'ghost':
      return {
        ...baseStyle,
        borderColor: Colors.glass.borderFocused,
        ...Shadows.glass,
      };
    default:
      return { ...baseStyle, ...Shadows.glass };
  }
};

// Liquid Glass Material Variants
export const LiquidGlassMaterials = {
  // Light materials for primary content
  light: {
    intensity: BlurIntensity.card,
    tint: 'systemUltraThinMaterialLight',
    highlight: Colors.glass.highlight,
    border: Colors.glass.border,
    shadow: Shadows.glass,
  },
  
  // Strong materials for floating elements
  lightStrong: {
    intensity: BlurIntensity.glassStrong,
    tint: 'systemUltraThinMaterialLight',
    highlight: Colors.glass.highlightStrong,
    border: Colors.glass.borderFocused,
    shadow: Shadows.glassStrong,
  },
  
  // Subtle materials for background elements
  lightSubtle: {
    intensity: BlurIntensity.glassSubtle,
    tint: 'light',
    highlight: Colors.glass.highlightSubtle,
    border: Colors.glass.border,
    shadow: Shadows.glass,
  },
  
  // Active/focused materials
  active: {
    intensity: BlurIntensity.inputFocused,
    tint: 'light',
    highlight: Colors.glass.highlightStrong,
    border: Colors.glass.borderActive,
    shadow: Shadows.glassColored,
  },
  
  // Input materials
  input: {
    intensity: BlurIntensity.input,
    tint: 'light',
    highlight: Colors.glass.highlight,
    border: Colors.glass.border,
    shadow: Shadows.glass,
  },
  
  // Button materials
  button: {
    intensity: BlurIntensity.input,
    tint: 'dark',
    highlight: Colors.buttonGradient,
    border: Colors.glass.borderActive,
    shadow: Shadows.glassButton,
  }
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
  createInputStyle,
  createButtonStyle,
  LiquidGlassMaterials,
};