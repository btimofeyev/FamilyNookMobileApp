import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Shadows, BlurIntensity, createCardStyle } from '../../theme';

const GlassCard = ({ 
  children, 
  intensity = BlurIntensity.strong,
  tint = 'light',
  variant = 'default',
  style,
  showHighlight = true,
  ...props 
}) => {
  const cardStyle = createCardStyle(variant);
  
  return (
    <View style={[cardStyle, style]} {...props}>
      <BlurView intensity={intensity} tint={tint} style={styles.blurContainer}>
        {showHighlight && (
          <LinearGradient
            colors={Colors.glass.highlight}
            style={styles.highlight}
          />
        )}
        <View style={styles.content}>
          {children}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: 1.5,
    left: 1.5,
    right: 1.5,
    height: '60%',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

export default GlassCard;