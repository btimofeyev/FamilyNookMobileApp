// app/(screens)/terms-of-service.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  Platform
} from 'react-native';
import { Stack } from 'expo-router';
import { BlurView } from 'expo-blur';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Terms of Service',
          headerStyle: {
            backgroundColor: '#1E2B2F'
          },
          headerTintColor: '#F5F5F7',
          headerShown: true
        }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BlurView intensity={10} tint="dark" style={styles.card}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.lastUpdated}>Last Updated: March 2024</Text>
          
          <Text style={styles.paragraph}>
            Welcome to FamlyNook. Please read these Terms of Service carefully before using our application.
          </Text>
          
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By creating an account and using FamlyNook, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our service.
          </Text>
          
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            FamlyNook is a private social platform designed exclusively for families to connect, share, and organize their lives together. Our service includes features for sharing photos, messages, organizing events, and preserving family memories.
          </Text>
          
          <Text style={styles.sectionTitle}>3. Account Registration</Text>
          <Text style={styles.paragraph}>
            To use FamlyNook, you must:
          </Text>
          <Text style={styles.bulletPoint}>• Create an account with a valid email address</Text>
          <Text style={styles.bulletPoint}>• Provide accurate information during registration</Text>
          <Text style={styles.bulletPoint}>• Be at least 13 years of age</Text>
          <Text style={styles.bulletPoint}>• Keep your account credentials secure</Text>
          
          <Text style={styles.sectionTitle}>4. User Content</Text>
          <Text style={styles.paragraph}>
            You retain ownership of all content you share through FamlyNook. However, by uploading content, you grant us a license to store, display, and transmit that content to your connected family members. You are solely responsible for all content you post.
          </Text>
          
          <Text style={styles.sectionTitle}>5. Acceptable Use</Text>
          <Text style={styles.paragraph}>
            When using FamlyNook, you agree not to:
          </Text>
          <Text style={styles.bulletPoint}>• Share illegal, harmful, or offensive content</Text>
          <Text style={styles.bulletPoint}>• Harass, intimidate, or threaten any user</Text>
          <Text style={styles.bulletPoint}>• Impersonate others or provide false information</Text>
          <Text style={styles.bulletPoint}>• Attempt to access accounts or data belonging to others</Text>
          <Text style={styles.bulletPoint}>• Use the service for any commercial purposes</Text>
          
          <Text style={styles.sectionTitle}>6. Privacy</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. By using FamlyNook, you consent to our data practices described in the Privacy Policy.
          </Text>
          
          <Text style={styles.sectionTitle}>7. Termination</Text>
          <Text style={styles.paragraph}>
            We reserve the right to suspend or terminate your account if you violate these Terms. You may also delete your account at any time through the app settings.
          </Text>
          
          <Text style={styles.sectionTitle}>8. Modifications to Terms</Text>
          <Text style={styles.paragraph}>
            We may modify these Terms at any time. We will notify you of significant changes through the app or via email. Your continued use of FamlyNook after such modifications constitutes your acceptance of the updated Terms.
          </Text>
          
          <Text style={styles.sectionTitle}>9. Disclaimers</Text>
          <Text style={styles.paragraph}>
            FamlyNook is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that our service will be uninterrupted, secure, or error-free.
          </Text>
          
          <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            In no event shall FamlyNook be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the service.
          </Text>
          
          <Text style={styles.sectionTitle}>11. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms shall be governed by the laws of the United States, without regard to its conflict of law provisions.
          </Text>
          
          <Text style={styles.sectionTitle}>12. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>Email: terms@famlynook.com</Text>
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
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontStyle: 'italic'
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
  bulletPoint: {
    fontSize: 16,
    color: '#F5F5F7',
    marginBottom: 8,
    paddingLeft: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  contactInfo: {
    fontSize: 16,
    color: '#3BAFBC', // Teal color for links and contact info
    marginTop: 8,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});