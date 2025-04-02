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
    if (loading || !authInitialized || !familiesInitialized) return;

    if (isAuthenticated && determineUserHasFamily()) {
      router.replace('/(tabs)');
    } 
    else if (isAuthenticated && !determineUserHasFamily()) {
      router.replace('/(family-setup)');
    }
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