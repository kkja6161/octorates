import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, Flame, ChevronRight, Palette, GitCompare, Bell, User, CheckCircle, Calculator, Trash2, FileText, Accessibility, Activity } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

import { useConsumption, ELECTRICITY_COMPARISON_TARIFFS, GAS_COMPARISON_TARIFFS } from '@/providers/ConsumptionProvider';
import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import { useNotificationSettings } from '@/providers/NotificationSettingsProvider';
import { requestNotificationPermissions, getNotificationPermissionStatus, cancelAllNotifications, clearNotificationCache } from '@/services/notificationService';
import { useAccessibleColors } from '@/hooks/useAccessibleStyles';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { GSP_REGIONS } from '@/types/energy';
import { getTariffDisplayName } from '@/utils/tariffNames';

export default function SettingsScreen() {
  const router = useRouter();
  
  const {
    accountNumber,
    accountData,
    hasAccountData,
    selectedRegion,
    selectedElectricityTariff,
    selectedGasTariff,
    electricityComparisonTariff,
    gasComparisonTariff,
    showGas,
    setShowGas,
    showNetFlux,
    setShowNetFlux,
    electricityAgreements,
    gasAgreements,
    availableElectricityProducts,
    availableGasProducts,
  } = useConsumption();
  
  const {
    notificationSettings,
    toggleNotifications,
  } = useNotificationSettings();
  
  const { clearRatesCache } = useEnergyRates();
  
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isClearingCache, setIsClearingCache] = useState(false);
  
  const { isDark } = useTheme();
  const { isHighContrast, scaleFontSize, scaleSpacing, isBoldText } = useAccessibility();
  const colors = useAccessibleColors();
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS !== 'web') {
        const status = await getNotificationPermissionStatus();
        setNotificationPermissionStatus(status);
      }
    };
    checkPermissions();
  }, []);
  
  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached energy rates and notification data. The app will fetch fresh data on next load. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            try {
              await clearRatesCache();
              await cancelAllNotifications();
              await clearNotificationCache();
              Alert.alert('Success', 'Cache cleared successfully. Pull down to refresh data.');
            } catch (error) {
              console.error('[Settings] Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            } finally {
              setIsClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled && Platform.OS !== 'web') {
      const status = await requestNotificationPermissions();
      setNotificationPermissionStatus(status);
      
      if (status === 'denied') {
        Alert.alert(
          'Permission Denied',
          'Notifications are disabled. Please enable them in your device Settings app to receive price alerts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return;
      }
      
      if (status !== 'granted') {
        return;
      }
    }
    
    toggleNotifications(enabled);
  };
  
  const selectedRegionName = GSP_REGIONS.find(r => r.code === selectedRegion)?.name || 'Unknown';

  const getComparisonTariffDisplayName = (code: string, type: 'electricity' | 'gas'): string => {
    const staticList = type === 'electricity' ? ELECTRICITY_COMPARISON_TARIFFS : GAS_COMPARISON_TARIFFS;
    const staticMatch = staticList.find(t => t.code === code);
    if (staticMatch) return staticMatch.displayName;

    const agreements = type === 'electricity' ? electricityAgreements : gasAgreements;
    const agreementMatch = agreements.find(a => a.productCode === code);
    if (agreementMatch) return agreementMatch.displayName;

    const products = type === 'electricity' ? availableElectricityProducts : availableGasProducts;
    const productMatch = products.find(p => p.code === code);
    if (productMatch) return productMatch.displayName;

    return code;
  };

  const formatTariffDate = (date: Date | null): string => {
    if (!date) return 'Present';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const cardBorderWidth = isHighContrast ? 2 : 0;
  const baseSpacing = scaleSpacing(16);
  const fontWeightNormal = isBoldText ? '600' as const : '500' as const;
  const fontWeightBold = isBoldText ? '800' as const : '700' as const;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: scaleSpacing(20),
      paddingBottom: baseSpacing,
    },
    headerTitle: {
      fontSize: scaleFontSize(24),
      fontWeight: fontWeightBold,
      color: colors.surface,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: scaleSpacing(20),
      gap: scaleSpacing(24),
    },
    section: {
      gap: scaleSpacing(12),
    },
    sectionTitle: {
      fontSize: scaleFontSize(14),
      fontWeight: fontWeightNormal,
      color: colors.text.secondary,
      textTransform: 'uppercase' as const,
      letterSpacing: isHighContrast ? 1 : 0.5,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: baseSpacing,
      borderRadius: 12,
      minHeight: 44,
      borderWidth: cardBorderWidth,
      borderColor: colors.border,
    },
    settingItemDisabled: {
      opacity: 0.5,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleSpacing(12),
      flex: 1,
    },
    iconContainer: {
      width: scaleSpacing(40),
      height: scaleSpacing(40),
      borderRadius: scaleSpacing(20),
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingTextContainer: {
      flex: 1,
      gap: 2,
    },
    settingLabel: {
      fontSize: scaleFontSize(14),
      color: colors.text.secondary,
      fontWeight: fontWeightNormal,
    },
    settingValue: {
      fontSize: scaleFontSize(16),
      color: colors.text.primary,
      fontWeight: fontWeightNormal,
    },
    accountInfoCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: baseSpacing,
      gap: scaleSpacing(12),
      borderWidth: cardBorderWidth,
      borderColor: colors.border,
    },
    accountInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    accountInfoLabel: {
      fontSize: scaleFontSize(14),
      color: colors.text.secondary,
    },
    accountInfoValue: {
      fontSize: scaleFontSize(14),
      fontWeight: fontWeightNormal,
      color: colors.text.primary,
    },
    comparisonHelpText: {
      fontSize: scaleFontSize(13),
      color: colors.text.secondary,
      lineHeight: scaleFontSize(18),
      paddingHorizontal: 4,
      marginTop: 4,
    },
    notificationStatusContainer: {
      gap: scaleSpacing(12),
      marginTop: 4,
    },
    permissionStatus: {
      backgroundColor: isHighContrast ? '#a7f3d0' : '#d1fae5',
      borderRadius: 12,
      padding: scaleSpacing(12),
      borderWidth: cardBorderWidth,
      borderColor: '#065f46',
    },
    permissionDeniedStatus: {
      backgroundColor: isHighContrast ? '#fecaca' : '#fee2e2',
      borderColor: '#991b1b',
    },
    permissionGrantedText: {
      fontSize: scaleFontSize(14),
      fontWeight: fontWeightNormal,
      color: '#065f46',
    },
    permissionDeniedText: {
      fontSize: scaleFontSize(14),
      fontWeight: fontWeightNormal,
      color: '#991b1b',
      marginBottom: scaleSpacing(8),
    },
    openSettingsButton: {
      backgroundColor: '#dc2626',
      padding: scaleSpacing(10),
      borderRadius: 8,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    openSettingsButtonText: {
      fontSize: scaleFontSize(14),
      fontWeight: fontWeightNormal,
      color: colors.surface,
    },
    versionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: baseSpacing,
      alignItems: 'center',
      gap: 4,
      borderWidth: cardBorderWidth,
      borderColor: colors.border,
    },
    versionLabel: {
      fontSize: scaleFontSize(12),
      color: colors.text.secondary,
      fontWeight: fontWeightNormal,
    },
    versionValue: {
      fontSize: scaleFontSize(18),
      fontWeight: fontWeightBold,
      color: colors.text.primary,
    },
  });

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
          <Text style={styles.headerTitle}>Settings</Text>
        </LinearGradient>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <Pressable 
              onPress={() => router.push('/settings/account')}
              style={styles.settingItem}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#e0f2fe' }]}>
                  <User size={20} color='#0284c7' />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Octopus Account</Text>
                  <Text style={styles.settingValue} numberOfLines={1}>
                    {hasAccountData ? accountNumber : 'Not configured'}
                  </Text>
                </View>
              </View>
              {hasAccountData ? (
                <CheckCircle size={20} color="#10b981" />
              ) : (
                <ChevronRight size={20} color={colors.text.secondary} />
              )}
            </Pressable>
            
            {hasAccountData && (
              <View style={styles.accountInfoCard}>
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountInfoLabel}>Region</Text>
                  <Text style={styles.accountInfoValue}>{selectedRegionName}</Text>
                </View>
                {accountData?.movedInAt && (
                  <View style={styles.accountInfoRow}>
                    <Text style={styles.accountInfoLabel}>Data Available From</Text>
                    <Text style={styles.accountInfoValue}>
                      {formatTariffDate(accountData.movedInAt)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Electricity</Text>
            
            <Pressable 
              onPress={() => router.push('/settings/electricity-tariff')}
              style={[styles.settingItem, !hasAccountData && styles.settingItemDisabled]}
              disabled={!hasAccountData}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                  <Zap size={20} color={colors.primary} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Electricity Tariff</Text>
                  <Text style={styles.settingValue} numberOfLines={1}>
                    {selectedElectricityTariff?.displayName || 'Set up account first'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.text.secondary} />
            </Pressable>
            
            <Pressable 
              onPress={() => router.push('/settings/electricity-comparison')}
              style={styles.settingItem}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
                  <GitCompare size={20} color='#16a34a' />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Compare Against</Text>
                  <Text style={styles.settingValue} numberOfLines={1}>
                    {getTariffDisplayName(getComparisonTariffDisplayName(electricityComparisonTariff, 'electricity'), 'label')}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.text.secondary} />
            </Pressable>
            
            <Pressable 
              onPress={() => router.push('/settings/electricity-thresholds')}
              style={styles.settingItem}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Palette size={20} color='#3b82f6' />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Rate Thresholds</Text>
                  <Text style={styles.settingValue}>Configure color coding</Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gas</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
                  <Flame size={20} color='#f59e0b' />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Show Gas</Text>
                  <Text style={styles.settingValue}>
                    {showGas ? 'Rates and usage visible' : 'Hidden'}
                  </Text>
                </View>
              </View>
              <Switch
                value={showGas}
                onValueChange={setShowGas}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            {showGas && (
              <>
                <Pressable 
                  onPress={() => router.push('/settings/gas-tariff')}
                  style={[styles.settingItem, !hasAccountData && styles.settingItemDisabled]}
                  disabled={!hasAccountData}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
                      <Flame size={20} color='#f59e0b' />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>Gas Tariff</Text>
                      <Text style={styles.settingValue} numberOfLines={1}>
                        {selectedGasTariff?.displayName || 'Set up account first'}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.text.secondary} />
                </Pressable>
                
                <Pressable 
                  onPress={() => router.push('/settings/gas-comparison')}
                  style={styles.settingItem}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
                      <GitCompare size={20} color='#16a34a' />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>Compare Against</Text>
                      <Text style={styles.settingValue} numberOfLines={1}>
                        {getTariffDisplayName(getComparisonTariffDisplayName(gasComparisonTariff, 'gas'), 'label')}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.text.secondary} />
                </Pressable>
                
                <Pressable 
                  onPress={() => router.push('/settings/gas-thresholds')}
                  style={styles.settingItem}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: '#fed7aa' }]}>
                      <Palette size={20} color='#ea580c' />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>Rate Thresholds</Text>
                      <Text style={styles.settingValue}>Configure color coding</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.text.secondary} />
                </Pressable>
                
                <Pressable 
                  onPress={() => router.push('/settings/gas-conversion')}
                  style={styles.settingItem}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
                      <Calculator size={20} color='#f59e0b' />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>Gas Conversion</Text>
                      <Text style={styles.settingValue}>m³ to kWh formula</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.text.secondary} />
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            
            <Pressable 
              onPress={() => router.push('/settings/theme')}
              style={styles.settingItem}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#3A3A3C' : '#F3F4F6' }]}>
                  <Palette size={20} color={colors.primary} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Theme</Text>
                  <Text style={styles.settingValue}>
                    {isDark ? 'Dark' : 'Light'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.text.secondary} />
            </Pressable>
            
            <Pressable 
              onPress={() => router.push('/settings/accessibility')}
              style={styles.settingItem}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#e0e7ff' }]}>
                  <Accessibility size={20} color="#6366f1" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Accessibility</Text>
                  <Text style={styles.settingValue}>
                    {isHighContrast ? 'High Contrast' : 'Standard'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dashboard</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
                  <Activity size={20} color="#16a34a" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Net Flux Card</Text>
                  <Text style={styles.settingValue}>
                    {showNetFlux ? 'Visible on dashboard' : 'Hidden'}
                  </Text>
                </View>
              </View>
              <Switch
                value={showNetFlux}
                onValueChange={setShowNetFlux}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
            
            <Text style={styles.comparisonHelpText}>
              The Net Flux card shows real-time cost/earnings flow for Agile tariff users.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Bell size={20} color='#3b82f6' />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Price Alerts</Text>
                  <Text style={styles.settingValue}>
                    {notificationSettings.enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.enabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            {notificationSettings.enabled && (
              <Pressable 
                onPress={() => router.push('/settings/notifications')}
                style={styles.settingItem}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>  
                    <Text style={{ fontSize: 20 }}>🔔</Text>
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Configure Alerts</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.text.secondary} />
              </Pressable>
            )}

            <View style={styles.notificationStatusContainer}>
              {notificationPermissionStatus === 'granted' && notificationSettings.enabled && (
                <View style={styles.permissionStatus}>
                  <Text style={styles.permissionGrantedText}>✓ Notifications enabled</Text>
                </View>
              )}
              {notificationPermissionStatus === 'denied' && notificationSettings.enabled && (
                <View style={[styles.permissionStatus, styles.permissionDeniedStatus]}>
                  <Text style={styles.permissionDeniedText}>⚠ Permission denied. Tap to open settings.</Text>
                  <Pressable
                    style={styles.openSettingsButton}
                    onPress={() => {
                      if (Platform.OS === 'ios') {
                        Linking.openURL('app-settings:');
                      } else {
                        Linking.openSettings();
                      }
                    }}
                  >
                    <Text style={styles.openSettingsButtonText}>Open Settings</Text>
                  </Pressable>
                </View>
              )}
              <Text style={styles.comparisonHelpText}>
                Get notified 15 minutes before prices reach your chosen thresholds. Requires notification permissions.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            
            <Pressable 
              onPress={() => router.push('/privacy')}
              style={styles.settingItem}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#f3e8ff' }]}>  
                  <FileText size={20} color='#9333ea' />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Privacy Policy</Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.text.secondary} />
            </Pressable>

            <View style={styles.versionCard}>
              <Text style={styles.versionLabel}>Version</Text>
              <Text style={styles.versionValue}></Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data & Storage</Text>
            
            <Pressable 
              onPress={handleClearCache}
              style={[styles.settingItem, isClearingCache && styles.settingItemDisabled]}
              disabled={isClearingCache}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                  <Trash2 size={20} color="#dc2626" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Clear Cache</Text>
                  <Text style={styles.settingValue}>
                    {isClearingCache ? 'Clearing...' : 'Clear cached rates & notifications'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.text.secondary} />
            </Pressable>
            
            <Text style={styles.comparisonHelpText}>
              Clear cached data if you experience issues with rates or notifications. Fresh data will be fetched on next app load.
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

