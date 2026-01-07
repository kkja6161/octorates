import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Zap, Flame, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useBilling } from '@/providers/BillingProvider';
import { useConsumption } from '@/providers/ConsumptionProvider';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/providers/ThemeProvider';

export default function BillingScreen() {
  const { 
    accountBalance, 
    estimatedBilling, 
    isLoading, 
    refetch,
    electricityBillingStartDate,
    gasBillingStartDate,
    updateElectricityBillingStartDate,
    updateGasBillingStartDate,
  } = useBilling();
  const { showGas } = useConsumption();
  const { isDark } = useTheme();
  const colors = useColors(isDark);

  const [showElectricityDatePicker, setShowElectricityDatePicker] = useState(false);
  const [showGasDatePicker, setShowGasDatePicker] = useState(false);
  const [tempElectricityDate, setTempElectricityDate] = useState<Date>(new Date());
  const [tempGasDate, setTempGasDate] = useState<Date>(new Date());

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
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateButtonText: {
      fontSize: 14,
      color: colors.text.primary,
      fontWeight: '500' as const,
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      gap: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text.primary,
      textAlign: 'center' as const,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    modalButtonCancel: {
      backgroundColor: colors.background,
    },
    modalButtonConfirm: {
      backgroundColor: colors.primary,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    modalButtonTextCancel: {
      color: colors.text.secondary,
    },
    modalButtonTextConfirm: {
      color: '#FFFFFF',
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
                  <>
                    <View style={styles.divider} />
                    <View style={styles.fuelCard}>
                      <Text style={[styles.estimateLabel, { marginBottom: 8 }]}>Electricity Billing Start Date</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          setTempElectricityDate(electricityBillingStartDate || new Date());
                          setShowElectricityDatePicker(true);
                        }}
                      >
                        <Calendar size={20} color={colors.primary} />
                        <Text style={styles.dateButtonText}>
                          {electricityBillingStartDate 
                            ? formatDate(electricityBillingStartDate)
                            : 'Set billing start date'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {showGas && estimatedBilling.gas && (
                      <View style={styles.fuelCard}>
                        <Text style={[styles.estimateLabel, { marginBottom: 8 }]}>Gas Billing Start Date</Text>
                        <TouchableOpacity
                          style={styles.dateButton}
                          onPress={() => {
                            setTempGasDate(gasBillingStartDate || new Date());
                            setShowGasDatePicker(true);
                          }}
                        >
                          <Calendar size={20} color={colors.gasColor} />
                          <Text style={styles.dateButtonText}>
                            {gasBillingStartDate 
                              ? formatDate(gasBillingStartDate)
                              : 'Set billing start date'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={styles.periodText}>
                      Current period: {formatDate(estimatedBilling.electricity.periodStart)} - {formatDate(estimatedBilling.electricity.periodEnd)}
                    </Text>
                  </>
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

        {Platform.OS === 'ios' ? (
          <>
            <Modal
              visible={showElectricityDatePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowElectricityDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Billing Start Date</Text>
                  <DateTimePicker
                    value={tempElectricityDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) setTempElectricityDate(date);
                    }}
                    maximumDate={new Date()}
                    textColor={colors.text.primary}
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonCancel]}
                      onPress={() => setShowElectricityDatePicker(false)}
                    >
                      <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonConfirm]}
                      onPress={() => {
                        updateElectricityBillingStartDate(tempElectricityDate);
                        setShowElectricityDatePicker(false);
                      }}
                    >
                      <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            <Modal
              visible={showGasDatePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowGasDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Billing Start Date</Text>
                  <DateTimePicker
                    value={tempGasDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) setTempGasDate(date);
                    }}
                    maximumDate={new Date()}
                    textColor={colors.text.primary}
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonCancel]}
                      onPress={() => setShowGasDatePicker(false)}
                    >
                      <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonConfirm]}
                      onPress={() => {
                        updateGasBillingStartDate(tempGasDate);
                        setShowGasDatePicker(false);
                      }}
                    >
                      <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </>
        ) : (
          <>
            {showElectricityDatePicker && (
              <DateTimePicker
                value={tempElectricityDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowElectricityDatePicker(false);
                  if (date && event.type === 'set') {
                    updateElectricityBillingStartDate(date);
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            {showGasDatePicker && (
              <DateTimePicker
                value={tempGasDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowGasDatePicker(false);
                  if (date && event.type === 'set') {
                    updateGasBillingStartDate(date);
                  }
                }}
                maximumDate={new Date()}
              />
            )}
          </>
        )}
      </View>
    </>
  );
}
