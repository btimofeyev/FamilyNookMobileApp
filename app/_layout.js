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
import * as SecureStore from 'expo-secure-store';

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
  const { isAuthenticated, loading: authLoading, authInitialized, refreshUserSession, user } = useAuth();
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
      // Check if we're in the family setup phase
      const checkIfInFamilySetup = async () => {
        // If no family_id, we're in setup phase - don't show retry
        if (!user?.family_id) {
          console.log('In family setup phase, not showing retry button');
          setShowRetry(false);
          return;
        }
        
        const registrationTime = await SecureStore.getItemAsync('registration_time');
        const isRecentRegistration = registrationTime && 
          (Date.now() - parseInt(registrationTime)) < 5 * 60 * 1000; // 5 minutes
        
        if (isRecentRegistration && !user?.family_id) {
          // New user in setup - don't show retry
          console.log('New account in setup phase, not showing retry');
          setShowRetry(false);
        } else if (!isRecentRegistration) {
          // Only show retry for established accounts
          const timer = setTimeout(() => {
            setShowRetry(true);
          }, 3000);
          
          return () => clearTimeout(timer);
        }
      };
      
      checkIfInFamilySetup();
    } else {
      setShowRetry(false);
    }
  }, [authInitialized, isAuthenticated, familiesInitialized, hasFamilies, familyLoading, user]);
  
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
    showRetry,
    userHasFamily: !!user?.family_id
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
          // Check if user needs family setup
          user?.family_id ? (
            // User is authenticated and has a family
            <Stack.Screen 
              name="(tabs)" 
              options={{
                animation: 'fade',
              }}
            />
          ) : (
            // User is authenticated but needs family setup
            <Stack.Screen 
              name="(family-setup)" 
              options={{
                animation: 'fade',
                gestureEnabled: false
              }}
            />
          )
        ) : (
          // Not authenticated, show auth screens
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