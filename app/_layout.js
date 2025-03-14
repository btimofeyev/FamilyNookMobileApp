// app/_layout.js
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FamilyProvider, useFamily } from '../context/FamilyContext';
import { NotificationProvider } from '../context/NotificationContext';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Keep the splash screen visible while we check authentication
SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  // Load any custom fonts if needed
  const [fontsLoaded] = useFonts({
    // Add custom fonts here if needed
  });

  if (!fontsLoaded) {
    return null; // Still loading fonts
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <FamilyProvider>
          <RootLayoutNav />
        </FamilyProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

// Loading indicator with retry button component
const LoadingScreen = ({ showRetry, onRetry }) => (
  <View style={{ 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#1E2B2F',
    padding: 20
  }}>
    {showRetry ? (
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 16, marginBottom: 20, textAlign: 'center' }}>
          We're having trouble connecting to your account.
        </Text>
        <TouchableOpacity 
          onPress={onRetry}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#3BAFBC',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8
          }}
        >
          <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            Retry Connection
          </Text>
        </TouchableOpacity>
      </View>
    ) : (
      <ActivityIndicator size="large" color="#3BAFBC" />
    )}
  </View>
);

// Navigation structure with authentication
function RootLayoutNav() {
  const { isAuthenticated, loading: authLoading, authInitialized, refreshUserSession } = useAuth();
  const { familiesInitialized, loading: familyLoading, hasFamilies, retryLoadFamilies } = useFamily();
  const [showRetry, setShowRetry] = useState(false);
  
  useEffect(() => {
    const hideSplash = async () => {
      // Only hide splash when both auth and family contexts are initialized
      if (authInitialized) {
        try {
          await SplashScreen.hideAsync();
          console.log('Splash screen hidden');
        } catch (e) {
          console.log('Error hiding splash screen:', e);
        }
      }
    };
    
    hideSplash();
  }, [authInitialized]);
  
  // Show retry button if authenticated but families failed to load
  useEffect(() => {
    if (authInitialized && isAuthenticated && familiesInitialized && !hasFamilies && !familyLoading) {
      // If we're authenticated but have no families, something might be wrong
      // Give the user a chance to retry after a short delay
      const timer = setTimeout(() => {
        setShowRetry(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setShowRetry(false);
    }
  }, [authInitialized, isAuthenticated, familiesInitialized, hasFamilies, familyLoading]);
  
  const handleRetry = async () => {
    setShowRetry(false);
    
    try {
      // Try refreshing the user session first
      await refreshUserSession();
      // Then retry loading families
      await retryLoadFamilies();
    } catch (error) {
      console.error('Retry failed:', error);
      setShowRetry(true);
    }
  };
  
  console.log('Navigation State:', { 
    isAuthenticated, 
    authInitialized,
    authLoading,
    familiesInitialized,
    familyLoading,
    showRetry
  });
  
  // Show a loading indicator if still initializing
  if (!authInitialized || authLoading) {
    return <LoadingScreen showRetry={false} />;
  }
  
  // Show retry screen if we're authenticated but no families loaded
  if (isAuthenticated && !familyLoading && !hasFamilies && showRetry) {
    return <LoadingScreen showRetry={true} onRetry={handleRetry} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1E2B2F' }}>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1E2B2F' },
          animation: 'fade',
        }}
      >
        {isAuthenticated ? (
          // Only show tabs if authenticated
          <Stack.Screen 
            name="(tabs)" 
            options={{
              animation: 'fade',
            }}
          />
        ) : (
          <Stack.Screen 
            name="(auth)"
            options={{
              animation: 'fade',
            }}
          />
        )}
      </Stack>
    </View>
  );
}

export default RootLayout;