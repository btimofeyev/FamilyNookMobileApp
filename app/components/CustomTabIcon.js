import React from 'react';
import { Image, StyleSheet, Animated } from 'react-native';

const CustomTabIcon = ({
  source,
  focused,
  size = 28, // Slightly larger for better visibility
  opacity = 0.6, // Opacity for unfocused state
}) => {

  return (
    <Animated.View style={[styles.iconContainer]}>
      <Image
        source={source}
        style={[
          styles.icon,
          {
            width: size,
            height: size,
            opacity: focused ? 1.0 : opacity, // Use opacity for focus state
          }
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  icon: {
    // Base styles for the icon
  }
});

export default CustomTabIcon;