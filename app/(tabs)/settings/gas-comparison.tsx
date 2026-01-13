import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronUp, Clock, Flame, Calendar } from 'lucide-react-native';

import { useConsumption, GAS_COMPARISON_TARIFFS } from '@/providers/ConsumptionProvider';
import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import { fetchComparisonTariffRates, fetchStandingCharge, fetchProductDetails, ProductDetails } from '@/services/energyApi';
import Colors from '@/constants/colors';
import { ProcessedRate } from '@/types/energy';

type SimplifiedCategory = 'Tracker' | 'Flexible' | 'Fixed' | 'Other';

interface TariffRateDisplay {
  rate: number;
  validFrom: string;
  validTo: string;
}

interface GroupedTariff {
  code: string;
  displayName: string;
  description: string;
  category: SimplifiedCategory;
}

function getSimplifiedCategory(code: string, displayName: string): SimplifiedCategory {
  const upperCode = code.toUpperCase();
  const upperName = displayName.toUpperCase();
  
  if (upperCode.includes('SILVER') || upperCode.includes('TRACKER') || upperName.includes('TRACKER')) return 'Tracker';
  if (upperCode.includes('FIX') || upperName.includes('FIXED')) return 'Fixed';
  if (upperCode.includes('VAR') || upperCode.includes('FLEX') || upperName.includes('FLEXIBLE')) return 'Flexible';
  
  return 'Other';
}

function groupTariffsByCategory(tariffs: typeof GAS_COMPARISON_TARIFFS): Map<SimplifiedCategory, GroupedTariff[]> {
  const groups = new Map<SimplifiedCategory, GroupedTariff[]>();
  const categoryOrder: SimplifiedCategory[] = ['Tracker', 'Flexible', 'Fixed', 'Other'];
  
  categoryOrder.forEach(cat => groups.set(cat, []));
  
  tariffs.forEach(tariff => {
    const category = getSimplifiedCategory(tariff.code, tariff.displayName);
    const grouped: GroupedTariff = {
      ...tariff,
      category,
    };
    
    groups.get(category)!.push(grouped);
  });
  
  categoryOrder.forEach(cat => {
    if (groups.get(cat)!.length === 0) {
      groups.delete(cat);
    }
  });
  
  return groups;
}

function getUniqueRatePeriods(rates: ProcessedRate[]): TariffRateDisplay[] {
  const periodMap = new Map<string, TariffRateDisplay>();
  
  rates.forEach(rate => {
    const fromTime = rate.validFrom.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const toTime = rate.validTo.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const key = `${fromTime}-${toTime}-${rate.price.toFixed(2)}`;
    
    if (!periodMap.has(key)) {
      periodMap.set(key, {
        rate: rate.price,
        validFrom: fromTime,
        validTo: toTime,
      });
    }
  });
  
  const periods = Array.from(periodMap.values());
  periods.sort((a, b) => {
    const aHour = parseInt(a.validFrom.split(':')[0], 10);
    const bHour = parseInt(b.validFrom.split(':')[0], 10);
    return aHour - bHour;
  });
  
  return periods;
}

function formatDate(date: Date | null): string {
  if (!date) return 'Present';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TariffDates({ productDetails, isLoading }: { productDetails: ProductDetails | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <View style={styles.datesRow}>
        <ActivityIndicator size="small" color={Colors.text.secondary} />
      </View>
    );
  }
  
  if (!productDetails) return null;
  
  const hasStartDate = productDetails.availableFrom !== null;
  const hasEndDate = productDetails.availableTo !== null;
  
  if (!hasStartDate && !hasEndDate) return null;
  
  return (
    <View style={styles.datesRow}>
      <Calendar size={12} color={Colors.text.secondary} />
      <Text style={styles.datesText}>
        {hasStartDate ? formatDate(productDetails.availableFrom) : 'Unknown'} 
        {' → '} 
        {hasEndDate ? formatDate(productDetails.availableTo) : 'Present'}
      </Text>
    </View>
  );
}

