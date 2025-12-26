import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, Flame, TrendingDown, TrendingUp, AlertCircle, X, RefreshCw, ChevronRight, ChevronLeft, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConsumption } from '@/providers/ConsumptionProvider';
import { useComparisonRate } from '@/hooks/useComparisonRate';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/providers/ThemeProvider';
import { DailyConsumption } from '@/types/energy';
import { getTariffDisplayName } from '@/utils/tariffNames';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type DateRangeType = 'last-month' | 'current-month' | 'custom';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function UsageScreen() {
  const {
    electricityDailyConsumption,
    gasDailyConsumption,
    isLoadingElectricity,
    isLoadingGas,
    refetchElectricityConsumption,
    refetchGasConsumption,
    apiKey,
    electricityMpan,
    gasMprn,
    dateRangeMode,
    setDateRangeMode,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    showGas,
    currentElectricityStandingCharge,
    currentGasStandingCharge,
    comparisonElectricityStandingCharge,
    comparisonGasStandingCharge,
    electricityComparisonAvailability,
    gasComparisonAvailability,
  } = useConsumption();
  
  const { comparisonElectricityTariffName, comparisonGasTariffName } = useComparisonRate();
  
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  const insets = useSafeAreaInsets();
  const [expandedFuelType, setExpandedFuelType] = useState<'electricity' | 'gas' | null>('electricity');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [showComparisonWarning, setShowComparisonWarning] = useState<boolean>(false);
  const [comparisonWarningType, setComparisonWarningType] = useState<'electricity' | 'gas'>('electricity');

  const handleFuelTypePress = (type: 'electricity' | 'gas') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFuelType(expandedFuelType === type ? null : type);
  };

  const handleDateRangePress = (type: DateRangeType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (type === 'last-month') {
      console.log('[UsageScreen] Setting mode to last-month');
      setDateRangeMode('last-month');
    } else if (type === 'current-month') {
      console.log('[UsageScreen] Setting mode to current-month');
      setDateRangeMode('current-month');
    } else if (type === 'custom') {
      setShowCustomModal(true);
    }
  };



  const refetchAll = () => {
    refetchElectricityConsumption();
    refetchGasConsumption();
  };

  const formatPrice = (price: number) => {
    return `£${price.toFixed(2)}`;
  };

  const formatConsumption = (consumption: number, type: 'electricity' | 'gas') => {
    return `${consumption.toFixed(2)} kWh`;
  };

  const hasConfiguration = apiKey && (electricityMpan || gasMprn);

  const handleDailyPress = (date: string, type: 'electricity' | 'gas') => {
    router.push({
      pathname: '/daily-detail' as const,
      params: { date, type },
    } as any);
  };

  const renderDailyConsumptionCard = (daily: DailyConsumption, type: 'electricity' | 'gas') => {
    const isSaving = daily.difference > 0;
    
    return (
      <Pressable 
        key={daily.date} 
        style={styles.dailyCard}
        onPress={() => handleDailyPress(daily.date, type)}
      >
        <View style={styles.dailyCardHeader}>
          <Text style={styles.dailyDate}>{daily.date}</Text>
          <Text style={styles.dailyConsumption}>
            {formatConsumption(daily.totalConsumption, type)}
          </Text>
        </View>

        <View style={styles.costComparisonContainer}>
          {type === 'electricity' && (
            <>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Current Tariff</Text>
                <Text style={styles.costValue}>{formatPrice(daily.cost)}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel} numberOfLines={1}>{getTariffDisplayName(comparisonElectricityTariffName, 'label')}</Text>
                <Text style={styles.costValue}>{formatPrice(daily.flexibleCost)}</Text>
              </View>
              <View style={[styles.costRow, styles.differenceRow]}>
                <View style={styles.differenceLabel}>
                  {isSaving ? (
                    <TrendingDown size={16} color="#10b981" />
                  ) : (
                    <TrendingUp size={16} color="#ef4444" />
                  )}
                  <Text style={styles.differenceText}>
                    {isSaving ? 'Saving' : 'Extra Cost'}
                  </Text>
                </View>
                <Text style={[
                  styles.differenceValue,
                  isSaving ? styles.savingValue : styles.extraValue
                ]}>
                  {formatPrice(Math.abs(daily.difference))}
                </Text>
              </View>
              <View style={styles.viewDetailsRow}>
                <Text style={styles.viewDetailsText}>View details</Text>
                <ChevronRight size={16} color={colors.primary} />
              </View>
            </>
          )}
          {type === 'gas' && (
            <>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Current Tariff</Text>
                <Text style={styles.costValue}>{formatPrice(daily.cost)}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel} numberOfLines={1}>{getTariffDisplayName(comparisonGasTariffName, 'label')}</Text>
                <Text style={styles.costValue}>{formatPrice(daily.flexibleCost)}</Text>
              </View>
              <View style={[styles.costRow, styles.differenceRow]}>
                <View style={styles.differenceLabel}>
                  {isSaving ? (
                    <TrendingDown size={16} color="#10b981" />
                  ) : (
                    <TrendingUp size={16} color="#ef4444" />
                  )}
                  <Text style={styles.differenceText}>
                    {isSaving ? 'Saving' : 'Extra Cost'}
                  </Text>
                </View>
                <Text style={[
                  styles.differenceValue,
                  isSaving ? styles.savingValue : styles.extraValue
                ]}>
                  {formatPrice(Math.abs(daily.difference))}
                </Text>
              </View>
              <View style={styles.viewDetailsRow}>
                <Text style={styles.viewDetailsText}>View details</Text>
                <ChevronRight size={16} color={colors.primary} />
              </View>
            </>
          )}
        </View>
      </Pressable>
    );
  };

  const filteredElectricityDailyConsumption = useMemo(() => {
    return electricityDailyConsumption;
  }, [electricityDailyConsumption]);

  const filteredGasDailyConsumption = useMemo(() => {
    return gasDailyConsumption;
  }, [gasDailyConsumption]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    refreshButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    refreshIconSpinning: {
      opacity: 0.5,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.surface,
    },
    dateRangeSelector: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dateRangeButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    dateRangeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dateRangeButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    dateRangeButtonTextActive: {
      color: colors.surface,
    },
    topSection: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.background,
    },
    fuelTypesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    fuelTypesContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    fuelTypeTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    fuelTypeBox: {
      width: 56,
      height: 56,
      backgroundColor: colors.surface,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fuelTypeBoxExpanded: {
      backgroundColor: colors.primary,
    },
    fuelTypeContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 20,
    },
    section: {
      gap: 12,
    },
    summaryContainer: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryItem: {
      flex: 1,
    },
    summaryItemLabel: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: '500' as const,
      marginBottom: 4,
    },
    summaryItemValue: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    totalSaving: {
      color: colors.success,
    },
    totalExtra: {
      color: colors.error,
    },
    dailyCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    dailyCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dailyDate: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    dailyConsumption: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.primary,
    },
    costComparisonContainer: {
      gap: 8,
    },
    costRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    costLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      fontWeight: '500' as const,
    },
    costValue: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    differenceRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      marginTop: 4,
    },
    differenceLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    differenceText: {
      fontSize: 14,
      color: colors.text.primary,
      fontWeight: '600' as const,
    },
    differenceValue: {
      fontSize: 17,
      fontWeight: '700' as const,
    },
    savingValue: {
      color: colors.success,
    },
    extraValue: {
      color: colors.error,
    },
    viewDetailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    viewDetailsText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 16,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text.primary,
      textAlign: 'center' as const,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center' as const,
      lineHeight: 24,
    },
    emptyDataContainer: {
      alignItems: 'center',
      padding: 40,
    },
    emptyDataText: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center' as const,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      gap: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalButtonCancel: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonConfirm: {
      backgroundColor: colors.primary,
    },
    modalButtonTextCancel: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    modalButtonTextConfirm: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.surface,
    },
    modalButtonDisabled: {
      backgroundColor: colors.border,
    },
    dateSelectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    dateSelectionBox: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    dateSelectionBoxActive: {
      borderColor: colors.primary,
    },
    dateSelectionLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.text.secondary,
      marginBottom: 4,
    },
    dateSelectionValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    dateSelectionPlaceholder: {
      color: colors.text.secondary,
    },
    dateSelectionDivider: {
      paddingHorizontal: 4,
    },
    dateSelectionDividerText: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    calendarContainer: {
      marginBottom: 16,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    calendarNavButton: {
      padding: 8,
      borderRadius: 8,
    },
    calendarNavButtonDisabled: {
      opacity: 0.4,
    },
    calendarMonthTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calendarDayLabel: {
      width: '14.28%',
      alignItems: 'center',
      paddingVertical: 8,
    },
    calendarDayLabelText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text.secondary,
    },
    calendarDay: {
      width: '14.28%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    calendarDaySelected: {
      backgroundColor: colors.primary,
      borderRadius: 20,
    },
    calendarDayInRange: {
      backgroundColor: isDark ? 'rgba(66, 165, 245, 0.2)' : 'rgba(37, 99, 235, 0.15)',
    },
    calendarDayDisabled: {
      opacity: 0.3,
    },
    calendarDayText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text.primary,
    },
    calendarDayTextSelected: {
      color: colors.surface,
      fontWeight: '700' as const,
    },
    calendarDayTextInRange: {
      color: colors.primary,
    },
    calendarDayTextDisabled: {
      color: colors.text.secondary,
    },
    standingChargeCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    standingChargeLabel: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: '500' as const,
      marginBottom: 4,
    },
    standingChargeValue: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.primary,
    },
    comparisonStandingCharge: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    comparisonStandingChargeLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      fontWeight: '500' as const,
      flex: 1,
    },
    comparisonStandingChargeValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    comparisonWarningBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#4A3800' : '#fef3c7',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 10,
      marginBottom: 12,
    },
    comparisonWarningText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: isDark ? '#FBB040' : '#92400e',
      flex: 1,
    },
    warningModalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 360,
      gap: 16,
    },
    warningModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    warningIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? '#4A3800' : '#fef3c7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    warningCloseButton: {
      padding: 4,
    },
    warningModalTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    warningModalDescription: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.text.secondary,
    },
    warningDetailBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      gap: 4,
    },
    warningDetailLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.text.secondary,
    },
    warningDetailValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    warningModalNote: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.text.secondary,
      fontStyle: 'italic' as const,
    },
    warningModalButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    warningModalButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.surface,
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
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Usage</Text>
            {hasConfiguration && (
              <Pressable
                style={styles.refreshButton}
                onPress={refetchAll}
                disabled={isLoadingElectricity || isLoadingGas}
              >
                <RefreshCw 
                  size={20} 
                  color={colors.surface} 
                  style={[isLoadingElectricity || isLoadingGas ? styles.refreshIconSpinning : null]}
                />
              </Pressable>
            )}
          </View>
        </LinearGradient>

        {!hasConfiguration ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={64} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>No Configuration</Text>
            <Text style={styles.emptyText}>
              Configure your API key and meter details in Settings to view consumption data
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.dateRangeSelector}>
              <Pressable
                style={[styles.dateRangeButton, dateRangeMode === 'last-month' && styles.dateRangeButtonActive]}
                onPress={() => handleDateRangePress('last-month')}
              >
                <Text style={[styles.dateRangeButtonText, dateRangeMode === 'last-month' && styles.dateRangeButtonTextActive]}>
                  Last Month
                </Text>
              </Pressable>
              <Pressable
                style={[styles.dateRangeButton, dateRangeMode === 'current-month' && styles.dateRangeButtonActive]}
                onPress={() => handleDateRangePress('current-month')}
              >
                <Text style={[styles.dateRangeButtonText, dateRangeMode === 'current-month' && styles.dateRangeButtonTextActive]}>
                  This Month
                </Text>
              </Pressable>
              <Pressable
                style={[styles.dateRangeButton, dateRangeMode === 'custom' && styles.dateRangeButtonActive]}
                onPress={() => handleDateRangePress('custom')}
              >
                <Text style={[styles.dateRangeButtonText, dateRangeMode === 'custom' && styles.dateRangeButtonTextActive]}>
                  Custom
                </Text>
              </Pressable>
            </View>

            <View style={styles.topSection}>
              <View style={styles.fuelTypesRow}>
                <View style={styles.fuelTypesContainer}>
                  {electricityMpan && (
                    <Pressable
                      style={[styles.fuelTypeBox, expandedFuelType === 'electricity' && styles.fuelTypeBoxExpanded]}
                      onPress={() => handleFuelTypePress('electricity')}
                    >
                      <View style={styles.fuelTypeContent}>
                        <Zap size={28} color={expandedFuelType === 'electricity' ? colors.surface : colors.primary} />
                      </View>
                    </Pressable>
                  )}

                  {showGas && gasMprn && (
                    <Pressable
                      style={[styles.fuelTypeBox, expandedFuelType === 'gas' && styles.fuelTypeBoxExpanded]}
                      onPress={() => handleFuelTypePress('gas')}
                    >
                      <View style={styles.fuelTypeContent}>
                        <Flame size={28} color={expandedFuelType === 'gas' ? colors.surface : colors.gasColor} />
                      </View>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.fuelTypeTitle}>
                  {expandedFuelType === 'electricity' ? 'Electricity Usage' : expandedFuelType === 'gas' ? 'Gas Usage' : ''}
                </Text>
              </View>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={isLoadingElectricity || isLoadingGas}
                  onRefresh={refetchAll}
                  tintColor={colors.primary}
                />
              }
            >
              {expandedFuelType === 'electricity' && filteredElectricityDailyConsumption.length > 0 && (
                <View style={styles.section}>
                  {!electricityComparisonAvailability.isAvailable && electricityComparisonAvailability.availableFrom && (
                    <Pressable 
                      style={styles.comparisonWarningBanner}
                      onPress={() => {
                        setComparisonWarningType('electricity');
                        setShowComparisonWarning(true);
                      }}
                    >
                      <Info size={18} color="#f59e0b" />
                      <Text style={styles.comparisonWarningText}>Comparison estimates - tap for details</Text>
                    </Pressable>
                  )}
                  {currentElectricityStandingCharge !== null && (
                    <View style={styles.standingChargeCard}>
                      <Text style={styles.standingChargeLabel}>Standing Charge</Text>
                      <Text style={styles.standingChargeValue}>{currentElectricityStandingCharge.toFixed(2)}p/day</Text>
                      {comparisonElectricityStandingCharge !== null && (
                        <View style={styles.comparisonStandingCharge}>
                          <Text style={styles.comparisonStandingChargeLabel} numberOfLines={1}>{getTariffDisplayName(comparisonElectricityTariffName, 'label')} Charge:</Text>
                          <Text style={styles.comparisonStandingChargeValue}>{comparisonElectricityStandingCharge.toFixed(2)}p/day</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemLabel}>Total Cost</Text>
                        <Text style={styles.summaryItemValue}>
                          {formatPrice(filteredElectricityDailyConsumption.reduce((sum: number, d: DailyConsumption) => sum + d.cost, 0))}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemLabel}>Total Usage</Text>
                        <Text style={styles.summaryItemValue}>
                          {filteredElectricityDailyConsumption.reduce((sum: number, d: DailyConsumption) => sum + d.totalConsumption, 0).toFixed(2)} kWh
                        </Text>
                      </View>
                    </View>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemLabel}>Total Saved</Text>
                        <Text style={[
                          styles.summaryItemValue,
                          filteredElectricityDailyConsumption.reduce((sum: number, d: DailyConsumption) => sum + d.difference, 0) > 0 
                            ? styles.totalSaving 
                            : styles.totalExtra
                        ]}>
                          {formatPrice(Math.abs(filteredElectricityDailyConsumption.reduce((sum: number, d: DailyConsumption) => sum + d.difference, 0)))}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemLabel}>Avg Rate</Text>
                        <Text style={styles.summaryItemValue}>
                          {(() => {
                            const totalConsumption = filteredElectricityDailyConsumption.reduce((sum: number, d: DailyConsumption) => sum + d.totalConsumption, 0);
                            const totalCostWithoutStanding = filteredElectricityDailyConsumption.reduce((sum: number, d: DailyConsumption) => {
                              const standingCharge = currentElectricityStandingCharge !== null ? currentElectricityStandingCharge / 100 : 0;
                              return sum + (d.cost - standingCharge);
                            }, 0);
                            const avgRate = totalConsumption > 0 ? (totalCostWithoutStanding / totalConsumption) * 100 : 0;
                            return `${avgRate.toFixed(2)}p`;
                          })()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {filteredElectricityDailyConsumption.map((daily: DailyConsumption) => renderDailyConsumptionCard(daily, 'electricity'))}
                </View>
              )}

              {expandedFuelType === 'gas' && filteredGasDailyConsumption.length > 0 && (
                <View style={styles.section}>
                  {!gasComparisonAvailability.isAvailable && gasComparisonAvailability.availableFrom && (
                    <Pressable 
                      style={styles.comparisonWarningBanner}
                      onPress={() => {
                        setComparisonWarningType('gas');
                        setShowComparisonWarning(true);
                      }}
                    >
                      <Info size={18} color="#f59e0b" />
                      <Text style={styles.comparisonWarningText}>Comparison estimates - tap for details</Text>
                    </Pressable>
                  )}
                  {currentGasStandingCharge !== null && (
                    <View style={styles.standingChargeCard}>
                      <Text style={styles.standingChargeLabel}>Standing Charge</Text>
                      <Text style={styles.standingChargeValue}>{currentGasStandingCharge.toFixed(2)}p/day</Text>
                      {comparisonGasStandingCharge !== null && (
                        <View style={styles.comparisonStandingCharge}>
                          <Text style={styles.comparisonStandingChargeLabel} numberOfLines={1}>{getTariffDisplayName(comparisonGasTariffName, 'label')} Charge:</Text>
                          <Text style={styles.comparisonStandingChargeValue}>{comparisonGasStandingCharge.toFixed(2)}p/day</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemLabel}>Total Cost</Text>
                        <Text style={styles.summaryItemValue}>
                          {formatPrice(filteredGasDailyConsumption.reduce((sum: number, d: DailyConsumption) => sum + d.cost, 0))}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemLabel}>Total Usage</Text>
                        <Text style={styles.summaryItemValue}>
                          {filteredGasDailyConsumption.reduce((sum: number, d: DailyConsumption) => sum + d.totalConsumption, 0).toFixed(2)} kWh
                        </Text>
                      </View>
                    </View>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemLabel}>Total Saved</Text>
                        <Text style={[
                          styles.summaryItemValue,
                          filteredGasDailyConsumption.reduce((sum: number, d: DailyConsumption) => sum + d.difference, 0) > 0 
                            ? styles.totalSaving 
                            : styles.totalExtra
                        ]}>
                          {formatPrice(Math.abs(filteredGasDailyConsumption.reduce((sum: number, d: DailyConsumption) => sum + d.difference, 0)))}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemLabel}>Avg Rate</Text>
                        <Text style={styles.summaryItemValue}>
                          {(() => {
                            const totalConsumption = filteredGasDailyConsumption.reduce((sum: number, d: DailyConsumption) => sum + d.totalConsumption, 0);
                            const totalCostWithoutStanding = filteredGasDailyConsumption.reduce((sum: number, d: DailyConsumption) => {
                              const standingCharge = currentGasStandingCharge !== null ? currentGasStandingCharge / 100 : 0;
                              return sum + (d.cost - standingCharge);
                            }, 0);
                            const avgRate = totalConsumption > 0 ? (totalCostWithoutStanding / totalConsumption) * 100 : 0;
                            return `${avgRate.toFixed(2)}p`;
                          })()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {filteredGasDailyConsumption.map((daily: DailyConsumption) => renderDailyConsumptionCard(daily, 'gas'))}
                </View>
              )}

              {expandedFuelType && (
                (expandedFuelType === 'electricity' && filteredElectricityDailyConsumption.length === 0) ||
                (expandedFuelType === 'gas' && filteredGasDailyConsumption.length === 0)
              ) && (
                <View style={styles.emptyDataContainer}>
                  <Text style={styles.emptyDataText}>
                    {isLoadingElectricity || isLoadingGas 
                      ? 'Loading consumption data...' 
                      : 'No consumption data available for selected period'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </>
        )}

        <CustomDateRangeModal
          visible={showCustomModal}
          onClose={() => setShowCustomModal(false)}
          currentStartDate={customStartDate}
          currentEndDate={customEndDate}
          onApply={(startDate, endDate) => {
            setCustomStartDate(startDate);
            setCustomEndDate(endDate);
            setDateRangeMode('custom');
            setShowCustomModal(false);
          }}
        />

        <ComparisonWarningModal
          visible={showComparisonWarning}
          onClose={() => setShowComparisonWarning(false)}
          fuelType={comparisonWarningType}
          comparisonTariffName={comparisonWarningType === 'electricity' ? comparisonElectricityTariffName : comparisonGasTariffName}
          availability={comparisonWarningType === 'electricity' ? electricityComparisonAvailability : gasComparisonAvailability}
        />
      </View>
    </>
  );
}

function ComparisonWarningModal({
  visible,
  onClose,
  fuelType,
  comparisonTariffName,
  availability,
}: {
  visible: boolean;
  onClose: () => void;
  fuelType: 'electricity' | 'gas';
  comparisonTariffName: string;
  availability: { isAvailable: boolean; availableFrom: Date | null; missingPeriods: { from: Date; to: Date }[] };
}) {
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    warningModalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 360,
      gap: 16,
    },
    warningModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    warningIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? '#4A3800' : '#fef3c7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    warningCloseButton: {
      padding: 4,
    },
    warningModalTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    warningModalDescription: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.text.secondary,
    },
    warningDetailBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      gap: 4,
    },
    warningDetailLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.text.secondary,
    },
    warningDetailValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    warningModalNote: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.text.secondary,
      fontStyle: 'italic' as const,
    },
    warningModalButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    warningModalButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.surface,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.warningModalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.warningModalHeader}>
            <View style={styles.warningIconContainer}>
              <Info size={24} color="#f59e0b" />
            </View>
            <Pressable onPress={onClose} style={styles.warningCloseButton}>
              <X size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <Text style={styles.warningModalTitle}>Comparison Estimate</Text>
          
          <Text style={styles.warningModalDescription}>
            The selected comparison tariff ({comparisonTariffName}) was not available for the entire date range you selected.
          </Text>

          {availability.availableFrom && (
            <View style={styles.warningDetailBox}>
              <Text style={styles.warningDetailLabel}>{comparisonTariffName} available from:</Text>
              <Text style={styles.warningDetailValue}>{formatDate(availability.availableFrom)}</Text>
            </View>
          )}

          {availability.missingPeriods.length > 0 && (
            <View style={styles.warningDetailBox}>
              <Text style={styles.warningDetailLabel}>Missing rates for:</Text>
              {availability.missingPeriods.map((period, index) => (
                <Text key={index} style={styles.warningDetailValue}>
                  {formatDate(period.from)} - {formatDate(period.to)}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.warningModalNote}>
            For periods where the comparison tariff was not available, savings calculations use the most recent available rate and are therefore estimates.
          </Text>

          <Pressable style={styles.warningModalButton} onPress={onClose}>
            <Text style={styles.warningModalButtonText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CustomDateRangeModal({
  visible,
  onClose,
  currentStartDate,
  currentEndDate,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  currentStartDate: Date | null;
  currentEndDate: Date | null;
  onApply: (startDate: Date, endDate: Date) => void;
}) {
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  const today = useMemo(() => new Date(), []);
  const [selectingStart, setSelectingStart] = useState<boolean>(true);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [viewingMonth, setViewingMonth] = useState<Date>(today);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  React.useEffect(() => {
    if (visible && !hasInitialized) {
      setTempStartDate(currentStartDate);
      setTempEndDate(currentEndDate);
      setViewingMonth(currentStartDate || today);
      setSelectingStart(true);
      setHasInitialized(true);
    } else if (!visible) {
      setHasInitialized(false);
    }
  }, [visible, hasInitialized, currentStartDate, currentEndDate, today]);

  const getDaysInMonth = useCallback((date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }, []);

  const handlePrevMonth = () => {
    setViewingMonth(new Date(viewingMonth.getFullYear(), viewingMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth() + 1, 1);
    if (nextMonth <= today) {
      setViewingMonth(nextMonth);
    }
  };

  const handleDayPress = (day: number) => {
    const selectedDate = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth(), day);
    
    if (selectingStart) {
      setTempStartDate(selectedDate);
      if (tempEndDate && selectedDate > tempEndDate) {
        setTempEndDate(null);
      }
      setSelectingStart(false);
    } else {
      if (tempStartDate && selectedDate < tempStartDate) {
        setTempStartDate(selectedDate);
        setTempEndDate(tempStartDate);
      } else {
        setTempEndDate(selectedDate);
      }
      setSelectingStart(true);
    }
  };

  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      onApply(tempStartDate, tempEndDate);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isDateInRange = (day: number) => {
    if (!tempStartDate || !tempEndDate) return false;
    const date = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth(), day);
    return date > tempStartDate && date < tempEndDate;
  };

  const isDateSelected = (day: number) => {
    const date = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth(), day);
    return (
      (tempStartDate && date.toDateString() === tempStartDate.toDateString()) ||
      (tempEndDate && date.toDateString() === tempEndDate.toDateString())
    );
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth(), day);
    return date > today;
  };

  const daysInMonth = getDaysInMonth(viewingMonth);
  const firstDay = getFirstDayOfMonth(viewingMonth);
  const canGoNext = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth() + 1, 1) <= today;

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      gap: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalButtonCancel: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonConfirm: {
      backgroundColor: colors.primary,
    },
    modalButtonTextCancel: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    modalButtonTextConfirm: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.surface,
    },
    modalButtonDisabled: {
      backgroundColor: colors.border,
    },
    dateSelectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    dateSelectionBox: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    dateSelectionBoxActive: {
      borderColor: colors.primary,
    },
    dateSelectionLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.text.secondary,
      marginBottom: 4,
    },
    dateSelectionValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    dateSelectionPlaceholder: {
      color: colors.text.secondary,
    },
    dateSelectionDivider: {
      paddingHorizontal: 4,
    },
    dateSelectionDividerText: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    calendarContainer: {
      marginBottom: 16,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    calendarNavButton: {
      padding: 8,
      borderRadius: 8,
    },
    calendarNavButtonDisabled: {
      opacity: 0.4,
    },
    calendarMonthTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calendarDayLabel: {
      width: '14.28%',
      alignItems: 'center',
      paddingVertical: 8,
    },
    calendarDayLabelText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text.secondary,
    },
    calendarDay: {
      width: '14.28%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    calendarDaySelected: {
      backgroundColor: colors.primary,
      borderRadius: 20,
    },
    calendarDayInRange: {
      backgroundColor: isDark ? 'rgba(66, 165, 245, 0.2)' : 'rgba(37, 99, 235, 0.15)',
    },
    calendarDayDisabled: {
      opacity: 0.3,
    },
    calendarDayText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text.primary,
    },
    calendarDayTextSelected: {
      color: colors.surface,
      fontWeight: '700' as const,
    },
    calendarDayTextInRange: {
      color: colors.primary,
    },
    calendarDayTextDisabled: {
      color: colors.text.secondary,
    },
  });

  const renderCalendar = () => {
    const days = [];
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 0; i < dayLabels.length; i++) {
      days.push(
        <View key={`label-${i}`} style={styles.calendarDayLabel}>
          <Text style={styles.calendarDayLabelText}>{dayLabels[i]}</Text>
        </View>
      );
    }

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const disabled = isDateDisabled(day);
      const selected = isDateSelected(day);
      const inRange = isDateInRange(day);

      days.push(
        <Pressable
          key={day}
          style={[
            styles.calendarDay,
            selected && styles.calendarDaySelected,
            inRange && styles.calendarDayInRange,
            disabled && styles.calendarDayDisabled,
          ]}
          onPress={() => !disabled && handleDayPress(day)}
          disabled={disabled}
        >
          <Text
            style={[
              styles.calendarDayText,
              selected && styles.calendarDayTextSelected,
              inRange && styles.calendarDayTextInRange,
              disabled && styles.calendarDayTextDisabled,
            ]}
          >
            {day}
          </Text>
        </Pressable>
      );
    }

    return days;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <Pressable onPress={onClose}>
              <X size={24} color={colors.text.primary} />
            </Pressable>
          </View>

          <View style={styles.dateSelectionRow}>
            <Pressable
              style={[
                styles.dateSelectionBox,
                selectingStart && styles.dateSelectionBoxActive,
              ]}
              onPress={() => setSelectingStart(true)}
            >
              <Text style={styles.dateSelectionLabel}>Start Date</Text>
              <Text style={[
                styles.dateSelectionValue,
                !tempStartDate && styles.dateSelectionPlaceholder,
              ]}>
                {formatDate(tempStartDate)}
              </Text>
            </Pressable>
            <View style={styles.dateSelectionDivider}>
              <Text style={styles.dateSelectionDividerText}>to</Text>
            </View>
            <Pressable
              style={[
                styles.dateSelectionBox,
                !selectingStart && styles.dateSelectionBoxActive,
              ]}
              onPress={() => setSelectingStart(false)}
            >
              <Text style={styles.dateSelectionLabel}>End Date</Text>
              <Text style={[
                styles.dateSelectionValue,
                !tempEndDate && styles.dateSelectionPlaceholder,
              ]}>
                {formatDate(tempEndDate)}
              </Text>
            </Pressable>
          </View>

          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={handlePrevMonth} style={styles.calendarNavButton}>
                <ChevronLeft size={20} color={colors.text.primary} />
              </Pressable>
              <Text style={styles.calendarMonthTitle}>
                {MONTHS[viewingMonth.getMonth()]} {viewingMonth.getFullYear()}
              </Text>
              <Pressable
                onPress={handleNextMonth}
                style={[styles.calendarNavButton, !canGoNext && styles.calendarNavButtonDisabled]}
                disabled={!canGoNext}
              >
                <ChevronRight size={20} color={canGoNext ? colors.text.primary : colors.text.secondary} />
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {renderCalendar()}
            </View>
          </View>

          <View style={styles.modalButtons}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalButton,
                styles.modalButtonConfirm,
                (!tempStartDate || !tempEndDate) && styles.modalButtonDisabled,
              ]}
              onPress={handleApply}
              disabled={!tempStartDate || !tempEndDate}
            >
              <Text style={styles.modalButtonTextConfirm}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
