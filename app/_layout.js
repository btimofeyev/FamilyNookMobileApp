// app/_layout.js
import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FamilyProvider } from '../context/FamilyContext';
import { NotificationProvider } from '../context/NotificationContext';
import { StatusBar } from 'expo-status-bar';

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
  
  // Temporarily bypass loading check
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    </>
  );
}

export default RootLayout;