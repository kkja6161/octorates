import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConsumption, ELECTRICITY_COMPARISON_TARIFFS, GAS_COMPARISON_TARIFFS } from '@/providers/ConsumptionProvider';
import { fetchFlexibleRate, fetchComparisonTariffRates } from '@/services/energyApi';

const FLEXIBLE_TARIFF_CODE = 'VAR-22-11-01';

function isValidComparisonTariff(code: string | null | undefined, tariffs: typeof ELECTRICITY_COMPARISON_TARIFFS): boolean {
  if (!code) return false;
  return tariffs.some(t => t.code === code);
}

export function useComparisonRate() {
  const {
    electricityComparisonTariff: storedElectricityTariff,
    gasComparisonTariff: storedGasTariff,
    selectedRegion,
  } = useConsumption();
  
  const safeSelectedRegion = selectedRegion ?? 'C';
  
  const electricityComparisonTariff = useMemo(() => {
    if (isValidComparisonTariff(storedElectricityTariff, ELECTRICITY_COMPARISON_TARIFFS)) {
      return storedElectricityTariff;
    }
    return FLEXIBLE_TARIFF_CODE;
  }, [storedElectricityTariff]);
  
  const gasComparisonTariff = useMemo(() => {
    if (isValidComparisonTariff(storedGasTariff, GAS_COMPARISON_TARIFFS)) {
      return storedGasTariff;
    }
    return FLEXIBLE_TARIFF_CODE;
  }, [storedGasTariff]);
  
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
    const tariffInfo = ELECTRICITY_COMPARISON_TARIFFS.find(t => t.code === electricityComparisonTariff);
    return tariffInfo?.displayName ?? 'Flexible Octopus';
  }, [electricityComparisonTariff]);
  
  const comparisonGasTariffName = useMemo(() => {
    const tariffInfo = GAS_COMPARISON_TARIFFS.find(t => t.code === gasComparisonTariff);
    return tariffInfo?.displayName ?? 'Flexible Octopus';
  }, [gasComparisonTariff]);
  
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
