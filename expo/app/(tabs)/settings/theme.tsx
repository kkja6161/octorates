import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Check } from 'lucide-react-native';

import { useTheme, ThemeMode } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';

export default function ThemeSettingsScreen() {
  const { themeMode, setThemeMode, isDark } = useTheme();
  const colors = useColors(isDark);

  const themeOptions: { mode: ThemeMode; label: string; description: string }[] = [
    {
      mode: 'system',
      label: 'System',
      description: 'Match your device settings',
    },
    {
      mode: 'light',
      label: 'Light',
      description: 'Always use light theme',
    },
    {
      mode: 'dark',
      label: 'Dark',
      description: 'Always use dark theme',
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 12,
    },
    optionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionCardSelected: {
      borderColor: colors.primary,
      backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
    },
    optionContent: {
      flex: 1,
      gap: 4,
    },
    optionLabel: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    optionDescription: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    checkContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoText: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
      marginTop: 8,
      paddingHorizontal: 4,
    },
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Appearance',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text.primary,
          headerShadowVisible: false,
        }}
      />

      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {themeOptions.map((option) => (
            <Pressable
              key={option.mode}
              style={[
                styles.optionCard,
                themeMode === option.mode && styles.optionCardSelected,
              ]}
              onPress={() => setThemeMode(option.mode)}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {themeMode === option.mode && (
                <View style={styles.checkContainer}>
                  <Check size={18} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </Pressable>
          ))}

          <Text style={styles.infoText}>
            Dark mode uses darker colors throughout the app to reduce eye strain in low-light environments and save battery on devices with OLED screens.
          </Text>
        </ScrollView>
      </View>
    </>
  );
}
