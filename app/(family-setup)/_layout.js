import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function FamilySetupLayout() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // If user already has a family, redirect to the main app
    if (isAuthenticated && user?.family_id) {
      router.replace('/(tabs)/feed');
    }
    // If not authenticated, redirect to login
    else if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, user]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#1E2B2F' },
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="index" options={{ title: "Family Setup" }} />
      <Stack.Screen name="create" options={{ title: "Create Family" }} />
      <Stack.Screen name="join" options={{ title: "Join Family" }} />
    </Stack>
  );
}