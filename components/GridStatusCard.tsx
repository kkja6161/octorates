import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Leaf, Factory, UtilityPole, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchGridStatus } from '@/services/energyApi';
import { GridStatusData } from '@/types/energy';
import { useAccessibility } from '@/providers/AccessibilityProvider';

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
  const { isLargeText } = useAccessibility();

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
      'pumped': 'Pumped Storage',
      'solar': 'Solar',
      'wind': 'Wind',
      'ccgt': 'Gas (CCGT)',
      'ocgt': 'Gas (OCGT)',
      'battery': 'Battery',
      'oil': 'Oil',
      'ifa': 'Imports',
      'moyle': 'Ireland (Moyle)',
      'britned': 'Netherlands',
      'ewic': 'Ireland (EWIC)',
      'nemo': 'Belgium',
      'ifa2': 'France (IFA2)',
      'nsl': 'Norway',
      'eleclink': 'France (Eleclink)',
      'viking': 'Denmark',
      'greenlink': 'Ireland (Greenlink)',
    };
    return names[fuel.toLowerCase()] || fuel;
  };

  const getDetailedMixForDisplay = () => {
    if (!gridStatus.detailedMix) {
      return gridStatus.generationMix.map(item => ({
        fuel: item.fuel,
        perc: item.perc,
        generation: 0,
      })).sort((a, b) => b.perc - a.perc);
    }

    const detailed = gridStatus.detailedMix;
    const displayItems: { fuel: string; perc: number; generation: number }[] = [];

    detailed.entries.forEach(entry => {
      if (entry.fuel === 'ccgt' || entry.fuel === 'ocgt') {
        const existingGas = displayItems.find(d => d.fuel === 'gas');
        if (existingGas) {
          existingGas.generation += entry.generation;
          existingGas.perc += entry.perc;
        } else {
          displayItems.push({
            fuel: 'gas',
            perc: entry.perc,
            generation: entry.generation,
          });
        }
      } else if (!['ifa', 'moyle', 'britned', 'ewic', 'nemo', 'ifa2', 'nsl', 'eleclink', 'viking', 'greenlink'].includes(entry.fuel)) {
        displayItems.push({
          fuel: entry.fuel,
          perc: entry.perc,
          generation: entry.generation,
        });
      }
    });

    if (detailed.interconnectors.total > 0) {
      const importPerc = detailed.total > 0 
        ? Math.round((detailed.interconnectors.total / detailed.total) * 1000) / 10 
        : 0;
      displayItems.push({
        fuel: 'imports',
        perc: importPerc,
        generation: detailed.interconnectors.total,
      });
    }

    return displayItems.filter(item => item.perc > 0.1).sort((a, b) => b.perc - a.perc);
  };

  const sortedMix = getDetailedMixForDisplay();

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
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.text.secondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginTop: 10,
      marginBottom: 8,
    },
    totalGeneration: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: colors.text.primary,
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
    mixGw: {
      fontSize: 11,
      color: colors.text.secondary,
    },
    exportValue: {
      color: '#EF4444',
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
          <UtilityPole size={16} color={colors.text.secondary} />
          <Text style={styles.gridLabel}>UK GRID</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Leaf size={14} color="#10B981" />
              <Text style={styles.statValue}>{gridStatus.renewablePercentage}%</Text>
            </View>
            {!isLargeText && (
              <View style={styles.statItem}>
                <Factory size={14} color="#6B7280" />
                <Text style={styles.statValue}>{gridStatus.nonRenewablePercentage}%</Text>
              </View>
            )}
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Generation Mix</Text>
            {gridStatus.detailedMix && (
              <Text style={styles.totalGeneration}>{gridStatus.detailedMix.total.toFixed(1)} GW</Text>
            )}
          </View>
          <View style={styles.mixGrid}>
            {sortedMix.map((item) => (
              <View key={item.fuel} style={styles.mixItem}>
                <Text style={styles.mixFuel}>{formatFuelName(item.fuel)}</Text>
                <Text style={styles.mixPerc}>{item.perc.toFixed(1)}%</Text>
                {gridStatus.detailedMix && item.generation > 0 && (
                  <Text style={styles.mixGw}>{item.generation.toFixed(1)}GW</Text>
                )}
              </View>
            ))}
          </View>



          {gridStatus.detailedMix && (gridStatus.detailedMix.storage.battery > 0 || gridStatus.detailedMix.storage.pumped > 0) && (
            <>
              <Text style={styles.sectionTitle}>Storage</Text>
              <View style={styles.mixGrid}>
                {gridStatus.detailedMix.storage.battery > 0 && (
                  <View style={styles.mixItem}>
                    <Text style={styles.mixFuel}>Battery</Text>
                    <Text style={styles.mixPerc}>{gridStatus.detailedMix.storage.battery.toFixed(2)} GW</Text>
                  </View>
                )}
                {gridStatus.detailedMix.storage.pumped > 0 && (
                  <View style={styles.mixItem}>
                    <Text style={styles.mixFuel}>Pumped</Text>
                    <Text style={styles.mixPerc}>{gridStatus.detailedMix.storage.pumped.toFixed(2)} GW</Text>
                  </View>
                )}
              </View>
            </>
          )}



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
