import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Info } from 'lucide-react-native';

import { useConsumption } from '@/providers/ConsumptionProvider';
import Colors from '@/constants/colors';

const DEFAULT_GAS_CV = 39.0;
const GAS_VCF = 1.02264;
const GAS_CF = 3.6;

export default function GasConversionScreen() {
  const { gasCv, setGasCv } = useConsumption();
  const [cvInput, setCvInput] = useState<string>(gasCv.toString());

  const handleSave = () => {
    const parsed = parseFloat(cvInput);
    
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid positive number for the Calorific Value.');
      return;
    }

    if (parsed < 35 || parsed > 45) {
      Alert.alert(
        'Unusual Value',
        'The Calorific Value you entered is outside the typical range (35-45). Are you sure this is correct?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Save Anyway', 
            onPress: () => {
              setGasCv(parsed);
              Alert.alert('Success', 'Gas conversion settings saved successfully.');
            }
          },
        ]
      );
      return;
    }

    setGasCv(parsed);
    Alert.alert('Success', 'Gas conversion settings saved successfully.');
  };

  const handleReset = () => {
    setCvInput(DEFAULT_GAS_CV.toString());
    setGasCv(DEFAULT_GAS_CV);
    Alert.alert('Success', 'Gas conversion settings reset to default.');
  };

  const calculateExample = () => {
    const cv = parseFloat(cvInput) || gasCv;
    const exampleM3 = 1.0;
    const exampleKwh = (exampleM3 * GAS_VCF * cv) / GAS_CF;
    return exampleKwh.toFixed(3);
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Gas Conversion',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text.primary,
        }} 
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Info size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Gas meters measure consumption in cubic meters (m³), but energy is billed in kilowatt-hours (kWh). 
            This conversion uses the formula from your gas bill.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversion Formula</Text>
          <View style={styles.formulaBox}>
            <Text style={styles.formulaText}>kWh = (m³ × VCF × CV) ÷ CF</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversion Factors</Text>
          
          <View style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <Text style={styles.factorLabel}>Volume Correction Factor (VCF)</Text>
              <Text style={styles.factorValue}>{GAS_VCF}</Text>
            </View>
            <Text style={styles.factorDescription}>
              Adjusts for temperature and pressure variations
            </Text>
          </View>

          <View style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <Text style={styles.factorLabel}>Calorific Value (CV)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={cvInput}
                  onChangeText={setCvInput}
                  keyboardType="decimal-pad"
                  placeholder="39.0"
                  placeholderTextColor={Colors.text.secondary}
                />
                <Text style={styles.inputUnit}>MJ/m³</Text>
              </View>
            </View>
            <Text style={styles.factorDescription}>
              Energy content of the gas. Check your gas bill for the exact value used in your area. 
              Typical range: 37.5 - 43.0 MJ/m³.
            </Text>
          </View>

          <View style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <Text style={styles.factorLabel}>Conversion Factor (CF)</Text>
              <Text style={styles.factorValue}>{GAS_CF}</Text>
            </View>
            <Text style={styles.factorDescription}>
              Converts megajoules to kilowatt-hours
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Example Calculation</Text>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleText}>
              1.0 m³ × {GAS_VCF} × {cvInput || gasCv} ÷ {GAS_CF}
            </Text>
            <Text style={styles.exampleResult}>
              = {calculateExample()} kWh
            </Text>
          </View>
          <Text style={styles.exampleNote}>
            This is how 1 cubic meter of gas is converted to kilowatt-hours for billing.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </Pressable>
          
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  formulaBox: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignItems: 'center',
  },
  formulaText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  factorCard: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    gap: 8,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  factorValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  factorDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'right' as const,
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.secondary,
  },
  exampleBox: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    gap: 8,
  },
  exampleText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  exampleResult: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
    textAlign: 'center' as const,
  },
  exampleNote: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    fontStyle: 'italic' as const,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
});
