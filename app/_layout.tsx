import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ThemeProvider as CustomThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { EnergyRatesProvider } from '@/providers/EnergyRatesProvider';
import { ConsumptionProvider } from '@/providers/ConsumptionProvider';
import { useColors } from '@/constants/colors';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isDark } = useTheme();
  const colors = useColors(isDark);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="electricity-detail" 
          options={{ 
            title: 'Electricity Rates',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="gas-detail" 
          options={{ 
            title: 'Gas Rates',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: 'Settings',
            headerBackTitle: 'Back',
            presentation: 'modal' 
          }} 
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <CustomThemeProvider>
      <EnergyRatesProvider>
        <ConsumptionProvider>
          <RootLayoutNav />
        </ConsumptionProvider>
      </EnergyRatesProvider>
    </CustomThemeProvider>
  );
}