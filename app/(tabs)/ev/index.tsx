import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Zap, 
  Battery, 
  Clock, 
  PoundSterling, 
  ChevronRight, 
  Plus,
  History,
  Car,
  BatteryCharging,
  TrendingDown,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';
import { useEV } from '@/providers/EVProvider';
import { ChargingCalculation, ChargingSlot } from '@/types/ev';

export default function EVChargingScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  const { profiles, calculateCharging, addLogEntry, isLoading } = useEV();

  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [currentCharge, setCurrentCharge] = useState<number>(20);
  const [targetCharge, setTargetCharge] = useState<number>(80);
  const [sliderWidth, setSliderWidth] = useState<number>(0);
  
  const currentChargeRef = useRef(currentCharge);
  const targetChargeRef = useRef(targetCharge);
  const sliderWidthRef = useRef(sliderWidth);
  const startValueRef = useRef<number>(0);
  
  currentChargeRef.current = currentCharge;
  targetChargeRef.current = targetCharge;
  sliderWidthRef.current = sliderWidth;
  
  const handleSliderLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width);
  }, []);
  
  const currentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startValueRef.current = currentChargeRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const width = sliderWidthRef.current;
        if (width === 0) return;
        const startPos = (startValueRef.current / 100) * width;
        const newPos = startPos + gestureState.dx;
        const newValue = Math.round((newPos / width) * 100);
        const clampedValue = Math.max(0, Math.min(100, newValue));
        if (clampedValue < targetChargeRef.current - 5) {
          setCurrentCharge(clampedValue);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;
  
  const targetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startValueRef.current = targetChargeRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const width = sliderWidthRef.current;
        if (width === 0) return;
        const startPos = (startValueRef.current / 100) * width;
        const newPos = startPos + gestureState.dx;
        const newValue = Math.round((newPos / width) * 100);
        const clampedValue = Math.max(0, Math.min(100, newValue));
        if (clampedValue > currentChargeRef.current + 5) {
          setTargetCharge(clampedValue);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;
  const [finishTimeMinutes, setFinishTimeMinutes] = useState<number>(420);
  const finishTimeMinutesRef = useRef(finishTimeMinutes);
  finishTimeMinutesRef.current = finishTimeMinutes;
  const [timeSliderWidth, setTimeSliderWidth] = useState<number>(0);
  const timeSliderWidthRef = useRef(timeSliderWidth);
  timeSliderWidthRef.current = timeSliderWidth;
  const timeStartValueRef = useRef<number>(0);
  
  const handleTimeSliderLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTimeSliderWidth(width);
  }, []);
  
  const timePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        timeStartValueRef.current = finishTimeMinutesRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const width = timeSliderWidthRef.current;
        if (width === 0) return;
        const maxMinutes = 1440;
        const startPos = (timeStartValueRef.current / maxMinutes) * width;
        const newPos = startPos + gestureState.dx;
        const newValue = Math.round((newPos / width) * maxMinutes / 30) * 30;
        const clampedValue = Math.max(0, Math.min(1410, newValue));
        setFinishTimeMinutes(clampedValue);
      },
      onPanResponderRelease: () => {},
    })
  ).current;
  
  const formatMinutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  const desiredFinishTime = formatMinutesToTime(finishTimeMinutes);
  const [calculation, setCalculation] = useState<ChargingCalculation | null>(null);
  const [note, setNote] = useState<string>('');

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  const handleCalculate = useCallback(() => {
    if (!selectedProfileId) {
      Alert.alert('Select Profile', 'Please select an EV or battery profile first.');
      return;
    }

    const current = currentCharge;
    const target = targetCharge;

    if (isNaN(current) || current < 0 || current > 100) {
      Alert.alert('Invalid Input', 'Current charge must be between 0 and 100%.');
      return;
    }

    if (isNaN(target) || target < 0 || target > 100) {
      Alert.alert('Invalid Input', 'Target charge must be between 0 and 100%.');
      return;
    }

    if (target <= current) {
      Alert.alert('Invalid Input', 'Target charge must be greater than current charge.');
      return;
    }

    const result = calculateCharging(selectedProfileId, current, target, desiredFinishTime);
    setCalculation(result);
    console.log('[EVScreen] Calculation result:', result);
  }, [selectedProfileId, currentCharge, targetCharge, desiredFinishTime, calculateCharging]);

  const handleSaveToLog = useCallback(() => {
    if (!calculation) return;

    const entry = addLogEntry(calculation, note.trim() || undefined);
    Alert.alert(
      'Session Saved',
      'Your charging session has been saved to the log. You can update it with actual values later.',
      [
        { text: 'View Log', onPress: () => router.push('/ev/logs') },
        { text: 'OK' },
      ]
    );
    setCalculation(null);
    setCurrentCharge(20);
    setNote('');
    console.log('[EVScreen] Saved log entry:', entry.id);
  }, [calculation, note, addLogEntry, router]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.mainContainer}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <Text style={styles.headerTitle}>EV Charging</Text>
        </LinearGradient>

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => router.push('/ev/profiles')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '20' }]}>
            <Car size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickActionText}>Profiles</Text>
          <ChevronRight size={16} color={colors.text.tertiary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => router.push('/ev/logs')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.accent + '20' }]}>
            <History size={20} color={colors.accent} />
          </View>
          <Text style={styles.quickActionText}>History</Text>
          <ChevronRight size={16} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Charging Calculator</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Select Profile</Text>
          {profiles.length === 0 ? (
            <TouchableOpacity 
              style={styles.emptyProfileButton}
              onPress={() => router.push('/ev/add-profile')}
            >
              <Plus size={20} color={colors.primary} />
              <Text style={styles.emptyProfileText}>Add your first EV or battery</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.profileScroll}
            >
              {profiles.map(profile => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.profileChip,
                    selectedProfileId === profile.id && styles.profileChipSelected,
                  ]}
                  onPress={() => setSelectedProfileId(profile.id)}
                >
                  {profile.type === 'ev' ? (
                    <Car size={16} color={selectedProfileId === profile.id ? '#fff' : colors.text.secondary} />
                  ) : (
                    <Battery size={16} color={selectedProfileId === profile.id ? '#fff' : colors.text.secondary} />
                  )}
                  <Text style={[
                    styles.profileChipText,
                    selectedProfileId === profile.id && styles.profileChipTextSelected,
                  ]}>
                    {profile.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addProfileChip}
                onPress={() => router.push('/ev/add-profile')}
              >
                <Plus size={16} color={colors.primary} />
              </TouchableOpacity>
            </ScrollView>
          )}

          {selectedProfile && (
            <View style={styles.profileInfo}>
              <Text style={styles.profileInfoText}>
                {selectedProfile.capacity} kWh capacity • {selectedProfile.maxChargingRate} kW max rate
              </Text>
            </View>
          )}

          <View style={styles.chargeSliderContainer}>
            <Text style={styles.label}>Charge Range</Text>
            <View style={styles.chargeLabels}>
              <View style={styles.chargeLabelBox}>
                <Text style={styles.chargeLabelTitle}>Current</Text>
                <Text style={styles.chargeLabelValue}>{currentCharge}%</Text>
              </View>
              <View style={[styles.chargeLabelBox, styles.chargeLabelBoxTarget]}>
                <Text style={styles.chargeLabelTitle}>Target</Text>
                <Text style={[styles.chargeLabelValue, { color: colors.primary }]}>{targetCharge}%</Text>
              </View>
            </View>
            
            <View 
              style={styles.sliderContainer}
              onLayout={handleSliderLayout}
            >
              <View style={styles.sliderTrack} />
              <View 
                style={[
                  styles.sliderFill,
                  {
                    left: `${currentCharge}%`,
                    width: `${targetCharge - currentCharge}%`,
                    backgroundColor: colors.primary,
                  }
                ]} 
              />
              
              <View
                {...currentPanResponder.panHandlers}
                style={[
                  styles.sliderHandle,
                  styles.sliderHandleCurrent,
                  { left: `${currentCharge}%`, borderColor: colors.text.secondary }
                ]}
              >
                <View style={[styles.sliderHandleInner, { backgroundColor: colors.text.secondary }]} />
              </View>
              
              <View
                {...targetPanResponder.panHandlers}
                style={[
                  styles.sliderHandle,
                  styles.sliderHandleTarget,
                  { left: `${targetCharge}%`, borderColor: colors.primary }
                ]}
              >
                <View style={[styles.sliderHandleInner, { backgroundColor: colors.primary }]} />
              </View>
            </View>
            
            <View style={styles.sliderScale}>
              <Text style={styles.sliderScaleText}>0%</Text>
              <Text style={styles.sliderScaleText}>25%</Text>
              <Text style={styles.sliderScaleText}>50%</Text>
              <Text style={styles.sliderScaleText}>75%</Text>
              <Text style={styles.sliderScaleText}>100%</Text>
            </View>
          </View>

          <View style={styles.timeSliderContainer}>
            <Text style={styles.label}>Desired Finish Time</Text>
            <View style={styles.timeDisplayBox}>
              <Clock size={20} color={colors.primary} />
              <Text style={styles.timeDisplayValue}>{desiredFinishTime}</Text>
              <Text style={styles.timeDisplayLabel}>
                {finishTimeMinutes < 360 ? 'Early morning' : 
                 finishTimeMinutes < 720 ? 'Morning' : 
                 finishTimeMinutes < 1080 ? 'Afternoon' : 'Evening'}
              </Text>
            </View>
            
            <View 
              style={styles.timeSliderOuter}
              onLayout={handleTimeSliderLayout}
            >
              <View style={styles.timeSliderTrack} />
              <View 
                style={[
                  styles.timeSliderFill,
                  {
                    width: `${(finishTimeMinutes / 1440) * 100}%`,
                    backgroundColor: colors.primary,
                  }
                ]} 
              />
              
              <View
                {...timePanResponder.panHandlers}
                style={[
                  styles.timeSliderHandle,
                  { left: `${(finishTimeMinutes / 1440) * 100}%`, borderColor: colors.primary }
                ]}
              >
                <View style={[styles.sliderHandleInner, { backgroundColor: colors.primary }]} />
              </View>
            </View>
            
            <View style={styles.timeSliderScale}>
              <Text style={styles.sliderScaleText}>00:00</Text>
              <Text style={styles.sliderScaleText}>06:00</Text>
              <Text style={styles.sliderScaleText}>12:00</Text>
              <Text style={styles.sliderScaleText}>18:00</Text>
              <Text style={styles.sliderScaleText}>24:00</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.calculateButton,
              !selectedProfileId && styles.calculateButtonDisabled,
            ]}
            onPress={handleCalculate}
            disabled={!selectedProfileId}
          >
            <Zap size={20} color="#fff" />
            <Text style={styles.calculateButtonText}>Find Best Time</Text>
          </TouchableOpacity>
        </View>
      </View>

      {calculation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Charging</Text>

          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <BatteryCharging size={24} color={colors.success} />
              <View style={styles.resultHeaderText}>
                <Text style={styles.resultTitle}>Optimal Charging Window</Text>
                <Text style={styles.resultSubtitle}>
                  {formatDate(calculation.bestStartTime)} • {calculation.cheapestSlots.length} slots
                  {calculation.desiredFinishTime && ` • Ready by ${formatTime(calculation.desiredFinishTime)}`}
                </Text>
              </View>
            </View>

            <View style={styles.resultStats}>
              <View style={styles.resultStat}>
                <Clock size={18} color={colors.primary} />
                <View>
                  <Text style={styles.resultStatValue}>
                    {formatTime(calculation.bestStartTime)} - {formatTime(calculation.bestEndTime)}
                  </Text>
                  <Text style={styles.resultStatLabel}>Best time to charge</Text>
                </View>
              </View>

              <View style={styles.resultStat}>
                <Zap size={18} color={colors.accent} />
                <View>
                  <Text style={styles.resultStatValue}>{calculation.energyNeeded.toFixed(1)} kWh</Text>
                  <Text style={styles.resultStatLabel}>Energy needed</Text>
                </View>
              </View>

              <View style={styles.resultStat}>
                <PoundSterling size={18} color={colors.success} />
                <View>
                  <Text style={styles.resultStatValue}>£{(calculation.estimatedCost / 100).toFixed(2)}</Text>
                  <Text style={styles.resultStatLabel}>Est. cost</Text>
                </View>
              </View>

              <View style={styles.resultStat}>
                <TrendingDown size={18} color={colors.secondary} />
                <View>
                  <Text style={styles.resultStatValue}>{calculation.averageRate.toFixed(2)}p/kWh</Text>
                  <Text style={styles.resultStatLabel}>Avg rate</Text>
                </View>
              </View>
            </View>

            {calculation.cheapestSlots.length > 0 && (
              <View style={styles.slotsContainer}>
                <Text style={styles.slotsTitle}>Charging Slots</Text>
                {calculation.cheapestSlots.slice(0, 6).map((slot: ChargingSlot, index: number) => (
                  <View key={index} style={styles.slotRow}>
                    <Text style={styles.slotTime}>
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </Text>
                    <Text style={styles.slotRate}>{slot.rate.toFixed(1)}p/kWh</Text>
                    <Text style={styles.slotEnergy}>{slot.energyCharged.toFixed(1)} kWh</Text>
                  </View>
                ))}
                {calculation.cheapestSlots.length > 6 && (
                  <Text style={styles.moreSlots}>
                    +{calculation.cheapestSlots.length - 6} more slots
                  </Text>
                )}
              </View>
            )}

            <View style={styles.noteContainer}>
              <Text style={styles.label}>Add Note (optional)</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="e.g., Weekend trip preparation"
                placeholderTextColor={colors.text.tertiary}
                multiline
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveToLog}
            >
              <History size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save to Charging Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.surface,
  },
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
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.text.secondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  emptyProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 16,
  },
  emptyProfileText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500' as const,
  },
  profileScroll: {
    marginBottom: 12,
    marginHorizontal: -4,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  profileChipText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500' as const,
  },
  profileChipTextSelected: {
    color: '#fff',
  },
  addProfileChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  profileInfo: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  profileInfoText: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center' as const,
  },
  chargeSliderContainer: {
    marginBottom: 16,
  },
  chargeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  chargeLabelBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  chargeLabelBoxTarget: {
    backgroundColor: colors.primary + '10',
  },
  chargeLabelTitle: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  chargeLabelValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  sliderContainer: {
    height: 44,
    justifyContent: 'center',
    marginHorizontal: 14,
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
  },
  sliderFill: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
  },
  sliderHandle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 3,
    marginLeft: -14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderHandleCurrent: {
    zIndex: 2,
  },
  sliderHandleTarget: {
    zIndex: 3,
  },
  sliderHandleInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sliderScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 0,
  },
  sliderScaleText: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  timeSliderContainer: {
    marginBottom: 16,
  },
  timeDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  timeDisplayValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  timeDisplayLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500' as const,
  },
  timeSliderOuter: {
    height: 44,
    justifyContent: 'center',
    marginHorizontal: 14,
  },
  timeSliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
  },
  timeSliderFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  timeSliderHandle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 3,
    marginLeft: -14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 5,
  },
  timeSliderScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 0,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  calculateButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultHeaderText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  resultSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  resultStats: {
    gap: 14,
    marginBottom: 16,
  },
  resultStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultStatValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  resultStatLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  slotsContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  slotsTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  slotTime: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500' as const,
  },
  slotRate: {
    width: 80,
    fontSize: 14,
    color: colors.success,
    fontWeight: '500' as const,
    textAlign: 'right' as const,
  },
  slotEnergy: {
    width: 70,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'right' as const,
  },
  moreSlots: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center' as const,
    marginTop: 8,
  },
  noteContainer: {
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 15,
    color: colors.text.primary,
    minHeight: 60,
    textAlignVertical: 'top' as const,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
});
