import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  Clock, 
  Zap, 
  PoundSterling, 
  Save,
  Trash2,
  BatteryCharging,
  CheckCircle,
  Circle,
  PlayCircle,
  Calendar,
  TrendingUp,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';
import { useEV } from '@/providers/EVProvider';
import { ChargingLogEntry } from '@/types/ev';

export default function LogDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  const { getLogEntry, updateLogEntry, deleteLogEntry } = useEV();

  const [log, setLog] = useState<ChargingLogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [actualStartTime, setActualStartTime] = useState('');
  const [actualEndTime, setActualEndTime] = useState('');
  const [actualEnergy, setActualEnergy] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (id) {
      const entry = getLogEntry(id);
      if (entry) {
        setLog(entry);
        setNote(entry.note || '');
        if (entry.actualStartTime) {
          setActualStartTime(formatDateTimeForInput(entry.actualStartTime));
        }
        if (entry.actualEndTime) {
          setActualEndTime(formatDateTimeForInput(entry.actualEndTime));
        }
        if (entry.actualEnergyDelivered) {
          setActualEnergy(entry.actualEnergyDelivered.toString());
        }
      }
      setIsLoading(false);
    }
  }, [id, getLogEntry]);

  const formatDateTimeForInput = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      year: 'numeric',
    });
  };

  const parseDateTimeInput = (input: string): Date | null => {
    const parts = input.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})/);
    if (parts) {
      const [, day, month, year, hour, minute] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    }
    return null;
  };

  const handleSave = () => {
    if (!id) return;

    const updates: Partial<ChargingLogEntry> = {
      note: note.trim() || undefined,
    };

    if (actualStartTime.trim()) {
      const parsed = parseDateTimeInput(actualStartTime);
      if (parsed) {
        updates.actualStartTime = parsed.toISOString();
      } else {
        Alert.alert('Invalid Date', 'Please enter start time in format: DD/MM/YYYY, HH:MM');
        return;
      }
    }

    if (actualEndTime.trim()) {
      const parsed = parseDateTimeInput(actualEndTime);
      if (parsed) {
        updates.actualEndTime = parsed.toISOString();
      } else {
        Alert.alert('Invalid Date', 'Please enter end time in format: DD/MM/YYYY, HH:MM');
        return;
      }
    }

    if (actualEnergy.trim()) {
      const energy = parseFloat(actualEnergy);
      if (isNaN(energy) || energy < 0) {
        Alert.alert('Invalid Energy', 'Please enter a valid energy value in kWh');
        return;
      }
      updates.actualEnergyDelivered = energy;
    }

    updateLogEntry(id, updates);
    
    const updatedLog = getLogEntry(id);
    if (updatedLog) {
      setLog(updatedLog);
    }

    Alert.alert('Saved', 'Charging session updated successfully');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this charging session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteLogEntry(id!);
            router.back();
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: ChargingLogEntry['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color={colors.success} />;
      case 'in_progress':
        return <PlayCircle size={20} color={colors.accent} />;
      default:
        return <Circle size={20} color={colors.text.tertiary} />;
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

  if (isLoading || !log) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <BatteryCharging size={28} color={colors.primary} />
          <View style={styles.headerText}>
            <Text style={styles.profileName}>{log.profileName}</Text>
            <Text style={styles.chargeRange}>
              {log.initialCurrentCharge}% → {log.initialTargetCharge}%
            </Text>
          </View>
          <View style={styles.statusBadge}>
            {getStatusIcon(log.status)}
            <Text style={styles.statusText}>{getStatusText(log.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estimates</Text>
        <View style={styles.card}>
          <View style={styles.statRow}>
            <View style={styles.statIcon}>
              <Calendar size={18} color={colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Recommended Time</Text>
              <Text style={styles.statValue}>
                {formatDate(log.recommendedStartTime)}
              </Text>
              <Text style={styles.statSubvalue}>
                {formatTime(log.recommendedStartTime)} - {formatTime(log.recommendedEndTime)}
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statIcon}>
              <Zap size={18} color={colors.accent} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Energy Needed</Text>
              <Text style={styles.statValue}>{log.estimatedEnergyNeeded.toFixed(2)} kWh</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statIcon}>
              <PoundSterling size={18} color={colors.success} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Estimated Cost</Text>
              <Text style={styles.statValue}>£{(log.estimatedCost / 100).toFixed(2)}</Text>
              <Text style={styles.statSubvalue}>{log.estimatedAvgRate.toFixed(2)}p/kWh avg</Text>
            </View>
          </View>
        </View>
      </View>

      {log.status === 'completed' && log.actualCost !== undefined && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actuals</Text>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <Zap size={18} color={colors.accent} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Energy Delivered</Text>
                <Text style={styles.statValue}>{log.actualEnergyDelivered?.toFixed(2)} kWh</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statIcon}>
                <PoundSterling size={18} color={colors.success} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Actual Cost</Text>
                <Text style={styles.statValue}>£{(log.actualCost / 100).toFixed(2)}</Text>
                <Text style={styles.statSubvalue}>{log.actualAvgRate?.toFixed(2)}p/kWh avg</Text>
              </View>
            </View>

            {log.actualChargingRate !== undefined && (
              <View style={styles.statRow}>
                <View style={styles.statIcon}>
                  <TrendingUp size={18} color={colors.secondary} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Avg Charging Rate</Text>
                  <Text style={styles.statValue}>{log.actualChargingRate.toFixed(2)} kW</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Update Actuals</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Time</Text>
            <View style={styles.inputWrapper}>
              <Clock size={18} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                value={actualStartTime}
                onChangeText={setActualStartTime}
                placeholder="DD/MM/YYYY, HH:MM"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>End Time</Text>
            <View style={styles.inputWrapper}>
              <Clock size={18} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                value={actualEndTime}
                onChangeText={setActualEndTime}
                placeholder="DD/MM/YYYY, HH:MM"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Energy Delivered (kWh)</Text>
            <View style={styles.inputWrapper}>
              <Zap size={18} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                value={actualEnergy}
                onChangeText={setActualEnergy}
                placeholder="e.g., 25.5"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Note</Text>
            <View style={styles.inputWrapper}>
              <FileText size={18} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder="Optional note..."
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Save size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Trash2 size={20} color={colors.error} />
          <Text style={[styles.deleteButtonText, { color: colors.error }]}>Delete Session</Text>
        </TouchableOpacity>
      </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  chargeRange: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  statSubvalue: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  actions: {
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  bottomPadding: {
    height: 40,
  },
});
