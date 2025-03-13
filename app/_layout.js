// app/_layout.js
import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FamilyProvider } from '../context/FamilyContext';
import { NotificationProvider } from '../context/NotificationContext';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

const RootLayout = () => {
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

// Navigation structure with authentication
function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  
  console.log('Navigation State:', { isAuthenticated, loading });
  
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
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
    </View>
  );
}

export default RootLayout;