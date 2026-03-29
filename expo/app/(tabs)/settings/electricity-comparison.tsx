import React, { useState, useMemo, useEffect } from 'react';
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
import { Check, ChevronDown, ChevronUp, Clock, Zap, Calendar, DollarSign } from 'lucide-react-native';

import { useConsumption } from '@/providers/ConsumptionProvider';
import { fetchComparisonTariffRates, fetchStandingCharge, fetchEnergyRates, processRates } from '@/services/energyApi';
import Colors from '@/constants/colors';
import { ProcessedRate, ProcessedTariffAgreement, HistoricalProduct } from '@/types/energy';

type SimplifiedCategory = 'Agile' | 'Flexible' | 'Tracker' | 'Fixed' | 'Go' | 'Cosy' | 'Intelligent' | 'Flux' | 'Other';

interface RatePeriod {
  rate: number;
  standingCharge: number | null;
  validFrom: Date;
  validTo: Date;
}

interface HistoricalTariffGroup {
  category: SimplifiedCategory;
  agreements: ProcessedTariffAgreement[];
}

interface AvailableProductGroup {
  category: SimplifiedCategory;
  products: HistoricalProduct[];
}

function getSimplifiedCategory(code: string, displayName: string): SimplifiedCategory {
  const upperCode = code.toUpperCase();
  const upperName = displayName.toUpperCase();
  
  if (upperCode.includes('AGILE') || upperName.includes('AGILE')) return 'Agile';
  if (upperCode.includes('SILVER') || upperCode.includes('TRACKER') || upperName.includes('TRACKER')) return 'Tracker';
  if (upperCode.includes('INTELLI') || upperName.includes('INTELLIGENT')) return 'Intelligent';
  if (upperCode.includes('FLUX') || upperName.includes('FLUX')) return 'Flux';
  if (upperCode.includes('GO-') || upperName.includes('OCTOPUS GO')) return 'Go';
  if (upperCode.includes('COSY') || upperName.includes('COSY')) return 'Cosy';
  if (upperCode.includes('FIX') || upperName.includes('FIXED')) return 'Fixed';
  if (upperCode.includes('VAR') || upperCode.includes('FLEX') || upperName.includes('FLEXIBLE')) return 'Flexible';
  
  return 'Other';
}

function groupAgreementsByCategory(agreements: ProcessedTariffAgreement[]): HistoricalTariffGroup[] {
  const categoryOrder: SimplifiedCategory[] = ['Agile', 'Tracker', 'Flexible', 'Fixed', 'Go', 'Cosy', 'Intelligent', 'Flux', 'Other'];
  const groups = new Map<SimplifiedCategory, ProcessedTariffAgreement[]>();
  
  categoryOrder.forEach(cat => groups.set(cat, []));
  
  agreements.forEach(agreement => {
    const category = getSimplifiedCategory(agreement.productCode, agreement.displayName);
    groups.get(category)!.push(agreement);
  });
  
  const result: HistoricalTariffGroup[] = [];
  categoryOrder.forEach(cat => {
    const catAgreements = groups.get(cat)!;
    if (catAgreements.length > 0) {
      catAgreements.sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
      result.push({ category: cat, agreements: catAgreements });
    }
  });
  
  return result;
}

function groupProductsByCategory(products: HistoricalProduct[]): AvailableProductGroup[] {
  const categoryOrder: SimplifiedCategory[] = ['Agile', 'Tracker', 'Flexible', 'Fixed', 'Go', 'Cosy', 'Intelligent', 'Flux', 'Other'];
  const groups = new Map<SimplifiedCategory, HistoricalProduct[]>();
  
  categoryOrder.forEach(cat => groups.set(cat, []));
  
  products.forEach(product => {
    const category = getSimplifiedCategory(product.code, product.displayName);
    groups.get(category)!.push(product);
  });
  
  const result: AvailableProductGroup[] = [];
  categoryOrder.forEach(cat => {
    const catProducts = groups.get(cat)!;
    if (catProducts.length > 0) {
      catProducts.sort((a, b) => {
        const dateA = a.availableFrom?.getTime() ?? 0;
        const dateB = b.availableFrom?.getTime() ?? 0;
        return dateB - dateA;
      });
      result.push({ category: cat, products: catProducts });
    }
  });
  
  return result;
}

