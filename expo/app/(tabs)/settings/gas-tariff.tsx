import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Calendar, Flame, DollarSign, ChevronDown, ChevronUp } from 'lucide-react-native';

import { useConsumption } from '@/providers/ConsumptionProvider';
import Colors from '@/constants/colors';
import { ProcessedTariffAgreement, ProcessedRate } from '@/types/energy';
import { fetchStandingCharge, fetchEnergyRates, fetchGasTrackerRates, processRates } from '@/services/energyApi';

interface RatePeriod {
  rate: number;
  standingCharge: number | null;
  validFrom: Date;
  validTo: Date;
}

interface TariffWithDetails extends ProcessedTariffAgreement {
  ratePeriods: RatePeriod[];
  isLoading: boolean;
  isExpanded: boolean;
}

export default function GasTariffScreen() {
  const {
    gasAgreements,
    selectedRegion,
  } = useConsumption();
  
  const [tariffsWithDetails, setTariffsWithDetails] = useState<TariffWithDetails[]>([]);

  const groupRatesIntoPeriods = (
    rates: ProcessedRate[],
    agreementStart: Date,
    agreementEnd: Date | null
  ): RatePeriod[] => {
    if (rates.length === 0) return [];

    // Deduplicate rates by validFrom timestamp - keep only one rate per date
    const ratesByDate = new Map<number, ProcessedRate>();
    for (const rate of rates) {
      const key = rate.validFrom.getTime();
      // Keep the first rate for each date (API returns them in order)
      if (!ratesByDate.has(key)) {
        ratesByDate.set(key, rate);
      }
    }
    
    const uniqueRates = Array.from(ratesByDate.values());
    const sortedRates = uniqueRates.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
    
    if (sortedRates.length === 0) return [];
    
    const periods: RatePeriod[] = [];
    
    // Round rates to 2 decimal places to avoid floating point comparison issues
    const roundRate = (rate: number) => Math.round(rate * 100) / 100;
    
    let currentRate = roundRate(sortedRates[0].price);
    let periodStart = sortedRates[0].validFrom;
    
    for (let i = 1; i < sortedRates.length; i++) {
      const thisRate = roundRate(sortedRates[i].price);
      if (thisRate !== currentRate) {
        periods.push({
          rate: currentRate,
          standingCharge: null,
          validFrom: periodStart,
          validTo: sortedRates[i - 1].validTo,
        });
        currentRate = thisRate;
        periodStart = sortedRates[i].validFrom;
      }
    }
    
    periods.push({
      rate: currentRate,
      standingCharge: null,
      validFrom: periodStart,
      validTo: sortedRates[sortedRates.length - 1].validTo,
    });
    
    const endDate = agreementEnd || new Date();
    
    return periods.filter(period => {
      const periodEnd = period.validTo;
      const periodStart = period.validFrom;
      
      return periodEnd >= agreementStart && periodStart <= endDate;
    });
  };

  useEffect(() => {
    const loadTariffDetails = async () => {
      const details: TariffWithDetails[] = gasAgreements.map(agreement => ({
        ...agreement,
        ratePeriods: [],
        isLoading: true,
        isExpanded: false,
      }));
      
      setTariffsWithDetails(details);
      
      for (let i = 0; i < gasAgreements.length; i++) {
        const agreement = gasAgreements[i];
        
        try {
          const periodFrom = agreement.validFrom.toISOString();
          const periodTo = agreement.validTo ? agreement.validTo.toISOString() : undefined;
          
          const isTracker = agreement.productCode.includes('SILVER') || agreement.productCode.includes('TRACKER');
          
          let ratesData;
          if (isTracker) {
            ratesData = await fetchGasTrackerRates(selectedRegion, periodFrom, periodTo);
          } else {
            ratesData = await fetchEnergyRates(
              selectedRegion,
              agreement.productCode,
              periodFrom,
              periodTo,
              'gas'
            );
          }
          
          const rates = processRates(ratesData, true);
          
          let ratePeriods: RatePeriod[] = [];
          
          if (isTracker) {
            if (rates.length > 0) {
              const sum = rates.reduce((acc, rate) => acc + rate.price, 0);
              const avgRate = sum / rates.length;
              ratePeriods = [{
                rate: avgRate,
                standingCharge: null,
                validFrom: agreement.validFrom,
                validTo: agreement.validTo || new Date(),
              }];
            }
          } else {
            ratePeriods = groupRatesIntoPeriods(rates, agreement.validFrom, agreement.validTo);
          }
          
          for (const period of ratePeriods) {
            try {
              const fromDate = period.validFrom.toISOString();
              const toDate = period.validTo.toISOString();
              
              if (new Date(fromDate) <= new Date(toDate)) {
                const standingCharge = await fetchStandingCharge(
                  agreement.productCode,
                  selectedRegion,
                  'gas',
                  fromDate,
                  toDate
                );
                period.standingCharge = standingCharge;
              } else {
                const standingCharge = await fetchStandingCharge(
                  agreement.productCode,
                  selectedRegion,
                  'gas'
                );
                period.standingCharge = standingCharge;
              }
            } catch {
              console.log('Could not fetch standing charge');
            }
          }
          
          setTariffsWithDetails(prev => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              ratePeriods,
              isLoading: false,
            };
            return updated;
          });
        } catch {
          console.log('Error loading details for', agreement.productCode);
          setTariffsWithDetails(prev => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              isLoading: false,
            };
            return updated;
          });
        }
      }
    };
    
    if (gasAgreements.length > 0) {
      loadTariffDetails();
    }
  }, [gasAgreements, selectedRegion]);



  const formatTariffDate = (date: Date | null): string => {
    if (!date) return 'Present';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatPeriodEndDate = (date: Date | null): string => {
    if (!date) return 'Present';
    const dayBefore = new Date(date);
    dayBefore.setDate(dayBefore.getDate() - 1);
    return dayBefore.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toggleExpanded = (index: number) => {
    setTariffsWithDetails(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isExpanded: !updated[index].isExpanded,
      };
      return updated;
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Your tariff history from Octopus Energy. These tariffs are used for rate display and cost calculations.
      </Text>
      
      <ScrollView style={styles.listContainer}>
        {tariffsWithDetails.map((tariff: TariffWithDetails, index: number) => (
          <View
            key={`${tariff.tariffCode}-${index}`}
            style={styles.tariffItem}
          >
            <View style={styles.tariffItemContent}>
              <View style={styles.tariffHeader}>
                <View style={styles.tariffHeaderText}>
                  <Text style={styles.tariffItemTitle}>
                    {tariff.displayName}
                  </Text>
                  
                  <View style={styles.tariffDateRow}>
                    <Calendar size={14} color={Colors.text.secondary} />
                    <Text style={styles.tariffDateText}>
                      {formatTariffDate(tariff.validFrom)} - {formatTariffDate(tariff.validTo)}
                    </Text>
                  </View>
                </View>
                
                {tariff.ratePeriods.length > 1 && !tariff.isLoading && (
                  <TouchableOpacity 
                    onPress={() => toggleExpanded(index)}
                    style={styles.expandButton}
                  >
                    {tariff.isExpanded ? (
                      <ChevronUp size={20} color={Colors.text.secondary} />
                    ) : (
                      <ChevronDown size={20} color={Colors.text.secondary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.tariffBadges}>
                {tariff.isActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.badgeText}>Current</Text>
                  </View>
                )}
                {tariff.ratePeriods.length > 1 && (
                  <View style={styles.periodsBadge}>
                    <Text style={styles.badgeText}>{tariff.ratePeriods.length} rate changes</Text>
                  </View>
                )}
              </View>
              
              {tariff.isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.text.secondary} />
                  <Text style={styles.loadingText}>Loading rate history...</Text>
                </View>
              ) : (
                <View style={styles.periodsContainer}>
                  {tariff.ratePeriods.length === 0 ? (
                    <Text style={styles.noDataText}>No rate data available</Text>
                  ) : (
                    <>
                      {(tariff.isExpanded ? [...tariff.ratePeriods].reverse() : tariff.ratePeriods.slice(0, 1)).map((period, periodIndex) => (
                        <View key={periodIndex} style={styles.periodItem}>
                          {tariff.ratePeriods.length > 1 && (
                            <View style={styles.periodDateRow}>
                              <Calendar size={12} color={Colors.text.tertiary} />
                              <Text style={styles.periodDateText}>
                                {formatTariffDate(period.validFrom)} - {formatPeriodEndDate(period.validTo)}
                              </Text>
                            </View>
                          )}
                          <View style={styles.detailsContainer}>
                            <View style={styles.detailRow}>
                              <View style={styles.detailLabel}>
                                <Flame size={14} color={Colors.text.secondary} />
                                <Text style={styles.detailLabelText}>
                                  {tariff.productCode.includes('TRACKER') || tariff.productCode.includes('SILVER') ? 'Average rate' : 'Rate'}
                                </Text>
                              </View>
                              <Text style={styles.detailValue}>{period.rate.toFixed(2)}p/kWh</Text>
                            </View>
                            
                            <View style={styles.detailRow}>
                              <View style={styles.detailLabel}>
                                <DollarSign size={14} color={Colors.text.secondary} />
                                <Text style={styles.detailLabelText}>Standing charge</Text>
                              </View>
                              {period.standingCharge !== null ? (
                                <Text style={styles.detailValue}>{period.standingCharge.toFixed(2)}p/day</Text>
                              ) : (
                                <Text style={styles.detailValue}>-</Text>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
        
        {gasAgreements.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No gas tariff history found. Your account may not have gas supply, or you need to connect your Octopus account first.
            </Text>
          </View>
        )}
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
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tariffItemContent: {
    gap: 8,
  },
  tariffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tariffHeaderText: {
    flex: 1,
    gap: 8,
  },
  expandButton: {
    padding: 4,
    marginLeft: 8,
  },
  tariffItemTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  tariffDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tariffDateText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  tariffBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  periodsBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  periodsContainer: {
    marginTop: 8,
    gap: 12,
  },
  periodItem: {
    gap: 8,
  },
  periodDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  periodDateText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '500' as const,
  },
  detailsContainer: {
    gap: 8,
  },
  noDataText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontStyle: 'italic' as const,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabelText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});
