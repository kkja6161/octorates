import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';

export default function EVLayout() {
  const { isDark } = useTheme();
  const colors = useColors(isDark);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: '600' as const,
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'EV Charging',
          headerLargeTitle: true,
        }} 
      />
      <Stack.Screen 
        name="profiles" 
        options={{ 
          title: 'Manage Profiles',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="add-profile" 
        options={{ 
          title: 'Add Profile',
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="edit-profile" 
        options={{ 
          title: 'Edit Profile',
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="logs" 
        options={{ 
          title: 'Charging History',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="log-detail" 
        options={{ 
          title: 'Charging Session',
          presentation: 'card',
        }} 
      />
    </Stack>
  );
}
