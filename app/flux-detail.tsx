import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Activity, TrendingUp, Clock } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAccessibleColors } from '@/hooks/useAccessibleStyles';
import { useConsumption } from '@/providers/ConsumptionProvider';
import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import { fetchTodayHalfHourlyConsumption, HalfHourlyConsumptionEntry } from '@/services/energyApi';
import { UsageCostChart, UsageCostDataPoint } from '@/components/UsageCostChart';

export default function FluxDetailScreen() {
  const { isDark } = useTheme();
  const colors = useAccessibleColors();
  const { apiKey, hasSmartMeter, meterDeviceId } = useConsumption();
  const { todayElectricityRates } = useEnergyRates();

  console.log('[FluxDetail] Screen loaded - hasSmartMeter:', hasSmartMeter, 'meterDeviceId:', meterDeviceId, 'apiKey:', apiKey ? 'present' : 'missing');

  const todayConsumptionQuery = useQuery({
    queryKey: ['today-half-hourly-consumption', meterDeviceId, apiKey],
    queryFn: async () => {
      if (!meterDeviceId || !apiKey) {
        console.log('[FluxDetail] Missing credentials - deviceId:', meterDeviceId, 'apiKey:', !!apiKey);
        return [];
      }
      console.log('[FluxDetail] Fetching today half-hourly consumption for device:', meterDeviceId);
      try {
        const data = await fetchTodayHalfHourlyConsumption(meterDeviceId, apiKey);
        console.log('[FluxDetail] Got', data.length, 'entries');
        return data;
      } catch (error) {
        console.error('[FluxDetail] Error fetching consumption:', error);
        return [];
      }
    },
    enabled: !!meterDeviceId && !!apiKey,
    refetchInterval: 15 * 60 * 1000, // 15 minutes - conservative to respect API rate limits
    staleTime: 10 * 60 * 1000, // 10 minutes - matches API cache interval
    retry: false, // Don't retry - the API service handles caching/rate limiting
    refetchOnWindowFocus: false, // Don't refetch on focus to reduce API calls
  });

  const chartData = useMemo((): UsageCostDataPoint[] => {
    const consumption = todayConsumptionQuery.data;
    if (!consumption || consumption.length === 0) return [];

    return consumption.map((entry: HalfHourlyConsumptionEntry) => {
      const readAt = new Date(entry.readAt);
      const kWh = entry.consumptionDelta || 0;
      
      let rate = 0;
      if (todayElectricityRates && todayElectricityRates.length > 0) {
        const matchingRate = todayElectricityRates.find(r => {
          return readAt >= r.validFrom && readAt < r.validTo;
        });
        if (matchingRate) {
          rate = matchingRate.price;
        } else {
          const sortedRates = [...todayElectricityRates].sort(
            (a, b) => Math.abs(readAt.getTime() - a.validFrom.getTime()) - 
                      Math.abs(readAt.getTime() - b.validFrom.getTime())
          );
          if (sortedRates.length > 0) {
            rate = sortedRates[0].price;
          }
        }
      }
      
      const cost = kWh * rate;

      return {
        time: readAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        timeDate: readAt,
        kWh,
        cost,
        rate,
      };
    });
  }, [todayConsumptionQuery.data, todayElectricityRates]);

  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { totalKWh: 0, totalCost: 0, avgRate: 0, peakKWh: 0, peakTime: '' };
    }

    const totalKWh = chartData.reduce((sum, d) => sum + d.kWh, 0);
    const totalCost = chartData.reduce((sum, d) => sum + d.cost, 0);
    const avgRate = totalKWh > 0 ? totalCost / totalKWh : 0;
    
    let peakKWh = 0;
    let peakTime = '';
    chartData.forEach(d => {
      if (d.kWh > peakKWh) {
        peakKWh = d.kWh;
        peakTime = d.time;
      }
    });

    return { totalKWh, totalCost, avgRate, peakKWh, peakTime };
  }, [chartData]);

  const isLoading = todayConsumptionQuery.isLoading;
  const isError = todayConsumptionQuery.isError;
  const queryEnabled = !!meterDeviceId && !!apiKey;

  console.log('[FluxDetail] Query state - enabled:', queryEnabled, 'isLoading:', isLoading, 'isError:', isError, 'dataLength:', todayConsumptionQuery.data?.length ?? 0);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statBox: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
    },
    statSubtext: {
      fontSize: 11,
      color: colors.text.secondary,
    },
    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 8,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.text.secondary,
    },
    noDataContainer: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      gap: 12,
    },
    noDataTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      textAlign: 'center',
    },
    noDataText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    usageList: {
      marginTop: 8,
    },
    usageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    usageTime: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
      width: 60,
    },
    usageKwh: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      width: 70,
      textAlign: 'right',
    },
    usageCost: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.error,
      width: 60,
      textAlign: 'right',
    },
    usageRate: {
      fontSize: 12,
      color: colors.text.secondary,
      width: 60,
      textAlign: 'right',
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 8,
      marginBottom: 4,
      borderBottomWidth: 2,
      borderBottomColor: colors.border,
    },
    listHeaderText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.secondary,
      textTransform: 'uppercase',
    },
  });

  if (!hasSmartMeter || !meterDeviceId) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            title: 'Today Usage',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text.primary,
          }} 
        />
        <View style={styles.container}>
          <View style={[styles.scrollContent, { flex: 1, justifyContent: 'center' }]}>
            <View style={styles.noDataContainer}>
              <Activity size={48} color={colors.text.secondary} />
              <Text style={styles.noDataTitle}>Smart Meter Required</Text>
              <Text style={styles.noDataText}>
                Real-time usage data requires a compatible smart meter with Home Mini or CAD device connected to your Octopus account.
              </Text>
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Today Usage',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text.primary,
        }} 
      />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={todayConsumptionQuery.isFetching}
              onRefresh={() => todayConsumptionQuery.refetch()}
              tintColor={colors.primary}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading usage data...</Text>
            </View>
          ) : isError ? (
            <View style={styles.noDataContainer}>
              <Activity size={48} color={colors.error} />
              <Text style={styles.noDataTitle}>Error Loading Data</Text>
              <Text style={styles.noDataText}>
                Failed to fetch consumption data. Pull down to retry.
              </Text>
            </View>
          ) : chartData.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Clock size={48} color={colors.text.secondary} />
              <Text style={styles.noDataTitle}>No Data Yet</Text>
              <Text style={styles.noDataText}>
                Half-hourly consumption data will appear here as it becomes available throughout the day.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Activity size={20} color={colors.primary} />
                  <Text style={styles.cardTitle}>Today Summary</Text>
                </View>
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Usage</Text>
                    <Text style={styles.statValue}>{stats.totalKWh.toFixed(2)}</Text>
                    <Text style={styles.statSubtext}>kWh</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Cost</Text>
                    <Text style={[styles.statValue, { color: colors.error }]}>
                      {stats.totalCost < 100 ? `${stats.totalCost.toFixed(1)}p` : `£${(stats.totalCost / 100).toFixed(2)}`}
                    </Text>
                    <Text style={styles.statSubtext}>so far today</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Avg Rate</Text>
                    <Text style={styles.statValue}>{stats.avgRate.toFixed(1)}p</Text>
                    <Text style={styles.statSubtext}>per kWh</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Peak Usage</Text>
                    <Text style={styles.statValue}>{stats.peakKWh.toFixed(2)}</Text>
                    <Text style={styles.statSubtext}>kWh at {stats.peakTime}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Usage & Cost Over Time</Text>
                <UsageCostChart
                  data={chartData}
                  colors={colors}
                  isDark={isDark}
                />
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <TrendingUp size={20} color={colors.primary} />
                  <Text style={styles.cardTitle}>Half-Hourly Breakdown</Text>
                </View>
                
                <View style={styles.listHeader}>
                  <Text style={[styles.listHeaderText, { width: 60 }]}>Time</Text>
                  <Text style={[styles.listHeaderText, { width: 70, textAlign: 'right' }]}>Usage</Text>
                  <Text style={[styles.listHeaderText, { width: 60, textAlign: 'right' }]}>Cost</Text>
                  <Text style={[styles.listHeaderText, { width: 60, textAlign: 'right' }]}>Rate</Text>
                </View>
                
                <View style={styles.usageList}>
                  {[...chartData].reverse().map((item, index) => (
                    <View key={index} style={styles.usageRow}>
                      <Text style={styles.usageTime}>{item.time}</Text>
                      <Text style={styles.usageKwh}>{item.kWh.toFixed(3)}</Text>
                      <Text style={styles.usageCost}>{item.cost.toFixed(2)}p</Text>
                      <Text style={styles.usageRate}>{item.rate.toFixed(1)}p</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}
