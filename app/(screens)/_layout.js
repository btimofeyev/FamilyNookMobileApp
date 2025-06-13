// app/(screens)/_layout.js
import { Stack } from 'expo-router';

export default function OtherLayout() {
  return (
    <Stack
      screenOptions={{
        // These are the DEFAULT options for all screens in this stack
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      {/* Add a specific screen configuration for create-post */}
      <Stack.Screen
        name="create-post"
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'fade_from_bottom',
        }}
      />
      {/* You don't need to list other screens like 'edit-post' here. 
        They will automatically use the default screenOptions from the Stack.
      */}
    </Stack>
  );
}