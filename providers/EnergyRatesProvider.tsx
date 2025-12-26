import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchEnergyRates, processRates, getTomorrowRates, fetchProducts, getAvailableTariffs, fetchFlexibleRate, fetchGasTrackerRates } from '@/services/energyApi';
import { checkAndNotifyNewAgileRates } from '@/services/notificationService';
import { DEFAULT_GSP_REGION, DEFAULT_PRODUCT_CODE } from '@/constants/octopus';
import { RateThresholds, DEFAULT_ELECTRICITY_THRESHOLDS, DEFAULT_GAS_THRESHOLDS, ProcessedTariffAgreement, ProcessedRate } from '@/types/energy';

const STORAGE_KEY_ELECTRICITY_THRESHOLDS = '@energy_rates:electricity_thresholds';
const STORAGE_KEY_GAS_THRESHOLDS = '@energy_rates:gas_thresholds';
const STORAGE_KEY_ACCOUNT_DATA = '@consumption:account_data';
const STORAGE_KEY_SELECTED_ELECTRICITY_TARIFF = '@consumption:selected_electricity_tariff';
const STORAGE_KEY_SELECTED_GAS_TARIFF = '@consumption:selected_gas_tariff';
const STORAGE_KEY_SHOW_GAS = '@consumption:show_gas';
const STORAGE_KEY_CACHED_ELECTRICITY_RATES = '@energy_rates:cached_electricity';
const STORAGE_KEY_CACHED_GAS_RATES = '@energy_rates:cached_gas';
const STORAGE_KEY_RATES_CACHE_TIMESTAMP = '@energy_rates:cache_timestamp';
const STORAGE_KEY_NOTIFICATION_SETTINGS = '@energy_rates:notification_settings';

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface CachedRates {
  rates: ProcessedRate[];
  timestamp: number;
  region: string;
  productCode: string;
}