function formatDate(date: Date | null): string {
  if (!date) return 'Present';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPeriodEndDate(date: Date | null): string {
  if (!date) return 'Present';
  const dayBefore = new Date(date);
  dayBefore.setDate(dayBefore.getDate() - 1);
  return dayBefore.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function HistoricalTariffItem({
  agreement,
  isSelected,
  onSelect,
  region,
}: {
  agreement: ProcessedTariffAgreement;
  isSelected: boolean;
  onSelect: () => void;
  region: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [ratePeriods, setRatePeriods] = useState<RatePeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const isAgile = agreement.productCode.toUpperCase().includes('AGILE');
  const isTracker = agreement.productCode.toUpperCase().includes('TRACKER') || agreement.productCode.toUpperCase().includes('SILVER');

  const groupRatesIntoPeriods = (
    rates: ProcessedRate[],
    agreementStart: Date,
    agreementEnd: Date | null
  ): RatePeriod[] => {
    if (rates.length === 0) return [];

    const ratesByDate = new Map<number, ProcessedRate>();
    for (const rate of rates) {
      const key = rate.validFrom.getTime();
      if (!ratesByDate.has(key)) {
        ratesByDate.set(key, rate);
      }
    }
    
    const uniqueRates = Array.from(ratesByDate.values());
    const sortedRates = uniqueRates.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
    
    if (sortedRates.length === 0) return [];
    
    const periods: RatePeriod[] = [];
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
      const pStart = period.validFrom;
      return periodEnd >= agreementStart && pStart <= endDate;
    });
  };

  useEffect(() => {
    if (!expanded) return;
    
    const loadRates = async () => {
      setIsLoading(true);
      try {
        const periodFrom = agreement.validFrom.toISOString();
        const periodTo = agreement.validTo ? agreement.validTo.toISOString() : undefined;
        
        const ratesData = await fetchEnergyRates(
          region,
          agreement.productCode,
          periodFrom,
          periodTo,
          'electricity'
        );
        
        const rates = processRates(ratesData, !isAgile);
        
        let periods: RatePeriod[] = [];
        
        if (isAgile || isTracker) {
          if (rates.length > 0) {
            const sum = rates.reduce((acc, rate) => acc + rate.price, 0);
            const avgRate = sum / rates.length;
            periods = [{
              rate: avgRate,
              standingCharge: null,
              validFrom: agreement.validFrom,
              validTo: agreement.validTo || new Date(),
            }];
          }
        } else {
          periods = groupRatesIntoPeriods(rates, agreement.validFrom, agreement.validTo);
        }
        
        for (const period of periods) {
          try {
            const fromDate = period.validFrom.toISOString();
            const toDate = period.validTo.toISOString();
            
            if (new Date(fromDate) <= new Date(toDate)) {
              const standingCharge = await fetchStandingCharge(
                agreement.productCode,
                region,
                'electricity',
                fromDate,
                toDate
              );
              period.standingCharge = standingCharge;
            } else {
              const standingCharge = await fetchStandingCharge(
                agreement.productCode,
                region,
                'electricity'
              );
              period.standingCharge = standingCharge;
            }
          } catch {
            console.log('Could not fetch standing charge');
          }
        }
        
        setRatePeriods(periods);
      } catch (error) {
        console.log('Error loading rates:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRates();
  }, [expanded, agreement, region, isAgile, isTracker]);

  return (
    <View style={[styles.tariffItem, isSelected && styles.listItemSelected]}>
      <Pressable
        style={styles.tariffItemHeader}
        onPress={onSelect}
      >
        <View style={styles.tariffItemLeft}>
          <Text style={[
            styles.tariffItemTitle,
            isSelected && styles.listItemTextSelected
          ]}>
            {agreement.displayName}
          </Text>
          <View style={styles.tariffDateRow}>
            <Calendar size={12} color={Colors.text.secondary} />
            <Text style={styles.tariffDateText}>
              {formatDate(agreement.validFrom)} → {formatDate(agreement.validTo)}
            </Text>
          </View>
          <View style={styles.tariffBadges}>
            {agreement.isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.badgeText}>Current</Text>
              </View>
            )}
            {agreement.isEco7 && (
              <View style={styles.eco7Badge}>
                <Text style={styles.badgeText}>Eco 7</Text>
              </View>
            )}
            {(isAgile || isTracker) && (
              <View style={styles.variableBadge}>
                <Text style={styles.badgeText}>{isAgile ? 'Variable' : 'Daily'}</Text>
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
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading rate history...</Text>
            </View>
          ) : ratePeriods.length === 0 ? (
            <Text style={styles.noRatesText}>Rate data not available</Text>
          ) : (
            <View style={styles.periodsContainer}>
              {[...ratePeriods].reverse().map((period, index) => (
                <View key={index} style={styles.periodItem}>
                  {ratePeriods.length > 1 && (
                    <View style={styles.periodDateRow}>
                      <Calendar size={12} color={Colors.text.tertiary} />
                      <Text style={styles.periodDateText}>
                        {formatDate(period.validFrom)} → {formatPeriodEndDate(period.validTo)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailLabel}>
                        <Zap size={14} color={Colors.primary} />
                        <Text style={styles.detailLabelText}>
                          {isAgile || isTracker ? 'Average rate' : 'Unit rate'}
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
                        <Text style={styles.detailValue}>—</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function AvailableProductItem({
  product,
  isSelected,
  onSelect,
  region,
}: {
  product: HistoricalProduct;
  isSelected: boolean;
  onSelect: () => void;
  region: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isAgile = product.code.toUpperCase().includes('AGILE');
  const isTracker = product.isTracker;
  


  const ratesQuery = useQuery({
    queryKey: ['comparison-tariff-rates', product.code, region],
    queryFn: () => fetchComparisonTariffRates(region, product.code, 'electricity'),
    enabled: expanded,
    staleTime: 60 * 60 * 1000,
  });

  const standingChargeQuery = useQuery({
    queryKey: ['comparison-standing-charge', product.code, region],
    queryFn: () => fetchStandingCharge(product.code, region, 'electricity'),
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

  const availabilityText = useMemo(() => {
    if (!product.availableFrom && !product.availableTo) return null;
    const from = product.availableFrom ? formatDate(product.availableFrom) : 'Unknown';
    const to = product.availableTo ? formatDate(product.availableTo) : 'Present';
    return `${from} → ${to}`;
  }, [product.availableFrom, product.availableTo]);

  return (
    <View style={[styles.tariffItem, isSelected && styles.listItemSelected]}>
      <Pressable style={styles.tariffItemHeader} onPress={onSelect}>
        <View style={styles.tariffItemLeft}>
          <Text style={[styles.tariffItemTitle, isSelected && styles.listItemTextSelected]}>
            {product.displayName}
          </Text>
          {product.description ? (
            <Text style={styles.tariffItemDescription} numberOfLines={2}>
              {product.description}
            </Text>
          ) : null}
          {availabilityText && (
            <View style={styles.tariffDateRow}>
              <Calendar size={12} color={Colors.text.secondary} />
              <Text style={styles.tariffDateText}>{availabilityText}</Text>
            </View>
          )}
          <View style={styles.tariffBadges}>
            {product.isVariable && (
              <View style={styles.variableBadge}>
                <Text style={styles.badgeText}>{isAgile ? 'Variable' : isTracker ? 'Daily' : 'Variable'}</Text>
              </View>
            )}
            {product.isGreen && (
              <View style={[styles.activeBadge, { backgroundColor: '#10b981' }]}>
                <Text style={styles.badgeText}>Green</Text>
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
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading rates...</Text>
            </View>
          ) : !displayRates || displayRates.length === 0 ? (
            <Text style={styles.noRatesText}>Rate data not available for your region</Text>
          ) : isAgile ? (
            <>
              <Text style={styles.ratesTitle}>Today&apos;s Agile Rates</Text>
              {(() => {
                const todayRates = displayRates.filter(r => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return r.validFrom >= today && r.validFrom < tomorrow;
                });
                const sortedRates = [...todayRates].sort((a, b) => a.price - b.price);
                const lowestRate = sortedRates[0];
                const highestRate = sortedRates[sortedRates.length - 1];
                const avgRate = todayRates.length > 0 
                  ? todayRates.reduce((sum, r) => sum + r.price, 0) / todayRates.length 
                  : 0;
                
                return (
                  <View style={styles.agileStatsRow}>
                    <View style={styles.agileStat}>
                      <Text style={styles.agileStatLabel}>Lowest</Text>
                      <Text style={[styles.agileStatValue, styles.lowRate]}>
                        {lowestRate?.price.toFixed(2) || '—'}p
                      </Text>
                    </View>
                    <View style={styles.agileStat}>
                      <Text style={styles.agileStatLabel}>Average</Text>
                      <Text style={styles.agileStatValue}>{avgRate.toFixed(2)}p</Text>
                    </View>
                    <View style={styles.agileStat}>
                      <Text style={styles.agileStatLabel}>Highest</Text>
                      <Text style={[styles.agileStatValue, styles.highRate]}>
                        {highestRate?.price.toFixed(2) || '—'}p
                      </Text>
                    </View>
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
                        <Zap size={14} color={Colors.primary} />
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
                      <Zap size={14} color={Colors.primary} />
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

export default function ElectricityComparisonScreen() {
  const router = useRouter();
  const {
    electricityComparisonTariff,
    setElectricityComparisonTariff,
    selectedRegion,
    electricityAgreements,
    movedInAt,
    availableElectricityProducts,
    isLoadingProducts,
  } = useConsumption();

  const historicalGroups = useMemo(() => {
    return groupAgreementsByCategory(electricityAgreements);
  }, [electricityAgreements]);

  const usedProductCodes = useMemo(() => {
    return new Set(electricityAgreements.map(a => a.productCode));
  }, [electricityAgreements]);

  const availableProductGroups = useMemo(() => {
    const filteredProducts = availableElectricityProducts.filter(p => !usedProductCodes.has(p.code));
    return groupProductsByCategory(filteredProducts);
  }, [availableElectricityProducts, usedProductCodes]);

  const handleSelectTariff = (code: string) => {
    setElectricityComparisonTariff(code);
    router.back();
  };

  const customerSince = movedInAt 
    ? movedInAt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Select a tariff to compare your electricity costs against. 
        {customerSince && ` Your tariff history since ${customerSince} is shown below.`}
      </Text>
      
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {historicalGroups.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Your Tariff History</Text>
            {historicalGroups.map((group) => (
              <View key={group.category} style={styles.groupContainer}>
                <Text style={styles.groupTitle}>{group.category}</Text>
                {group.agreements.map((agreement, index) => (
                  <HistoricalTariffItem
                    key={`${agreement.tariffCode}-${index}`}
                    agreement={agreement}
                    isSelected={electricityComparisonTariff === agreement.productCode}
                    onSelect={() => handleSelectTariff(agreement.productCode)}
                    region={selectedRegion}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
        
        {availableProductGroups.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Other Available Tariffs</Text>
            {isLoadingProducts && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading available tariffs...</Text>
              </View>
            )}
            {availableProductGroups.map((group) => (
              <View key={group.category} style={styles.groupContainer}>
                <Text style={styles.groupTitle}>{group.category}</Text>
                {group.products.map((product) => (
                  <AvailableProductItem
                    key={product.code}
                    product={product}
                    isSelected={electricityComparisonTariff === product.code}
                    onSelect={() => handleSelectTariff(product.code)}
                    region={selectedRegion}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
        
        {electricityAgreements.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No tariff history found. Connect your Octopus account to see your historical tariffs.
            </Text>
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
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupContainer: {
    marginBottom: 4,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.primary,
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
    color: Colors.primary,
  },
  tariffItemDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginTop: 2,
  },
  tariffDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tariffDateText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  tariffBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  activeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eco7Badge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
    backgroundColor: Colors.primary,
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
  loadingText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  noRatesText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic' as const,
  },
  periodsContainer: {
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
    backgroundColor: Colors.background,
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
  agileStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  agileStat: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  agileStatLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  agileStatValue: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  lowRate: {
    color: Colors.chart.veryLow,
  },
  highRate: {
    color: Colors.chart.veryHigh,
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
  bottomPadding: {
    height: 40,
  },
});
