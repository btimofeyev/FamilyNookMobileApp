// app/components/CustomTabIcon.js
import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

const CustomTabIcon = ({ 
  focusedSource,    // Image for when tab is active
  unfocusedSource,  // Image for when tab is inactive
  source,           // Single image source (no tinting - shows original colors)
  focused, 
  size = 24, 
  focusedTintColor = '#3BAFBC', 
  unfocusedTintColor = '#8E8E93',
  useTinting = false, // Changed default to false to show colorful images
  opacity = 0.6       // Opacity for unfocused state when not using tinting
}) => {
  // If using different images for focused/unfocused states
  if (!useTinting && focusedSource && unfocusedSource) {
    return (
      <View style={styles.iconContainer}>
        <Image
          source={focused ? focusedSource : unfocusedSource}
          style={[
            styles.icon,
            {
              width: size,
              height: size,
            }
          ]}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Show colorful images with opacity change for focus state (no tinting)
  if (!useTinting && source) {
    return (
      <View style={styles.iconContainer}>
        <Image
          source={source}
          style={[
            styles.icon,
            {
              width: size,
              height: size,
              opacity: focused ? 1.0 : opacity, // Use opacity instead of tinting
            }
          ]}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Fallback: tinting behavior (for monochrome icons)
  return (
    <View style={styles.iconContainer}>
      <Image
        source={source}
        style={[
          styles.icon,
          {
            width: size,
            height: size,
            tintColor: focused ? focusedTintColor : unfocusedTintColor,
          }
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  icon: {
    // Base styles for the icon
  }
});

export default CustomTabIcon;