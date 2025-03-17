import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';

export default function FamilySetupScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleCreateFamily = () => {
    router.push('create');
  };

  const handleJoinFamily = () => {
    router.push('join');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>👪</Text>
          </View>
          <Text style={styles.headerTitle}>Family Setup</Text>
          <Text style={styles.headerSubtitle}>
            Connect with your family in FamlyNook
          </Text>
        </View>

        <BlurView intensity={15} tint="dark" style={styles.formContainer}>
          <Text style={styles.welcomeText}>Welcome, {user?.name || 'Friend'}!</Text>
          <Text style={styles.instructionText}>
            To get started with FamlyNook, you can either create a new family group or join an existing one.
          </Text>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleCreateFamily}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIconContainer, styles.createIconContainer]}>
                <Text style={styles.optionIconText}>✨</Text>
              </View>
              <Text style={styles.optionTitle}>Create a New Family</Text>
              <Text style={styles.optionDescription}>
                Start a new family group and invite your family members to join
              </Text>
              <LinearGradient
                colors={['#1E2B2F', '#3BAFBC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.optionButton}
              >
                <Text style={styles.optionButtonText}>Create Family</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleJoinFamily}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIconContainer, styles.joinIconContainer]}>
                <Text style={styles.optionIconText}>🔑</Text>
              </View>
              <Text style={styles.optionTitle}>Join Existing Family</Text>
              <Text style={styles.optionDescription}>
                Join a family group with a passkey from a family member
              </Text>
              <LinearGradient
                colors={['#1E2B2F', '#3BAFBC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.optionButton}
              >
                <Text style={styles.optionButtonText}>Join Family</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2B2F', // Midnight Green background
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 175, 188, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(59, 175, 188, 0.5)',
  },
  iconText: {
    fontSize: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
    textAlign: 'center',
    maxWidth: '80%',
  },
  formContainer: {
    marginHorizontal: 16,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.8)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 32,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    alignItems: 'center',
  },
  optionCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 43, 47, 0.6)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.2)',
  },
  optionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
  },
  createIconContainer: {
    backgroundColor: 'rgba(59, 175, 188, 0.15)',
    borderColor: 'rgba(59, 175, 188, 0.4)',
  },
  joinIconContainer: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderColor: 'rgba(255, 184, 0, 0.4)',
  },
  optionIconText: {
    fontSize: 40,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    textAlign: 'center',
    lineHeight: 20,
  },
  optionButton: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  optionButtonText: {
    color: '#F5F5F7',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(59, 175, 188, 0.2)',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});