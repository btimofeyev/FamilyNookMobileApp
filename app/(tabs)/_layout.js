import React, { useState, useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import CustomTabIcon from '../components/CustomTabIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  // State to hold the layout of each tab. Initialize with nulls.
  const [tabLayouts, setTabLayouts] = useState(Array(state.routes.length).fill(null));
  const slideAnim = useRef(new Animated.Value(0)).current;

  // This effect runs when the active tab (state.index) or the layouts change.
  useEffect(() => {
    // Find the layout for the currently active tab.
    const activeLayout = tabLayouts[state.index];
    // **FIX**: Only run the animation if the layout for the active tab has been measured.
    if (activeLayout) {
      Animated.spring(slideAnim, {
        toValue: activeLayout.x, // Animate to the x position of the active tab
        useNativeDriver: false,
        bounciness: 6,
        speed: 10,
      }).start();
    }
  }, [state.index, tabLayouts]);

  // Safely calculate the pill's width. Default to 0 if layout isn't ready.
  const pillWidth = tabLayouts[state.index]?.width * 0.8 ?? 0;

  return (
    <BlurView tint="systemUltraThinMaterialLight" intensity={95} style={[styles.tabBarContainer, { height: 85 + insets.bottom }]}>
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.95)', 
          'rgba(255, 255, 255, 0.8)'
        ]}
        style={styles.tabBarHighlight}
      />
      {/* The single animated pill that slides */}
      <Animated.View
        style={[
          styles.slidingPill,
          {
            width: pillWidth,
            transform: [{ translateX: slideAnim }],
            // Center the pill within the tab's width
            left: tabLayouts[state.index] ? (tabLayouts[state.index].width * 0.1) : 0,
          },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(125, 211, 252, 0.8)', 
            'rgba(125, 211, 252, 0.6)'
          ]}
          style={styles.pillGradient}
        />
      </Animated.View>

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabItem}
            // **FIX**: The onLayout handler now safely updates the array of layouts.
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setTabLayouts(currentLayouts => {
                const newLayouts = [...currentLayouts];
                newLayouts[index] = { x, width };
                return newLayouts;
              });
            }}
          >
            <CustomTabIcon
              source={options.tabBarIcon.source}
              focused={isFocused}
              size={30}
            />
          </TouchableOpacity>
        );
      })}
    </BlurView>
  );
}

// Main Layout Component
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
          headerShown: false,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: { source: require('../../assets/icons/feed-icon.png') },
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          tabBarIcon: { source: require('../../assets/icons/memories-icon1.png') },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: { source: require('../../assets/icons/profile-icon.png') },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: { source: require('../../assets/icons/notifications-icon.png') },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 16,
  },
  tabBarHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
  },
  slidingPill: {
    position: 'absolute',
    top: 18,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.4)',
    overflow: 'hidden',
    shadowColor: 'rgba(125, 211, 252, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  pillGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});