import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';
import { RateLineChart } from '@/components/RateLineChart';
import { getRateThresholdLevel, getThresholdColor } from '@/utils/thresholds';

export default function ElectricityDetailScreen() {
  const router = useRouter();
  const { 
    todayElectricityRates, 
    tomorrowElectricityRates, 
    electricityThresholds 
  } = useEnergyRates();
  
  const { isDark } = useTheme();
  const colors = useColors(isDark);

  const getRateColor = (price: number) => {
    const level = getRateThresholdLevel(price, electricityThresholds);
    return getThresholdColor(level, isDark);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Overlay (since headerShown: false in layout) */}
      <View style={[styles.customHeader, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          <Text style={[styles.backText, { color: colors.text.primary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Electricity Rates</Text>
        <View style={{ width: 60 }} /> {/* Spacer for centering */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Today's Chart Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Today's Trend</Text>
          <RateLineChart 
             rates={todayElectricityRates} 
             type="electricity"
             colors={colors}
             getRateColor={(p) => getRateColor(p)}
             allFutureRates={tomorrowElectricityRates}
          />
        </View>

        {/* Tomorrow's Chart Card (Conditional) */}
        {tomorrowElectricityRates.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Tomorrow's Trend</Text>
            <RateLineChart 
               rates={tomorrowElectricityRates} 
               type="electricity"
               colors={colors}
               getRateColor={(p) => getRateColor(p)}
            />
          </View>
        )}

        {/* Detailed List Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
           <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Detailed Schedule</Text>
           
           <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
             <Text style={[styles.headerLabel, { color: colors.text.secondary }]}>Time</Text>
             <Text style={[styles.headerLabel, { color: colors.text.secondary }]}>Price (p/kWh)</Text>
           </View>

           {todayElectricityRates.map((rate, index) => (
             <View key={index} style={[styles.row, { borderBottomColor: colors.border }]}>
               <Text style={[styles.timeText, { color: colors.text.primary }]}>{rate.time}</Text>
               <View style={styles.priceContainer}>
                 {rate.isCurrent && (
                   <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                     <Text style={styles.currentBadgeText}>NOW</Text>
                   </View>
                 )}
                 <Text style={[styles.priceText, { color: getRateColor(rate.price) }]}>
                   {rate.price.toFixed(2)}p
                 </Text>
               </View>
             </View>
           ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  backText: {
    fontSize: 16,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
});
