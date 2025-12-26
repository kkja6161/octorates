import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useConsumption, ELECTRICITY_COMPARISON_TARIFFS } from '@/providers/ConsumptionProvider';
import Colors from '@/constants/colors';

export default function ElectricityComparisonScreen() {
  const router = useRouter();
  const {
    electricityComparisonTariff,
    setElectricityComparisonTariff,
  } = useConsumption();

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Select a tariff to compare your electricity costs against. This helps you see potential savings on different tariffs.
      </Text>
      
      <ScrollView style={styles.listContainer}>
        {ELECTRICITY_COMPARISON_TARIFFS.map((tariff) => (
          <Pressable
            key={tariff.code}
            style={[
              styles.tariffItem,
              electricityComparisonTariff === tariff.code && styles.listItemSelected
            ]}
            onPress={() => {
              setElectricityComparisonTariff(tariff.code);
              router.back();
            }}
          >
            <View style={styles.tariffItemLeft}>
              <Text style={[
                styles.tariffItemTitle,
                electricityComparisonTariff === tariff.code && styles.listItemTextSelected
              ]}>
                {tariff.displayName}
              </Text>
              <Text style={styles.tariffItemDescription} numberOfLines={2}>
                {tariff.description}
              </Text>
            </View>
            {electricityComparisonTariff === tariff.code && (
              <View style={styles.checkmark} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  description: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  listContainer: {
    flex: 1,
  },
  tariffItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  listItemSelected: {
    backgroundColor: Colors.background,
  },
  tariffItemLeft: {
    flex: 1,
    gap: 6,
  },
  tariffItemTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  listItemTextSelected: {
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  tariffItemDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
});
