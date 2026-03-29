import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { Clock, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import Colors from '@/constants/colors';
import { ProcessedRate } from '@/types/energy';
import { getRateThresholdLevel, getThresholdColor, getThresholdLabel } from '@/utils/thresholds';

export default function ElectricityDetailScreen() {
  const {
    todayElectricityRates,
    tomorrowElectricityRates,
    electricityThresholds,
  } = useEnergyRates();

  const insets = useSafeAreaInsets();
  const [durationHours, setDurationHours] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');

  const now = useMemo(() => new Date(), []);

  const allRates = useMemo(() => {
    return [...todayElectricityRates, ...tomorrowElectricityRates];
  }, [todayElectricityRates, tomorrowElectricityRates]);

  const futureRates = useMemo(() => {
    return allRates.filter(rate => rate.validTo > now);
  }, [allRates, now]);

  const visibleTodayRates = useMemo(() => {
    return todayElectricityRates.filter(rate => rate.validTo > now);
  }, [todayElectricityRates, now]);

  const visibleTomorrowRates = useMemo(() => {
    return tomorrowElectricityRates;
  }, [tomorrowElectricityRates]);

  const cheapestTimeSlot = useMemo(() => {
    if (!durationHours && !durationMinutes) return null;
    
    const hours = parseInt(durationHours) || 0;
    const minutes = parseInt(durationMinutes) || 0;
    const totalMinutes = hours * 60 + minutes;
    
    if (totalMinutes === 0 || totalMinutes > 24 * 60) return null;

    const slotsNeeded = Math.ceil(totalMinutes / 30);
    
    if (slotsNeeded > futureRates.length) return null;

    let cheapestCost = Infinity;

    let cheapestSlots: ProcessedRate[] = [];

    for (let i = 0; i <= futureRates.length - slotsNeeded; i++) {
      const slots = futureRates.slice(i, i + slotsNeeded);
      
      const areConsecutive = slots.every((slot, idx) => {
        if (idx === 0) return true;
        return slot.validFrom.getTime() === slots[idx - 1].validTo.getTime();
      });

      if (!areConsecutive) continue;

      const totalCost = slots.reduce((sum, slot) => sum + slot.price, 0);
      
      if (totalCost < cheapestCost) {
        cheapestCost = totalCost;
        cheapestSlots = slots;
      }
    }

    if (cheapestSlots.length === 0) return null;

    const averagePrice = cheapestCost / cheapestSlots.length;
    const startTime = cheapestSlots[0].time;
    const endTime = cheapestSlots[cheapestSlots.length - 1].validTo.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      startTime,
      endTime,
      averagePrice,
      slots: cheapestSlots,
    };
  }, [durationHours, durationMinutes, futureRates]);

  const formatPrice = (price: number) => {
    return `${price.toFixed(1)}p`;
  };

  const getRateColorForPrice = (price: number) => {
    const level = getRateThresholdLevel(price, electricityThresholds);
    return getThresholdColor(level);
  };

  const getRateLevelForPrice = (price: number) => {
    const level = getRateThresholdLevel(price, electricityThresholds);
    return getThresholdLabel(level);
  };

  const isInCheapestSlot = (rate: ProcessedRate) => {
    if (!cheapestTimeSlot) return false;
    return cheapestTimeSlot.slots.some(slot => 
      slot.validFrom.getTime() === rate.validFrom.getTime()
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Electricity Rates',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text.primary,
        }} 
      />
      
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.calculatorCard}>
            <View style={styles.calculatorHeader}>
              <Clock size={24} color={Colors.primary} />
              <Text style={styles.calculatorTitle}>Find Cheapest Time</Text>
            </View>
            <Text style={styles.calculatorDescription}>
              Enter appliance running time to find the cheapest period
            </Text>
            
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="number-pad"
                  value={durationHours}
                  onChangeText={setDurationHours}
                  maxLength={2}
                />
                <Text style={styles.inputLabel}>hours</Text>
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="number-pad"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  maxLength={2}
                />
                <Text style={styles.inputLabel}>minutes</Text>
              </View>
            </View>

            {cheapestTimeSlot && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Zap size={20} color={Colors.primary} />
                  <Text style={styles.resultTitle}>Cheapest Period</Text>
                </View>
                <View style={styles.resultContent}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Time:</Text>
                    <Text style={styles.resultValue}>
                      {cheapestTimeSlot.startTime} - {cheapestTimeSlot.endTime}
                    </Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Avg Price:</Text>
                    <Text style={styles.resultValue}>
                      {formatPrice(cheapestTimeSlot.averagePrice)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {visibleTodayRates.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today&apos;s Rates</Text>
              <View style={styles.ratesList}>
                {visibleTodayRates.map((rate, index) => {
                  const isCurrent = rate.isCurrent;
                  const isInCheapest = isInCheapestSlot(rate);
                  const color = getRateColorForPrice(rate.price);
                  const level = getRateLevelForPrice(rate.price);

                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.rateCard,
                        { borderLeftColor: color, borderLeftWidth: 4 },
                        isCurrent && styles.rateCardCurrent,
                        isInCheapest && styles.rateCardHighlighted,
                      ]}
                    >
                      <View style={styles.rateTimeContainer}>
                        <Text style={[
                          styles.rateTime,
                          isCurrent && styles.rateTimeCurrent,
                        ]}>
                          {rate.time}
                        </Text>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>NOW</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.rateInfo}>
                        <Text style={styles.ratePrice}>
                          {formatPrice(rate.price)}
                        </Text>
                        <Text style={[styles.rateLevel, { color }]}>
                          {level}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {visibleTomorrowRates.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tomorrow&apos;s Rates</Text>
              <View style={styles.ratesList}>
                {visibleTomorrowRates.map((rate, index) => {
                  const isInCheapest = isInCheapestSlot(rate);
                  const color = getRateColorForPrice(rate.price);
                  const level = getRateLevelForPrice(rate.price);

                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.rateCard,
                        { borderLeftColor: color, borderLeftWidth: 4 },
                        isInCheapest && styles.rateCardHighlighted,
                      ]}
                    >
                      <View style={styles.rateTimeContainer}>
                        <Text style={styles.rateTime}>{rate.time}</Text>
                      </View>
                      <View style={styles.rateInfo}>
                        <Text style={styles.ratePrice}>
                          {formatPrice(rate.price)}
                        </Text>
                        <Text style={[styles.rateLevel, { color }]}>
                          {level}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  calculatorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calculatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calculatorTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  calculatorDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    gap: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
  },
  inputLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
  resultCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  resultContent: {
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },

  ratesList: {
    gap: 8,
  },
  rateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateCardCurrent: {
    backgroundColor: Colors.primary + '10',
  },
  rateCardPast: {
    opacity: 0.5,
  },
  rateCardHighlighted: {
    backgroundColor: '#10b98110',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  rateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rateTime: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  rateTimeCurrent: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  rateTimePast: {
    color: Colors.text.secondary,
  },
  currentBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  rateInfo: {
    alignItems: 'flex-end',
    gap: 4,
  },
  ratePrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  ratePricePast: {
    color: Colors.text.secondary,
  },
  rateLevel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
