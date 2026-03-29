import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ExternalLink } from 'lucide-react-native';
import * as Linking from 'expo-linking';

import { useConsumption } from '@/providers/ConsumptionProvider';
import Colors from '@/constants/colors';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const {
    apiKey,
    accountNumber,
    fetchAndSaveAccountData,
    isAccountLoading,
    accountError,
    hasAccountData,
  } = useConsumption();

  const [tempAccountNumber, setTempAccountNumber] = useState<string>(accountNumber || '');
  const [tempApiKey, setTempApiKey] = useState<string>(apiKey || '');

  const handleSaveAccount = async () => {
    if (!tempAccountNumber.trim() || !tempApiKey.trim()) {
      Alert.alert('Missing Information', 'Please enter both your Account Number and API Key.');
      return;
    }
    
    try {
      await fetchAndSaveAccountData(tempAccountNumber.trim(), tempApiKey.trim());
      router.back();
    } catch {
      Alert.alert('Error', accountError || 'Failed to fetch account data. Please check your credentials.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>
          Enter your Octopus Energy account number and API key to automatically fetch your meter details, tariffs, and consumption data.
        </Text>
        
        <Pressable
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://octopus.energy/dashboard/new/accounts/personal-details/api-access')}
        >
          <Text style={styles.linkButtonText}>Get API Key from Octopus</Text>
          <ExternalLink size={16} color={Colors.primary} />
        </Pressable>
        
        {hasAccountData && (
          <View style={styles.apiKeyStatus}>
            <Text style={styles.apiKeyStatusText}>✓ Account connected</Text>
            <Text style={styles.apiKeyValue}>{accountNumber}</Text>
          </View>
        )}
        
        <View style={styles.inputItem}>
          <Text style={styles.inputLabel}>Account Number</Text>
          <TextInput
            style={styles.input}
            value={tempAccountNumber}
            onChangeText={setTempAccountNumber}
            placeholder="A-XXXXXXXX"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
        
        <View style={styles.inputItem}>
          <Text style={styles.inputLabel}>API Key</Text>
          <TextInput
            style={styles.input}
            value={tempApiKey}
            onChangeText={setTempApiKey}
            placeholder="sk_live_xxxxxxxxxxxxx"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>
        
        <Pressable
          style={[styles.saveButton, isAccountLoading && styles.saveButtonDisabled]}
          onPress={handleSaveAccount}
          disabled={isAccountLoading}
        >
          {isAccountLoading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.saveButtonText}>
              {hasAccountData ? 'Update Account' : 'Connect Account'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    padding: 12,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  apiKeyStatus: {
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  apiKeyStatusText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#065f46',
  },
  apiKeyValue: {
    fontSize: 13,
    color: '#047857',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputItem: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  input: {
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
});