function TariffRatesDisplay({ 
  rates, 
  standingCharge, 
  isLoading,
  isTracker,
}: { 
  rates: ProcessedRate[] | null;
  standingCharge: number | null;
  isLoading: boolean;
  isTracker: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.ratesContainer}>
        <ActivityIndicator size="small" color={Colors.gasColor} />
      </View>
    );
  }

  if (!rates || rates.length === 0) {
    return (
      <View style={styles.ratesContainer}>
        <Text style={styles.noRatesText}>Rate data not available</Text>
      </View>
    );
  }

  const uniqueRates = getUniqueRatePeriods(rates);
  const hasMultipleRates = uniqueRates.length > 1 && uniqueRates.length < 4;
  const isSingleRate = uniqueRates.length === 1;

  if (isTracker) {
    const todayRates = rates.filter(r => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return r.validFrom >= today && r.validFrom < tomorrow;
    });

    const currentRate = todayRates.length > 0 ? todayRates[0] : rates[rates.length - 1];

    return (
      <View style={styles.ratesContainer}>
        <Text style={styles.ratesTitle}>Today&apos;s Tracker Rate</Text>
        <View style={styles.trackerRateRow}>
          <Flame size={18} color={Colors.gasColor} />
          <Text style={styles.trackerRateLabel}>Unit Rate</Text>
          <Text style={styles.trackerRateValue}>{currentRate?.price.toFixed(2)}p/kWh</Text>
        </View>
        {standingCharge !== null && (
          <View style={styles.standingChargeRow}>
            <Text style={styles.standingChargeLabel}>Standing Charge</Text>
            <Text style={styles.standingChargeValue}>{standingCharge.toFixed(2)}p/day</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.ratesContainer}>
      {isSingleRate ? (
        <>
          <View style={styles.singleRateRow}>
            <Flame size={16} color={Colors.gasColor} />
            <Text style={styles.singleRateLabel}>Unit Rate</Text>
            <Text style={styles.singleRateValue}>{uniqueRates[0].rate.toFixed(2)}p/kWh</Text>
          </View>
        </>
      ) : hasMultipleRates ? (
        <>
          <Text style={styles.ratesTitle}>Rate Periods</Text>
          {uniqueRates.map((period, index) => (
            <View key={index} style={styles.ratePeriodRow}>
              <View style={styles.ratePeriodTime}>
                <Clock size={14} color={Colors.text.secondary} />
                <Text style={styles.ratePeriodTimeText}>
                  {period.validFrom} - {period.validTo}
                </Text>
              </View>
              <Text style={styles.ratePeriodValue}>{period.rate.toFixed(2)}p</Text>
            </View>
          ))}
        </>
      ) : (
        <View style={styles.singleRateRow}>
          <Flame size={16} color={Colors.gasColor} />
          <Text style={styles.singleRateLabel}>Unit Rate</Text>
          <Text style={styles.singleRateValue}>{uniqueRates[0]?.rate.toFixed(2)}p/kWh</Text>
        </View>
      )}
      {standingCharge !== null && (
        <View style={styles.standingChargeRow}>
          <Text style={styles.standingChargeLabel}>Standing Charge</Text>
          <Text style={styles.standingChargeValue}>{standingCharge.toFixed(2)}p/day</Text>
        </View>
      )}
    </View>
  );
}

