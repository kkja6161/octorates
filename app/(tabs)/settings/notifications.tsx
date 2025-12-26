import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';

import { useConsumption } from '@/providers/ConsumptionProvider';
import { useNotificationSettings } from '@/providers/NotificationSettingsProvider';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/providers/ThemeProvider';

export default function NotificationPreferencesScreen() {
  const { selectedElectricityTariff } = useConsumption();
  const {
    notificationSettings,
    toggleNewAgileRatesNotification,
  } = useNotificationSettings();
  
  const { isDark } = useTheme();
  const colors = useColors(isDark);

  const isAgileTariff = selectedElectricityTariff?.productCode?.toUpperCase().includes('AGILE') || false;

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
    description: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    notificationHelp: {
      backgroundColor: isDark ? colors.surface : '#e0f2fe',
      borderRadius: 12,
      padding: 12,
      marginTop: 20,
    },
    notificationHelpText: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
    },
    agileSection: {
      marginTop: 8,
      marginBottom: 20,
    },
    agileSectionTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text.primary,
      marginBottom: 12,
    },
    agileItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    agileItemContent: {
      flex: 1,
      marginRight: 12,
    },
    agileItemTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
      marginBottom: 4,
    },
    agileItemDescription: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
    },
    noAgileContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center' as const,
    },
    noAgileText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center' as const,
      lineHeight: 20,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>
          Get notified when new Agile tariff rates are published, typically around 4pm each day.
        </Text>

        {isAgileTariff && (
          <View style={styles.agileSection}>
            <Text style={styles.agileSectionTitle}>Agile Tariff Notifications</Text>
            
            <View style={styles.agileItem}>
              <View style={styles.agileItemContent}>
                <Text style={styles.agileItemTitle}>New Rates Available</Text>
                <Text style={styles.agileItemDescription}>
                  Get notified when tomorrow&apos;s Agile rates are published (usually around 4pm). Includes average, low, and high rates.
                </Text>
              </View>
              <Switch
                value={notificationSettings.notifyNewAgileRates}
                onValueChange={toggleNewAgileRatesNotification}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        )}

        {!isAgileTariff && (
          <View style={styles.noAgileContainer}>
            <Text style={styles.noAgileText}>
              Notifications are currently only available for Agile tariffs. Switch to an Agile tariff in settings to receive notifications when new rates are published.
            </Text>
          </View>
        )}
        
        <View style={styles.notificationHelp}>
          <Text style={styles.notificationHelpText}>
            💡 Tip: New Agile rates are typically published around 4pm each day for the following day.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
