import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Clock, 
  Zap, 
  PoundSterling, 
  ChevronRight, 
  BatteryCharging,
  CheckCircle,
  Circle,
  PlayCircle,
  History,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';
import { useEV } from '@/providers/EVProvider';
import { ChargingLogEntry } from '@/types/ev';

export default function LogsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  const { logs } = useEV();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
    });
  };

  const getStatusIcon = (status: ChargingLogEntry['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color={colors.success} />;
      case 'in_progress':
        return <PlayCircle size={16} color={colors.accent} />;
      default:
        return <Circle size={16} color={colors.text.tertiary} />;
    }
  };

  const getStatusText = (status: ChargingLogEntry['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Planned';
    }
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <History size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No Charging History</Text>
          <Text style={styles.emptySubtitle}>
            Your saved charging sessions will appear here
          </Text>
        </View>
      ) : (
        <View style={styles.logsList}>
          {logs.map(log => (
            <TouchableOpacity
              key={log.id}
              style={styles.logCard}
              onPress={() => router.push({ pathname: '/(tabs)/ev/log-detail', params: { id: log.id } })}
            >
              <View style={styles.logHeader}>
                <View style={styles.logHeaderLeft}>
                  <BatteryCharging size={20} color={colors.primary} />
                  <View>
                    <Text style={styles.logProfileName}>{log.profileName}</Text>
                    <Text style={styles.logDate}>{formatDate(log.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.logStatus}>
                  {getStatusIcon(log.status)}
                  <Text style={[
                    styles.logStatusText,
                    log.status === 'completed' && { color: colors.success },
                    log.status === 'in_progress' && { color: colors.accent },
                  ]}>
                    {getStatusText(log.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.logStats}>
                <View style={styles.logStat}>
                  <Clock size={14} color={colors.text.tertiary} />
                  <Text style={styles.logStatText}>
                    {formatTime(log.recommendedStartTime)}
                  </Text>
                </View>
                <View style={styles.logStat}>
                  <Zap size={14} color={colors.text.tertiary} />
                  <Text style={styles.logStatText}>
                    {log.actualEnergyDelivered 
                      ? `${log.actualEnergyDelivered.toFixed(1)} kWh`
                      : `~${log.estimatedEnergyNeeded.toFixed(1)} kWh`}
                  </Text>
                </View>
                <View style={styles.logStat}>
                  <PoundSterling size={14} color={colors.text.tertiary} />
                  <Text style={styles.logStatText}>
                    £{((log.actualCost ?? log.estimatedCost) / 100).toFixed(2)}
                  </Text>
                </View>
              </View>

              {log.note && (
                <Text style={styles.logNote} numberOfLines={1}>
                  {log.note}
                </Text>
              )}

              <View style={styles.logFooter}>
                <Text style={styles.logChargeRange}>
                  {log.initialCurrentCharge}% → {log.initialTargetCharge}%
                </Text>
                <ChevronRight size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center' as const,
    marginTop: 8,
    lineHeight: 20,
  },
  logsList: {
    gap: 12,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logProfileName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  logDate: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  logStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logStatusText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.text.secondary,
  },
  logStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  logStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logStatText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  logNote: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontStyle: 'italic' as const,
    marginBottom: 10,
  },
  logFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logChargeRange: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.primary,
  },
  bottomPadding: {
    height: 40,
  },
});
