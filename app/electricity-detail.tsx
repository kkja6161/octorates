import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';
import { RateLineChart } from '@/components/RateLineChart';
import { getRateThresholdLevel, getThresholdColor } from '@/utils/thresholds';

export default function ElectricityDetailScreen() {
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    timeText: {
      fontSize: 16,
      color: colors.text.primary,
    },
    priceText: {
      fontSize: 16,
      fontWeight: '600',
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Electricity Detail' }} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Today's Chart */}
          <View style={styles.card}>
            <Text style={styles.title}>Today's Trend</Text>
            <RateLineChart 
               rates={todayElectricityRates} 
               type="electricity"
               colors={colors}
               getRateColor={(p) => getRateColor(p)}
               allFutureRates={tomorrowElectricityRates}
            />
          </View>

          {/* Tomorrow's Chart */}
          {tomorrowElectricityRates.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.title}>Tomorrow's Trend</Text>
              <RateLineChart 
                 rates={tomorrowElectricityRates} 
                 type="electricity"
                 colors={colors}
                 getRateColor={(p) => getRateColor(p)}
              />
            </View>
          )}

          {/* List View Example */}
          <View style={styles.card}>
             <Text style={styles.title}>Rate List (Today)</Text>
             {todayElectricityRates.map((rate, index) => (
               <View key={index} style={styles.row}>
                 <Text style={styles.timeText}>{rate.time}</Text>
                 <Text style={[styles.priceText, { color: getRateColor(rate.price) }]}>
                   {rate.price.toFixed(2)}p
                 </Text>
               </View>
             ))}
          </View>

        </ScrollView>
      </View>
    </>
  );
}