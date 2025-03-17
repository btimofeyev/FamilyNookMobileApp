import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useRouter } from 'expo-router';

export default function AuthLayout() {
  const { user, isAuthenticated, loading, authInitialized } = useAuth();
  const { determineUserHasFamily, familiesInitialized } = useFamily();
  const router = useRouter();

  useEffect(() => {
    // Skip redirection during initial loading or before auth is initialized
    if (loading || !authInitialized || !familiesInitialized) return;

    // If user is already authenticated and has a family, redirect to the main app
    if (isAuthenticated && determineUserHasFamily()) {
      console.log('User is authenticated and has a family, redirecting to feed');
      router.replace('/(tabs)');
    } 
    // If user is authenticated but doesn't have a family, send to family setup
    else if (isAuthenticated && !determineUserHasFamily()) {
      console.log('User is authenticated but needs family setup');
      router.replace('/(family-setup)');
    }
    // Otherwise, stay on the auth screens
  }, [isAuthenticated, user, loading, authInitialized, familiesInitialized, determineUserHasFamily]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#1E2B2F' }
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}