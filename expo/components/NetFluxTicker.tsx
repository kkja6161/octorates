import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Activity, Sun, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react-native';

interface NetFluxTickerProps {
  importRate: number | null;
  exportRate: number | null;
  currentLoad: number | null;
  currentGeneration: number | null;
  colors: {
    surface: string;
    text: { primary: string; secondary: string };
    success: string;
    error: string;
    primary: string;
    border: string;
  };
  isDark: boolean;
  onPress?: () => void;
}

export function NetFluxTicker({
  importRate,
  exportRate,
  currentLoad,
  currentGeneration,
  colors,
  isDark,
  onPress: _onPress,
}: NetFluxTickerProps) {
  const [netFlux, setNetFlux] = useState<number | null>(null);
  const [isEarning, setIsEarning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (importRate === null) {
      setNetFlux(null);
      return;
    }

    // Telemetry returns demand in Watts, convert to kW for calculation
    const loadKw = (Number(currentLoad) || 0) / 1000;
    const generationKw = (Number(currentGeneration) || 0) / 1000;

    const importCost = (importRate / 100) * loadKw;
    
    const exportEarnings = (exportRate && generationKw > 0) 
      ? (exportRate / 100) * generationKw 
      : 0;

    const flux = importCost - exportEarnings;
    setNetFlux(flux);
    setIsEarning(flux < 0);

    console.log('[NetFlux] Import Rate:', importRate, 'p/kWh');
    console.log('[NetFlux] Export Rate:', exportRate, 'p/kWh');
    console.log('[NetFlux] Current Load:', currentLoad, 'W =', loadKw.toFixed(3), 'kW');
    console.log('[NetFlux] Current Generation:', currentGeneration, 'W =', generationKw.toFixed(3), 'kW');
    console.log('[NetFlux] Net Flux:', flux.toFixed(4), '£/h', flux < 0 ? '(EARNING)' : '(COST)');
  }, [importRate, exportRate, currentLoad, currentGeneration]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  const formatFlux = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue < 0.01) {
      return `${(absValue * 100).toFixed(2)}p/h`;
    }
    return `£${absValue.toFixed(2)}/h`;
  };

  const hasExportTariff = exportRate !== null && exportRate > 0;
  const hasGeneration = currentGeneration !== null && currentGeneration > 0;
  const hasRealTimeData = currentLoad !== null;

  if (importRate === null) {
    return null;
  }

  const fluxColor = isEarning ? colors.success : colors.error;

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const styles = useMemo(() => StyleSheet.create({
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
    label: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.secondary,
      letterSpacing: 0.5,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
    fluxBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: isEarning 
        ? (isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)')
        : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'),
    },
    fluxBadgeText: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: fluxColor,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: fluxColor,
      marginRight: 4,
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
    detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 12,
    },
    detailItem: {
      alignItems: 'center',
      gap: 4,
    },
    detailLabel: {
      fontSize: 11,
      color: colors.text.secondary,
      textTransform: 'uppercase' as const,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    importValue: {
      color: colors.error,
    },
    exportValue: {
      color: colors.success,
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
    noExportBadge: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 10,
    },
    noExportText: {
      fontSize: 11,
      color: colors.text.secondary,
      textAlign: 'center' as const,
    },
    viewDetailsRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 4,
    },
    viewDetailsText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.primary,
    },
  }), [colors, isDark, isEarning, fluxColor]);

  const loadKw = (Number(currentLoad) || 0) / 1000;

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <Activity size={16} color={fluxColor} />
          <Text style={styles.label}>NET FLUX</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: fluxColor }]}>
                {formatFlux(netFlux ?? 0)}
              </Text>
            </View>
            {hasRealTimeData && (
              <Text style={{ fontSize: 13, color: colors.text.secondary }}>
                @ {loadKw.toFixed(2)}kW
              </Text>
            )}
          </View>
        </View>
        <View style={styles.fluxBadge}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.fluxBadgeText}>
              {isEarning ? 'Earning' : 'Cost'}
            </Text>
          </View>
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
        <Pressable 
          style={styles.expandedContent} 
          onPress={() => router.push('/flux-detail')}
          accessibilityRole="button"
          accessibilityLabel="View today's usage details"
        >
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Import Rate</Text>
              <Text style={[styles.detailValue, styles.importValue]}>
                {importRate?.toFixed(1)}p/kWh
              </Text>
            </View>
            {hasRealTimeData && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Current Load</Text>
                <Text style={styles.detailValue}>
                  {loadKw.toFixed(2)} kW
                </Text>
              </View>
            )}
            {hasExportTariff && hasGeneration && (
              <View style={styles.detailItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Sun size={12} color={colors.success} />
                  <Text style={styles.detailLabel}>Export</Text>
                </View>
                <Text style={[styles.detailValue, styles.exportValue]}>
                  {exportRate?.toFixed(1)}p @ {((Number(currentGeneration) || 0) / 1000).toFixed(2)}kW
                </Text>
              </View>
            )}
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Status</Text>
              <Text style={[styles.summaryValue, { color: fluxColor }]}>
                {isEarning ? 'Earning' : 'Spending'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Hourly Rate</Text>
              <Text style={[styles.summaryValue, { color: fluxColor }]}>
                {formatFlux(netFlux ?? 0)}
              </Text>
            </View>
          </View>

          {!hasRealTimeData && (
            <View style={styles.noExportBadge}>
              <Text style={styles.noExportText}>
                Rate-only mode. Connect smart meter for real-time tracking.
              </Text>
            </View>
          )}

          {hasRealTimeData && !hasExportTariff && (
            <View style={styles.noExportBadge}>
              <Text style={styles.noExportText}>
                No export tariff detected. Add solar/battery to see earnings.
              </Text>
            </View>
          )}

          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>View today usage</Text>
            <ChevronRight size={16} color={colors.primary} />
          </View>
        </Pressable>
      )}
    </View>
  );
}
