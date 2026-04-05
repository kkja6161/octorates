import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConsumption, ELECTRICITY_COMPARISON_TARIFFS, GAS_COMPARISON_TARIFFS } from '@/providers/ConsumptionProvider';
import { fetchFlexibleRate, fetchComparisonTariffRates } from '@/services/energyApi';

const FLEXIBLE_TARIFF_CODE = 'VAR-22-11-01';

export function useComparisonRate() {
  const {
    electricityComparisonTariff: storedElectricityTariff,
    gasComparisonTariff: storedGasTariff,
    selectedRegion,
    availableElectricityProducts,
    availableGasProducts,
  } = useConsumption();
  
  const safeSelectedRegion = selectedRegion ?? 'C';
  
  const electricityComparisonTariff = storedElectricityTariff || FLEXIBLE_TARIFF_CODE;
  const gasComparisonTariff = storedGasTariff || FLEXIBLE_TARIFF_CODE;
  
  const isFlexibleElectricity = electricityComparisonTariff === FLEXIBLE_TARIFF_CODE;
  const isFlexibleGas = gasComparisonTariff === FLEXIBLE_TARIFF_CODE;
  
  const flexibleElectricityQuery = useQuery({
    queryKey: ['home-comparison-flexible-electricity', safeSelectedRegion],
    queryFn: () => fetchFlexibleRate(safeSelectedRegion, 'electricity'),
    staleTime: 60 * 60 * 1000,
  });
  
  const flexibleGasQuery = useQuery({
    queryKey: ['home-comparison-flexible-gas', safeSelectedRegion],
    queryFn: () => fetchFlexibleRate(safeSelectedRegion, 'gas'),
    staleTime: 60 * 60 * 1000,
  });
  
  const comparisonElectricityQuery = useQuery({
    queryKey: ['home-comparison-electricity', safeSelectedRegion, electricityComparisonTariff, isFlexibleElectricity],
    queryFn: async () => {
      if (isFlexibleElectricity) return null;
      console.log('[useComparisonRate] Fetching electricity comparison for tariff:', electricityComparisonTariff);
      const rates = await fetchComparisonTariffRates(
        safeSelectedRegion,
        electricityComparisonTariff,
        'electricity',
        undefined,
        undefined
      );
      console.log('[useComparisonRate] Electricity comparison rates received:', rates.length);
      if (rates.length > 0) {
        const now = new Date();
        const currentRate = rates.find(r => r.validFrom <= now && r.validTo > now);
        if (currentRate) {
          console.log('[useComparisonRate] Current electricity comparison rate:', currentRate.price);
          return currentRate.price;
        }
        // Fallback to most recent rate if no current rate found
        const mostRecent = rates[rates.length - 1];
        console.log('[useComparisonRate] Using most recent electricity comparison rate:', mostRecent.price);
        return mostRecent.price;
      }
      return null;
    },
    enabled: !isFlexibleElectricity,
    staleTime: 30 * 60 * 1000,
  });
  
  const comparisonGasQuery = useQuery({
    queryKey: ['home-comparison-gas', safeSelectedRegion, gasComparisonTariff, isFlexibleGas],
    queryFn: async () => {
      if (isFlexibleGas) return null;
      console.log('[useComparisonRate] Fetching gas comparison for tariff:', gasComparisonTariff);
      
      try {
        const rates = await fetchComparisonTariffRates(
          safeSelectedRegion,
          gasComparisonTariff,
          'gas',
          undefined,
          undefined
        );
        console.log('[useComparisonRate] Gas comparison rates received:', rates.length);
        if (rates.length > 0) {
          const now = new Date();
          const currentRate = rates.find(r => r.validFrom <= now && r.validTo > now);
          if (currentRate) {
            console.log('[useComparisonRate] Current gas comparison rate:', currentRate.price);
            return currentRate.price;
          }
          // Fallback to most recent rate if no current rate found
          const mostRecent = rates[rates.length - 1];
          console.log('[useComparisonRate] Using most recent gas comparison rate:', mostRecent.price);
          return mostRecent.price;
        }
      } catch {
        console.log('[useComparisonRate] Gas tariff not found, falling back to Flexible');
        const flexibleGasRate = await fetchFlexibleRate(safeSelectedRegion, 'gas');
        return flexibleGasRate;
      }
      
      return null;
    },
    enabled: !isFlexibleGas,
    staleTime: 30 * 60 * 1000,
  });
  
  const comparisonElectricityTariffName = useMemo(() => {
    const hardcoded = ELECTRICITY_COMPARISON_TARIFFS.find(t => t.code === electricityComparisonTariff);
    if (hardcoded) return hardcoded.displayName;
    const dynamic = availableElectricityProducts.find(p => p.code === electricityComparisonTariff);
    if (dynamic) return dynamic.displayName;
    return 'Flexible Octopus';
  }, [electricityComparisonTariff, availableElectricityProducts]);
  
  const comparisonGasTariffName = useMemo(() => {
    const hardcoded = GAS_COMPARISON_TARIFFS.find(t => t.code === gasComparisonTariff);
    if (hardcoded) return hardcoded.displayName;
    const dynamic = availableGasProducts.find(p => p.code === gasComparisonTariff);
    if (dynamic) return dynamic.displayName;
    return 'Flexible Octopus';
  }, [gasComparisonTariff, availableGasProducts]);
  
  const comparisonElectricityRate = isFlexibleElectricity 
    ? flexibleElectricityQuery.data 
    : comparisonElectricityQuery.data;
    
  const comparisonGasRate = isFlexibleGas 
    ? flexibleGasQuery.data 
    : comparisonGasQuery.data;
  
  return {
    comparisonElectricityRate,
    comparisonGasRate,
    comparisonTariffName: comparisonElectricityTariffName,
    comparisonElectricityTariffName,
    comparisonGasTariffName,
    electricityComparisonTariff,
    gasComparisonTariff,
    isLoading: (isFlexibleElectricity ? flexibleElectricityQuery.isLoading : comparisonElectricityQuery.isLoading) ||
      (isFlexibleGas ? flexibleGasQuery.isLoading : comparisonGasQuery.isLoading),
  };
}
