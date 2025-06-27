import { Stack } from 'expo-router';

export default function CameraLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="scanner" />
    </Stack>
  );
}
