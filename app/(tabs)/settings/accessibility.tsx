import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Type, Contrast, Zap, RotateCcw, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useAccessibleStyles } from '@/hooks/useAccessibleStyles';

const FONT_SCALE_OPTIONS = [
  { label: 'System Default', value: null },
  { label: 'Small (85%)', value: 0.85 },
  { label: 'Normal (100%)', value: 1.0 },
  { label: 'Large (115%)', value: 1.15 },
  { label: 'Extra Large (130%)', value: 1.3 },
  { label: 'Maximum (150%)', value: 1.5 },
];

export default function AccessibilityScreen() {
  const insets = useSafeAreaInsets();
  const {
    colors,
    textStyles,
    spacing,
    borderWidth,
    minTouchTarget,
    scaleFontSize,
    isHighContrast,
  } = useAccessibleStyles();

  const {
    systemFontScale,
    effectiveFontScale,
    settings,
    setHighContrastEnabled,
    setFontScaleOverride,
    setBoldTextEnabled,
    setReduceMotionEnabled,
  } = useAccessibility();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
    },
    headerTitle: {
      fontSize: scaleFontSize(24),
      fontWeight: '700' as const,
      color: colors.surface,
    },
    scrollContent: {
      padding: spacing.xl,
      gap: spacing.xxl,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...textStyles.label,
      marginBottom: spacing.xs,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: 12,
      minHeight: minTouchTarget,
      borderWidth: isHighContrast ? borderWidth : 0,
      borderColor: colors.border,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingTextContainer: {
      flex: 1,
      gap: 2,
    },
    settingLabel: {
      ...textStyles.body,
      fontWeight: '600' as const,
    },
    settingDescription: {
      ...textStyles.caption,
    },
    fontScaleOptions: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: isHighContrast ? borderWidth : 0,
      borderColor: colors.border,
    },
    fontScaleOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      minHeight: minTouchTarget,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    fontScaleOptionLast: {
      borderBottomWidth: 0,
    },
    fontScaleOptionSelected: {
      backgroundColor: isHighContrast ? colors.primary + '20' : colors.background,
    },
    fontScaleLabel: {
      ...textStyles.body,
    },
    fontScaleLabelSelected: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.xl,
      gap: spacing.md,
      borderWidth: isHighContrast ? borderWidth : 0,
      borderColor: colors.border,
    },
    previewTitle: {
      ...textStyles.heading,
    },
    previewBody: {
      ...textStyles.body,
    },
    previewCaption: {
      ...textStyles.caption,
    },
    infoCard: {
      backgroundColor: colors.primary + '15',
      borderRadius: 12,
      padding: spacing.lg,
      borderWidth: isHighContrast ? borderWidth : 0,
      borderColor: colors.primary,
    },
    infoText: {
      ...textStyles.caption,
      color: colors.text.primary,
    },
    resetButton: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      minHeight: minTouchTarget,
      borderWidth: isHighContrast ? borderWidth : 0,
      borderColor: colors.border,
    },
    resetButtonText: {
      ...textStyles.button,
      color: colors.error,
    },
  });

  const handleResetAll = () => {
    setHighContrastEnabled(false);
    setFontScaleOverride(null);
    setBoldTextEnabled(false);
    setReduceMotionEnabled(false);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <Text style={styles.headerTitle}>Accessibility</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Display</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Contrast size={20} color="#3b82f6" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>High Contrast</Text>
                  <Text style={styles.settingDescription}>
                    Increase color contrast for better visibility
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.highContrastEnabled}
                onValueChange={setHighContrastEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
                  <Type size={20} color="#f59e0b" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Bold Text</Text>
                  <Text style={styles.settingDescription}>
                    Make text heavier for easier reading
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.boldTextEnabled}
                onValueChange={setBoldTextEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
                  <Zap size={20} color="#16a34a" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Reduce Motion</Text>
                  <Text style={styles.settingDescription}>
                    Minimize animations throughout the app
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.reduceMotionEnabled}
                onValueChange={setReduceMotionEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Text Size</Text>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                System font scale: {(systemFontScale * 100).toFixed(0)}% • 
                Current: {(effectiveFontScale * 100).toFixed(0)}%
              </Text>
            </View>

            <View style={styles.fontScaleOptions}>
              {FONT_SCALE_OPTIONS.map((option, index) => {
                const isSelected = settings.fontScaleOverride === option.value;
                const isLast = index === FONT_SCALE_OPTIONS.length - 1;
                
                return (
                  <Pressable
                    key={option.label}
                    style={[
                      styles.fontScaleOption,
                      isSelected && styles.fontScaleOptionSelected,
                      isLast && styles.fontScaleOptionLast,
                    ]}
                    onPress={() => setFontScaleOverride(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={option.label}
                  >
                    <Text style={[
                      styles.fontScaleLabel,
                      isSelected && styles.fontScaleLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview</Text>
            
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Sample Heading</Text>
              <Text style={styles.previewBody}>
                This is how body text will appear throughout the app. 
                Adjust the settings above to customize your reading experience.
              </Text>
              <Text style={styles.previewCaption}>
                Caption text for smaller details
              </Text>
            </View>
          </View>

          {Platform.OS !== 'web' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Tip: You can also adjust text size in your device&apos;s Settings → 
                Display & Brightness → Text Size. The app will automatically adapt.
              </Text>
            </View>
          )}

          <Pressable
            style={styles.resetButton}
            onPress={handleResetAll}
            accessibilityRole="button"
            accessibilityLabel="Reset all accessibility settings to defaults"
          >
            <RotateCcw size={20} color={colors.error} />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </Pressable>
        </ScrollView>
      </View>
    </>
  );
}
