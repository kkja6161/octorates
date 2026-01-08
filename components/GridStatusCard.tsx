import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Leaf, Factory, Activity, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchGridStatus } from '@/services/energyApi';
import { GridStatusData } from '@/types/energy';

interface GridStatusCardProps {
  colors: {
    surface: string;
    text: {
      primary: string;
      secondary: string;
    };
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  isDark: boolean;
}

const INTENSITY_COLORS: Record<string, { bg: string; text: string }> = {
  'very low': { bg: '#10B981', text: '#FFFFFF' },
  'low': { bg: '#34D399', text: '#064E3B' },
  'moderate': { bg: '#FBBF24', text: '#78350F' },
  'high': { bg: '#F97316', text: '#FFFFFF' },
  'very high': { bg: '#EF4444', text: '#FFFFFF' },
};

export function GridStatusCard({ colors, isDark }: GridStatusCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [rotateAnim] = useState(new Animated.Value(0));

  const { data: gridStatus, isLoading } = useQuery<GridStatusData | null>({
    queryKey: ['gridStatus'],
    queryFn: fetchGridStatus,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  if (isLoading || !gridStatus) {
    return null;
  }

  const intensityColor = INTENSITY_COLORS[gridStatus.intensityIndex] || INTENSITY_COLORS['moderate'];

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const formatFuelName = (fuel: string) => {
    const names: Record<string, string> = {
      'biomass': 'Biomass',
      'coal': 'Coal',
      'imports': 'Imports',
      'gas': 'Gas',
      'nuclear': 'Nuclear',
      'other': 'Other',
      'hydro': 'Hydro',
      'hydroelectric': 'Hydro',
      'pumped storage': 'Pumped Storage',
      'solar': 'Solar',
      'wind': 'Wind',
    };
    return names[fuel.toLowerCase()] || fuel;
  };

  const sortedMix = [...gridStatus.generationMix].sort((a, b) => b.perc - a.perc);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    gridLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.secondary,
      letterSpacing: 0.5,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    co2Badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: intensityColor.bg,
    },
    co2Text: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: intensityColor.text,
    },
    expandButton: {
      padding: 4,
    },
    expandedContent: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.text.secondary,
      marginTop: 10,
      marginBottom: 8,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    mixGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    mixItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    mixFuel: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    mixPerc: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    summaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: 2,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    renewableValue: {
      color: '#10B981',
    },
    nonRenewableValue: {
      color: '#6B7280',
    },
    co2Value: {
      color: intensityColor.bg,
    },
  });

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <Activity size={16} color={colors.text.secondary} />
          <Text style={styles.gridLabel}>UK GRID</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Leaf size={14} color="#10B981" />
              <Text style={styles.statValue}>{gridStatus.renewablePercentage}%</Text>
            </View>
            <View style={styles.statItem}>
              <Factory size={14} color="#6B7280" />
              <Text style={styles.statValue}>{gridStatus.nonRenewablePercentage}%</Text>
            </View>
          </View>
        </View>
        <View style={styles.co2Badge}>
          <Text style={styles.co2Text}>{gridStatus.carbonIntensity}g</Text>
        </View>
        <View style={styles.expandButton}>
          {expanded ? (
            <ChevronUp size={18} color={colors.text.secondary} />
          ) : (
            <ChevronDown size={18} color={colors.text.secondary} />
          )}
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.sectionTitle}>Generation Mix</Text>
          <View style={styles.mixGrid}>
            {sortedMix.filter(item => item.perc > 0).map((item) => (
              <View key={item.fuel} style={styles.mixItem}>
                <Text style={styles.mixFuel}>{formatFuelName(item.fuel)}</Text>
                <Text style={styles.mixPerc}>{item.perc.toFixed(1)}%</Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Renewable</Text>
              <Text style={[styles.summaryValue, styles.renewableValue]}>
                {gridStatus.renewablePercentage}%
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Non-Renewable</Text>
              <Text style={[styles.summaryValue, styles.nonRenewableValue]}>
                {gridStatus.nonRenewablePercentage}%
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>CO₂ Intensity</Text>
              <Text style={[styles.summaryValue, styles.co2Value]}>
                {gridStatus.carbonIntensity}g/kWh
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
