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
          headerTintColor: '#F5F5F7',
          headerShown: true
        }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BlurView intensity={10} tint="dark" style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: March 2025</Text>
          
          <Text style={styles.sectionTitle}>Our Commitment to Your Privacy</Text>
          <Text style={styles.paragraph}>
            At FamlyNook, we understand that privacy is paramount when it comes to family matters. Our platform is built on the foundation of trust, and we take the responsibility of protecting your family's personal information seriously.
          </Text>
          
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          
          <Text style={styles.subSectionTitle}>Account Information</Text>
          <Text style={styles.paragraph}>
            When you create a FamlyNook account, we collect:
          </Text>
          <Text style={styles.bulletPoint}>• Your name and email address</Text>
          <Text style={styles.bulletPoint}>• Family passkey (if provided)</Text>
          <Text style={styles.bulletPoint}>• Account credentials</Text>
          
          <Text style={styles.subSectionTitle}>Content You Share</Text>
          <Text style={styles.paragraph}>
            We store the content you choose to share, including:
          </Text>
          <Text style={styles.bulletPoint}>• Photos and videos</Text>
          <Text style={styles.bulletPoint}>• Comments and messages</Text>
          <Text style={styles.bulletPoint}>• Calendar events and family milestones</Text>
          <Text style={styles.bulletPoint}>• Family member relationships and connections</Text>
          
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            Your information is used exclusively to:
          </Text>
          <Text style={styles.bulletPoint}>• Maintain your family connections and shared content</Text>
          <Text style={styles.bulletPoint}>• Send important updates about your account and family activities</Text>
          <Text style={styles.bulletPoint}>• Ensure the security of your family's private space</Text>
          
          <Text style={styles.sectionTitle}>Sharing Your Information</Text>
          <Text style={styles.paragraph}>
            We never share your personal information with third parties except:
          </Text>
          <Text style={styles.bulletPoint}>• With family members you explicitly connect with</Text>
          <Text style={styles.bulletPoint}>• When required by law</Text>
          <Text style={styles.bulletPoint}>• To protect our rights or the safety of our users</Text>
          
          <Text style={styles.sectionTitle}>Your Privacy Controls</Text>
          <Text style={styles.paragraph}>
            You have full control over your data:
          </Text>
          <Text style={styles.bulletPoint}>• Manage your family connections and sharing preferences</Text>
          <Text style={styles.bulletPoint}>• Download or delete your personal data</Text>
          <Text style={styles.bulletPoint}>• Control email notifications and communication preferences</Text>
          <Text style={styles.bulletPoint}>• Modify or remove content you've shared</Text>
          
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about our privacy practices or need to report a privacy concern, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>Email: privacy@famlynook.com</Text>
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
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F0C142', // Gold color from the app's color scheme
    marginTop: 16,
    marginBottom: 8,
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