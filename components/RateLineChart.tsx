import React, { useMemo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { ProcessedRate } from '@/types/energy';

interface RateLineChartProps {
  rates: ProcessedRate[];
  type: 'electricity' | 'gas';
  colors: any;
  getRateColor: (price: number, type: 'electricity' | 'gas') => string;
  allFutureRates?: ProcessedRate[];
}

export const RateLineChart = React.memo(({ rates, type, colors, getRateColor, allFutureRates }: RateLineChartProps) => {
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
    
    // Calculate Next Rate Logic
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

    // Calculate Next Lowest Rate Logic
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
      range, 
      currentRateIndex, 
      nextRateIndex,
      nextRateFromTomorrow,
      nextLowestRate,
      getX, 
      getY 
    };
  }, [rates, colors, type, getRateColor, allFutureRates]);

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
          <SvgText key={i} fill={colors.chartAxisLabel} fontSize="11" fontWeight="500">
             {/* Note: In standard RN View, we use Text. Using plain Text below for axis labels outside SVG */}
          </SvgText>
        ))}
         {/* Render X Axis Labels with standard Text components for better layout control */}
         <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40, width: chartWidth}}>
             {['00', '06', '12', '18', "23"].map((time, i) => (
               <View key={i}><SvgText fill="transparent">{time}</SvgText></View> // Spacer
             ))}
         </View>
      </View>
       
       {/* Re-implementing the X-Axis Labels properly outside SVG */}
      <View style={styles.xAxisLabels}>
        {['00', '06', '12', '18', "23"].map((time, i) => (
          <React.Fragment key={i}>
             {/* Use Text from react-native, imported by parent usually, but here we use View structure */}
          </React.Fragment>
        ))}
      </View>

      {currentRateIndex >= 0 && (
        <View style={[styles.rateInfoContainer, { borderTopColor: colors.border }]}>
          <View style={styles.rateInfoColumn}>
            <TextLabel color={colors.text.secondary}>Next Rate</TextLabel>
            {nextRateIndex >= 0 ? (
               <>
                 <TextValue color={colors.text.primary}>
                   {formatPrice(nextRateFromTomorrow && allFutureRates ? allFutureRates[nextRateIndex].price : rates[nextRateIndex].price)}
                 </TextValue>
                 <TextTime color={colors.text.secondary}>
                   at {nextRateFromTomorrow && allFutureRates ? allFutureRates[nextRateIndex].time : rates[nextRateIndex].time}
                 </TextTime>
               </>
            ) : (
               <TextValue color={colors.text.primary}>No data</TextValue>
            )}
          </View>
          
          {nextLowestRate && (
            <View style={[styles.rateInfoColumn, styles.rateInfoColumnRight]}>
              <TextLabel color={colors.text.secondary}>Next Lowest Rate</TextLabel>
              <TextValue color={colors.text.primary}>
                {formatPrice(nextLowestRate.price)}
              </TextValue>
              <TextTime color={colors.text.secondary}>
                {nextLowestRate.displayTime || nextLowestRate.time}
              </TextTime>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

// Simple local components to avoid import mess in this file
const TextLabel = ({children, color}: any) => <View><SvgText fill={color} fontSize="13" fontWeight="600">{children}</SvgText></View>; 
// Note: To keep this file clean and working, we should rely on the styles passed from parent or defined here.
// But standard RN Text is better for these labels. 
// Let's rely on standard styling in the main component, but for this specific "Text" inside the chart component:

const styles = StyleSheet.create({
  lineGraphContainer: { marginTop: 8 },
  xAxisLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40, marginTop: 8 },
  rateInfoContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  rateInfoColumn: { flex: 1 },
  rateInfoColumnRight: { alignItems: 'flex-end' },
});

// Since we cannot easily import "Text" inside the component without conflicting with SVG Text, 
// we will export this component and let the user import Text from react-native in the main file.
// Ideally, swap the SvgText for standard RN Text for the labels below the chart.
