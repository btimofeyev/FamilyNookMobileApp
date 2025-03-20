// app/(screens)/settings.js - Create this file
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const { logout } = useAuth();
  
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: {
            backgroundColor: '#1E2B2F'
          },
          headerTintColor: '#F5F5F7',
          headerShown: true
        }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Account Settings */}
        <BlurView intensity={20} tint="dark" style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.settingsContainer}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/edit-profile')}
            >
              <Ionicons name="person-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/notification-preferences')}
            >
              <Ionicons name="notifications-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Notification Preferences</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/privacy-settings')}
            >
              <Ionicons name="lock-closed-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Privacy Settings</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </BlurView>
        
        {/* Legal and Policies */}
        <BlurView intensity={20} tint="dark" style={styles.section}>
          <Text style={styles.sectionTitle}>Legal and Policies</Text>
          
          <View style={styles.settingsContainer}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/privacy-policy')}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/terms-of-service')}
            >
              <Ionicons name="document-text-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </BlurView>
        
        {/* Support & Help */}
        <BlurView intensity={20} tint="dark" style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <View style={styles.settingsContainer}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/help-center')}
            >
              <Ionicons name="help-circle-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Help Center</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/feedback')}
            >
              <Ionicons name="chatbubble-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Send Feedback</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/about')}
            >
              <Ionicons name="information-circle-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>About FamlyNook</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </BlurView>
        
        {/* Account Actions */}
        <BlurView intensity={20} tint="dark" style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <View style={styles.settingsContainer}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/account-deletion')}
            >
              <Ionicons name="trash-outline" size={22} color="#FF453A" />
              <Text style={[styles.settingText, styles.dangerText]}>Delete My Account</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={22} color="#FF453A" />
              <Text style={[styles.settingText, styles.dangerText]}>Log Out</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </BlurView>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>FamlyNook v1.0.0</Text>
        </View>
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
  section: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  settingsContainer: {
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.2)',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#F5F5F7',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  dangerText: {
    color: '#FF453A', // iOS red color
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});