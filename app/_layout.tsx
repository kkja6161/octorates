import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

import { EnergyRatesProvider } from "@/providers/EnergyRatesProvider";
import { ConsumptionProvider, useConsumption } from "@/providers/ConsumptionProvider";
import { NotificationSettingsProvider } from "@/providers/NotificationSettingsProvider";
import { TutorialProvider } from "@/providers/TutorialProvider";
import { ThemeContext } from "@/providers/ThemeProvider";
import { AccessibilityContext } from "@/providers/AccessibilityProvider";
import { EVProvider } from "@/providers/EVProvider";
import { ForecastProvider } from "@/providers/ForecastProvider";
import TutorialOverlay from "@/components/TutorialOverlay";
import Colors from "@/constants/colors";

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false 
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
  );
}

function LoadingOverlay({ apiKey, onVisibilityChange }: { apiKey: string | null; onVisibilityChange: (visible: boolean) => void }) {
  const [visible, setVisible] = useState<boolean>(false);

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
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Just a moment while we fetch your data</Text>
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
return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext>
        <AccessibilityContext>
          <EnergyRatesProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <ConsumptionProvider>
                <ForecastProvider>
                  <EVProvider>
                    <NotificationSettingsProvider>
                    <TutorialProvider>
                      <AppContent />
                    </TutorialProvider>
                  </NotificationSettingsProvider>
                  </EVProvider>
                </ForecastProvider>
              </ConsumptionProvider>
            </GestureHandlerRootView>
          </EnergyRatesProvider>
        </AccessibilityContext>
      </ThemeContext>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
});
