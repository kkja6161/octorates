import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronUp, Clock, Flame } from 'lucide-react-native';

import { useConsumption, GAS_COMPARISON_TARIFFS } from '@/providers/ConsumptionProvider';
import { fetchComparisonTariffRates, fetchStandingCharge } from '@/services/energyApi';
import Colors from '@/constants/colors';
import { ProcessedRate, ComparisonTariffOption } from '@/types/energy';

type SimplifiedCategory = 'Tracker' | 'Flexible' | 'Fixed' | 'Other';

interface TariffGroup {
  category: SimplifiedCategory;
  tariffs: ComparisonTariffOption[];
}

function getSimplifiedCategory(code: string, displayName: string): SimplifiedCategory {
  const upperCode = code.toUpperCase();
  const upperName = displayName.toUpperCase();

  if (upperCode.includes('SILVER') || upperCode.includes('TRACKER') || upperName.includes('TRACKER')) return 'Tracker';
  if (upperCode.includes('FIX') || upperName.includes('FIXED')) return 'Fixed';
  if (upperCode.includes('VAR') || upperCode.includes('FLEX') || upperName.includes('FLEXIBLE')) return 'Flexible';

  return 'Other';
}

function groupTariffsByCategory(tariffs: ComparisonTariffOption[]): TariffGroup[] {
  const categoryOrder: SimplifiedCategory[] = ['Tracker', 'Flexible', 'Fixed', 'Other'];
  const groups = new Map<SimplifiedCategory, ComparisonTariffOption[]>();

  categoryOrder.forEach(cat => groups.set(cat, []));

  tariffs.forEach(tariff => {
    const category = getSimplifiedCategory(tariff.code, tariff.displayName);
    groups.get(category)!.push(tariff);
  });

  const result: TariffGroup[] = [];
  categoryOrder.forEach(cat => {
    const catTariffs = groups.get(cat)!;
    if (catTariffs.length > 0) {
      result.push({ category: cat, tariffs: catTariffs });
    }
  });

  return result;
}

