import { Tabs } from 'expo-router';
import { Home, BarChart3, BatteryCharging } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';

export default function TabsLayout() {
  const { isDark } = useTheme();
  const colors = useColors(isDark);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 50,
          paddingBottom: 4,
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="usage"
        options={{
          title: 'Usage',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ev"
        options={{
          title: 'EV',
          tabBarIcon: ({ color, size }) => <BatteryCharging size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
