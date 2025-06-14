// app/components/LoadingIndicator.js
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoadingIndicator({ text = 'Loading...', showText = true }) {
  return (
    <View style={styles.container}>
      <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.card}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.8)', 
            'rgba(255, 255, 255, 0.4)'
          ]}
          style={styles.cardHighlight}
        />
        
        <ActivityIndicator size="large" color="#7dd3fc" style={styles.indicator} />
        
        {showText && (
          <Text style={styles.text}>{text}</Text>
        )}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    minWidth: 160,
  },
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  indicator: {
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});