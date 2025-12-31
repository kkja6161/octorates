import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useContext } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from 'expo-status-bar';

import { EnergyRatesProvider } from "@/providers/EnergyRatesProvider";
import { ConsumptionProvider, useConsumption } from "@/providers/ConsumptionProvider";
import { NotificationSettingsProvider } from "@/providers/NotificationSettingsProvider";
import { TutorialProvider } from "@/providers/TutorialProvider";
import { ThemeContext, useTheme } from "@/providers/ThemeProvider"; // Ensure useTheme is exported
import { EVProvider } from "@/providers/EVProvider";
import TutorialOverlay from "@/components/TutorialOverlay";
import { useColors } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isDark } = useTheme();
  const colors = useColors(isDark);

  return (
    <>
      <Stack 
        screenOptions={{ 
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text.primary,
          // contentStyle is the key to fixing the white background on all pages
          contentStyle: { backgroundColor: colors.background } 
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="settings/index" 
          options={{ 
            title: "Settings",
            presentation: 'modal',
            headerShown: true 
          }} 
        />
        <Stack.Screen 
          name="daily-detail" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="electricity-detail" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

function LoadingOverlay({ apiKey, onVisibilityChange }: { apiKey: string | null; onVisibilityChange: (visible: boolean) => void }) {
  const [visible, setVisible] = useState<boolean>(false);
  const { isDark } = useTheme();
  const colors = useColors(isDark);

  useEffect(() => {
    if (apiKey) {
      setVisible(true);
      onVisibilityChange(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onVisibilityChange(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [apiKey, onVisibilityChange]);

  if (!visible || !apiKey) return null;

  return (
    <View style={[styles.loadingOverlay, { backgroundColor: isDark ? 'rgba(18, 18, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.primary }]}>Just a moment while we fetch your data</Text>
      </View>
    </View>
  );
}

function AppContent() {
  const { apiKey } = useConsumption();
  const [isLoadingOverlayVisible, setIsLoadingOverlayVisible] = useState(false);
  
  return (
    <>
      <RootLayoutNav />
      <LoadingOverlay apiKey={apiKey} onVisibilityChange={setIsLoadingOverlayVisible} />
      <TutorialOverlay hideWhileLoading={isLoadingOverlayVisible} />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext>
        <EnergyRatesProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ConsumptionProvider>
              <EVProvider>
                <NotificationSettingsProvider>
                  <TutorialProvider>
                    <AppContent />
                  </TutorialProvider>
                </NotificationSettingsProvider>
              </EVProvider>
            </ConsumptionProvider>
          </GestureHandlerRootView>
        </EnergyRatesProvider>
      </ThemeContext>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
