import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTintColor: Colors.primary,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          title: 'Octopus Account',
        }}
      />
      <Stack.Screen
        name="electricity-tariff"
        options={{
          title: 'Electricity Tariff',
        }}
      />
      <Stack.Screen
        name="gas-tariff"
        options={{
          title: 'Gas Tariff',
        }}
      />
      <Stack.Screen
        name="electricity-comparison"
        options={{
          title: 'Electricity Comparison',
        }}
      />
      <Stack.Screen
        name="gas-comparison"
        options={{
          title: 'Gas Comparison',
        }}
      />
      <Stack.Screen
        name="electricity-thresholds"
        options={{
          title: 'Electricity Thresholds',
        }}
      />
      <Stack.Screen
        name="gas-thresholds"
        options={{
          title: 'Gas Thresholds',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notification Preferences',
        }}
      />
    </Stack>
  );
}
