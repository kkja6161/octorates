import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Zap, Flame, Clock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConsumption } from '@/providers/ConsumptionProvider';
import { useComparisonRate } from '@/hooks/useComparisonRate';
import Colors, { useColors } from '@/constants/colors';
import { useTheme } from '@/providers/ThemeProvider';
import { getTariffDisplayName } from '@/utils/tariffNames';
import { ConsumptionEntryWithRate } from '@/types/energy';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HORIZONTAL_PADDING = 32;

interface HalfHourlyData {
  time: string;
  consumption: number;
  rate: number | null;
  cost: number;
  intervalStart: Date;
  intervalKey: string;
  comparisonCost: number;
  comparisonRate: number;
}

const bankersRound = (num: number, decimals: number): string => {
  const factor = Math.pow(10, decimals);
  const shifted = num * factor;
  const truncated = Math.trunc(shifted);
  const remainder = shifted - truncated;
  
  let rounded: number;
  if (Math.abs(remainder - 0.5) < 1e-9) {
    rounded = truncated % 2 === 0 ? truncated : truncated + 1;
  } else {
    rounded = Math.round(shifted);
  }
  
  return (rounded / factor).toFixed(decimals);
};

export default function DailyDetailScreen() {
  const { date, type } = useLocalSearchParams<{ date: string; type: 'electricity' | 'gas' }>();
  const insets = useSafeAreaInsets();
  const { electricityDailyConsumption, gasDailyConsumption } = useConsumption();
  const { comparisonElectricityTariffName, comparisonGasTariffName } = useComparisonRate();
  const { isDark } = useTheme();
  const colors = useColors(isDark);

  const dailyData = useMemo(() => {
    const consumption = type === 'electricity' ? electricityDailyConsumption : gasDailyConsumption;
    return consumption.find(d => d.date === date);
  }, [type, date, electricityDailyConsumption, gasDailyConsumption]);

  const halfHourlyData = useMemo((): HalfHourlyData[] => {
    if (!dailyData) return [];

    return dailyData.entries
      .map((entry: ConsumptionEntryWithRate) => {
        const intervalStart = new Date(entry.interval_start);
        const hours = intervalStart.getHours();
        const minutes = intervalStart.getMinutes();
        const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        // FIX: Prioritize pre-calculated flexibleCost. 
        // If calculating manually: Rate (p) * Cons (kWh) / 100 = Cost (£)
        const comparisonRate = entry.flexibleRate || 0;
        
        // Calculate comparison cost: Rate (p) * Cons (kWh) / 100 = Cost (£)
        const comparisonCost = (entry.consumption * comparisonRate) / 100;

        return {
          time,
          consumption: entry.consumption,
          rate: entry.rate,
          cost: entry.cost,
          intervalStart,
          intervalKey: entry.interval_start,
          comparisonCost,
          comparisonRate,
        };
      })
      .sort((a, b) => a.intervalStart.getTime() - b.intervalStart.getTime());
  }, [dailyData]);

  const { maxConsumption, maxRate, minRate, avgRate } = useMemo(() => {
    if (halfHourlyData.length === 0) {
      return { maxConsumption: 0, maxRate: 0, minRate: 0, avgRate: 0 };
    }

    const periodsWithRate = halfHourlyData.filter(p => p.rate !== null);
    const rates = periodsWithRate.map(p => p.rate || 0);
    
    const maxConsumptionValue = Math.max(...halfHourlyData.map(p => p.consumption));
    const maxRateValue = rates.length > 0 ? Math.max(...rates) : 0;
    const minRateValue = rates.length > 0 ? Math.min(...rates) : 0;
    const avgRateValue = periodsWithRate.length > 0 
      ? periodsWithRate.reduce((sum, p) => sum + (p.rate || 0), 0) / periodsWithRate.length 
      : 0;

    // For gas, use fixed scale 0-30; for electricity use dynamic scale
    const finalMaxRate = type === 'gas' ? 30 : maxRateValue;
    const finalMinRate = type === 'gas' ? 0 : minRateValue;

    return {
      maxConsumption: maxConsumptionValue,
      maxRate: finalMaxRate,
      minRate: finalMinRate,
      avgRate: avgRateValue,
    };
  }, [halfHourlyData, type]);

  const getBarColor = (): string => {
    return type === 'electricity' ? Colors.primary : '#f59e0b';
  };

  const cumulativeCosts = useMemo(() => {
    let currentCumulative = 0;
    let comparisonCumulative = 0;
    
    return halfHourlyData.map((period) => {
      currentCumulative += period.cost;
      comparisonCumulative += period.comparisonCost;
      return {
        currentCumulative,
        comparisonCumulative,
      };
    });
  }, [halfHourlyData]);

  const maxCumulativeCost = useMemo(() => {
    if (cumulativeCosts.length === 0) return 0;
    const maxCurrent = Math.max(...cumulativeCosts.map(c => c.currentCumulative));
    const maxComparison = Math.max(...cumulativeCosts.map(c => c.comparisonCumulative));
    // Ensure we have a valid max to prevent division by zero
    return Math.max(maxCurrent, maxComparison, 0.01);
  }, [cumulativeCosts]);

  const getRateLinePoints = useMemo(() => {
    if (halfHourlyData.length === 0 || maxRate === minRate) return [];
    
    const chartHeight = 120;
    const chartWidth = SCREEN_WIDTH - CHART_HORIZONTAL_PADDING - 32;
    const barGap = 1;
    const totalBars = halfHourlyData.length;
    const barWidth = (chartWidth - (totalBars - 1) * barGap) / totalBars;
    
    return halfHourlyData.map((period, index) => {
      const x = index * (barWidth + barGap) + barWidth / 2;
      const rate = period.rate || 0;
      const normalizedRate = maxRate > minRate 
        ? (rate - minRate) / (maxRate - minRate) 
        : 0.5;
      const y = chartHeight - (normalizedRate * (chartHeight - 20)) - 10;
      return { x, y, rate };
    });
  }, [halfHourlyData, maxRate, minRate]);

  const getCumulativeCostLinePoints = useMemo(() => {
    if (cumulativeCosts.length === 0 || maxCumulativeCost === 0) return { current: [], comparison: [] };
    
    const chartHeight = 120;
    const chartWidth = SCREEN_WIDTH - CHART_HORIZONTAL_PADDING - 32;
    const pointSpacing = chartWidth / (cumulativeCosts.length - 1 || 1);
    
    const current = cumulativeCosts.map((cost, index) => {
      const x = index * pointSpacing;
      const normalized = cost.currentCumulative / maxCumulativeCost;
      const y = chartHeight - (normalized * (chartHeight - 20)) - 10;
      return { x, y, cost: cost.currentCumulative };
    });

    const comparison = cumulativeCosts.map((cost, index) => {
      const x = index * pointSpacing;
      const normalized = cost.comparisonCumulative / maxCumulativeCost;
      const y = chartHeight - (normalized * (chartHeight - 20)) - 10;
      return { x, y, cost: cost.comparisonCumulative };
    });

    return { current, comparison };
  }, [cumulativeCosts, maxCumulativeCost]);

  const formatPrice = (price: number): string => `£${price.toFixed(4)}`;
  const formatRate = (rate: number): string => `${rate.toFixed(2)}p`;
  const formatConsumption = (consumption: number): string => `${consumption.toFixed(3)} kWh`;

  if (!dailyData) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.surface} />
          </Pressable>
          <Text style={styles.headerTitle}>Not Found</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data found for this date</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <LinearGradient
        colors={type === 'electricity' ? [Colors.primary, Colors.secondary] : ['#f59e0b', '#fbbf24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.surface} />
          </Pressable>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              {type === 'electricity' ? (
                <Zap size={24} color={Colors.surface} />
              ) : (
                <Flame size={24} color={Colors.surface} />
              )}
              <Text style={styles.headerTitle}>{date}</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {formatConsumption(dailyData.totalConsumption)} • {formatPrice(dailyData.cost)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Consumption</Text>
              <Text style={styles.summaryValue}>{formatConsumption(dailyData.totalConsumption)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Cost (Current Tariff)</Text>
              <Text style={styles.summaryValue}>£{bankersRound(dailyData.cost, 2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{getTariffDisplayName(type === 'electricity' ? comparisonElectricityTariffName : comparisonGasTariffName, 'short')} Cost</Text>
              <Text style={styles.summaryValue}>£{bankersRound(dailyData.flexibleCost, 2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryDifferenceRow]}>
              <Text style={styles.summaryLabel}>
                {dailyData.difference > 0 ? 'You Saved' : 'Extra Cost'}
              </Text>
              <Text style={[
                styles.summaryDifference,
                dailyData.difference > 0 ? styles.savingText : styles.extraText,
              ]}>
                £{bankersRound(Math.abs(dailyData.difference), 2)}
              </Text>
            </View>
            {avgRate > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Average Rate</Text>
                <Text style={styles.summaryValue}>{bankersRound(avgRate, 2)}p</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Usage & Rates</Text>
          <View style={styles.chartLegend}>
            <View style={styles.chartLegendItem}>
              <View style={[styles.chartLegendBar, { backgroundColor: getBarColor() }]} />
              <Text style={styles.chartLegendText}>Usage (kWh)</Text>
            </View>
            <View style={styles.chartLegendItem}>
              <View style={[styles.chartLegendLine, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.chartLegendText}>Rate (p)</Text>
            </View>
          </View>
          <View style={styles.chartContainer}>
            <View style={styles.chartMainArea}>
              <View style={styles.chartBars}>
                {halfHourlyData.map((period, index) => {
                  const barHeight = maxConsumption > 0 ? (period.consumption / maxConsumption) * 120 : 0;
                  
                  return (
                    <View key={index} style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(2, barHeight),
                            backgroundColor: getBarColor(),
                            opacity: 0.8,
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
              <View style={styles.rateLineContainer} pointerEvents="none">
                {getRateLinePoints.length > 1 && (
                  <View style={StyleSheet.absoluteFill}>
                    {getRateLinePoints.map((point, index) => {
                      if (index === getRateLinePoints.length - 1) return null;
                      const nextPoint = getRateLinePoints[index + 1];
                      const dx = nextPoint.x - point.x;
                      const dy = nextPoint.y - point.y;
                      const length = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                      
                      return (
                        <View
                          key={index}
                          style={[
                            styles.rateLine,
                            {
                              width: length,
                              left: point.x,
                              top: point.y,
                              transform: [{ rotate: `${angle}deg` }],
                            },
                          ]}
                        />
                      );
                    })}

                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.chartLabels}>
            <Text style={styles.chartLabel}>00</Text>
            <Text style={styles.chartLabel}>06</Text>
            <Text style={styles.chartLabel}>12</Text>
            <Text style={styles.chartLabel}>18</Text>
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Cumulative Cost</Text>
          <View style={styles.chartLegend}>
            <View style={styles.chartLegendItem}>
              <View style={[styles.chartLegendLine, { backgroundColor: colors.primary }]} />
              <Text style={styles.chartLegendText}>Current Tariff</Text>
            </View>
            <View style={styles.chartLegendItem}>
              <View style={[styles.chartLegendLine, { backgroundColor: '#10b981' }]} />
              <Text style={styles.chartLegendText}>{getTariffDisplayName(type === 'electricity' ? comparisonElectricityTariffName : comparisonGasTariffName, 'short')}</Text>
            </View>
          </View>
          <View style={styles.cumulativeCostContainer}>
            {Platform.OS !== 'web' ? (
              <View style={styles.cumulativeChartArea}>
                {getCumulativeCostLinePoints.current.length > 1 && (
                  <View style={StyleSheet.absoluteFill}>
                    {getCumulativeCostLinePoints.current.map((point, index) => {
                      if (index === getCumulativeCostLinePoints.current.length - 1) return null;
                      const nextPoint = getCumulativeCostLinePoints.current[index + 1];
                      const dx = nextPoint.x - point.x;
                      const dy = nextPoint.y - point.y;
                      const length = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                      
                      return (
                        <View
                          key={`current-${index}`}
                          style={[
                            styles.cumulativeLine,
                            {
                              width: length,
                              left: point.x,
                              top: point.y,
                              backgroundColor: colors.primary,
                              transform: [{ rotate: `${angle}deg` }],
                            },
                          ]}
                        />
                      );
                    })}
                    {getCumulativeCostLinePoints.comparison.map((point, index) => {
                      if (index === getCumulativeCostLinePoints.comparison.length - 1) return null;
                      const nextPoint = getCumulativeCostLinePoints.comparison[index + 1];
                      const dx = nextPoint.x - point.x;
                      const dy = nextPoint.y - point.y;
                      const length = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                      
                      return (
                        <View
                          key={`comparison-${index}`}
                          style={[
                            styles.cumulativeLine,
                            {
                              width: length,
                              left: point.x,
                              top: point.y,
                              backgroundColor: '#10b981',
                              transform: [{ rotate: `${angle}deg` }],
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.cumulativeChartArea}>
                <Text style={[styles.chartLegendText, { textAlign: 'center' as const, padding: 20 }]}>
                  Cumulative cost visualization available on mobile
                </Text>
              </View>
            )}
          </View>
          <View style={styles.chartLabels}>
            <Text style={styles.chartLabel}>00</Text>
            <Text style={styles.chartLabel}>06</Text>
            <Text style={styles.chartLabel}>12</Text>
            <Text style={styles.chartLabel}>18</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Half-Hourly Breakdown</Text>

          {halfHourlyData.map((period, index) => (
            <View key={index} style={styles.periodRow}>
              <View style={styles.periodTimeContainer}>
                <Clock size={14} color={Colors.text.secondary} />
                <Text style={styles.periodTime}>{period.time}</Text>
              </View>
              <View style={styles.periodDetails}>
                <Text style={styles.periodConsumption}>
                  {formatConsumption(period.consumption)}
                </Text>
                <Text style={styles.periodRate}>
                  {period.rate !== null ? `${formatRate(period.rate)} (${formatRate(period.comparisonRate)})` : '-'}
                </Text>
                <Text style={styles.periodCost}>
                  £{bankersRound(period.cost, 2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.surface,
    opacity: 0.9,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },

  chartSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartLegendBar: {
    width: 16,
    height: 10,
    borderRadius: 2,
  },
  chartLegendLine: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  chartLegendText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  chartContainer: {
    flexDirection: 'row',
    gap: 4,
  },

  chartMainArea: {
    flex: 1,
    position: 'relative',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 1,
  },
  rateLineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  rateLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#ef4444',
    transformOrigin: 'left center',
  },

  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 1,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  cumulativeCostContainer: {
    height: 120,
  },
  cumulativeChartArea: {
    flex: 1,
    position: 'relative',
  },
  cumulativeLine: {
    position: 'absolute',
    height: 3,
    transformOrigin: 'left center',
    borderRadius: 1.5,
  },
  detailsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },

  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  periodTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 70,
  },
  periodTime: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  periodDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodConsumption: {
    fontSize: 12,
    color: Colors.text.secondary,
    width: 80,
    textAlign: 'center' as const,
  },
  periodRate: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.text.primary,
    width: 110,
    textAlign: 'center' as const,
  },
  periodCost: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    width: 70,
    textAlign: 'right' as const,
  },

  summarySection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDifferenceRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  summaryDifference: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  savingText: {
    color: '#10b981',
  },
  extraText: {
    color: '#ef4444',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
});