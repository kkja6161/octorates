import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import Colors from '@/constants/colors';
import { RateThresholds } from '@/types/energy';
import { validateThresholds, normalizeThresholds } from '@/utils/thresholds';

export default function GasThresholdsScreen() {
  const router = useRouter();
  const {
    gasThresholds,
    setGasThresholds,
  } = useEnergyRates();
  
  const [tempThresholds, setTempThresholds] = useState<RateThresholds>(gasThresholds);
  const [thresholdErrors, setThresholdErrors] = useState<string[]>([]);

  const handleSave = () => {
    const validation = validateThresholds(tempThresholds);
    if (!validation.isValid) {
      setThresholdErrors(validation.errors);
      return;
    }
    setGasThresholds(tempThresholds);
    setThresholdErrors([]);
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>
          Set the price thresholds (in pence/kWh) for color coding rates
        </Text>
        
        <View style={styles.thresholdItem}>
          <View style={styles.thresholdHeader}>
            <View style={[styles.colorDot, { backgroundColor: Colors.chart.veryLow }]} />
            <Text style={styles.thresholdLabel}>Very Low (Below)</Text>
          </View>
          <TextInput
            style={styles.thresholdInput}
            value={(tempThresholds?.veryLow ?? 0).toString()}
            onChangeText={(text) => {
              const value = parseFloat(text) || 0;
              setTempThresholds({ ...tempThresholds, veryLow: value });
            }}
            keyboardType="decimal-pad"
            placeholder="3"
          />
        </View>
        
        <View style={styles.thresholdItem}>
          <View style={styles.thresholdHeader}>
            <View style={[styles.colorDot, { backgroundColor: Colors.chart.low }]} />
            <Text style={styles.thresholdLabel}>Low (Below)</Text>
          </View>
          <TextInput
            style={styles.thresholdInput}
            value={(tempThresholds?.low ?? 0).toString()}
            onChangeText={(text) => {
              const value = parseFloat(text) || 0;
              setTempThresholds({ ...tempThresholds, low: value });
            }}
            keyboardType="decimal-pad"
            placeholder="5"
          />
        </View>
        
        <View style={styles.thresholdItem}>
          <View style={styles.thresholdHeader}>
            <View style={[styles.colorDot, { backgroundColor: Colors.chart.medium }]} />
            <Text style={styles.thresholdLabel}>Medium (Below)</Text>
          </View>
          <TextInput
            style={styles.thresholdInput}
            value={(tempThresholds?.medium ?? 0).toString()}
            onChangeText={(text) => {
              const value = parseFloat(text) || 0;
              setTempThresholds({ ...tempThresholds, medium: value });
            }}
            keyboardType="decimal-pad"
            placeholder="7"
          />
        </View>
        
        <View style={styles.thresholdItem}>
          <View style={styles.thresholdHeader}>
            <View style={[styles.colorDot, { backgroundColor: Colors.chart.high }]} />
            <Text style={styles.thresholdLabel}>High (Below)</Text>
          </View>
          <TextInput
            style={styles.thresholdInput}
            value={(tempThresholds?.high ?? 0).toString()}
            onChangeText={(text) => {
              const value = parseFloat(text) || 0;
              setTempThresholds({ ...tempThresholds, high: value });
            }}
            keyboardType="decimal-pad"
            placeholder="10"
          />
        </View>
        
        <View style={styles.thresholdItem}>
          <View style={styles.thresholdHeader}>
            <View style={[styles.colorDot, { backgroundColor: Colors.chart.veryHigh }]} />
            <Text style={styles.thresholdLabel}>Very High (Above)</Text>
          </View>
          <TextInput
            style={styles.thresholdInput}
            value={(tempThresholds?.veryHigh ?? 0).toString()}
            onChangeText={(text) => {
              const value = parseFloat(text) || 0;
              setTempThresholds({ ...tempThresholds, veryHigh: value });
            }}
            keyboardType="decimal-pad"
            placeholder="11"
          />
        </View>
        
        {thresholdErrors.length > 0 && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Threshold Errors:</Text>
            {thresholdErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>• {error}</Text>
            ))}
            <Pressable
              style={styles.normalizeButton}
              onPress={() => {
                const normalized = normalizeThresholds(tempThresholds);
                setTempThresholds(normalized);
                setThresholdErrors([]);
              }}
            >
              <Text style={styles.normalizeButtonText}>Fix Automatically</Text>
            </Pressable>
          </View>
        )}
        
        <Pressable
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Thresholds</Text>
        </Pressable>
      </ScrollView>
    </View>
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
    padding: 20,
    gap: 20,
  },
  description: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  thresholdItem: {
    gap: 8,
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  thresholdLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  thresholdInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#991b1b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    marginBottom: 4,
  },
  normalizeButton: {
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  normalizeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
});
