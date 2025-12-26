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
import { Zap, Flame, ChevronRight, Palette, GitCompare, Bell, User, CheckCircle, Calculator, Trash2, FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

import { useConsumption, ELECTRICITY_COMPARISON_TARIFFS, GAS_COMPARISON_TARIFFS } from '@/providers/ConsumptionProvider';
import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import { useNotificationSettings } from '@/providers/NotificationSettingsProvider';
import { requestNotificationPermissions, getNotificationPermissionStatus, cancelAllNotifications, clearNotificationCache } from '@/services/notificationService';
import { useColors } from '@/constants/colors';
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
  } = useConsumption();
  
  const {
    notificationSettings,
    toggleNotifications,
  } = useNotificationSettings();
  
  const { clearRatesCache } = useEnergyRates();
  
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isClearingCache, setIsClearingCache] = useState(false);
  
  const { isDark } = useTheme();
  const colors = useColors(isDark);
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

  const formatTariffDate = (date: Date | null): string => {
    if (!date) return 'Present';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.surface,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 24,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.secondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
    },
    settingItemDisabled: {
      opacity: 0.5,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
      fontSize: 14,
      color: colors.text.secondary,
      fontWeight: '500' as const,
    },
    settingValue: {
      fontSize: 16,
      color: colors.text.primary,
      fontWeight: '600' as const,
    },
    accountInfoCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    accountInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    accountInfoLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    accountInfoValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    comparisonHelpText: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
      paddingHorizontal: 4,
      marginTop: 4,
    },
    notificationStatusContainer: {
      gap: 12,
      marginTop: 4,
    },
    permissionStatus: {
      backgroundColor: '#d1fae5',
      borderRadius: 12,
      padding: 12,
    },
    permissionDeniedStatus: {
      backgroundColor: '#fee2e2',
    },
    permissionGrantedText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#065f46',
    },
    permissionDeniedText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#991b1b',
      marginBottom: 8,
    },
    openSettingsButton: {
      backgroundColor: '#dc2626',
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    openSettingsButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.surface,
    },
    versionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      gap: 4,
    },
    versionLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      fontWeight: '500' as const,
    },
    versionValue: {
      fontSize: 18,
      fontWeight: '700' as const,
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
                    {getTariffDisplayName(ELECTRICITY_COMPARISON_TARIFFS.find(t => t.code === electricityComparisonTariff)?.displayName || 'Flexible Octopus', 'label')}
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
                        {getTariffDisplayName(GAS_COMPARISON_TARIFFS.find(t => t.code === gasComparisonTariff)?.displayName || 'Flexible Octopus', 'label')}
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
              <Text style={styles.versionValue}>1.0.5</Text>
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

