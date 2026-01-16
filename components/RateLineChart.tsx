import React, { useMemo } from 'react';
import { View, Dimensions, StyleSheet, Text } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { ProcessedRate, ProcessedForecastRate } from '@/types/energy';

interface RateLineChartProps {
  rates: ProcessedRate[];
  type: 'electricity' | 'gas';
  colors: any;
  getRateColor: (price: number, type: 'electricity' | 'gas') => string;
  allFutureRates?: ProcessedRate[];
  forecastRates?: ProcessedForecastRate[];
}

export const RateLineChart = React.memo(function RateLineChart({ rates, type, colors, getRateColor, allFutureRates, forecastRates }: RateLineChartProps) {
  const chartWidth = Dimensions.get('window').width - 72;
  const chartHeight = 200;
  const padding = { top: 20, bottom: 40, left: 40, right: 10 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const chartData = useMemo(() => {
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

    let nextLowestRate = null;
    if (currentRateIndex >= 0) {
      const todayFutureRates = rates.slice(currentRateIndex + 1);
      const futureRates = allFutureRates ? [...todayFutureRates, ...allFutureRates] : todayFutureRates;
      
      if (futureRates.length > 0) {
        const lowest = futureRates.reduce((min, rate) => 
          rate.price < min.price ? rate : min
        , futureRates[0]);
        
        const isTomorrow = allFutureRates && allFutureRates.some(r => r === lowest);
        nextLowestRate = {
          ...lowest,
          displayTime: isTomorrow ? `Tomorrow ${lowest.time}` : lowest.time,
        };
      }
    }

    return { 
      pathSegments, 
      minRate, 
      maxRate: minRate + range,
      range, 
      currentRateIndex, 
      nextRateIndex,
      nextRateFromTomorrow,
      nextLowestRate,
      getX, 
      getY 
    };
  }, [rates, colors, type, getRateColor, allFutureRates, graphHeight, graphWidth, padding.left, padding.top]);

  const forecastPath = useMemo(() => {
    if (!forecastRates || forecastRates.length === 0 || !chartData) return null;
    
    const { minRate: chartMin, maxRate: chartMax } = chartData;
    const chartRange = chartMax - chartMin || 1;
    
    const getYForForecast = (price: number) => 
      padding.top + graphHeight - ((price - chartMin) / chartRange) * graphHeight;
    
    const sortedForecast = [...forecastRates].sort(
      (a, b) => a.validFrom.getTime() - b.validFrom.getTime()
    );
    
    const matchedPoints: { x: number; y: number }[] = [];
    
    sortedForecast.forEach(forecast => {
      const forecastTime = forecast.validFrom.getTime();
      
      let closestIdx = -1;
      let closestDiff = Infinity;
      
      rates.forEach((rate, idx) => {
        const rateTime = rate.validFrom.getTime();
        const diff = Math.abs(rateTime - forecastTime);
        if (diff < closestDiff && diff < 30 * 60 * 1000) {
          closestDiff = diff;
          closestIdx = idx;
        }
      });
      
      if (closestIdx >= 0) {
        const x = padding.left + (closestIdx / Math.max(rates.length - 1, 1)) * graphWidth;
        const y = getYForForecast(forecast.price);
        matchedPoints.push({ x, y });
      }
    });
    
    if (matchedPoints.length < 2) return null;
    
    let pathD = `M ${matchedPoints[0].x} ${matchedPoints[0].y}`;
    for (let i = 1; i < matchedPoints.length; i++) {
      pathD += ` L ${matchedPoints[i].x} ${matchedPoints[i].y}`;
    }
    
    return pathD;
  }, [forecastRates, chartData, rates, padding.left, padding.top, graphHeight, graphWidth]);

  if (!chartData) return null;

  const { pathSegments, minRate, range, currentRateIndex, getX, getY, nextRateIndex, nextRateFromTomorrow, nextLowestRate } = chartData;
  const formatPrice = (price: number) => `${price.toFixed(1)}p`;

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
                stroke={colors.chartGrid || '#e1e1e1'}
                strokeWidth="1"
                strokeDasharray="5,5"
              />
              <SvgText
                x={0}
                y={y + 4}
                fontSize="11"
                fill={colors.chartAxisLabel || '#888'}
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

        {forecastPath && (
          <Path
            d={forecastPath}
            stroke="#9CA3AF"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6,4"
            opacity={0.8}
          />
        )}

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
        {['00:00', '06:00', '12:00', '18:00', "23:30"].map((time, i) => (
          <Text key={i} style={{ color: colors.chartAxisLabel, fontSize: 10, fontWeight: '500' }}>
            {time}
          </Text>
        ))}
      </View>

      {currentRateIndex >= 0 && (
        <View style={[styles.rateInfoContainer, { borderTopColor: colors.border }]}>
          <View style={styles.rateInfoColumn}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Next Rate</Text>
            {nextRateIndex >= 0 ? (
               <>
                 <Text style={[styles.value, { color: colors.text.primary }]}>
                   {formatPrice(nextRateFromTomorrow && allFutureRates ? allFutureRates[nextRateIndex].price : rates[nextRateIndex].price)}
                 </Text>
                 <Text style={[styles.timeLabel, { color: colors.text.secondary }]}>
                   at {nextRateFromTomorrow && allFutureRates ? allFutureRates[nextRateIndex].time : rates[nextRateIndex].time}
                 </Text>
               </>
            ) : (
               <Text style={[styles.value, { color: colors.text.primary }]}>No data</Text>
            )}
          </View>
          
          {nextLowestRate && (
            <View style={[styles.rateInfoColumn, styles.rateInfoColumnRight]}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Next Lowest</Text>
              <Text style={[styles.value, { color: colors.text.primary }]}>
                {formatPrice(nextLowestRate.price)}
              </Text>
              <Text style={[styles.timeLabel, { color: colors.text.secondary }]}>
                {nextLowestRate.displayTime}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  lineGraphContainer: { marginTop: 8 },
  xAxisLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 40, paddingRight: 10, marginTop: 4 },
  rateInfoContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  rateInfoColumn: { flex: 1 },
  rateInfoColumnRight: { alignItems: 'flex-end' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  value: { fontSize: 18, fontWeight: '700' },
  timeLabel: { fontSize: 12 },
});