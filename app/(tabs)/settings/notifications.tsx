import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { Bell, Zap, Clock, Target } from 'lucide-react-native';

import { useConsumption } from '@/providers/ConsumptionProvider';
import { useNotificationSettings } from '@/providers/NotificationSettingsProvider';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/providers/ThemeProvider';

export default function NotificationPreferencesScreen() {
  const { selectedElectricityTariff } = useConsumption();
  const {
    notificationSettings,
    toggleNewAgileRatesNotification,
    priceAlertSettings,
    togglePriceAlerts,
    setTargetPrice,
    setAdvanceMinutes,
    getPriceAlertInfo,
  } = useNotificationSettings();
  
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  
  const [targetPriceInput, setTargetPriceInput] = useState(priceAlertSettings?.targetPrice?.toString() || '5');
  const [alertStatus, setAlertStatus] = useState<{ scheduled: number; targetPrice: number } | null>(null);

  const isAgileTariff = selectedElectricityTariff?.productCode?.toUpperCase().includes('AGILE') || false;

  useEffect(() => {
    if (priceAlertSettings?.targetPrice) {
      setTargetPriceInput(priceAlertSettings.targetPrice.toString());
    }
  }, [priceAlertSettings?.targetPrice]);

  useEffect(() => {
    const loadAlertStatus = async () => {
      const status = await getPriceAlertInfo();
      setAlertStatus(status);
    };
    loadAlertStatus();
  }, [getPriceAlertInfo, priceAlertSettings?.enabled]);

  const handleTargetPriceChange = (text: string) => {
    setTargetPriceInput(text);
    const value = parseFloat(text);
    if (!isNaN(value) && value > 0 && value <= 100) {
      setTargetPrice(value);
    }
  };

  const advanceOptions = [5, 10, 15, 30];

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
      gap: 16,
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
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: colors.text.primary,
      flex: 1,
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
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    settingLabel: {
      fontSize: 15,
      color: colors.text.primary,
      fontWeight: '500' as const,
    },
    settingDescription: {
      fontSize: 13,
      color: colors.text.secondary,
      marginTop: 4,
      lineHeight: 18,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    priceInput: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      color: colors.text.primary,
      width: 70,
      textAlign: 'center' as const,
      fontWeight: '600' as const,
    },
    inputSuffix: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    advanceOptionsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    advanceOption: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
    },
    advanceOptionActive: {
      backgroundColor: colors.primary,
    },
    advanceOptionText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.secondary,
    },
    advanceOptionTextActive: {
      color: '#FFFFFF',
    },
    statusBadge: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusText: {
      fontSize: 13,
      color: colors.success || '#22c55e',
      fontWeight: '500' as const,
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {Platform.OS === 'web' && (
          <View style={styles.noAgileContainer}>
            <Text style={styles.noAgileText}>
              Push notifications are not available on web. Use the mobile app to receive price alerts.
            </Text>
          </View>
        )}

        {Platform.OS !== 'web' && isAgileTariff && (
          <>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Bell size={18} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>New Rates Alert</Text>
                <Switch
                  value={notificationSettings.notifyNewAgileRates}
                  onValueChange={toggleNewAgileRatesNotification}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
              <Text style={styles.agileItemDescription}>
                Get notified when tomorrow&apos;s Agile rates are published (usually around 4pm).
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)' }]}>
                  <Target size={18} color={colors.success || '#22c55e'} />
                </View>
                <Text style={styles.sectionTitle}>Smart Price Alerts</Text>
                <Switch
                  value={priceAlertSettings?.enabled || false}
                  onValueChange={togglePriceAlerts}
                  trackColor={{ false: colors.border, true: colors.success || '#22c55e' }}
                  thumbColor={colors.surface}
                />
              </View>
              
              <Text style={styles.agileItemDescription}>
                Get notified before cheap energy slots. Set your target price and we&apos;ll alert you in advance.
              </Text>

              {priceAlertSettings?.enabled && (
                <>
                  <View style={styles.divider} />
                  
                  <View>
                    <View style={styles.settingRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.settingLabel}>Target Price</Text>
                        <Text style={styles.settingDescription}>
                          Alert when price drops below this value
                        </Text>
                      </View>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.priceInput}
                          value={targetPriceInput}
                          onChangeText={handleTargetPriceChange}
                          keyboardType="decimal-pad"
                          maxLength={5}
                          selectTextOnFocus
                        />
                        <Text style={styles.inputSuffix}>p/kWh</Text>
                      </View>
                    </View>
                  </View>

                  <View>
                    <View style={styles.settingRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Clock size={14} color={colors.text.secondary} />
                          <Text style={styles.settingLabel}>Advance Notice</Text>
                        </View>
                        <Text style={styles.settingDescription}>
                          How early to notify before the slot starts
                        </Text>
                      </View>
                    </View>
                    <View style={styles.advanceOptionsContainer}>
                      {advanceOptions.map((mins) => (
                        <Pressable
                          key={mins}
                          style={[
                            styles.advanceOption,
                            priceAlertSettings?.advanceMinutes === mins && styles.advanceOptionActive,
                          ]}
                          onPress={() => setAdvanceMinutes(mins)}
                        >
                          <Text
                            style={[
                              styles.advanceOptionText,
                              priceAlertSettings?.advanceMinutes === mins && styles.advanceOptionTextActive,
                            ]}
                          >
                            {mins}m
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {alertStatus && alertStatus.scheduled > 0 && (
                    <View style={styles.statusBadge}>
                      <Zap size={14} color={colors.success || '#22c55e'} />
                      <Text style={styles.statusText}>
                        {alertStatus.scheduled} alert{alertStatus.scheduled > 1 ? 's' : ''} scheduled for prices below {alertStatus.targetPrice}p
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {Platform.OS !== 'web' && !isAgileTariff && (
          <View style={styles.noAgileContainer}>
            <Text style={styles.noAgileText}>
              Smart notifications are available for Agile tariffs. Switch to an Agile tariff to receive price alerts and rate notifications.
            </Text>
          </View>
        )}
        
        <View style={styles.notificationHelp}>
          <Text style={styles.notificationHelpText}>
            💡 Tip: Price alerts use predicted rates from Agile Predict. Set a target like 5p to catch the cheapest overnight slots for running appliances.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