export const [EnergyRatesProvider, useEnergyRates] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState<string>(DEFAULT_GSP_REGION);
  const [selectedElectricityProductCode, setSelectedElectricityProductCode] = useState<string>(DEFAULT_PRODUCT_CODE);
  const [selectedGasProductCode, setSelectedGasProductCode] = useState<string | null>(null);
  const [showGas, setShowGas] = useState<boolean>(false);
  const [electricityThresholds, setElectricityThresholds] = useState<RateThresholds>(DEFAULT_ELECTRICITY_THRESHOLDS);
  const [gasThresholds, setGasThresholds] = useState<RateThresholds>(DEFAULT_GAS_THRESHOLDS);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [cachedElectricityRates, setCachedElectricityRates] = useState<ProcessedRate[] | null>(null);
  const [cachedGasRates, setCachedGasRates] = useState<ProcessedRate[] | null>(null);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

  useQuery({
    queryKey: ['stored-account-data-for-rates'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ACCOUNT_DATA);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.region) {
          setSelectedRegion(parsed.region);
        }
        if (parsed.electricity?.currentAgreement?.productCode) {
          setSelectedElectricityProductCode(parsed.electricity.currentAgreement.productCode);
        }
        if (parsed.gas?.currentAgreement?.productCode) {
          setSelectedGasProductCode(parsed.gas.currentAgreement.productCode);
        }
      }
      
      const showGasStored = await AsyncStorage.getItem(STORAGE_KEY_SHOW_GAS);
      if (showGasStored !== null) {
        setShowGas(showGasStored === 'true');
      }
      
      setIsSettingsLoaded(true);
      return stored;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-selected-electricity-tariff-for-rates'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_SELECTED_ELECTRICITY_TARIFF);
      if (stored) {
        const accountDataStored = await AsyncStorage.getItem(STORAGE_KEY_ACCOUNT_DATA);
        if (accountDataStored) {
          const accountData = JSON.parse(accountDataStored);
          if (accountData.electricity?.agreements) {
            const agreements = accountData.electricity.agreements.map((a: ProcessedTariffAgreement) => ({
              ...a,
              validFrom: new Date(a.validFrom),
              validTo: a.validTo ? new Date(a.validTo) : null,
            }));
            const selected = agreements.find((a: ProcessedTariffAgreement) => a.tariffCode === stored);
            if (selected) {
              setSelectedElectricityProductCode(selected.productCode);
            }
          }
        }
      }
      return stored;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-selected-gas-tariff-for-rates'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_SELECTED_GAS_TARIFF);
      if (stored) {
        const accountDataStored = await AsyncStorage.getItem(STORAGE_KEY_ACCOUNT_DATA);
        if (accountDataStored) {
          const accountData = JSON.parse(accountDataStored);
          if (accountData.gas?.agreements) {
            const agreements = accountData.gas.agreements.map((a: ProcessedTariffAgreement) => ({
              ...a,
              validFrom: new Date(a.validFrom),
              validTo: a.validTo ? new Date(a.validTo) : null,
            }));
            const selected = agreements.find((a: ProcessedTariffAgreement) => a.tariffCode === stored);
            if (selected) {
              setSelectedGasProductCode(selected.productCode);
            }
          }
        }
      }
      return stored;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const productsQuery = useQuery({
    queryKey: ['energy-products'],
    queryFn: async () => {
      const data = await fetchProducts();
      return getAvailableTariffs(data);
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: false,
  });

  useQuery({
    queryKey: ['load-cached-electricity-rates'],
    queryFn: async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY_CACHED_ELECTRICITY_RATES);
        if (cached) {
          const parsed: CachedRates = JSON.parse(cached);
          const now = Date.now();
          if (now - parsed.timestamp < CACHE_DURATION_MS && 
              parsed.region === selectedRegion && 
              parsed.productCode === selectedElectricityProductCode) {
            const restoredRates = parsed.rates.map(r => ({
              ...r,
              validFrom: new Date(r.validFrom),
              validTo: new Date(r.validTo),
            }));
            setCachedElectricityRates(restoredRates);
            return restoredRates;
          }
        }
      } catch {
        
      }
      return null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['load-cached-gas-rates'],
    queryFn: async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY_CACHED_GAS_RATES);
        if (cached) {
          const parsed: CachedRates = JSON.parse(cached);
          const now = Date.now();
          if (now - parsed.timestamp < CACHE_DURATION_MS && parsed.region === selectedRegion) {
            const restoredRates = parsed.rates.map(r => ({
              ...r,
              validFrom: new Date(r.validFrom),
              validTo: new Date(r.validTo),
            }));
            setCachedGasRates(restoredRates);
            return restoredRates;
          }
        }
      } catch {
        
      }
      return null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const electricityRatesQuery = useQuery({
    queryKey: ['energy-rates-electricity', selectedRegion, selectedElectricityProductCode],
    queryFn: async () => {
      console.log('[EnergyRatesProvider] Fetching fresh electricity rates...');
      const data = await fetchEnergyRates(selectedRegion, selectedElectricityProductCode, undefined, undefined, 'electricity');
      const rates = processRates(data, false);
      
      try {
        const cacheData: CachedRates = {
          rates,
          timestamp: Date.now(),
          region: selectedRegion,
          productCode: selectedElectricityProductCode,
        };
        await AsyncStorage.setItem(STORAGE_KEY_CACHED_ELECTRICITY_RATES, JSON.stringify(cacheData));
        console.log('[EnergyRatesProvider] Cached electricity rates:', rates.length);
      } catch (error) {
        console.log('[EnergyRatesProvider] Error caching electricity rates:', error);
      }
      
      return rates;
    },
    enabled: isSettingsLoaded && !!selectedElectricityProductCode && !!selectedRegion,
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    placeholderData: cachedElectricityRates || undefined,
  });

  const gasRatesQuery = useQuery({
    queryKey: ['energy-rates-gas', selectedRegion, selectedGasProductCode],
    queryFn: async () => {
      if (!selectedGasProductCode) {
        console.log('[EnergyRatesProvider] No gas tariff selected, skipping gas rates fetch');
        return [];
      }
      
      const isTrackerTariff = selectedGasProductCode.includes('SILVER') || selectedGasProductCode.includes('TRACKER');
      console.log('[EnergyRatesProvider] Fetching gas rates for region:', selectedRegion, 'product:', selectedGasProductCode, 'isTracker:', isTrackerTariff);
      
      let data;
      if (isTrackerTariff) {
        data = await fetchGasTrackerRates(selectedRegion);
      } else {
        data = await fetchEnergyRates(selectedRegion, selectedGasProductCode, undefined, undefined, 'gas');
      }
      
      const rates = processRates(data, true);
      
      try {
        const cacheData: CachedRates = {
          rates,
          timestamp: Date.now(),
          region: selectedRegion,
          productCode: selectedGasProductCode,
        };
        await AsyncStorage.setItem(STORAGE_KEY_CACHED_GAS_RATES, JSON.stringify(cacheData));
        console.log('[EnergyRatesProvider] Cached gas rates:', rates.length);
      } catch (error) {
        console.log('[EnergyRatesProvider] Error caching gas rates:', error);
      }
      
      return rates;
    },
    enabled: isSettingsLoaded && !!selectedRegion && !!selectedGasProductCode && showGas,
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    placeholderData: cachedGasRates || undefined,
  });

  useQuery({
    queryKey: ['stored-electricity-thresholds'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ELECTRICITY_THRESHOLDS);
      if (stored) {
        const parsed = JSON.parse(stored);
        setElectricityThresholds(parsed);
      }
      return stored ? JSON.parse(stored) : DEFAULT_ELECTRICITY_THRESHOLDS;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-gas-thresholds'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_GAS_THRESHOLDS);
      if (stored) {
        const parsed = JSON.parse(stored);
        setGasThresholds(parsed);
      }
      return stored ? JSON.parse(stored) : DEFAULT_GAS_THRESHOLDS;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });





  const saveElectricityThresholdsMutation = useMutation({
    mutationFn: async (thresholds: RateThresholds) => {
      await AsyncStorage.setItem(STORAGE_KEY_ELECTRICITY_THRESHOLDS, JSON.stringify(thresholds));
      setElectricityThresholds(thresholds);
      return thresholds;
    },
  });

  const saveGasThresholdsMutation = useMutation({
    mutationFn: async (thresholds: RateThresholds) => {
      await AsyncStorage.setItem(STORAGE_KEY_GAS_THRESHOLDS, JSON.stringify(thresholds));
      setGasThresholds(thresholds);
      return thresholds;
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const currentElectricityRate = useMemo(() => {
    if (!electricityRatesQuery.data) return null;
    const now = currentTime;
    return electricityRatesQuery.data.find(rate => rate.validFrom <= now && rate.validTo > now) || null;
  }, [electricityRatesQuery.data, currentTime]);

  const todayElectricityRates = useMemo(() => {
    if (!electricityRatesQuery.data) return [];
    const now = currentTime;
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return electricityRatesQuery.data
      .filter(rate => rate.validFrom >= today && rate.validFrom < tomorrow)
      .map(rate => ({
        ...rate,
        isCurrent: now >= rate.validFrom && now < rate.validTo
      }));
  }, [electricityRatesQuery.data, currentTime]);

  const currentGasRate = useMemo(() => {
    if (!gasRatesQuery.data) return null;
    const now = currentTime;
    return gasRatesQuery.data.find(rate => rate.validFrom <= now && rate.validTo > now) || null;
  }, [gasRatesQuery.data, currentTime]);

  const todayGasRates = useMemo(() => {
    if (!gasRatesQuery.data) return [];
    const now = currentTime;
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return gasRatesQuery.data
      .filter(rate => rate.validFrom >= today && rate.validFrom < tomorrow)
      .map(rate => ({
        ...rate,
        isCurrent: now >= rate.validFrom && now < rate.validTo
      }));
  }, [gasRatesQuery.data, currentTime]);

  const tomorrowElectricityRates = useMemo(() => {
    if (!electricityRatesQuery.data) return [];
    return getTomorrowRates(electricityRatesQuery.data);
  }, [electricityRatesQuery.data]);

  useEffect(() => {
    const checkNewRatesNotification = async () => {
      if (tomorrowElectricityRates.length > 0 && selectedElectricityProductCode.toUpperCase().includes('AGILE')) {
        try {
          const storedSettings = await AsyncStorage.getItem(STORAGE_KEY_NOTIFICATION_SETTINGS);
          if (storedSettings) {
            const settings = JSON.parse(storedSettings);
            if (settings.enabled && settings.notifyNewAgileRates) {
              await checkAndNotifyNewAgileRates(tomorrowElectricityRates, true);
            }
          }
        } catch (error) {
          console.log('[EnergyRatesProvider] Error checking new rates notification:', error);
        }
      }
    };
    checkNewRatesNotification();
  }, [tomorrowElectricityRates, selectedElectricityProductCode]);

  const tomorrowGasRates = useMemo(() => {
    if (!gasRatesQuery.data) return [];
    return getTomorrowRates(gasRatesQuery.data);
  }, [gasRatesQuery.data]);

  const allElectricityRates = electricityRatesQuery.data || [];
  const allGasRates = gasRatesQuery.data || [];

  const setRegion = (region: string) => {
    setSelectedRegion(region);
  };

  const setElectricityTariff = (_tariffCode: string) => {
    // Tariff selection now handled by ConsumptionProvider
  };

  const flexibleElectricityQuery = useQuery({
    queryKey: ['flexible-electricity-rate', selectedRegion],
    queryFn: () => fetchFlexibleRate(selectedRegion, 'electricity'),
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const flexibleGasQuery = useQuery({
    queryKey: ['flexible-gas-rate', selectedRegion],
    queryFn: () => fetchFlexibleRate(selectedRegion, 'gas'),
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const clearRatesCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY_CACHED_ELECTRICITY_RATES,
        STORAGE_KEY_CACHED_GAS_RATES,
        STORAGE_KEY_RATES_CACHE_TIMESTAMP,
      ]);
      setCachedElectricityRates(null);
      setCachedGasRates(null);
      queryClient.invalidateQueries({ queryKey: ['energy-rates-electricity'] });
      queryClient.invalidateQueries({ queryKey: ['energy-rates-gas'] });
      console.log('[EnergyRatesProvider] Rates cache cleared');
    } catch (error) {
      console.error('[EnergyRatesProvider] Error clearing rates cache:', error);
    }
  }, [queryClient]);

  return {
    currentElectricityRate,
    todayElectricityRates,
    tomorrowElectricityRates,
    allElectricityRates,
    currentGasRate,
    todayGasRates,
    tomorrowGasRates,
    allGasRates,
    availableTariffs: productsQuery.data || [],
    isLoading: electricityRatesQuery.isLoading || gasRatesQuery.isLoading,
    isError: electricityRatesQuery.isError || gasRatesQuery.isError,
    error: electricityRatesQuery.error || gasRatesQuery.error,
    refetchElectricity: electricityRatesQuery.refetch,
    refetchGas: gasRatesQuery.refetch,
    selectedRegion,
    setRegion,
    selectedElectricityTariff: selectedElectricityProductCode,
    setElectricityTariff,
    selectedGasTariff: selectedGasProductCode,
    electricityThresholds,
    setElectricityThresholds: saveElectricityThresholdsMutation.mutate,
    gasThresholds,
    setGasThresholds: saveGasThresholdsMutation.mutate,
    flexibleElectricityRate: flexibleElectricityQuery.data || null,
    flexibleGasRate: flexibleGasQuery.data || null,
    clearRatesCache,
  };
});
