import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { TrendingUp, TrendingDown, Zap, Sun } from 'lucide-react-native';

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
  onPress,
}: NetFluxTickerProps) {
  const [netFlux, setNetFlux] = useState<number | null>(null);
  const [isEarning, setIsEarning] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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
          toValue: 1.05,
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

  useEffect(() => {
    if (isEarning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isEarning, glowAnim]);

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
  const bgColor = isEarning 
    ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)')
    : (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)');

  const styles = StyleSheet.create({
    container: {
      backgroundColor: bgColor,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isEarning ? colors.success : colors.error,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: fluxColor,
    },
    liveText: {
      fontSize: 11,
      fontWeight: '700',
      color: fluxColor,
      textTransform: 'uppercase',
    },
    fluxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    fluxValue: {
      fontSize: 32,
      fontWeight: '800',
      color: fluxColor,
    },
    fluxLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: fluxColor,
      marginTop: 4,
    },
    detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    detailItem: {
      alignItems: 'center',
      gap: 4,
    },
    detailLabel: {
      fontSize: 11,
      color: colors.text.secondary,
      textTransform: 'uppercase',
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    importValue: {
      color: colors.error,
    },
    exportValue: {
      color: colors.success,
    },
    noExportBadge: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginTop: 8,
    },
    noExportText: {
      fontSize: 11,
      color: colors.text.secondary,
      textAlign: 'center',
    },
  });

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Zap size={16} color={fluxColor} />
            <Text style={styles.title}>Net Flux</Text>
          </View>
          <View style={styles.liveIndicator}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        <View style={styles.fluxRow}>
          {isEarning ? (
            <TrendingUp size={28} color={colors.success} />
          ) : (
            <TrendingDown size={28} color={colors.error} />
          )}
          <Text style={styles.fluxValue}>
            {isEarning ? '+' : '-'}{formatFlux(netFlux ?? 0)}
          </Text>
        </View>
        <Text style={[styles.fluxLabel, { textAlign: 'center' }]}>
          {isEarning ? 'Earning' : 'Spending'}
        </Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Import Rate</Text>
            <Text style={[styles.detailValue, styles.importValue]}>
              {importRate?.toFixed(1)}p/kWh{hasRealTimeData ? ` @ ${((Number(currentLoad) || 0) / 1000).toFixed(2)}kW` : ''}
            </Text>
          </View>
          
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

        {!hasRealTimeData && (
          <View style={styles.noExportBadge}>
            <Text style={styles.noExportText}>
              Rate-only mode. Connect a smart meter or home energy monitor for real-time cost tracking.
            </Text>
          </View>
        )}

        {hasRealTimeData && !hasExportTariff && (
          <View style={styles.noExportBadge}>
            <Text style={styles.noExportText}>
              No export tariff detected. Add solar/battery export to see earnings.
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}
