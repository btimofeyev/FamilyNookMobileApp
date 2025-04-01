// app/(screens)/about.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  Platform,
  Image
} from 'react-native';
import { Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'About FamlyNook',
          headerStyle: {
            backgroundColor: '#1E2B2F'
          },
          headerTintColor: '#F5F5F7',
          headerShown: true
        }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BlurView intensity={10} tint="dark" style={styles.card}>
          {/* Logo and app name */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#3BAFBC', '#1E2B2F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBackground}
            >
              <Text style={styles.logoText}>F</Text>
            </LinearGradient>
            <Text style={styles.appName}>FamlyNook</Text>
          </View>
          
          <Text style={styles.version}>Version 1.0.0</Text>
          
          <Text style={styles.sectionTitle}>Our Mission</Text>
          
          <Text style={styles.paragraph}>
            In today's fast-paced world, maintaining close family ties can be challenging, especially when members are spread across different locations. FamlyNook was created to bridge the gap between digital interaction and genuine family relationships, providing a sanctuary from the noise and distractions of traditional social media platforms.
          </Text>
          
          <Text style={styles.paragraph}>
            Founded on the principles of intimacy, privacy, and meaningful engagement, FamlyNook serves as your family's cozy corner on the internet—a place to stay connected, share memories, and build a legacy together. Our platform is designed with a deep understanding of family dynamics and the importance of preserving those precious moments that define our lives.
          </Text>
          
          <Text style={styles.sectionTitle}>Our Philosophy</Text>
          
          <Text style={styles.paragraph}>
            At FamlyNook, we believe that social media should enhance relationships, not detract from them. We've stripped away the complexities and clutter of typical social networks to focus on what truly matters—helping you and your loved ones stay close, no matter the physical distance. Here, you won't find endless feeds filled with advertisements or irrelevant content. Instead, you'll discover a focused environment tailored to foster genuine interactions and nurture the bonds that are most important to you.
          </Text>
          
          <Text style={styles.paragraph}>
            Whether it's planning a family reunion, sharing the joy of a newborn, or reminiscing over old photographs, FamlyNook ensures these experiences are not only shared but cherished. By prioritizing privacy, we create a safe space where your family can communicate freely and securely. With FamlyNook, every member—from the youngest to the oldest—has a voice and a place in your family's digital home.
          </Text>
          
          <Text style={styles.paragraph}>
            Join us at FamlyNook, where family comes first and every connection is a step towards a stronger, more united future. Together, let's keep the essence of family alive in the digital age.
          </Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Our Team</Text>
          
          <Text style={styles.teamText}>
            FamlyNook was created by a passionate team of designers and developers who believe in the power of family connections.
          </Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.copyrightText}>
            © 2024 FamlyNook. All rights reserved.
          </Text>
        </BlurView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.9)', // Fallback color
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F5F5F7',
    marginTop: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  version: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3BAFBC',
    marginTop: 24,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  paragraph: {
    fontSize: 16,
    color: '#F5F5F7',
    marginBottom: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(84, 84, 88, 0.2)',
    marginVertical: 25,
  },
  teamText: {
    fontSize: 16,
    color: '#F5F5F7',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  copyrightText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  }
});