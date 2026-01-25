import React, { useMemo } from 'react';
import { View, Dimensions, StyleSheet, Text } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';

export interface UsageCostDataPoint {
  time: string;
  timeDate: Date;
  kWh: number;
  cost: number;
  rate: number;
}

interface UsageCostChartProps {
  data: UsageCostDataPoint[];
  colors: {
    surface: string;
    text: { primary: string; secondary: string };
    primary: string;
    success: string;
    error: string;
    border: string;
    chartGrid?: string;
    chartAxisLabel?: string;
  };
  isDark: boolean;
}

export const UsageCostChart = React.memo(function UsageCostChart({ 
  data, 
  colors,
  isDark,
}: UsageCostChartProps) {
  const chartWidth = Dimensions.get('window').width - 48;
  const chartHeight = 220;
  const padding = { top: 24, bottom: 44, left: 44, right: 44 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const kWhValues = data.map(d => d.kWh);
    const costValues = data.map(d => d.cost);

    const minKWh = 0;
    const maxKWh = Math.max(...kWhValues, 0.1);
    const kWhRange = maxKWh - minKWh || 0.1;

    const minCost = 0;
    const maxCost = Math.max(...costValues, 1);
    const costRange = maxCost - minCost || 1;

    const getX = (index: number) => {
      if (data.length <= 1) return padding.left + graphWidth / 2;
      return padding.left + (index / (data.length - 1)) * graphWidth;
    };

    const getYkWh = (kWh: number) => {
      return padding.top + graphHeight - ((kWh - minKWh) / kWhRange) * graphHeight;
    };

    const getYCost = (cost: number) => {
      return padding.top + graphHeight - ((cost - minCost) / costRange) * graphHeight;
    };

    // Build kWh path
    let kWhPath = '';
    data.forEach((point, index) => {
      const x = getX(index);
      const y = getYkWh(point.kWh);
      if (index === 0) {
        kWhPath = `M ${x} ${y}`;
      } else {
        kWhPath += ` L ${x} ${y}`;
      }
    });

    // Build cost path
    let costPath = '';
    data.forEach((point, index) => {
      const x = getX(index);
      const y = getYCost(point.cost);
      if (index === 0) {
        costPath = `M ${x} ${y}`;
      } else {
        costPath += ` L ${x} ${y}`;
      }
    });

    // Build area fill for kWh
    let kWhAreaPath = kWhPath;
    if (data.length > 0) {
      kWhAreaPath += ` L ${getX(data.length - 1)} ${padding.top + graphHeight}`;
      kWhAreaPath += ` L ${getX(0)} ${padding.top + graphHeight}`;
      kWhAreaPath += ' Z';
    }

    return {
      kWhPath,
      costPath,
      kWhAreaPath,
      minKWh,
      maxKWh,
      kWhRange,
      minCost,
      maxCost,
      costRange,
      getX,
      getYkWh,
      getYCost,
    };
  }, [data, graphHeight, graphWidth, padding.left, padding.top]);

  const timeLabels = useMemo(() => {
    if (data.length === 0) return [];
    const labels: { time: string; x: number }[] = [];
    const step = Math.max(1, Math.floor(data.length / 6));
    
    for (let i = 0; i < data.length; i += step) {
      labels.push({
        time: data[i].time,
        x: padding.left + (i / (data.length - 1)) * graphWidth,
      });
    }
    
    if (labels.length > 0 && labels[labels.length - 1].time !== data[data.length - 1].time) {
      labels.push({
        time: data[data.length - 1].time,
        x: padding.left + graphWidth,
      });
    }
    
    return labels;
  }, [data, graphWidth, padding.left]);

  if (!chartData || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          No consumption data available yet
        </Text>
      </View>
    );
  }

  const { 
    kWhPath, 
    costPath, 
    kWhAreaPath, 
    maxKWh, 
    maxCost, 
    getX, 
    getYkWh, 
    getYCost 
  } = chartData;

  const kWhColor = colors.primary;
  const costColor = colors.error;

  const formatKWh = (value: number) => `${value.toFixed(2)}`;
  const formatCost = (value: number) => `${value.toFixed(1)}p`;

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
          const y = padding.top + graphHeight - fraction * graphHeight;
          return (
            <Line
              key={i}
              x1={padding.left}
              y1={y}
              x2={padding.left + graphWidth}
              y2={y}
              stroke={colors.chartGrid || (isDark ? '#333' : '#e1e1e1')}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* kWh area fill */}
        <Path
          d={kWhAreaPath}
          fill={kWhColor}
          opacity={0.1}
        />

        {/* kWh line */}
        <Path
          d={kWhPath}
          stroke={kWhColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cost line */}
        <Path
          d={costPath}
          stroke={costColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6,3"
        />

        {/* Left Y-axis labels (kWh) */}
        {[0, 0.5, 1].map((fraction, i) => {
          const y = padding.top + graphHeight - fraction * graphHeight;
          const value = fraction * maxKWh;
          return (
            <SvgText
              key={`kwh-${i}`}
              x={padding.left - 6}
              y={y + 4}
              fontSize="10"
              fill={kWhColor}
              fontWeight="500"
              textAnchor="end"
            >
              {formatKWh(value)}
            </SvgText>
          );
        })}

        {/* Right Y-axis labels (Cost) */}
        {[0, 0.5, 1].map((fraction, i) => {
          const y = padding.top + graphHeight - fraction * graphHeight;
          const value = fraction * maxCost;
          return (
            <SvgText
              key={`cost-${i}`}
              x={padding.left + graphWidth + 6}
              y={y + 4}
              fontSize="10"
              fill={costColor}
              fontWeight="500"
              textAnchor="start"
            >
              {formatCost(value)}
            </SvgText>
          );
        })}

        {/* Y-axis titles */}
        <SvgText
          x={12}
          y={padding.top + graphHeight / 2}
          fontSize="9"
          fill={kWhColor}
          fontWeight="600"
          textAnchor="middle"
          rotation="-90"
          originX={12}
          originY={padding.top + graphHeight / 2}
        >
          kWh
        </SvgText>

        <SvgText
          x={chartWidth - 10}
          y={padding.top + graphHeight / 2}
          fontSize="9"
          fill={costColor}
          fontWeight="600"
          textAnchor="middle"
          rotation="90"
          originX={chartWidth - 10}
          originY={padding.top + graphHeight / 2}
        >
          Cost
        </SvgText>

        {/* Data point markers for latest */}
        {data.length > 0 && (
          <>
            <Circle
              cx={getX(data.length - 1)}
              cy={getYkWh(data[data.length - 1].kWh)}
              r="5"
              fill={kWhColor}
              stroke={colors.surface}
              strokeWidth="2"
            />
            <Circle
              cx={getX(data.length - 1)}
              cy={getYCost(data[data.length - 1].cost)}
              r="5"
              fill={costColor}
              stroke={colors.surface}
              strokeWidth="2"
            />
          </>
        )}

        {/* X-axis time labels */}
        {timeLabels.map((label, i) => (
          <SvgText
            key={i}
            x={label.x}
            y={chartHeight - 8}
            fontSize="9"
            fill={colors.chartAxisLabel || colors.text.secondary}
            fontWeight="500"
            textAnchor="middle"
          >
            {label.time}
          </SvgText>
        ))}
      </Svg>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: kWhColor }]} />
          <Text style={[styles.legendText, { color: colors.text.secondary }]}>
            Usage (kWh)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLineDashed, { borderColor: costColor }]} />
          <Text style={[styles.legendText, { color: colors.text.secondary }]}>
            Cost (p)
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  emptyContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
  },
  legendLineDashed: {
    width: 16,
    height: 0,
    borderTopWidth: 3,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
