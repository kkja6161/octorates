import React, { useState, useRef, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { Stack, router, Link } from 'expo-router';
import { Zap, Flame, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';

import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import { useConsumption } from '@/providers/ConsumptionProvider';
import { useComparisonRate } from '@/hooks/useComparisonRate';
import { useColors } from '@/constants/colors';
import { ProcessedRate } from '@/types/energy';
import { getRateThresholdLevel, getThresholdColor } from '@/utils/thresholds';
import { getTariffDisplayName } from '@/utils/tariffNames';
import { useTheme } from '@/providers/ThemeProvider';

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
  } = useEnergyRates();
  
  const { showGas } = useConsumption();
  
  const { comparisonElectricityRate, comparisonGasRate, comparisonElectricityTariffName, comparisonGasTariffName } = useComparisonRate();
  
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  const insets = useSafeAreaInsets();
  const [expandedFuelType, setExpandedFuelType] = useState<'electricity' | 'gas' | null>('electricity');
  const todayRatesScrollRef = useRef<ScrollView>(null);
  
  const handleFuelTypePress = (type: 'electricity' | 'gas') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFuelType(expandedFuelType === type ? null : type);
  };

  const refetchAll = () => {
    refetchElectricity();
    refetchGas();
  };

  const getRateColor = (price: number, type: 'electricity' | 'gas') => {
    const thresholds = type === 'electricity' ? electricityThresholds : gasThresholds;
    const level = getRateThresholdLevel(price, thresholds);
    return getThresholdColor(level, isDark);
  };

  useEffect(() => {
    if (expandedFuelType) {
      const rates = expandedFuelType === 'electricity' ? todayElectricityRates : todayGasRates;
      if (rates.length > 0) {
        setTimeout(() => {
          const currentRateIndex = rates.findIndex((r: ProcessedRate) => r.isCurrent);
          if (currentRateIndex >= 0 && todayRatesScrollRef.current) {
            const scrollToPosition = Math.max(0, currentRateIndex * 58 - 100);
            todayRatesScrollRef.current.scrollTo({ x: scrollToPosition, animated: true });
          }
        }, 300);
      }
    }
  }, [expandedFuelType, todayElectricityRates, todayGasRates]);

  const getRateHeight = (price: number, minRate: number, maxRate: number) => {
    const range = maxRate - minRate;
    if (range === 0) return 40;
    return ((price - minRate) / range) * 60 + 20;
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(1)}p`;
  };

  const isAgileTariff = (productCode: string) => {
    return productCode.toUpperCase().includes('AGILE');
  };

  const renderLineGraph = (rates: ProcessedRate[], type: 'electricity' | 'gas', allFutureRates?: ProcessedRate[]) => {
    const chartWidth = Dimensions.get('window').width - 72;
    const chartHeight = 200;
    const padding = { top: 20, bottom: 40, left: 40, right: 10 };
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;

    if (rates.length === 0) return null;

    const minRate = Math.min(...rates.map(r => r.price));
    const maxRate = Math.max(...rates.map(r => r.price));
    const range = maxRate - minRate || 1;

    const getX = (index: number) => padding.left + (index / (rates.length - 1)) * graphWidth;
    const getY = (price: number) => padding.top + graphHeight - ((price - minRate) / range) * graphHeight;

    const pathSegments: { path: string; color: string }[] = [];
    let currentPath = '';
    let currentColor = '';

    rates.forEach((rate, index) => {
      const x = getX(index);
      const y = getY(rate.price);
      const color = rate.isCurrent ? colors.primary : getRateColor(rate.price, type);

      if (index === 0) {
        currentPath = `M ${x} ${y}`;
        currentColor = color;
      } else {
        if (color === currentColor) {
          currentPath += ` L ${x} ${y}`;
        } else {
          pathSegments.push({ path: currentPath, color: currentColor });
          currentPath = `M ${getX(index - 1)} ${getY(rates[index - 1].price)} L ${x} ${y}`;
          currentColor = color;
        }
      }

      if (index === rates.length - 1) {
        pathSegments.push({ path: currentPath, color: currentColor });
      }
    });

    const currentRateIndex = rates.findIndex(r => r.isCurrent);
    let nextRateIndex = -1;
    let nextRateFromTomorrow = false;
    
    if (currentRateIndex >= 0) {
      if (currentRateIndex < rates.length - 1) {
        nextRateIndex = currentRateIndex + 1;
      } else if (allFutureRates && allFutureRates.length > 0) {
        nextRateIndex = 0;
        nextRateFromTomorrow = true;
      }
    }
    
    const findNextLowestRate = () => {
      if (currentRateIndex < 0) return null;
      
      const todayFutureRates = rates.slice(currentRateIndex + 1);
      const futureRates = allFutureRates ? [...todayFutureRates, ...allFutureRates] : todayFutureRates;
      
      if (futureRates.length === 0) return null;
      
      const lowestFutureRate = futureRates.reduce((lowest, rate) => 
        rate.price < lowest.price ? rate : lowest
      , futureRates[0]);
      
      const isTomorrow = allFutureRates && allFutureRates.some(r => r === lowestFutureRate);
      
      return {
        ...lowestFutureRate,
        displayTime: isTomorrow ? `Tomorrow ${lowestFutureRate.time}` : lowestFutureRate.time,
      };
    };
    
    const nextLowestRate = findNextLowestRate();

    return (
      <View style={styles.lineGraphContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
            const y = padding.top + graphHeight - fraction * graphHeight;
            const price = minRate + fraction * range;
            return (
              <React.Fragment key={i}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + graphWidth}
                  y2={y}
                  stroke={colors.chartGrid}
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
                <SvgText
                  x={0}
                  y={y + 4}
                  fontSize="11"
                  fill={colors.chartAxisLabel}
                  fontWeight="500"
                >
                  {price.toFixed(1)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {pathSegments.map((segment, i) => (
            <Path
              key={i}
              d={segment.path}
              stroke={segment.color}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {currentRateIndex >= 0 && (
            <Circle
              cx={getX(currentRateIndex)}
              cy={getY(rates[currentRateIndex].price)}
              r="6"
              fill={colors.primary}
              stroke={colors.surface}
              strokeWidth="2"
            />
          )}
        </Svg>

        <View style={styles.xAxisLabels}>
          {['00', '06', '12', '18', "23"].map((time, i) => (
            <Text key={i} style={[styles.xAxisLabel, { color: colors.chartAxisLabel }]}>
              {time}
            </Text>
          ))}
        </View>

        {currentRateIndex >= 0 && (
          <View style={[styles.rateInfoContainer, { borderTopColor: colors.border }]}>
            <View style={styles.rateInfoColumn}>
              {nextRateIndex >= 0 ? (
                <>
                  <Text style={[styles.rateInfoLabel, { color: colors.text.secondary }]}>Next Rate</Text>
                  <Text style={[styles.rateInfoValue, { color: colors.text.primary }]}>
                    {formatPrice(nextRateFromTomorrow && allFutureRates ? allFutureRates[nextRateIndex].price : rates[nextRateIndex].price)}
                  </Text>
                  <Text style={[styles.rateInfoTime, { color: colors.text.secondary }]}>
                    at {nextRateFromTomorrow && allFutureRates ? allFutureRates[nextRateIndex].time : rates[nextRateIndex].time}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.rateInfoLabel, { color: colors.text.secondary }]}>Next Rate</Text>
                  <Text style={[styles.rateInfoValue, { color: colors.text.primary }]}>No data</Text>
                </>
              )}
            </View>
            {nextLowestRate && (
              <View style={[styles.rateInfoColumn, styles.rateInfoColumnRight]}>
                <Text style={[styles.rateInfoLabel, { color: colors.text.secondary }]}>Next Lowest Rate</Text>
                <Text style={[styles.rateInfoValue, { color: colors.text.primary }]}>
                  {formatPrice(nextLowestRate.price)}
                </Text>
                <Text style={[styles.rateInfoTime, { color: colors.text.secondary }]}>
                  {nextLowestRate.displayTime || nextLowestRate.time}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topSection: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    dashboardTitle: {
      fontSize: 32,
      fontWeight: '700' as const,
    },
    settingsButton: {
      padding: 8,
    },
    fuelTypesContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    fuelTypeBox: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    fuelTypeBoxExpanded: {
      backgroundColor: colors.primary,
      transform: [{ scale: 1.02 }],
    },
    fuelTypeContent: {
      alignItems: 'center',
      gap: 12,
    },
    fuelTypeIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fuelTypeIconContainerGas: {
      backgroundColor: colors.gasBackground,
    },
    fuelTypeLabel: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: '600' as const,
    },
    fuelTypeLabelExpanded: {
      color: '#FFFFFF',
    },
    fuelTypePrice: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    fuelTypePriceExpanded: {
      color: '#FFFFFF',
    },
    fuelTypeNoData: {
      fontSize: 14,
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
      padding: 20,
      gap: 16,
    },
    barGraphCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    tapToView: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600' as const,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text.primary,
      marginBottom: 8,
    },
    chartContainer: {
      paddingVertical: 12,
      gap: 8,
    },
    barContainer: {
      alignItems: 'center',
      gap: 8,
      minWidth: 50,
    },
    bar: {
      width: 36,
      borderRadius: 8,
    },
    barPrice: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: '600' as const,
    },
    barTime: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    barTimeCurrent: {
      color: colors.primary,
      fontWeight: '700' as const,
    },
    placeholderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 16,
    },
    placeholderTitle: {
      fontSize: 26,
      fontWeight: '700' as const,
      color: colors.text.primary,
      textAlign: 'center' as const,
    },
    placeholderText: {
      fontSize: 18,
      color: colors.text.secondary,
      textAlign: 'center' as const,
      lineHeight: 26,
    },
    selectFuelContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    selectFuelText: {
      fontSize: 18,
      color: colors.text.secondary,
      textAlign: 'center' as const,
    },
    gasDailyRatesContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    dailyRateCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    dailyRateTitle: {
      fontSize: 16,
      color: colors.text.secondary,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    dailyRatePrice: {
      fontSize: 34,
      fontWeight: '700' as const,
      color: colors.gasColor,
    },
    electricityDailyRatePrice: {
      color: colors.primary,
    },
    dailyRateDate: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    flexibleComparisonCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    comparisonCardTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text.primary,
      marginBottom: 8,
    },
    flexibleRateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    flexibleLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      fontWeight: '500' as const,
    },
    flexibleRate: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    flexibleDifferenceRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 16,
      marginTop: 4,
    },
    flexibleDifferenceLabel: {
      fontSize: 14,
      color: colors.text.primary,
      fontWeight: '700' as const,
    },
    flexibleDifference: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    flexibleSaving: {
      color: colors.success,
    },
    flexibleExtra: {
      color: colors.error,
    },
    cheaperThanGasText: {
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    lineGraphContainer: {
      marginTop: 8,
    },
    yAxisLabel: {
      fontSize: 11,
      color: colors.chartAxisLabel,
      fontWeight: '500' as const,
    },
    xAxisLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 40,
      marginTop: 8,
    },
    xAxisLabel: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    rateInfoContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    rateInfoColumn: {
      flex: 1,
    },
    rateInfoColumnRight: {
      alignItems: 'flex-end',
    },
    rateInfoLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    rateInfoValue: {
      fontSize: 16,
      fontWeight: '700' as const,
      marginBottom: 2,
    },
    rateInfoTime: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    cheaperThanGasCard: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
    },
    cheaperThanGasTitle: {
      fontSize: 15,
      fontWeight: '700' as const,
      marginBottom: 12,
    },
    cheaperPeriodRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    cheaperPeriodTime: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    cheaperPeriodPrice: {
      fontSize: 15,
      fontWeight: '700' as const,
    },
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.container}>
        <View style={[styles.topSection, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.dashboardTitle, { color: colors.text.primary }]}>Dashboard</Text>
            <Link href="/settings" asChild>
              <Pressable style={styles.settingsButton}>
                <Settings size={24} color={colors.text.primary} />
              </Pressable>
            </Link>
          </View>
          <View style={styles.fuelTypesContainer}>
            <Pressable
              style={[styles.fuelTypeBox, expandedFuelType === 'electricity' && styles.fuelTypeBoxExpanded]}
              onPress={() => handleFuelTypePress('electricity')}
            >
              <View style={styles.fuelTypeContent}>
                <View style={styles.fuelTypeIconContainer}>
                  <Zap size={32} color={colors.primary} />
                </View>
                <Text style={[styles.fuelTypeLabel, expandedFuelType === 'electricity' && styles.fuelTypeLabelExpanded]}>Electricity</Text>
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
                style={[styles.fuelTypeBox, expandedFuelType === 'gas' && styles.fuelTypeBoxExpanded]}
                onPress={() => handleFuelTypePress('gas')}
              >
                <View style={styles.fuelTypeContent}>
                  <View style={[styles.fuelTypeIconContainer, styles.fuelTypeIconContainerGas]}>
                    <Flame size={32} color={colors.gasColor} />
                  </View>
                  <Text style={[styles.fuelTypeLabel, expandedFuelType === 'gas' && styles.fuelTypeLabelExpanded]}>Gas</Text>
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
            const isAgile = isElectricity && isAgileTariff(selectedElectricityTariff);
            
            const minRate = todayRates.length > 0 ? Math.min(...todayRates.map((r: ProcessedRate) => r.price)) : 0;
            const maxRate = todayRates.length > 0 ? Math.max(...todayRates.map((r: ProcessedRate) => r.price)) : 0;
            
            const getElectricityCheaperThanGasPeriods = () => {
              if (!isElectricity || tomorrowRates.length === 0 || tomorrowGasRates.length === 0) return [];
              const gasPrice = tomorrowGasRates[0].price;
              const cheaperPeriods: { start: string; end: string; price: number }[] = [];
              let periodStart: string | null = null;
              let periodPrice = 0;
              
              tomorrowRates.forEach((rate: ProcessedRate, index: number) => {
                if (rate.price < gasPrice) {
                  if (!periodStart) {
                    periodStart = rate.time;
                    periodPrice = rate.price;
                  }
                } else if (periodStart) {
                  cheaperPeriods.push({ start: periodStart, end: rate.time, price: periodPrice });
                  periodStart = null;
                }
                if (index === tomorrowRates.length - 1 && periodStart) {
                  cheaperPeriods.push({ start: periodStart, end: '00:00', price: periodPrice });
                }
              });
              return cheaperPeriods;
            };
            
            const electricityCheaperPeriods = getElectricityCheaperThanGasPeriods();

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
                    {isAgile ? (
                      <>
                        <Pressable style={styles.barGraphCard} onPress={() => router.push('/electricity-detail')}>
                          <Text style={styles.sectionTitle}>{"Today's Rates"}</Text>
                          {renderLineGraph(todayRates, expandedFuelType, tomorrowRates)}
                        </Pressable>

                        {tomorrowRates.length > 0 && (
                          <Pressable style={styles.barGraphCard} onPress={() => router.push('/electricity-detail')}>
                            <Text style={styles.sectionTitle}>{"Tomorrow's Rates"}</Text>
                            {renderLineGraph(tomorrowRates, expandedFuelType, [])}
                            
                            {electricityCheaperPeriods.length > 0 && tomorrowGasRates.length > 0 && (
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
                    ) : (
                      <>
                        <View style={styles.barGraphCard}>
                          <Text style={styles.sectionTitle}>{"Today's Rates"}</Text>
                          <ScrollView 
                            ref={todayRatesScrollRef}
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chartContainer}
                            scrollEnabled={true}
                          >
                            {todayRates.map((rate: ProcessedRate, index: number) => {
                              const isCheaperThanGas = isElectricity && todayGasRates.length > 0 && rate.price < todayGasRates[0].price;
                              return (
                                <View key={index} style={styles.barContainer}>
                                  <Text style={[
                                    styles.barPrice,
                                    isCheaperThanGas && styles.cheaperThanGasText
                                  ]}>{formatPrice(rate.price)}</Text>
                                  <View 
                                    style={[
                                      styles.bar,
                                      { 
                                        height: getRateHeight(rate.price, minRate, maxRate),
                                        backgroundColor: rate.isCurrent 
                                          ? colors.primary
                                          : getRateColor(rate.price, expandedFuelType),
                                        opacity: rate.isCurrent ? 1 : 0.8,
                                      }
                                    ]}
                                  />
                                  <Text style={[
                                    styles.barTime,
                                    rate.isCurrent && styles.barTimeCurrent,
                                    isCheaperThanGas && styles.cheaperThanGasText
                                  ]}>
                                    {rate.time}
                                  </Text>
                                </View>
                              );
                            })}
                          </ScrollView>
                        </View>

                        {tomorrowRates.length > 0 && (
                          <View style={styles.barGraphCard}>
                            <Text style={styles.sectionTitle}>{"Tomorrow's Rates"}</Text>
                            <ScrollView 
                              horizontal 
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.chartContainer}
                              scrollEnabled={true}
                            >
                              {tomorrowRates.map((rate: ProcessedRate, index: number) => {
                                const isCheaperThanGas = isElectricity && tomorrowGasRates.length > 0 && rate.price < tomorrowGasRates[0].price;
                                return (
                                  <View key={index} style={styles.barContainer}>
                                    <Text style={[
                                      styles.barPrice,
                                      isCheaperThanGas && styles.cheaperThanGasText
                                    ]}>{formatPrice(rate.price)}</Text>
                                    <View 
                                      style={[
                                        styles.bar,
                                        { 
                                          height: getRateHeight(rate.price, minRate, maxRate),
                                          backgroundColor: getRateColor(rate.price, expandedFuelType),
                                          opacity: 0.8,
                                        }
                                      ]}
                                    />
                                    <Text style={[
                                      styles.barTime,
                                      isCheaperThanGas && styles.cheaperThanGasText
                                    ]}>
                                      {rate.time}
                                    </Text>
                                  </View>
                                );
                              })}
                            </ScrollView>
                          </View>
                        )}
                      </>
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
                    <View style={[styles.flexibleRateRow, styles.flexibleDifferenceRow]}>
                      <Text style={styles.flexibleDifferenceLabel}>Difference</Text>
                      <Text style={[
                        styles.flexibleDifference,
                        currentRate.price < comparisonRate ? styles.flexibleSaving : styles.flexibleExtra
                      ]}>
                        {currentRate.price < comparisonRate ? '-' : '+'}{formatPrice(Math.abs(currentRate.price - comparisonRate))}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.placeholderContainer}>
                {isElectricity ? (
                  <Zap size={64} color={colors.primary} />
                ) : (
                  <Flame size={64} color={colors.gasColor} />
                )}
                <Text style={styles.placeholderTitle}>
                  {isElectricity ? 'No Electricity Rates' : 'No Gas Rates'}
                </Text>
                <Text style={styles.placeholderText}>
                  {isLoading 
                    ? 'Loading rates...' 
                    : 'Select a tariff in settings to view rates'}
                </Text>
              </View>
            );
          })()}

          {!expandedFuelType && (
            <View style={styles.selectFuelContainer}>
              <Text style={styles.selectFuelText}>Select Electricity or Gas above to view rates</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}