function GasTariffItem({
  tariff,
  isSelected,
  onSelect,
  region,
  mainTariffIsTracker,
  mainTrackerRates,
}: {
  tariff: GroupedTariff;
  isSelected: boolean;
  onSelect: () => void;
  region: string;
  mainTariffIsTracker: boolean;
  mainTrackerRates: ProcessedRate[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isTracker = tariff.code.toUpperCase().includes('SILVER') || tariff.code.toUpperCase().includes('TRACKER');
  
  const canReuseMainRates = isTracker && mainTariffIsTracker && mainTrackerRates.length > 0;

  const productDetailsQuery = useQuery({
    queryKey: ['product-details', tariff.code],
    queryFn: () => fetchProductDetails(tariff.code),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const ratesQuery = useQuery({
    queryKey: ['gas-comparison-tariff-rates', tariff.code, region],
    queryFn: () => fetchComparisonTariffRates(region, tariff.code, 'gas'),
    enabled: expanded && !canReuseMainRates,
    staleTime: 60 * 60 * 1000,
  });

  const standingChargeQuery = useQuery({
    queryKey: ['gas-comparison-standing-charge', tariff.code, region],
    queryFn: () => fetchStandingCharge(tariff.code, region, 'gas'),
    enabled: expanded,
    staleTime: 60 * 60 * 1000,
  });

  const displayRates = canReuseMainRates ? mainTrackerRates : ratesQuery.data || null;

  return (
    <View style={[styles.tariffItem, isSelected && styles.listItemSelected]}>
      <Pressable
        style={styles.tariffItemHeader}
        onPress={() => {
          onSelect();
        }}
      >
        <View style={styles.tariffItemLeft}>
          <Text style={[
            styles.tariffItemTitle,
            isSelected && styles.listItemTextSelected
          ]}>
            {tariff.displayName}
          </Text>
          <TariffDates 
            productDetails={productDetailsQuery.data ?? null} 
            isLoading={productDetailsQuery.isLoading} 
          />
          <Text style={styles.tariffItemDescription} numberOfLines={2}>
            {tariff.description}
          </Text>
        </View>
        <View style={styles.tariffItemRight}>
          {isSelected && (
            <View style={styles.checkmark}>
              <Check size={14} color="#fff" />
            </View>
          )}
          <Pressable
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
            hitSlop={8}
          >
            {expanded ? (
              <ChevronUp size={20} color={Colors.text.secondary} />
            ) : (
              <ChevronDown size={20} color={Colors.text.secondary} />
            )}
          </Pressable>
        </View>
      </Pressable>
      
      {expanded && (
        <TariffRatesDisplay
          rates={displayRates}
          standingCharge={standingChargeQuery.data || null}
          isLoading={!canReuseMainRates && ratesQuery.isLoading}
          isTracker={isTracker}
        />
      )}
    </View>
  );
}

export default function GasComparisonScreen() {
  const router = useRouter();
  const {
    gasComparisonTariff,
    setGasComparisonTariff,
    selectedRegion,
  } = useConsumption();
  
  const { 
    todayGasRates, 
    selectedGasTariff,
  } = useEnergyRates();

  const mainTariffIsTracker = selectedGasTariff?.toUpperCase().includes('SILVER') || 
                              selectedGasTariff?.toUpperCase().includes('TRACKER') || false;

  const groupedTariffs = useMemo(() => {
    return groupTariffsByCategory(GAS_COMPARISON_TARIFFS);
  }, []);

  const handleSelectTariff = (code: string) => {
    setGasComparisonTariff(code);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Select a tariff to compare your gas costs against. Tariffs are grouped by type and show availability dates where known.
      </Text>
      
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {Array.from(groupedTariffs.entries()).map(([category, tariffs]) => (
          <View key={category} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{category}</Text>
            {tariffs.map((tariff) => (
              <GasTariffItem
                key={tariff.code}
                tariff={tariff}
                isSelected={gasComparisonTariff === tariff.code}
                onSelect={() => handleSelectTariff(tariff.code)}
                region={selectedRegion}
                mainTariffIsTracker={mainTariffIsTracker}
                mainTrackerRates={todayGasRates}
              />
            ))}
          </View>
        ))}
        <View style={styles.bottomPadding} />
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
  groupContainer: {
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.gasColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tariffItem: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listItemSelected: {
    backgroundColor: Colors.background,
  },
  tariffItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  tariffItemLeft: {
    flex: 1,
    gap: 4,
  },
  tariffItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tariffItemTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  listItemTextSelected: {
    fontWeight: '600' as const,
    color: Colors.gasColor,
  },
  tariffItemDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginTop: 2,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  datesText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.gasColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButton: {
    padding: 4,
  },
  ratesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  ratesTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  noRatesText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  singleRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.gasBackground,
    padding: 12,
    borderRadius: 8,
  },
  singleRateLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  singleRateValue: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.gasColor,
  },
  ratePeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gasBackground,
    padding: 12,
    borderRadius: 8,
  },
  ratePeriodTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratePeriodTimeText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  ratePeriodValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  standingChargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  standingChargeLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  standingChargeValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  trackerRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.gasBackground,
    padding: 14,
    borderRadius: 8,
  },
  trackerRateLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  trackerRateValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.gasColor,
  },
  bottomPadding: {
    height: 40,
  },
});
