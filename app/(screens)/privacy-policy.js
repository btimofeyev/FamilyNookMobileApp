// app/(screens)/privacy-policy.js
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

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
          headerStyle: {
            backgroundColor: '#1E2B2F'
          },
          headerTintColor: '#F5F5F7'
        }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BlurView intensity={10} tint="dark" style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: March, 2025</Text>
          
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            Welcome to FamlyNook. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and protect your information when you use our application.
          </Text>
          
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly to us, including your name, email address, profile information, photos, and content you post or share through our app.
          </Text>
          
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use your information to provide and improve our services, communicate with you, personalize your experience, and comply with legal obligations.
          </Text>
          
          <Text style={styles.sectionTitle}>4. How We Share Your Information</Text>
          <Text style={styles.paragraph}>
            We share your information with other users according to your privacy settings, service providers that help us operate our services, and as required by law.
          </Text>
          
          <Text style={styles.sectionTitle}>5. Your Rights and Choices</Text>
          <Text style={styles.paragraph}>
            You have the right to access, update, or delete your personal information. You can manage your preferences within the app settings.
          </Text>
          
          <Text style={styles.sectionTitle}>6. Account Deletion</Text>
          <Text style={styles.paragraph}>
            You can request deletion of your account at any time through the "Delete My Account" option in your profile settings. When you request account deletion:
          </Text>
          
          <Text style={styles.bulletPoint}>• We will send you an email to confirm your request</Text>
          <Text style={styles.bulletPoint}>• Once confirmed, we will permanently delete all your personal data</Text>
          <Text style={styles.bulletPoint}>• This includes your profile information, posts, comments, and photos</Text>
          <Text style={styles.bulletPoint}>• Deletion will be processed within 30 days of confirmation</Text>
          <Text style={styles.bulletPoint}>• Some data may remain in backups for up to 90 days</Text>
          
          <Text style={styles.paragraph}>
            Please note that some information may be retained for legal, security, or fraud prevention purposes. Content you shared with other users may remain visible even after your account is deleted.
          </Text>
          
          <Text style={styles.sectionTitle}>7. Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </Text>
          
          <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
          </Text>
          
          <Text style={styles.sectionTitle}>9. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>Email: privacy@famlynook.com</Text>
          <Text style={styles.contactInfo}>Address: 123 Family Lane, Suite 100, San Francisco, CA 94103</Text>
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
    color: '#F5F5F7',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});