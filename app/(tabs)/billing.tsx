import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Zap, Flame } from 'lucide-react-native';

import { useBilling } from '@/providers/BillingProvider';
import { useConsumption } from '@/providers/ConsumptionProvider';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/providers/ThemeProvider';

export default function BillingScreen() {
  const { accountBalance, estimatedBilling, isLoading, refetch } = useBilling();
  const { showGas } = useConsumption();
  const { isDark } = useTheme();
  const colors = useColors(isDark);

  const formatCurrency = (amount: number) => {
    return `£${Math.abs(amount).toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    balanceContainer: {
      alignItems: 'center' as const,
      gap: 8,
    },
    balanceAmount: {
      fontSize: 48,
      fontWeight: '700' as const,
    },
    balanceLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
      fontWeight: '600' as const,
    },
    creditAmount: {
      color: colors.success,
    },
    debitAmount: {
      color: colors.error,
    },
    estimateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    estimateLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      fontWeight: '500' as const,
    },
    estimateValue: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.primary,
    },
    fuelCard: {
      gap: 12,
    },
    fuelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    fuelIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    electricityIconBg: {
      backgroundColor: colors.background,
    },
    gasIconBg: {
      backgroundColor: colors.gasBackground,
    },
    fuelTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    totalRow: {
      borderTopWidth: 2,
      borderTopColor: colors.border,
      paddingTop: 16,
      marginTop: 8,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.primary,
    },
    periodText: {
      fontSize: 12,
      color: colors.text.secondary,
      textAlign: 'center' as const,
      marginTop: 8,
    },
    noDataText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center' as const,
      fontStyle: 'italic' as const,
    },
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Billing' }} />
      
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Balance</Text>
            <View style={styles.balanceContainer}>
              <Text
                style={[
                  styles.balanceAmount,
                  (accountBalance ?? 0) >= 0 ? styles.creditAmount : styles.debitAmount,
                ]}
              >
                {formatCurrency(accountBalance ?? 0)}
              </Text>
              <Text style={styles.balanceLabel}>
                {(accountBalance ?? 0) >= 0 ? 'IN CREDIT' : 'IN DEBIT'}
              </Text>
            </View>
          </View>

          {estimatedBilling && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Estimated Next Bill</Text>
                
                {estimatedBilling.electricity && (
                  <View style={styles.fuelCard}>
                    <View style={styles.fuelHeader}>
                      <View style={[styles.fuelIconContainer, styles.electricityIconBg]}>
                        <Zap size={24} color={colors.primary} />
                      </View>
                      <Text style={styles.fuelTitle}>Electricity</Text>
                    </View>
                    
                    <View style={styles.estimateRow}>
                      <Text style={styles.estimateLabel}>Consumption</Text>
                      <Text style={styles.estimateValue}>
                        {estimatedBilling.electricity.consumption.toFixed(2)} kWh
                      </Text>
                    </View>
                    
                    <View style={styles.estimateRow}>
                      <Text style={styles.estimateLabel}>Usage Cost</Text>
                      <Text style={styles.estimateValue}>
                        {formatCurrency(estimatedBilling.electricity.cost)}
                      </Text>
                    </View>
                    
                    <View style={styles.estimateRow}>
                      <Text style={styles.estimateLabel}>Standing Charge</Text>
                      <Text style={styles.estimateValue}>
                        {formatCurrency(estimatedBilling.electricity.standingCharge)}
                      </Text>
                    </View>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.estimateRow}>
                      <Text style={styles.totalLabel}>Electricity Total</Text>
                      <Text style={styles.totalValue}>
                        {formatCurrency(estimatedBilling.electricity.totalCost)}
                      </Text>
                    </View>
                  </View>
                )}

                {showGas && estimatedBilling.gas && (
                  <>
                    {estimatedBilling.electricity && <View style={styles.divider} />}
                    
                    <View style={styles.fuelCard}>
                      <View style={styles.fuelHeader}>
                        <View style={[styles.fuelIconContainer, styles.gasIconBg]}>
                          <Flame size={24} color={colors.gasColor} />
                        </View>
                        <Text style={styles.fuelTitle}>Gas</Text>
                      </View>
                      
                      <View style={styles.estimateRow}>
                        <Text style={styles.estimateLabel}>Consumption</Text>
                        <Text style={styles.estimateValue}>
                          {estimatedBilling.gas.consumption.toFixed(2)} kWh
                        </Text>
                      </View>
                      
                      <View style={styles.estimateRow}>
                        <Text style={styles.estimateLabel}>Usage Cost</Text>
                        <Text style={styles.estimateValue}>
                          {formatCurrency(estimatedBilling.gas.cost)}
                        </Text>
                      </View>
                      
                      <View style={styles.estimateRow}>
                        <Text style={styles.estimateLabel}>Standing Charge</Text>
                        <Text style={styles.estimateValue}>
                          {formatCurrency(estimatedBilling.gas.standingCharge)}
                        </Text>
                      </View>
                      
                      <View style={styles.divider} />
                      
                      <View style={styles.estimateRow}>
                        <Text style={styles.totalLabel}>Gas Total</Text>
                        <Text style={styles.totalValue}>
                          {formatCurrency(estimatedBilling.gas.totalCost)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                <View style={[styles.estimateRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Estimated Bill</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(estimatedBilling.totalEstimatedCost)}
                  </Text>
                </View>

                {estimatedBilling.electricity && (
                  <Text style={styles.periodText}>
                    Billing period: {formatDate(estimatedBilling.electricity.periodStart)} - {formatDate(estimatedBilling.electricity.periodEnd)}
                  </Text>
                )}
              </View>
            </>
          )}

          {!estimatedBilling && !isLoading && (
            <View style={styles.card}>
              <Text style={styles.noDataText}>
                No billing data available. Please ensure your account is configured.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}
