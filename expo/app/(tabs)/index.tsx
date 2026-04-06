import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Stack, router, Link } from 'expo-router';
import { Zap, Flame, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import { useConsumption } from '@/providers/ConsumptionProvider';
import { useComparisonRate } from '@/hooks/useComparisonRate';
import { useAccessibleColors } from '@/hooks/useAccessibleStyles';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useForecast, useForecastOverlay } from '@/providers/ForecastProvider';
import { ProcessedRate } from '@/types/energy';
import { getRateThresholdLevel, getThresholdColor } from '@/utils/thresholds';
import { getTariffDisplayName } from '@/utils/tariffNames';
import { useTheme } from '@/providers/ThemeProvider';
import { RateLineChart } from '@/components/RateLineChart';
import { GridStatusCard } from '@/components/GridStatusCard';
import { AgileForecastCard } from '@/components/AgileForecastCard';
import { NetFluxTicker } from '@/components/NetFluxTicker';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const {
    currentElectricityRate,
    todayElectricityRates,
    tomorrowElectricityRates,
    currentGasRate,
    todayGasRates,
    tomorrowGasRates,
    isLoading,
    refetchElectricity,
    refetchGas,
    electricityThresholds,
    gasThresholds,
    selectedElectricityTariff,
    selectedRegion,
  } = useEnergyRates();
  
  const { showGas, showNetFlux, liveDemand } = useConsumption();
  
  const { comparisonElectricityRate, comparisonGasRate, comparisonElectricityTariffName, comparisonGasTariffName } = useComparisonRate();
  
  const { isDark } = useTheme();
  const { isHighContrast, scaleFontSize, scaleSpacing, isBoldText } = useAccessibility();
  const colors = useAccessibleColors();
  const insets = useSafeAreaInsets();
  const [expandedFuelType, setExpandedFuelType] = useState<'electricity' | 'gas' | null>('electricity');
  
  const handleFuelTypePress = useCallback((type: 'electricity' | 'gas') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFuelType(prev => prev === type ? null : type);
  }, []);

  const refetchAll = useCallback(() => {
    void refetchElectricity();
    void refetchGas();
  }, [refetchElectricity, refetchGas]);

  const getRateColor = useCallback((price: number, type: 'electricity' | 'gas') => {
    const thresholds = type === 'electricity' ? electricityThresholds : gasThresholds;
    const level = getRateThresholdLevel(price, thresholds);
    return getThresholdColor(level, isDark);
  }, [electricityThresholds, gasThresholds, isDark]);

  const formatPrice = useCallback((price: number) => {
    return `${price.toFixed(1)}p`;
  }, []);

  const isAgileTariff = useCallback((productCode: string) => {
    return productCode && productCode.toUpperCase().includes('AGILE');
  }, []);

  const isAgile = selectedElectricityTariff && isAgileTariff(selectedElectricityTariff);

  const { updateRegion, updateIsAgile } = useForecast();
  const { todayForecast, tomorrowForecast } = useForecastOverlay();

  useEffect(() => {
    if (selectedRegion) {
      updateRegion(selectedRegion);
    }
  }, [selectedRegion, updateRegion]);

  useEffect(() => {
    updateIsAgile(!!isAgile);
  }, [isAgile, updateIsAgile]);

  // Memoized calculations to prevent stutter
  const electricityCheaperPeriods = useMemo(() => {
    if (expandedFuelType !== 'electricity' || tomorrowElectricityRates.length === 0 || tomorrowGasRates.length === 0) return [];
    
    const gasPrice = tomorrowGasRates[0].price;
    const cheaperPeriods: { start: string; end: string; price: number }[] = [];
    let periodStart: string | null = null;
    let periodPrice = 0;
    
    tomorrowElectricityRates.forEach((rate: ProcessedRate, index: number) => {
      if (rate.price < gasPrice) {
        if (!periodStart) {
          periodStart = rate.time;
          periodPrice = rate.price;
        }
      } else if (periodStart) {
        cheaperPeriods.push({ start: periodStart, end: rate.time, price: periodPrice });
        periodStart = null;
      }
      if (index === tomorrowElectricityRates.length - 1 && periodStart) {
        cheaperPeriods.push({ start: periodStart, end: '00:00', price: periodPrice });
      }
    });
    return cheaperPeriods;
  }, [expandedFuelType, tomorrowElectricityRates, tomorrowGasRates]);

  const cardBorderWidth = isHighContrast ? 2 : 0;
  const baseSpacing = scaleSpacing(12);
  const cardGap = scaleSpacing(8);
  const fontWeightNormal = isBoldText ? '600' as const : '500' as const;
  const fontWeightBold = isBoldText ? '800' as const : '700' as const;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topSection: {
      paddingHorizontal: baseSpacing,
      paddingBottom: scaleSpacing(8),
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: scaleSpacing(8),
    },
    dashboardTitle: {
      fontSize: scaleFontSize(32),
      fontWeight: fontWeightBold,
    },
    settingsButton: {
      padding: scaleSpacing(8),
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fuelTypesContainer: {
      flexDirection: 'row',
      gap: scaleSpacing(8),
    },
    fuelTypeBox: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: scaleSpacing(10),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: cardBorderWidth,
      borderColor: colors.border,
    },
    fuelTypeBoxExpanded: {
      backgroundColor: colors.primary,
      transform: [{ scale: 1.02 }],
      borderColor: colors.primary,
    },
    fuelTypeContent: {
      alignItems: 'center',
      gap: scaleSpacing(8),
    },
    fuelTypeIconContainer: {
      width: scaleSpacing(48),
      height: scaleSpacing(48),
      borderRadius: scaleSpacing(24),
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fuelTypeIconContainerGas: {
      backgroundColor: colors.gasBackground,
    },
    fuelTypeLabel: {
      fontSize: scaleFontSize(13),
      color: colors.text.secondary,
      fontWeight: fontWeightNormal,
    },
    fuelTypeLabelExpanded: {
      color: '#FFFFFF',
    },
    fuelTypePrice: {
      fontSize: scaleFontSize(22),
      fontWeight: fontWeightBold,
      color: colors.text.primary,
    },
    fuelTypePriceExpanded: {
      color: '#FFFFFF',
    },
    fuelTypeNoData: {
      fontSize: scaleFontSize(14),
      color: colors.text.secondary,
      fontStyle: 'italic' as const,
    },
    fuelTypeNoDataExpanded: {
      color: '#FFFFFF',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: baseSpacing,
      paddingTop: scaleSpacing(8),
      paddingBottom: scaleSpacing(20),
      gap: cardGap,
    },
    barGraphCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: scaleSpacing(12),
      gap: scaleSpacing(8),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: cardBorderWidth,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: scaleFontSize(18),
      fontWeight: fontWeightBold,
      color: colors.text.primary,
      marginBottom: scaleSpacing(4),
    },
    chartContainer: {
      paddingVertical: scaleSpacing(12),
      gap: scaleSpacing(8),
    },
    barContainer: {
      alignItems: 'center',
      gap: scaleSpacing(8),
      minWidth: 50,
    },
    bar: {
      width: 36,
      borderRadius: 8,
    },
    barPrice: {
      fontSize: scaleFontSize(13),
      color: colors.text.secondary,
      fontWeight: fontWeightNormal,
    },
    barTime: {
      fontSize: scaleFontSize(13),
      color: colors.text.secondary,
    },
    barTimeCurrent: {
      color: colors.primary,
      fontWeight: fontWeightBold,
    },
    gasDailyRatesContainer: {
      flexDirection: 'row',
      gap: scaleSpacing(8),
    },
    dailyRateCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: scaleSpacing(14),
      alignItems: 'center',
      gap: scaleSpacing(8),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: cardBorderWidth,
      borderColor: colors.border,
    },
    dailyRateTitle: {
      fontSize: scaleFontSize(16),
      color: colors.text.secondary,
      fontWeight: fontWeightNormal,
      textTransform: 'uppercase' as const,
      letterSpacing: isHighContrast ? 1 : 0.5,
    },
    dailyRatePrice: {
      fontSize: scaleFontSize(34),
      fontWeight: fontWeightBold,
      color: colors.gasColor,
    },
    dailyRateDate: {
      fontSize: scaleFontSize(14),
      color: colors.text.secondary,
    },
    flexibleComparisonCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: scaleSpacing(14),
      gap: scaleSpacing(10),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: cardBorderWidth,
      borderColor: colors.border,
    },
    comparisonCardTitle: {
      fontSize: scaleFontSize(16),
      fontWeight: fontWeightBold,
      color: colors.text.primary,
      marginBottom: scaleSpacing(4),
    },
    flexibleRateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    flexibleLabel: {
      fontSize: scaleFontSize(14),
      color: colors.text.secondary,
      fontWeight: fontWeightNormal,
    },
    flexibleRate: {
      fontSize: scaleFontSize(16),
      fontWeight: fontWeightNormal,
      color: colors.text.primary,
    },
    flexibleDifferenceRow: {
      borderTopWidth: isHighContrast ? 2 : 1,
      borderTopColor: colors.border,
      paddingTop: scaleSpacing(10),
      marginTop: scaleSpacing(2),
    },
    flexibleDifferenceLabel: {
      fontSize: scaleFontSize(14),
      color: colors.text.primary,
      fontWeight: fontWeightBold,
    },
    flexibleDifference: {
      fontSize: scaleFontSize(18),
      fontWeight: fontWeightBold,
    },
    flexibleSaving: {
      color: colors.success,
    },
    flexibleExtra: {
      color: colors.error,
    },
    cheaperThanGasText: {
      fontWeight: fontWeightBold,
      color: colors.text.primary,
    },
    cheaperThanGasCard: {
      marginTop: scaleSpacing(8),
      paddingTop: scaleSpacing(8),
      borderTopWidth: isHighContrast ? 2 : 1,
    },
    cheaperThanGasTitle: {
      fontSize: scaleFontSize(15),
      fontWeight: fontWeightBold,
      marginBottom: scaleSpacing(12),
    },
    cheaperPeriodRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: scaleSpacing(6),
    },
    cheaperPeriodTime: {
      fontSize: scaleFontSize(15),
      fontWeight: fontWeightNormal,
    },
    cheaperPeriodPrice: {
      fontSize: scaleFontSize(15),
      fontWeight: fontWeightBold,
    },
    placeholderContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: scaleSpacing(40),
    },
    placeholderTitle: {
      fontSize: scaleFontSize(16),
      color: colors.text.secondary,
      textAlign: 'center' as const,
    },
  }), [colors, isDark, baseSpacing, cardGap, cardBorderWidth, fontWeightNormal, fontWeightBold, isHighContrast, scaleFontSize, scaleSpacing]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.container}>
        <View style={[styles.topSection, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.dashboardTitle, { color: colors.text.primary }]}>Dashboard</Text>
            <Link href="/settings" asChild>
              <Pressable style={styles.settingsButton} accessibilityRole="button" accessibilityLabel="Settings">
                <Settings size={24} color={colors.text.primary} />
              </Pressable>
            </Link>
          </View>
          <GridStatusCard colors={colors} isDark={isDark} />
          {showNetFlux && selectedElectricityTariff && isAgileTariff(selectedElectricityTariff) && (
            <>
              <View style={{ height: 6 }} />
              <NetFluxTicker
                importRate={currentElectricityRate?.price || null}
                exportRate={null}
                currentLoad={liveDemand}
                currentGeneration={null}
                colors={colors}
                isDark={isDark}
              />
            </>
          )}
          <View style={{ height: 8 }} />
          <View style={styles.fuelTypesContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: expandedFuelType === 'electricity' }}
              style={[styles.fuelTypeBox, expandedFuelType === 'electricity' && styles.fuelTypeBoxExpanded]}
              onPress={() => handleFuelTypePress('electricity')}
            >
              <View style={styles.fuelTypeContent}>
                <View style={styles.fuelTypeIconContainer}>
                  <Zap size={21} color={colors.primary} />
                </View>
                {currentElectricityRate ? (
                  <Text style={[styles.fuelTypePrice, expandedFuelType === 'electricity' && styles.fuelTypePriceExpanded]}>
                    {formatPrice(currentElectricityRate.price)}
                  </Text>
                ) : (
                  <Text style={[styles.fuelTypeNoData, expandedFuelType === 'electricity' && styles.fuelTypeNoDataExpanded]}>No data</Text>
                )}
              </View>
            </Pressable>

            {showGas && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: expandedFuelType === 'gas' }}
                style={[styles.fuelTypeBox, expandedFuelType === 'gas' && styles.fuelTypeBoxExpanded]}
                onPress={() => handleFuelTypePress('gas')}
              >
                <View style={styles.fuelTypeContent}>
                  <View style={[styles.fuelTypeIconContainer, styles.fuelTypeIconContainerGas]}>
                    <Flame size={21} color={colors.gasColor} />
                  </View>
                  {currentGasRate ? (
                    <Text style={[styles.fuelTypePrice, expandedFuelType === 'gas' && styles.fuelTypePriceExpanded]}>
                      {formatPrice(currentGasRate.price)}
                    </Text>
                  ) : (
                    <Text style={[styles.fuelTypeNoData, expandedFuelType === 'gas' && styles.fuelTypeNoDataExpanded]}>No data</Text>
                  )}
                </View>
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetchAll}
              tintColor={colors.primary}
            />
          }
        >
          {expandedFuelType && (() => {
            const isElectricity = expandedFuelType === 'electricity';
            const todayRates = isElectricity ? todayElectricityRates : todayGasRates;
            const tomorrowRates = isElectricity ? tomorrowElectricityRates : tomorrowGasRates;
            const comparisonRate = isElectricity ? comparisonElectricityRate : comparisonGasRate;
            const currentRate = isElectricity ? currentElectricityRate : currentGasRate;
            
            const allRatesSamePrice = (rates: ProcessedRate[]) => {
              if (rates.length <= 1) return true;
              const firstPrice = rates[0].price;
              return rates.every(r => Math.abs(r.price - firstPrice) < 0.01);
            };
            
            const isDailyRate = !isElectricity || 
              (todayRates.length > 0 && todayRates.length <= 4) || 
              (todayRates.length > 0 && allRatesSamePrice(todayRates));
            const isAgileExpanded = isElectricity && selectedElectricityTariff && isAgileTariff(selectedElectricityTariff);

            return todayRates.length > 0 ? (
              <>
                {isDailyRate ? (
                  <View style={styles.gasDailyRatesContainer}>
                    <View style={styles.dailyRateCard}>
                      <Text style={styles.dailyRateTitle}>Today</Text>
                      <Text style={[styles.dailyRatePrice, { color: isElectricity ? colors.primary : getRateColor(todayRates[0].price, 'gas') }]}>{formatPrice(todayRates[0].price)}</Text>
                      <Text style={styles.dailyRateDate}>{todayRates[0].time}</Text>
                    </View>
                    {tomorrowRates.length > 0 && (
                      <View style={styles.dailyRateCard}>
                        <Text style={styles.dailyRateTitle}>Tomorrow</Text>
                        <Text style={[styles.dailyRatePrice, { color: isElectricity ? colors.primary : getRateColor(tomorrowRates[0].price, 'gas') }]}>{formatPrice(tomorrowRates[0].price)}</Text>
                        <Text style={styles.dailyRateDate}>{tomorrowRates[0].time}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    <Pressable style={styles.barGraphCard} onPress={() => isElectricity ? router.push('/electricity-detail') : undefined}>
                      <Text style={styles.sectionTitle}>Today&apos;s Rates</Text>
                      <RateLineChart 
                        rates={todayRates} 
                        type={expandedFuelType} 
                        colors={colors}
                        getRateColor={getRateColor}
                        allFutureRates={tomorrowRates}
                        forecastRates={isAgileExpanded ? todayForecast : undefined}
                      />
                    </Pressable>

                    {tomorrowRates.length > 0 && (
                      <Pressable style={styles.barGraphCard} onPress={() => isElectricity ? router.push('/electricity-detail') : undefined}>
                        <Text style={styles.sectionTitle}>Tomorrow&apos;s Rates</Text>
                        <RateLineChart 
                          rates={tomorrowRates} 
                          type={expandedFuelType} 
                          colors={colors}
                          getRateColor={getRateColor}
                          forecastRates={isAgileExpanded ? tomorrowForecast : undefined}
                        />
                        
                        {isAgileExpanded && electricityCheaperPeriods.length > 0 && tomorrowGasRates.length > 0 && (
                          <View style={[styles.cheaperThanGasCard, { borderTopColor: colors.border }]}>
                            <Text style={[styles.cheaperThanGasTitle, { color: colors.text.primary }]}>Cheaper Than Gas ({formatPrice(tomorrowGasRates[0].price)})</Text>
                            {electricityCheaperPeriods.map((period, idx) => (
                              <View key={idx} style={styles.cheaperPeriodRow}>
                                <Text style={[styles.cheaperPeriodTime, { color: colors.success }]}>
                                  {period.start} - {period.end}
                                </Text>
                                <Text style={[styles.cheaperPeriodPrice, { color: colors.success }]}>
                                  {formatPrice(period.price)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </Pressable>
                    )}
                  </>
                )}

                {comparisonRate && currentRate && (
                  <View style={styles.flexibleComparisonCard}>
                    <Text style={styles.comparisonCardTitle}>Tariff Rate Comparison</Text>
                    <View style={styles.flexibleRateRow}>
                      <Text style={styles.flexibleLabel} numberOfLines={1}>{getTariffDisplayName(isElectricity ? comparisonElectricityTariffName : comparisonGasTariffName, 'comparison')}</Text>
                      <Text style={styles.flexibleRate}>{formatPrice(comparisonRate)}</Text>
                    </View>
                    <View style={styles.flexibleRateRow}>
                      <Text style={styles.flexibleLabel}>Current Tariff</Text>
                      <Text style={styles.flexibleRate}>{formatPrice(currentRate.price)}</Text>
                    </View>
                    <View style={styles.flexibleDifferenceRow}>
                      <Text style={styles.flexibleDifferenceLabel}>Difference</Text>
                      <Text style={[
                        styles.flexibleDifference,
                        currentRate.price < comparisonRate ? styles.flexibleSaving : styles.flexibleExtra
                      ]}>
                        {formatPrice(Math.abs(currentRate.price - comparisonRate))} {currentRate.price < comparisonRate ? 'cheaper' : 'more expensive'}
                      </Text>
                    </View>
                  </View>
                )}

                {isAgileExpanded && (
                  <>
                    <AgileForecastCard
                      region={selectedRegion}
                      colors={colors}
                      isDark={isDark}
                      thresholds={electricityThresholds}
                      tomorrowRatesAvailable={tomorrowElectricityRates.length > 0}
                    />
                  </>
                )}
              </>
            ) : (
               <View style={styles.placeholderContainer}>
                 <Text style={styles.placeholderTitle}>No Data Available</Text>
               </View>
            );
          })()}
        </ScrollView>
      </View>
    </>
  );
}