function TariffItem({
  tariff,
  isSelected,
  onSelect,
  region,
}: {
  tariff: ComparisonTariffOption;
  isSelected: boolean;
  onSelect: () => void;
  region: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isTracker = tariff.code.toUpperCase().includes('SILVER') || tariff.code.toUpperCase().includes('TRACKER');

  const ratesQuery = useQuery({
    queryKey: ['gas-comparison-tariff-rates', tariff.code, region],
    queryFn: () => fetchComparisonTariffRates(region, tariff.code, 'gas'),
    enabled: expanded,
    staleTime: 60 * 60 * 1000,
  });

  const standingChargeQuery = useQuery({
    queryKey: ['gas-comparison-standing-charge', tariff.code, region],
    queryFn: () => fetchStandingCharge(tariff.code, region, 'gas'),
    enabled: expanded,
    staleTime: 60 * 60 * 1000,
  });

  const displayRates = ratesQuery.data || null;

  const getUniqueRatePeriods = (rates: ProcessedRate[]) => {
    const periodMap = new Map<string, { rate: number; validFrom: string; validTo: string }>();

    rates.forEach(rate => {
      const fromTime = rate.validFrom.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const toTime = rate.validTo.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const key = `${fromTime}-${toTime}-${rate.price.toFixed(2)}`;

      if (!periodMap.has(key)) {
        periodMap.set(key, { rate: rate.price, validFrom: fromTime, validTo: toTime });
      }
    });

    return Array.from(periodMap.values()).sort((a, b) => {
      const aHour = parseInt(a.validFrom.split(':')[0], 10);
      const bHour = parseInt(b.validFrom.split(':')[0], 10);
      return aHour - bHour;
    });
  };

  return (
    <View style={[styles.tariffItem, isSelected && styles.listItemSelected]}>
      <Pressable style={styles.tariffItemHeader} onPress={onSelect}>
        <View style={styles.tariffItemLeft}>
          <Text style={[styles.tariffItemTitle, isSelected && styles.listItemTextSelected]}>
            {tariff.displayName}
          </Text>
          {tariff.description ? (
            <Text style={styles.tariffItemDescription} numberOfLines={2}>
              {tariff.description}
            </Text>
          ) : null}
          <View style={styles.tariffBadges}>
            {isTracker && (
              <View style={styles.variableBadge}>
                <Text style={styles.badgeText}>Daily</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.tariffItemRight}>
          {isSelected && (
            <View style={styles.checkmark}>
              <Check size={14} color="#fff" />
            </View>
          )}
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {expanded ? (
              <ChevronUp size={20} color={Colors.text.secondary} />
            ) : (
              <ChevronDown size={20} color={Colors.text.secondary} />
            )}
          </TouchableOpacity>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.ratesContainer}>
          {ratesQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.gasColor} />
              <Text style={styles.loadingText}>Loading rates...</Text>
            </View>
          ) : !displayRates || displayRates.length === 0 ? (
            <Text style={styles.noRatesText}>Rate data not available for your region</Text>
          ) : isTracker ? (
            <>
              <Text style={styles.ratesTitle}>Today&apos;s Tracker Rate</Text>
              {(() => {
                const todayRates = displayRates.filter(r => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return r.validFrom >= today && r.validFrom < tomorrow;
                });
                const currentRate = todayRates.length > 0 ? todayRates[0] : displayRates[displayRates.length - 1];

                return (
                  <View style={styles.trackerRateRow}>
                    <Flame size={18} color={Colors.gasColor} />
                    <Text style={styles.trackerRateLabel}>Unit Rate</Text>
                    <Text style={styles.trackerRateValue}>{currentRate?.price.toFixed(2) || '—'}p/kWh</Text>
                  </View>
                );
              })()}
              {standingChargeQuery.data && (
                <View style={styles.standingChargeRow}>
                  <Text style={styles.standingChargeLabel}>Standing Charge</Text>
                  <Text style={styles.standingChargeValue}>{standingChargeQuery.data.toFixed(2)}p/day</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {(() => {
                const uniqueRates = getUniqueRatePeriods(displayRates);
                const hasMultipleRates = uniqueRates.length > 1 && uniqueRates.length < 4;

                if (uniqueRates.length === 1) {
                  return (
                    <View style={styles.detailRow}>
                      <View style={styles.detailLabel}>
                        <Flame size={14} color={Colors.gasColor} />
                        <Text style={styles.detailLabelText}>Unit rate</Text>
                      </View>
                      <Text style={styles.detailValue}>{uniqueRates[0].rate.toFixed(2)}p/kWh</Text>
                    </View>
                  );
                }

                if (hasMultipleRates) {
                  return (
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
                  );
                }

                return (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabel}>
                      <Flame size={14} color={Colors.gasColor} />
                      <Text style={styles.detailLabelText}>Unit rate</Text>
                    </View>
                    <Text style={styles.detailValue}>{uniqueRates[0]?.rate.toFixed(2) || '—'}p/kWh</Text>
                  </View>
                );
              })()}
              {standingChargeQuery.data && (
                <View style={styles.standingChargeRow}>
                  <Text style={styles.standingChargeLabel}>Standing Charge</Text>
                  <Text style={styles.standingChargeValue}>{standingChargeQuery.data.toFixed(2)}p/day</Text>
                </View>
              )}
            </>
          )}
        </View>
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
    currentGasProducts,
    isLoadingCurrentProducts,
  } = useConsumption();

  const allTariffs = useMemo(() => {
    const hardcodedCodes = new Set(GAS_COMPARISON_TARIFFS.map(t => t.code));

    const extraFromApi: ComparisonTariffOption[] = currentGasProducts
      .filter(p => !hardcodedCodes.has(p.code))
      .map(p => ({
        code: p.code,
        displayName: p.displayName,
        description: p.description || '',
        hasGas: true,
      }));

    return [...GAS_COMPARISON_TARIFFS, ...extraFromApi];
  }, [currentGasProducts]);

  const tariffGroups = useMemo(() => {
    return groupTariffsByCategory(allTariffs);
  }, [allTariffs]);

  const handleSelectTariff = (code: string) => {
    console.log('[GasComparison] Selected tariff:', code);
    setGasComparisonTariff(code);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Select a tariff to compare your gas costs against.
      </Text>

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {tariffGroups.map((group) => (
          <View key={group.category} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{group.category}</Text>
            {group.tariffs.map((tariff) => (
              <TariffItem
                key={tariff.code}
                tariff={tariff}
                isSelected={gasComparisonTariff === tariff.code}
                onSelect={() => handleSelectTariff(tariff.code)}
                region={selectedRegion}
              />
            ))}
          </View>
        ))}

        {isLoadingCurrentProducts && (
          <View style={styles.loadingContainerCentered}>
            <ActivityIndicator size="small" color={Colors.gasColor} />
            <Text style={styles.loadingText}>Loading additional tariffs...</Text>
          </View>
        )}

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
    marginBottom: 4,
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
  tariffBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  variableBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.surface,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainerCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  noRatesText: {
    fontSize: 14,
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
  ratesTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
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
