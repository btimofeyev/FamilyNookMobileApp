// app/(screens)/settings.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { BlurView } from "expo-blur";
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from "expo-haptics";

export default function SettingsScreen() {
  const { logout } = useAuth();
  const topInset = useSafeAreaInsets().top;

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#f0f9ff', '#e0f2fe', '#f8faff']}
        style={styles.backgroundGradient}
      />
      <Stack.Screen
        options={{
          title: "Settings",
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerTintColor: "#1C1C1E",
          headerShown: true,
          headerTransparent: true,
        }}
      />

      <ScrollView contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topInset + 80 }
      ]}>
        {/* Account Settings */}
        <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.section}>
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.8)', 
              'rgba(255, 255, 255, 0.4)'
            ]}
            style={styles.sectionHighlight}
          />
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.settingsContainer}>
            {/* Edit Profile - Commented out for future implementation 
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/edit-profile")}
            >
              <Ionicons name="person-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
            </TouchableOpacity>
            */}

            {/* Notification Preferences - Commented out for future implementation 
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/notification-preferences")}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color="rgba(28, 28, 30, 0.6)"
              />
              <Text style={styles.settingText}>Notification Preferences</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
            </TouchableOpacity>
            */}

            {/* Privacy Settings - Commented out for future implementation 
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/privacy-settings")}
            >
              <Ionicons name="lock-closed-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Privacy Settings</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
            </TouchableOpacity>
            */}
            
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/notification-settings")}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color="rgba(28, 28, 30, 0.6)"
              />
              <Text style={styles.settingText}>Notification Settings</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/privacy-policy")}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="rgba(28, 28, 30, 0.6)"
              />
              <Text style={styles.settingText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Legal and Policies */}
        <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.section}>
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.8)', 
              'rgba(255, 255, 255, 0.4)'
            ]}
            style={styles.sectionHighlight}
          />
          <Text style={styles.sectionTitle}>Legal and Policies</Text>

          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/terms-of-service")}
            >
              <Ionicons
                name="document-text-outline"
                size={22}
                color="rgba(28, 28, 30, 0.6)"
              />
              <Text style={styles.settingText}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Support & Help */}
        <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.section}>
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.8)', 
              'rgba(255, 255, 255, 0.4)'
            ]}
            style={styles.sectionHighlight}
          />
          <Text style={styles.sectionTitle}>Support</Text>

          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/help-center")}
            >
              <Ionicons name="help-circle-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Help Center</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/feedback")}
            >
              <Ionicons name="chatbubble-outline" size={22} color="#AEAEB2" />
              <Text style={styles.settingText}>Send Feedback</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/about")}
            >
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="rgba(28, 28, 30, 0.6)"
              />
              <Text style={styles.settingText}>About FamlyNook</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Account Actions */}
        <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={styles.section}>
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.8)', 
              'rgba(255, 255, 255, 0.4)'
            ]}
            style={styles.sectionHighlight}
          />
          <Text style={styles.sectionTitle}>Account Actions</Text>

          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/account-deletion")}
            >
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
              <Text style={[styles.settingText, styles.dangerText]}>
                Delete My Account
              </Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
              <Text style={[styles.settingText, styles.dangerText]}>
                Log Out
              </Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(28, 28, 30, 0.4)" />
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
    backgroundColor: 'transparent',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  section: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 20,
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
    letterSpacing: -0.3,
  },
  settingsContainer: {
    marginTop: 8,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: "#1C1C1E",
    marginLeft: 12,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
    fontWeight: '500',
  },
  dangerText: {
    color: "#FF3B30",
  },
  versionContainer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 14,
    color: 'rgba(28, 28, 30, 0.6)',
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
    fontWeight: '500',
  },
});