import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react-native';

import { fetchAgilePrediction } from '@/services/energyApi';
import { ProcessedForecastRate, RateThresholds } from '@/types/energy';
import { getRateThresholdLevel, getThresholdColor } from '@/utils/thresholds';
import { useNotificationSettings } from '@/providers/NotificationSettingsProvider';

interface AgileForecastCardProps {
  region: string;
  colors: any;
  isDark: boolean;
  thresholds: RateThresholds;
  tomorrowRatesAvailable: boolean;
}

export const AgileForecastCard = React.memo(function AgileForecastCard({
  region,
  colors,
  isDark,
  thresholds,
  tomorrowRatesAvailable,
}: AgileForecastCardProps) {
  const { schedulePriceAlerts, priceAlertSettings } = useNotificationSettings();

  const { data: rawForecastRates, isLoading, error } = useQuery({
    queryKey: ['agile-prediction', region],
    queryFn: () => fetchAgilePrediction(region, 7),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });

  const chartWidth = Dimensions.get('window').width - 72;
  const chartHeight = 180;
  const padding = { top: 20, bottom: 50, left: 45, right: 10 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const getRateColor = (price: number) => {
    const level = getRateThresholdLevel(price, thresholds);
    return getThresholdColor(level, isDark);
  };

  const forecastRates = useMemo(() => {
    if (!rawForecastRates || rawForecastRates.length === 0) return [];
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrowStart = new Date(tomorrowStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);
    
    const filtered = rawForecastRates.filter(rate => {
      // Always exclude today
      if (rate.validFrom < tomorrowStart) return false;
      // Exclude tomorrow if actual rates are available
      if (tomorrowRatesAvailable && rate.validFrom < dayAfterTomorrowStart) return false;
      return true;
    });
    
    // Get unique days and limit to exactly 5 days
    const daySet = new Set<string>();
    const result: ProcessedForecastRate[] = [];
    
    for (const rate of filtered) {
      const dayKey = rate.validFrom.toDateString();
      if (!daySet.has(dayKey)) {
        if (daySet.size >= 5) break;
        daySet.add(dayKey);
      }
      if (daySet.size <= 5) {
        result.push(rate);
      }
    }
    
    return result;
  }, [rawForecastRates, tomorrowRatesAvailable]);

  useEffect(() => {
    if (rawForecastRates && rawForecastRates.length > 0 && priceAlertSettings?.enabled) {
      console.log('[AgileForecastCard] Scheduling price alerts with', rawForecastRates.length, 'forecast rates');
      void schedulePriceAlerts(rawForecastRates);
    }
  }, [rawForecastRates, priceAlertSettings?.enabled, schedulePriceAlerts]);

  const chartData = useMemo(() => {
    if (!forecastRates || forecastRates.length === 0) return null;

    const dailyAverages = new Map<string, { sum: number; count: number; min: number; max: number; rates: ProcessedForecastRate[] }>();
    
    forecastRates.forEach(rate => {
      const dateKey = rate.date;
      if (!dailyAverages.has(dateKey)) {
        dailyAverages.set(dateKey, { sum: 0, count: 0, min: Infinity, max: -Infinity, rates: [] });
      }
      const day = dailyAverages.get(dateKey)!;
      day.sum += rate.price;
      day.count++;
      day.min = Math.min(day.min, rate.lowPrice ?? rate.price);
      day.max = Math.max(day.max, rate.highPrice ?? rate.price);
      day.rates.push(rate);
    });

    const days = Array.from(dailyAverages.entries()).map(([date, data]) => ({
      date,
      avg: data.sum / data.count,
      min: data.min,
      max: data.max,
      rateCount: data.count,
    }));

    const allPrices = forecastRates.map(r => r.price);
    const minRate = Math.min(...allPrices) - 2;
    const maxRate = Math.max(...allPrices) + 2;
    const range = maxRate - minRate || 1;

    const getX = (index: number) => padding.left + (index / Math.max(forecastRates.length - 1, 1)) * graphWidth;
    const getY = (price: number) => padding.top + graphHeight - ((price - minRate) / range) * graphHeight;

    // Build colored path segments like RateLineChart
    const pathSegments: { path: string; color: string }[] = [];
    let currentPath = '';
    let currentColor = '';

    forecastRates.forEach((rate, index) => {
      const x = getX(index);
      const y = getY(rate.price);
      const level = getRateThresholdLevel(rate.price, thresholds);
      const color = getThresholdColor(level, isDark);

      if (index === 0) {
        currentPath = `M ${x} ${y}`;
        currentColor = color;
      } else {
        if (color === currentColor) {
          currentPath += ` L ${x} ${y}`;
        } else {
          pathSegments.push({ path: currentPath, color: currentColor });
          currentPath = `M ${getX(index - 1)} ${getY(forecastRates[index - 1].price)} L ${x} ${y}`;
          currentColor = color;
        }
      }

      if (index === forecastRates.length - 1) {
        pathSegments.push({ path: currentPath, color: currentColor });
      }
    });

    // Build area path for gradient fill
    let areaPathD = '';
    forecastRates.forEach((rate, index) => {
      const x = getX(index);
      const y = getY(rate.price);
      if (index === 0) {
        areaPathD = `M ${x} ${y}`;
      } else {
        areaPathD += ` L ${x} ${y}`;
      }
    });

    let areaPath = areaPathD;
    if (forecastRates.length > 0) {
      areaPath += ` L ${getX(forecastRates.length - 1)} ${padding.top + graphHeight}`;
      areaPath += ` L ${getX(0)} ${padding.top + graphHeight} Z`;
    }

    return {
      pathSegments,
      areaPath,
      minRate,
      maxRate,
      range,
      days,
      getX,
      getY,
    };
  }, [forecastRates, graphHeight, graphWidth, padding.left, padding.top, thresholds, isDark]);

  const formatPrice = (price: number) => `${price.toFixed(1)}p`;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    subtitle: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    badge: {
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#8B5CF6',
    },
    chartContainer: {
      marginTop: 8,
    },
    loadingContainer: {
      height: 180,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorContainer: {
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center' as const,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 11,
      color: colors.text.secondary,
      fontWeight: '500' as const,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
  }), [colors, isDark]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={styles.title}>5-Day Forecast</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !chartData || forecastRates.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={styles.title}>5-Day Forecast</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Forecast data unavailable</Text>
        </View>
      </View>
    );
  }

  const { pathSegments, areaPath, minRate, range, days } = chartData;

  const avgPrice = forecastRates.reduce((sum, r) => sum + r.price, 0) / forecastRates.length;
  const minPrice = Math.min(...forecastRates.map(r => r.price));
  const maxPrice = Math.max(...forecastRates.map(r => r.price));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={styles.title}>5-Day Forecast</Text>
          </View>
          <Text style={styles.subtitle}>Predicted Agile prices</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI Prediction</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>

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
                  stroke={colors.chartGrid || '#e1e1e1'}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={2}
                  y={y + 4}
                  fontSize="10"
                  fill={colors.chartAxisLabel || '#888'}
                  fontWeight="500"
                >
                  {price.toFixed(0)}p
                </SvgText>
              </React.Fragment>
            );
          })}

          <Path
            d={areaPath}
            fill="url(#areaGradient)"
          />

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

          {days.map((day) => {
            const dayRates = forecastRates.filter(r => r.date === day.date);
            if (dayRates.length === 0) return null;
            const midIndex = Math.floor(dayRates.length / 2);
            const midRate = dayRates[midIndex];
            const rateIndex = forecastRates.indexOf(midRate);
            const x = chartData.getX(rateIndex);
            
            return (
              <React.Fragment key={day.date}>
                <Line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + graphHeight}
                  stroke={colors.border}
                  strokeWidth="1"
                  strokeDasharray="2,4"
                />
                <SvgText
                  x={x}
                  y={chartHeight - 20}
                  fontSize="9"
                  fill={colors.chartAxisLabel || '#888'}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {day.date.split(' ')[0]}
                </SvgText>
                <SvgText
                  x={x}
                  y={chartHeight - 8}
                  fontSize="9"
                  fill={colors.chartAxisLabel || '#888'}
                  textAnchor="middle"
                >
                  {day.date.split(' ').slice(1).join(' ')}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Avg</Text>
          <Text style={[styles.statValue, { color: getRateColor(avgPrice) }]}>
            {formatPrice(avgPrice)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Min</Text>
          <Text style={[styles.statValue, { color: getRateColor(minPrice) }]}>
            {formatPrice(minPrice)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Max</Text>
          <Text style={[styles.statValue, { color: getRateColor(maxPrice) }]}>
            {formatPrice(maxPrice)}
          </Text>
        </View>
      </View>
    </View>
  );
});
