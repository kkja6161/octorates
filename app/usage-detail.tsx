import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Zap, PoundSterling, RefreshCw } from 'lucide-react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/providers/ThemeProvider';
import { useConsumption } from '@/providers/ConsumptionProvider';
import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import { LIGHT_THEME, DARK_THEME } from '@/constants/colors';
import { fetchConsumption } from '@/services/energyApi';
import { ProcessedRate, ConsumptionEntry } from '@/types/energy';

interface HalfHourlyDataPoint {
  time: string;
  fullTime: string;
  consumption: number;
  cost: number;
  rate: number | null;
  intervalStart: Date;
}

export default function UsageDetailScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = isDark ? DARK_THEME : LIGHT_THEME;
  const { 
    electricityDailyConsumption 
  } = useConsumption();
  const { currentElectricityRate, allElectricityRates } = useEnergyRates();
  
  const [consumptionData, setConsumptionData] = useState<ConsumptionEntry[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { apiKey, electricityMpan, electricitySerialNumbers } = useConsumption();

  const loadConsumptionData = useCallback(async () => {
    if (!apiKey || !electricityMpan || electricitySerialNumbers.length === 0) {
      console.log('[UsageDetail] Missing credentials for consumption fetch');
      setHasLoaded(true);
      return;
    }

    console.log('[UsageDetail] Loading 48h consumption data...');
    setError(null);
    setIsLoading(true);

    try {
      // Calculate 48 hours ago
      const now = new Date();
      const startTime = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      
      console.log('[UsageDetail] Fetching consumption from:', startTime.toISOString(), 'to:', now.toISOString());

      // Try each serial number until we get data
      let allResults: ConsumptionEntry[] = [];
      for (const serial of electricitySerialNumbers) {
        try {
          const result = await fetchConsumption(
            electricityMpan,
            serial,
            apiKey,
            'electricity',
            startTime.toISOString(),
            now.toISOString()
          );
          
          if (result.results.length > 0) {
            allResults = result.results;
            console.log('[UsageDetail] Got', result.results.length, 'consumption entries from serial', serial);
            break;
          }
        } catch {
          console.log('[UsageDetail] Serial', serial, 'failed, trying next...');
        }
      }

      // Sort by time ascending
      allResults.sort((a, b) => 
        new Date(a.interval_start).getTime() - new Date(b.interval_start).getTime()
      );

      console.log('[UsageDetail] Total consumption entries:', allResults.length);
      if (allResults.length > 0) {
        console.log('[UsageDetail] First entry:', allResults[0].interval_start);
        console.log('[UsageDetail] Last entry:', allResults[allResults.length - 1].interval_start);
      }

      setConsumptionData(allResults);
      setHasLoaded(true);
    } catch (err) {
      console.error('[UsageDetail] Error fetching consumption:', err);
      setError('Failed to load consumption data');
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, electricityMpan, electricitySerialNumbers]);

  useEffect(() => {
    if (!hasLoaded && apiKey && electricityMpan) {
      loadConsumptionData();
    } else if (!apiKey || !electricityMpan) {
      setHasLoaded(true);
    }
  }, [hasLoaded, apiKey, electricityMpan, loadConsumptionData]);

  const findRateForTime = useCallback((timestamp: Date): number | null => {
    if (!allElectricityRates || allElectricityRates.length === 0) {
      return currentElectricityRate?.price ?? null;
    }
    
    const rate = allElectricityRates.find((r: ProcessedRate) => 
      r.validFrom <= timestamp && r.validTo > timestamp
    );
    
    if (rate) return rate.price;
    
    if (currentElectricityRate) return currentElectricityRate.price;
    
    return null;
  }, [allElectricityRates, currentElectricityRate]);

  const last48HoursData = useMemo((): HalfHourlyDataPoint[] => {
    // Use directly fetched consumption data (REST API - more reliable for historical data)
    if (consumptionData.length > 0) {
      console.log('[UsageDetail] Processing consumption data:', consumptionData.length, 'entries');
      
      return consumptionData.map(entry => {
        const intervalStart = new Date(entry.interval_start);
        const consumptionKwh = typeof entry.consumption === 'number' ? entry.consumption : 0;
        const rate = findRateForTime(intervalStart);
        const cost = rate !== null ? consumptionKwh * (rate / 100) : 0;
        
        return {
          time: intervalStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          fullTime: intervalStart.toLocaleString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          consumption: consumptionKwh,
          cost,
          rate,
          intervalStart,
        };
      });
    }
    
    // Fallback to daily consumption data from provider if direct fetch failed
    if (!electricityDailyConsumption || electricityDailyConsumption.length === 0) {
      console.log('[UsageDetail] No consumption data available');
      return [];
    }

    console.log('[UsageDetail] Falling back to daily consumption data from provider');
    
    const allEntries: { interval_start: string; consumption: number; cost: number; rate: number | null }[] = [];
    electricityDailyConsumption.forEach(day => {
      if (day.entries) {
        allEntries.push(...day.entries);
      }
    });

    allEntries.sort((a, b) => 
      new Date(b.interval_start).getTime() - new Date(a.interval_start).getTime()
    );

    const now = new Date();
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const filtered = allEntries.filter(entry => {
      const entryTime = new Date(entry.interval_start);
      return entryTime >= cutoff;
    });

    const last96 = filtered.slice(0, 96);
    last96.reverse();

    return last96.map(entry => {
      const intervalStart = new Date(entry.interval_start);
      return {
        time: intervalStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        fullTime: intervalStart.toLocaleString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        consumption: typeof entry.consumption === 'number' ? entry.consumption : 0,
        cost: typeof entry.cost === 'number' ? entry.cost : 0,
        rate: entry.rate,
        intervalStart,
      };
    });
  }, [consumptionData, electricityDailyConsumption, findRateForTime]);

  const chartWidth = Dimensions.get('window').width - 48;
  const chartHeight = 280;
  const paddingTop = 30;
  const paddingBottom = 50;
  const paddingLeft = 50;
  const paddingRight = 50;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  const chartData = useMemo(() => {
    if (last48HoursData.length === 0) return null;

    const consumptions = last48HoursData.map(d => d.consumption);
    const costs = last48HoursData.map(d => d.cost);

    const minConsumption = Math.min(...consumptions);
    const maxConsumption = Math.max(...consumptions);
    const consumptionRange = maxConsumption - minConsumption || 0.1;

    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const costRange = maxCost - minCost || 0.01;

    const getX = (index: number) => 
      paddingLeft + (index / Math.max(last48HoursData.length - 1, 1)) * graphWidth;

    const getYConsumption = (value: number) => 
      paddingTop + graphHeight - ((value - minConsumption) / consumptionRange) * graphHeight;

    const getYCost = (value: number) => 
      paddingTop + graphHeight - ((value - minCost) / costRange) * graphHeight;

    let consumptionPath = '';
    let costPath = '';

    last48HoursData.forEach((point, index) => {
      const x = getX(index);
      const yConsumption = getYConsumption(point.consumption);
      const yCost = getYCost(point.cost);

      if (index === 0) {
        consumptionPath = `M ${x} ${yConsumption}`;
        costPath = `M ${x} ${yCost}`;
      } else {
        consumptionPath += ` L ${x} ${yConsumption}`;
        costPath += ` L ${x} ${yCost}`;
      }
    });

    return {
      consumptionPath,
      costPath,
      minConsumption,
      maxConsumption,
      consumptionRange,
      minCost,
      maxCost,
      costRange,
      getX,
      getYConsumption,
      getYCost,
    };
  }, [last48HoursData, graphWidth, graphHeight, paddingLeft, paddingTop]);

  const totalConsumption = useMemo(() => {
    const total = last48HoursData.reduce((sum, d) => sum + (d.consumption || 0), 0);
    return typeof total === 'number' && !isNaN(total) ? total : 0;
  }, [last48HoursData]);

  const totalCost = useMemo(() => {
    const total = last48HoursData.reduce((sum, d) => sum + (d.cost || 0), 0);
    return typeof total === 'number' && !isNaN(total) ? total : 0;
  }, [last48HoursData]);

  const avgRate = useMemo(() => {
    const ratesWithValues = last48HoursData.filter(d => d.rate !== null);
    if (ratesWithValues.length === 0) return null;
    return ratesWithValues.reduce((sum, d) => sum + (d.rate || 0), 0) / ratesWithValues.length;
  }, [last48HoursData]);

  const consumptionColor = '#3B82F6';
  const costColor = '#F59E0B';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text.primary,
      flex: 1,
    },
    refreshButton: {
      padding: 8,
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      fontSize: 14,
      color: colors.text.secondary,
      marginTop: 12,
    },
    dataSourceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 12,
      marginBottom: 4,
      gap: 6,
    },
    dataSourceText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.primary,
    },
    summarySection: {
      padding: 16,
      gap: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    summaryUnit: {
      fontSize: 13,
      fontWeight: '400' as const,
      color: colors.text.secondary,
    },
    chartSection: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
      marginBottom: 12,
    },
    legendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 24,
      marginBottom: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    noDataContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    noDataText: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center' as const,
    },
    xAxisLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingLeft: paddingLeft,
      paddingRight: paddingRight,
      marginTop: 4,
    },
    xAxisLabel: {
      fontSize: 10,
      color: colors.text.secondary,
    },
    dataListSection: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    dataListTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
      marginBottom: 12,
    },
    dataListCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    dataRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dataRowLast: {
      borderBottomWidth: 0,
    },
    dataTime: {
      flex: 1,
      fontSize: 13,
      color: colors.text.secondary,
    },
    dataConsumption: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600' as const,
      color: consumptionColor,
      textAlign: 'center' as const,
    },
    dataCost: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600' as const,
      color: costColor,
      textAlign: 'right' as const,
    },
    dataHeader: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    dataHeaderText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.text.secondary,
      textTransform: 'uppercase' as const,
    },
  });

  const formatConsumptionAxis = (value: number) => `${value.toFixed(2)}`;
  const formatCostAxis = (value: number) => {
    if (value < 0.01) return `${(value * 100).toFixed(1)}p`;
    return `£${value.toFixed(2)}`;
  };

  const xAxisLabels = useMemo(() => {
    if (last48HoursData.length === 0) return [];
    const labels: string[] = [];
    const step = Math.floor(last48HoursData.length / 4);
    for (let i = 0; i < last48HoursData.length; i += step) {
      if (last48HoursData[i]) {
        const date = last48HoursData[i].intervalStart;
        labels.push(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + 
          '\n' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      }
    }
    if (last48HoursData.length > 0) {
      const lastDate = last48HoursData[last48HoursData.length - 1].intervalStart;
      labels.push(lastDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + 
        '\n' + lastDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
    return labels.slice(0, 5);
  }, [last48HoursData]);

  const isUsingDirectFetch = consumptionData.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>48 Hour Usage</Text>
        <Pressable 
          style={styles.refreshButton} 
          onPress={loadConsumptionData}
          disabled={isLoading}
        >
          <RefreshCw 
            size={20} 
            color={isLoading ? colors.text.secondary : colors.primary} 
          />
        </Pressable>
      </View>

      {!hasLoaded || isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading telemetry data...</Text>
        </View>
      ) : error ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>{error}</Text>
        </View>
      ) : last48HoursData.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            No consumption data available for the last 48 hours.
            {'\n\n'}
            Connect your smart meter to view real-time usage.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isUsingDirectFetch && (
            <View style={styles.dataSourceBadge}>
              <Zap size={14} color={colors.primary} />
              <Text style={styles.dataSourceText}>Smart Meter Consumption Data</Text>
            </View>
          )}

          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Usage</Text>
                <Text style={styles.summaryValue}>
                  {totalConsumption.toFixed(2)}
                  <Text style={styles.summaryUnit}> kWh</Text>
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Cost</Text>
                <Text style={styles.summaryValue}>
                  £{totalCost.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Data Points</Text>
                <Text style={styles.summaryValue}>
                  {last48HoursData.length}
                  <Text style={styles.summaryUnit}> periods</Text>
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Avg Rate</Text>
                <Text style={styles.summaryValue}>
                  {avgRate !== null ? avgRate.toFixed(2) : '-'}
                  <Text style={styles.summaryUnit}> p/kWh</Text>
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.chartSection}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Half-Hourly Breakdown</Text>
              
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: consumptionColor }]} />
                  <Zap size={14} color={consumptionColor} />
                  <Text style={styles.legendText}>Usage (kWh)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: costColor }]} />
                  <PoundSterling size={14} color={costColor} />
                  <Text style={styles.legendText}>Cost (£)</Text>
                </View>
              </View>

              {chartData && (
                <>
                  <Svg width={chartWidth} height={chartHeight}>
                    {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
                      const y = paddingTop + graphHeight - fraction * graphHeight;
                      return (
                        <Line
                          key={i}
                          x1={paddingLeft}
                          y1={y}
                          x2={paddingLeft + graphWidth}
                          y2={y}
                          stroke={colors.border}
                          strokeWidth="1"
                          strokeDasharray="4,4"
                        />
                      );
                    })}

                    {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
                      const y = paddingTop + graphHeight - fraction * graphHeight;
                      const consumptionValue = chartData.minConsumption + fraction * chartData.consumptionRange;
                      return (
                        <SvgText
                          key={`left-${i}`}
                          x={paddingLeft - 6}
                          y={y + 4}
                          fontSize="10"
                          fill={consumptionColor}
                          textAnchor="end"
                        >
                          {formatConsumptionAxis(consumptionValue)}
                        </SvgText>
                      );
                    })}

                    {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
                      const y = paddingTop + graphHeight - fraction * graphHeight;
                      const costValue = chartData.minCost + fraction * chartData.costRange;
                      return (
                        <SvgText
                          key={`right-${i}`}
                          x={paddingLeft + graphWidth + 6}
                          y={y + 4}
                          fontSize="10"
                          fill={costColor}
                          textAnchor="start"
                        >
                          {formatCostAxis(costValue)}
                        </SvgText>
                      );
                    })}

                    <Path
                      d={chartData.consumptionPath}
                      stroke={consumptionColor}
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <Path
                      d={chartData.costPath}
                      stroke={costColor}
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {last48HoursData.length > 0 && (
                      <>
                        <Circle
                          cx={chartData.getX(last48HoursData.length - 1)}
                          cy={chartData.getYConsumption(last48HoursData[last48HoursData.length - 1].consumption)}
                          r="5"
                          fill={consumptionColor}
                          stroke={colors.surface}
                          strokeWidth="2"
                        />
                        <Circle
                          cx={chartData.getX(last48HoursData.length - 1)}
                          cy={chartData.getYCost(last48HoursData[last48HoursData.length - 1].cost)}
                          r="5"
                          fill={costColor}
                          stroke={colors.surface}
                          strokeWidth="2"
                        />
                      </>
                    )}
                  </Svg>

                  <View style={styles.xAxisLabels}>
                    {xAxisLabels.map((label, i) => (
                      <Text key={i} style={styles.xAxisLabel}>
                        {label.split('\n')[0]}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={styles.dataListSection}>
            <Text style={styles.dataListTitle}>Recent Readings</Text>
            <View style={styles.dataListCard}>
              <View style={[styles.dataRow, styles.dataHeader]}>
                <Text style={[styles.dataTime, styles.dataHeaderText]}>Time</Text>
                <Text style={[styles.dataConsumption, styles.dataHeaderText, { color: colors.text.secondary }]}>Usage</Text>
                <Text style={[styles.dataCost, styles.dataHeaderText, { color: colors.text.secondary }]}>Cost</Text>
              </View>
              {[...last48HoursData].reverse().slice(0, 20).map((point, index, arr) => (
                <View 
                  key={index} 
                  style={[
                    styles.dataRow, 
                    index === arr.length - 1 && styles.dataRowLast
                  ]}
                >
                  <Text style={styles.dataTime}>{point.fullTime}</Text>
                  <Text style={styles.dataConsumption}>{point.consumption.toFixed(3)} kWh</Text>
                  <Text style={styles.dataCost}>
                    {point.cost < 0.01 
                      ? `${(point.cost * 100).toFixed(2)}p` 
                      : `£${point.cost.toFixed(2)}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
