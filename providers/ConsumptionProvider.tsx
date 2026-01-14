import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchConsumption, fetchEnergyRates, processRates, fetchFlexibleRate, fetchComparisonTariffRates, fetchGasTrackerRates, fetchStandingCharge, fetchAccountData, processAccountData } from '@/services/energyApi';
import { DailyConsumption, ConsumptionEntry, ProcessedRate, ConsumptionEntryWithRate, ProcessedAccountData, ProcessedTariffAgreement, ComparisonTariffOption } from '@/types/energy';
import { DEFAULT_GSP_REGION, DEFAULT_PRODUCT_CODE, GAS_TRACKER_PRODUCT } from '@/constants/octopus';

function roundHalfToEven(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  const remainder = Math.abs(value * 100 - Math.floor(value * 100));
  
  if (remainder === 0.5) {
    const floor = Math.floor(value * 100);
    const even = floor % 2 === 0 ? floor : floor + 1;
    return even / 100;
  }
  
  return rounded;
}

const STORAGE_KEY_API_KEY = '@consumption:api_key';
const STORAGE_KEY_ACCOUNT_NUMBER = '@consumption:account_number';
const STORAGE_KEY_ACCOUNT_DATA = '@consumption:account_data';
const STORAGE_KEY_SHOW_GAS = '@consumption:show_gas';
const STORAGE_KEY_SELECTED_ELECTRICITY_TARIFF = '@consumption:selected_electricity_tariff';
const STORAGE_KEY_SELECTED_GAS_TARIFF = '@consumption:selected_gas_tariff';
const STORAGE_KEY_ELECTRICITY_COMPARISON_TARIFF = '@consumption:electricity_comparison_tariff';
const STORAGE_KEY_GAS_COMPARISON_TARIFF = '@consumption:gas_comparison_tariff';
const STORAGE_KEY_GAS_CV = '@consumption:gas_cv';
const STORAGE_KEY_TUTORIAL_COMPLETED = '@tutorial:completed_v2';

const FLEXIBLE_TARIFF_CODE = 'VAR-22-11-01';
const DEFAULT_GAS_CV = 39.0;
const GAS_VCF = 1.02264;
const GAS_CF = 3.6;

interface TariffPeriodRates {
  productCode: string;
  validFrom: Date;
  validTo: Date | null;
  rates: ProcessedRate[];
  standingCharge: number | null;
}

interface ComparisonAvailability {
  isAvailable: boolean;
  availableFrom: Date | null;
  missingPeriods: { from: Date; to: Date }[];
}

export const ELECTRICITY_COMPARISON_TARIFFS: ComparisonTariffOption[] = [
  { code: 'VAR-22-11-01', displayName: 'Flexible Octopus', description: 'Variable rate tariff with standard pricing', hasGas: true },
  { code: 'OE-FIX-12M-25-11-24', displayName: 'Octopus 12M Fixed November 2025', description: '12 month fixed rate tariff', hasGas: true },
  { code: 'PREPAY-VAR-18-09-21', displayName: 'Flexible Octopus Smart Pay as You Go', description: 'Prepay variable rate tariff', hasGas: true },
  { code: 'LOYAL-FIX-12M-25-12-03', displayName: 'Loyal Octopus 12M Fixed December 2025', description: '12 month fixed rate tariff for loyal customers', hasGas: true },
  { code: 'SILVER-24-04-03', displayName: 'Octopus Tracker April 2024', description: 'Daily variable rates based on wholesale prices', hasGas: true },
  { code: 'AGILE-24-10-01', displayName: 'Agile Octopus October 2024', description: 'Half-hourly variable rates based on wholesale prices', hasGas: false },
  { code: 'AGILE-BB-24-10-01', displayName: 'Agile Octopus Business', description: 'Business half-hourly variable rates', hasGas: false },
  { code: 'GO-VAR-22-10-14', displayName: 'Octopus Go', description: 'EV friendly tariff with cheap off-peak rates', hasGas: false },
  { code: 'COSY-22-12-08', displayName: 'Cosy Octopus', description: 'Heat pump friendly tariff with cheap off-peak rates', hasGas: false },
  { code: 'INTELLI-VAR-22-10-14', displayName: 'Intelligent Octopus Go', description: 'Smart EV tariff with automatic charging optimization', hasGas: false },
  { code: 'INTELLI-BB-VAR-22-10-14', displayName: 'Intelligent Octopus Flux', description: 'Smart tariff with solar/battery export', hasGas: false },
  { code: 'FLUX-IMPORT-23-02-14', displayName: 'Octopus Flux Import', description: 'Import tariff for solar/battery systems', hasGas: false },
  { code: 'FLUX-EXPORT-23-02-14', displayName: 'Octopus Flux Export', description: 'Export tariff for solar/battery systems', hasGas: false },
  { code: 'OUTGOING-FIX-12M-19-05-13', displayName: 'Outgoing Octopus Fixed', description: 'Fixed export tariff', hasGas: false },
  { code: 'OUTGOING-LITE-FIX-12M-25-01-28', displayName: 'Outgoing Octopus Lite', description: 'Lite fixed export tariff', hasGas: false },
];

export const GAS_COMPARISON_TARIFFS: ComparisonTariffOption[] = [
  { code: 'VAR-22-11-01', displayName: 'Flexible Octopus', description: 'Variable rate tariff with standard pricing', hasGas: true },
  { code: 'OE-FIX-12M-25-11-24', displayName: 'Octopus 12M Fixed November 2025', description: '12 month fixed rate tariff', hasGas: true },
  { code: 'PREPAY-VAR-18-09-21', displayName: 'Flexible Octopus Smart Pay as You Go', description: 'Prepay variable rate tariff', hasGas: true },
  { code: 'LOYAL-FIX-12M-25-12-03', displayName: 'Loyal Octopus 12M Fixed December 2025', description: '12 month fixed rate tariff for loyal customers', hasGas: true },
  { code: 'SILVER-24-04-03', displayName: 'Octopus Tracker April 2024', description: 'Daily variable rates based on wholesale prices', hasGas: true },
];

export const [ConsumptionProvider, useConsumption] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [accountNumber, setAccountNumberState] = useState<string | null>(null);
  const [accountData, setAccountDataState] = useState<ProcessedAccountData | null>(null);
  const [dateRangeDays, setDateRangeDays] = useState<number>(28);
  const [dateRangeMode, setDateRangeMode] = useState<'days' | 'last-month' | 'current-month' | 'custom'>('current-month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showGas, setShowGasState] = useState<boolean>(true);
  const [selectedElectricityTariffCode, setSelectedElectricityTariffCode] = useState<string | null>(null);
  const [selectedGasTariffCode, setSelectedGasTariffCode] = useState<string | null>(null);
  const [electricityComparisonTariff, setElectricityComparisonTariffState] = useState<string>(FLEXIBLE_TARIFF_CODE);
  const [gasComparisonTariff, setGasComparisonTariffState] = useState<string>(FLEXIBLE_TARIFF_CODE);
  const [isAccountLoading, setIsAccountLoading] = useState<boolean>(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [gasCv, setGasCvState] = useState<number>(DEFAULT_GAS_CV);

  const selectedRegion = accountData?.region || DEFAULT_GSP_REGION;
  const electricityMpan = accountData?.electricity?.mpan || null;
  const gasMprn = accountData?.gas?.mprn || null;
  const electricitySerialNumbers = accountData?.electricity?.serialNumbers || [];
  const gasSerialNumbers = accountData?.gas?.serialNumbers || [];
  const movedInAt = accountData?.movedInAt || null;

  const selectedElectricityTariff = useMemo(() => {
    if (selectedElectricityTariffCode && accountData?.electricity?.agreements) {
      return accountData.electricity.agreements.find(a => a.tariffCode === selectedElectricityTariffCode) || accountData.electricity.currentAgreement;
    }
    return accountData?.electricity?.currentAgreement || null;
  }, [selectedElectricityTariffCode, accountData]);

  const selectedGasTariff = useMemo(() => {
    if (selectedGasTariffCode && accountData?.gas?.agreements) {
      return accountData.gas.agreements.find(a => a.tariffCode === selectedGasTariffCode) || accountData.gas.currentAgreement;
    }
    return accountData?.gas?.currentAgreement || null;
  }, [selectedGasTariffCode, accountData]);

  useQuery({
    queryKey: ['stored-api-key'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_API_KEY);
      if (stored) {
        setApiKeyState(stored);
      }
      return stored;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-account-number'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ACCOUNT_NUMBER);
      if (stored) {
        setAccountNumberState(stored);
      }
      return stored;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-account-data'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ACCOUNT_DATA);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.movedInAt) {
            parsed.movedInAt = new Date(parsed.movedInAt);
          }
          if (parsed.electricity?.agreements) {
            parsed.electricity.agreements = parsed.electricity.agreements.map((a: ProcessedTariffAgreement) => ({
              ...a,
              validFrom: new Date(a.validFrom),
              validTo: a.validTo ? new Date(a.validTo) : null,
            }));
          }
          if (parsed.gas?.agreements) {
            parsed.gas.agreements = parsed.gas.agreements.map((a: ProcessedTariffAgreement) => ({
              ...a,
              validFrom: new Date(a.validFrom),
              validTo: a.validTo ? new Date(a.validTo) : null,
            }));
          }
          setAccountDataState(parsed);
        } catch (error) {
          console.error('[ConsumptionProvider] Error parsing account data:', error);
          await AsyncStorage.removeItem(STORAGE_KEY_ACCOUNT_DATA);
        }
      }
      return stored;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-show-gas'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_SHOW_GAS);
      if (stored !== null) {
        setShowGasState(stored === 'true');
      }
      return stored;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-selected-electricity-tariff'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_SELECTED_ELECTRICITY_TARIFF);
      if (stored) {
        setSelectedElectricityTariffCode(stored);
      }
      return stored;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-selected-gas-tariff'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_SELECTED_GAS_TARIFF);
      if (stored) {
        setSelectedGasTariffCode(stored);
      }
      return stored;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-electricity-comparison-tariff'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ELECTRICITY_COMPARISON_TARIFF);
      if (stored) {
        setElectricityComparisonTariffState(stored);
      }
      return stored || FLEXIBLE_TARIFF_CODE;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-gas-comparison-tariff'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_GAS_COMPARISON_TARIFF);
      if (stored) {
        setGasComparisonTariffState(stored);
      }
      return stored || FLEXIBLE_TARIFF_CODE;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useQuery({
    queryKey: ['stored-gas-cv'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_GAS_CV);
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed)) {
          setGasCvState(parsed);
        }
      }
      return stored;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      await AsyncStorage.setItem(STORAGE_KEY_API_KEY, key);
      setApiKeyState(key);
      return key;
    },
  });

  const saveAccountNumberMutation = useMutation({
    mutationFn: async (number: string) => {
      await AsyncStorage.setItem(STORAGE_KEY_ACCOUNT_NUMBER, number);
      setAccountNumberState(number);
      return number;
    },
  });



  const saveShowGasMutation = useMutation({
    mutationFn: async (show: boolean) => {
      await AsyncStorage.setItem(STORAGE_KEY_SHOW_GAS, show.toString());
      setShowGasState(show);
      return show;
    },
  });

  const saveSelectedElectricityTariffMutation = useMutation({
    mutationFn: async (tariffCode: string | null) => {
      if (tariffCode) {
        await AsyncStorage.setItem(STORAGE_KEY_SELECTED_ELECTRICITY_TARIFF, tariffCode);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_SELECTED_ELECTRICITY_TARIFF);
      }
      setSelectedElectricityTariffCode(tariffCode);
      return tariffCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['electricity-rates-for-consumption'] });
      queryClient.invalidateQueries({ queryKey: ['energy-rates-electricity'] });
    },
  });

  const saveSelectedGasTariffMutation = useMutation({
    mutationFn: async (tariffCode: string | null) => {
      if (tariffCode) {
        await AsyncStorage.setItem(STORAGE_KEY_SELECTED_GAS_TARIFF, tariffCode);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_SELECTED_GAS_TARIFF);
      }
      setSelectedGasTariffCode(tariffCode);
      return tariffCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gas-rates-for-consumption'] });
      queryClient.invalidateQueries({ queryKey: ['energy-rates-gas'] });
    },
  });

  const saveElectricityComparisonTariffMutation = useMutation({
    mutationFn: async (tariff: string) => {
      console.log('[ConsumptionProvider] Saving electricity comparison tariff:', tariff);
      await AsyncStorage.setItem(STORAGE_KEY_ELECTRICITY_COMPARISON_TARIFF, tariff);
      setElectricityComparisonTariffState(tariff);
      return tariff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumption-comparison-electricity-rates'] });
      queryClient.invalidateQueries({ queryKey: ['home-comparison-electricity'] });
    },
  });

  const saveGasComparisonTariffMutation = useMutation({
    mutationFn: async (tariff: string) => {
      console.log('[ConsumptionProvider] Saving gas comparison tariff:', tariff);
      await AsyncStorage.setItem(STORAGE_KEY_GAS_COMPARISON_TARIFF, tariff);
      setGasComparisonTariffState(tariff);
      return tariff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumption-comparison-gas-rates'] });
      queryClient.invalidateQueries({ queryKey: ['home-comparison-gas'] });
    },
  });

  const saveGasCvMutation = useMutation({
    mutationFn: async (cv: number) => {
      console.log('[ConsumptionProvider] Saving gas CV:', cv);
      await AsyncStorage.setItem(STORAGE_KEY_GAS_CV, cv.toString());
      setGasCvState(cv);
      return cv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gas-consumption'] });
    },
  });

  const fetchAndSaveAccountData = useCallback(async (accNumber: string, key: string) => {
    setIsAccountLoading(true);
    setAccountError(null);
    try {
      console.log('[ConsumptionProvider] Fetching account data for:', accNumber);
      const rawData = await fetchAccountData(accNumber, key);
      const processed = processAccountData(rawData);
      
      if (processed) {
        await AsyncStorage.setItem(STORAGE_KEY_ACCOUNT_DATA, JSON.stringify(processed));
        setAccountDataState(processed);
        
        await AsyncStorage.setItem(STORAGE_KEY_ACCOUNT_NUMBER, accNumber);
        setAccountNumberState(accNumber);
        
        await AsyncStorage.setItem(STORAGE_KEY_API_KEY, key);
        setApiKeyState(key);
        
        if (processed.electricity?.currentAgreement) {
          await AsyncStorage.setItem(STORAGE_KEY_SELECTED_ELECTRICITY_TARIFF, processed.electricity.currentAgreement.tariffCode);
          setSelectedElectricityTariffCode(processed.electricity.currentAgreement.tariffCode);
        }
        if (processed.gas?.currentAgreement) {
          await AsyncStorage.setItem(STORAGE_KEY_SELECTED_GAS_TARIFF, processed.gas.currentAgreement.tariffCode);
          setSelectedGasTariffCode(processed.gas.currentAgreement.tariffCode);
        }
        
        setShowGasState(!!processed.gas);
        await AsyncStorage.setItem(STORAGE_KEY_SHOW_GAS, (!!processed.gas).toString());
        
        queryClient.invalidateQueries();
        
        // Mark tutorial as completed since we now have valid credentials
        await AsyncStorage.setItem(STORAGE_KEY_TUTORIAL_COMPLETED, 'true');
        console.log('[ConsumptionProvider] Tutorial marked as completed');
        
        console.log('[ConsumptionProvider] Account data saved successfully');
        return processed;
      } else {
        throw new Error('Failed to process account data');
      }
    } catch (error) {
      console.error('[ConsumptionProvider] Error fetching account data:', error);
      setAccountError(error instanceof Error ? error.message : 'Failed to fetch account data');
      throw error;
    } finally {
      setIsAccountLoading(false);
    }
  }, [queryClient]);

  const isFlexibleElectricityComparison = electricityComparisonTariff === FLEXIBLE_TARIFF_CODE;
  const isFlexibleGasComparison = gasComparisonTariff === FLEXIBLE_TARIFF_CODE;

  const flexibleElectricityQuery = useQuery({
    queryKey: ['consumption-flexible-electricity-rate', selectedRegion],
    queryFn: () => fetchFlexibleRate(selectedRegion, 'electricity'),
    staleTime: 60 * 60 * 1000,
    enabled: !!selectedRegion,
  });

  const flexibleGasQuery = useQuery({
    queryKey: ['consumption-flexible-gas-rate', selectedRegion],
    queryFn: () => fetchFlexibleRate(selectedRegion, 'gas'),
    staleTime: 60 * 60 * 1000,
    enabled: !!selectedRegion,
  });

  const flexibleElectricityRate = flexibleElectricityQuery.data || null;
  const flexibleGasRate = flexibleGasQuery.data || null;

  const currentElectricityStandingChargeQuery = useQuery({
    queryKey: ['electricity-standing-charge', selectedRegion, selectedElectricityTariff?.productCode],
    queryFn: () => fetchStandingCharge(selectedElectricityTariff?.productCode || DEFAULT_PRODUCT_CODE, selectedRegion, 'electricity'),
    enabled: !!selectedElectricityTariff?.productCode,
    staleTime: 60 * 60 * 1000,
  });

  const currentGasStandingChargeQuery = useQuery({
    queryKey: ['gas-standing-charge', selectedRegion, selectedGasTariff?.productCode],
    queryFn: () => fetchStandingCharge(selectedGasTariff?.productCode || GAS_TRACKER_PRODUCT, selectedRegion, 'gas'),
    enabled: !!selectedGasTariff?.productCode,
    staleTime: 60 * 60 * 1000,
  });

  const comparisonElectricityStandingChargeQuery = useQuery({
    queryKey: ['comparison-electricity-standing-charge', selectedRegion, electricityComparisonTariff],
    queryFn: () => fetchStandingCharge(electricityComparisonTariff, selectedRegion, 'electricity'),
    enabled: !!electricityComparisonTariff && !!selectedRegion,
    staleTime: 60 * 60 * 1000,
  });

  const comparisonGasStandingChargeQuery = useQuery({
    queryKey: ['comparison-gas-standing-charge', selectedRegion, gasComparisonTariff],
    queryFn: () => fetchStandingCharge(gasComparisonTariff, selectedRegion, 'gas'),
    enabled: !!gasComparisonTariff && !!selectedRegion,
    staleTime: 60 * 60 * 1000,
  });

  const getDateRangeForMode = useCallback(() => {
    const now = new Date();
    if (dateRangeMode === 'last-month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      end.setHours(0, 0, 0, 0);
      console.log('[ConsumptionProvider] Last month range - start:', start.toISOString(), 'end:', end.toISOString());
      return { start, end };
    } else if (dateRangeMode === 'current-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    } else if (dateRangeMode === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      console.log('[ConsumptionProvider] Custom range - start:', start.toISOString(), 'end:', end.toISOString());
      return { start, end };
    } else {
      const start = new Date();
      start.setDate(start.getDate() - dateRangeDays);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
  }, [dateRangeMode, dateRangeDays, customStartDate, customEndDate]);

  const fetchConsumptionForSerials = useCallback(async (
    mpanOrMprn: string,
    serialNumbers: string[],
    key: string,
    fuelType: 'electricity' | 'gas',
    startDate: Date,
    endDate: Date
  ) => {
    console.log(`[ConsumptionProvider] Fetching ${fuelType} consumption for ${serialNumbers.length} meters`);
    
    const allResults: ConsumptionEntry[] = [];
    const fetchedDates = new Set<string>();
    
    for (const serial of serialNumbers) {
      console.log(`[ConsumptionProvider] Trying serial: ${serial}`);
      
      try {
        const result = await fetchConsumption(
          mpanOrMprn,
          serial,
          key,
          fuelType,
          startDate.toISOString(),
          endDate.toISOString()
        );
        
        if (result.results.length > 0) {
          for (const entry of result.results) {
            const entryDate = new Date(entry.interval_start).toISOString();
            if (!fetchedDates.has(entryDate)) {
              fetchedDates.add(entryDate);
              allResults.push(entry);
            }
          }
          console.log(`[ConsumptionProvider] Serial ${serial}: ${result.results.length} entries, total unique: ${allResults.length}`);
        }
      } catch (error) {
        console.log(`[ConsumptionProvider] Serial ${serial} failed, trying next...`, error);
      }
    }
    
    allResults.sort((a, b) => new Date(a.interval_start).getTime() - new Date(b.interval_start).getTime());
    
    return {
      count: allResults.length,
      next: null,
      previous: null,
      results: allResults,
    };
  }, []);

  const electricityConsumptionQuery = useQuery({
    queryKey: ['electricity-consumption', electricityMpan, electricitySerialNumbers, apiKey, dateRangeDays, dateRangeMode, customStartDate?.toISOString(), customEndDate?.toISOString()],
    queryFn: async () => {
      console.log('[ConsumptionProvider] ========== FETCHING ELECTRICITY CONSUMPTION ==========');
      
      if (!electricityMpan || electricitySerialNumbers.length === 0 || !apiKey) {
        console.log('[ConsumptionProvider] Missing required params, returning null');
        return null;
      }
      
      const { start: startDate, end: endDate } = getDateRangeForMode();
      
      const result = await fetchConsumptionForSerials(
        electricityMpan,
        electricitySerialNumbers,
        apiKey,
        'electricity',
        startDate,
        endDate
      );
      
      if (result) {
        result.results = result.results.filter(entry => {
          const entryStart = new Date(entry.interval_start);
          return entryStart >= startDate && entryStart < endDate;
        });
        console.log('[ConsumptionProvider] Electricity consumption after filtering:', result.results.length);
      }
      
      return result;
    },
    enabled: !!electricityMpan && electricitySerialNumbers.length > 0 && !!apiKey,
    staleTime: 30 * 60 * 1000,
  });

  const gasConsumptionQuery = useQuery({
    queryKey: ['gas-consumption', gasMprn, gasSerialNumbers, apiKey, dateRangeDays, dateRangeMode, customStartDate?.toISOString(), customEndDate?.toISOString(), gasCv],
    queryFn: async () => {
      if (!gasMprn || gasSerialNumbers.length === 0 || !apiKey) {
        return null;
      }
      const { start: startDate, end: endDate } = getDateRangeForMode();
      
      const result = await fetchConsumptionForSerials(
        gasMprn,
        gasSerialNumbers,
        apiKey,
        'gas',
        startDate,
        endDate
      );
      
      if (result) {
        result.results = result.results.filter(entry => {
          const entryStart = new Date(entry.interval_start);
          return entryStart >= startDate && entryStart < endDate;
        });
        
        // Convert m3 to kWh using formula: (m3 * VCF * CV) / CF = kWh
        result.results = result.results.map(entry => ({
          ...entry,
          consumption: (entry.consumption * GAS_VCF * gasCv) / GAS_CF,
        }));
        
        console.log('[ConsumptionProvider] Gas consumption after filtering and conversion:', result.results.length);
      }
      
      return result;
    },
    enabled: !!gasMprn && gasSerialNumbers.length > 0 && !!apiKey,
    staleTime: 30 * 60 * 1000,
  });

  const electricityTariffRatesQuery = useQuery({
    queryKey: ['electricity-rates-for-consumption', selectedRegion, selectedElectricityTariff?.productCode, dateRangeDays, dateRangeMode, customStartDate?.toISOString(), customEndDate?.toISOString()],
    queryFn: async (): Promise<ProcessedRate[]> => {
      console.log('[ConsumptionProvider] ========== FETCHING ELECTRICITY TARIFF RATES ==========');
      console.log('[ConsumptionProvider] selectedRegion:', selectedRegion);
      console.log('[ConsumptionProvider] selectedElectricityTariff:', selectedElectricityTariff?.productCode);
      
      const productCode = selectedElectricityTariff?.productCode || DEFAULT_PRODUCT_CODE;
      
      const { start: dateRangeStart } = getDateRangeForMode();
      const startDate = new Date(dateRangeStart);
      startDate.setDate(startDate.getDate() - 5);
      startDate.setHours(0, 0, 0, 0);
      
      try {
        const data = await fetchEnergyRates(
          selectedRegion,
          productCode,
          startDate.toISOString(),
          undefined,
          'electricity'
        );
        
        const processed = processRates(data, false);
        
        if (processed.length === 0) {
          console.warn('[ConsumptionProvider] No electricity rates returned, trying without date filter');
          const allData = await fetchEnergyRates(
            selectedRegion,
            productCode,
            undefined,
            undefined,
            'electricity'
          );
          return processRates(allData, false);
        }
        
        return processed;
      } catch (error) {
        console.error('[ConsumptionProvider] ERROR fetching electricity tariff rates:', error);
        return [];
      }
    },
    enabled: !!selectedElectricityTariff?.productCode && !!electricityConsumptionQuery.data,
    staleTime: 30 * 60 * 1000,
  });

  const comparisonElectricityRatesQuery = useQuery({
    queryKey: ['consumption-comparison-electricity-rates', selectedRegion, electricityComparisonTariff, dateRangeDays, dateRangeMode, customStartDate?.toISOString(), customEndDate?.toISOString(), isFlexibleElectricityComparison],
    queryFn: async (): Promise<ProcessedRate[]> => {
      if (isFlexibleElectricityComparison) {
        return [];
      }
      console.log('[ConsumptionProvider] ========== FETCHING COMPARISON ELECTRICITY TARIFF RATES ==========');
      
      const { start: dateRangeStart } = getDateRangeForMode();
      const startDate = new Date(dateRangeStart);
      startDate.setDate(startDate.getDate() - 5);
      startDate.setHours(0, 0, 0, 0);
      
      return fetchComparisonTariffRates(
        selectedRegion,
        electricityComparisonTariff,
        'electricity',
        startDate.toISOString(),
        undefined
      );
    },
    enabled: !isFlexibleElectricityComparison && !!electricityConsumptionQuery.data && !!selectedRegion,
    staleTime: 30 * 60 * 1000,
  });

  const gasTariffRatesQuery = useQuery({
    queryKey: ['gas-rates-for-consumption', selectedRegion, selectedGasTariff?.productCode, dateRangeDays, dateRangeMode, customStartDate?.toISOString(), customEndDate?.toISOString()],
    queryFn: async () => {
      console.log('[ConsumptionProvider] ========== FETCHING GAS RATES ==========');
      
      const productCode = selectedGasTariff?.productCode || GAS_TRACKER_PRODUCT;
      
      const { start: dateRangeStart } = getDateRangeForMode();
      const startDate = new Date(dateRangeStart);
      startDate.setDate(startDate.getDate() - 5);
      startDate.setHours(0, 0, 0, 0);
      
      if (productCode.includes('SILVER') || productCode.includes('TRACKER')) {
        const data = await fetchGasTrackerRates(
          selectedRegion,
          startDate.toISOString(),
          undefined
        );
        return processRates(data, true);
      }
      
      const data = await fetchEnergyRates(
        selectedRegion,
        productCode,
        startDate.toISOString(),
        undefined,
        'gas'
      );
      return processRates(data, true);
    },
    enabled: !!gasConsumptionQuery.data && !!selectedRegion,
    staleTime: 30 * 60 * 1000,
  });

  const comparisonGasRatesQuery = useQuery({
    queryKey: ['consumption-comparison-gas-rates', selectedRegion, gasComparisonTariff, dateRangeDays, dateRangeMode, customStartDate?.toISOString(), customEndDate?.toISOString(), isFlexibleGasComparison],
    queryFn: async (): Promise<ProcessedRate[]> => {
      if (isFlexibleGasComparison) {
        return [];
      }
      
      console.log('[ConsumptionProvider] ========== FETCHING COMPARISON GAS TARIFF RATES ==========');
      
      const { start: dateRangeStart } = getDateRangeForMode();
      const startDate = new Date(dateRangeStart);
      startDate.setDate(startDate.getDate() - 5);
      startDate.setHours(0, 0, 0, 0);
      
      try {
        return await fetchComparisonTariffRates(
          selectedRegion,
          gasComparisonTariff,
          'gas',
          startDate.toISOString(),
          undefined
        );
      } catch {
        console.log('[ConsumptionProvider] Gas comparison tariff not found');
        return [];
      }
    },
    enabled: !isFlexibleGasComparison && !!gasConsumptionQuery.data && !!selectedRegion,
    staleTime: 30 * 60 * 1000,
  });

  // Fetch historical electricity tariff rates for each agreement period in the date range
  const historicalElectricityRatesQuery = useQuery({
    queryKey: ['historical-electricity-rates', selectedRegion, accountData?.electricity?.agreements, dateRangeMode, customStartDate?.toISOString(), customEndDate?.toISOString()],
    queryFn: async (): Promise<TariffPeriodRates[]> => {
      const agreements = accountData?.electricity?.agreements;
      if (!agreements || agreements.length === 0) return [];
      
      const { start: rangeStart, end: rangeEnd } = getDateRangeForMode();
      console.log('[ConsumptionProvider] Fetching historical electricity rates for range:', rangeStart, 'to', rangeEnd);
      
      // Find all agreements that overlap with the date range
      const relevantAgreements = agreements.filter(a => {
        const agreementStart = a.validFrom;
        const agreementEnd = a.validTo || new Date();
        return agreementStart < rangeEnd && agreementEnd > rangeStart;
      });
      
      console.log('[ConsumptionProvider] Relevant electricity agreements:', relevantAgreements.length);
      
      const periodRates: TariffPeriodRates[] = [];
      
      for (const agreement of relevantAgreements) {
        const periodStart = new Date(Math.max(agreement.validFrom.getTime(), rangeStart.getTime()));
        periodStart.setDate(periodStart.getDate() - 5); // Buffer for rate matching
        const periodEnd = agreement.validTo ? new Date(Math.min(agreement.validTo.getTime(), rangeEnd.getTime())) : rangeEnd;
        
        try {
          console.log(`[ConsumptionProvider] Fetching rates for ${agreement.productCode} from ${periodStart} to ${periodEnd}`);
          
          const data = await fetchEnergyRates(
            selectedRegion,
            agreement.productCode,
            periodStart.toISOString(),
            periodEnd.toISOString(),
            'electricity'
          );
          
          const rates = processRates(data, false);
          const standingCharge = await fetchStandingCharge(agreement.productCode, selectedRegion, 'electricity');
          
          periodRates.push({
            productCode: agreement.productCode,
            validFrom: agreement.validFrom,
            validTo: agreement.validTo,
            rates,
            standingCharge,
          });
          
          console.log(`[ConsumptionProvider] Got ${rates.length} rates for ${agreement.productCode}`);
        } catch (error) {
          console.error(`[ConsumptionProvider] Failed to fetch rates for ${agreement.productCode}:`, error);
        }
      }
      
      return periodRates;
    },
    enabled: !!accountData?.electricity?.agreements && accountData.electricity.agreements.length > 0 && !!electricityConsumptionQuery.data,
    staleTime: 30 * 60 * 1000,
  });

  // Fetch historical gas tariff rates for each agreement period in the date range
  const historicalGasRatesQuery = useQuery({
    queryKey: ['historical-gas-rates', selectedRegion, accountData?.gas?.agreements, dateRangeMode, customStartDate?.toISOString(), customEndDate?.toISOString()],
    queryFn: async (): Promise<TariffPeriodRates[]> => {
      const agreements = accountData?.gas?.agreements;
      if (!agreements || agreements.length === 0) return [];
      
      const { start: rangeStart, end: rangeEnd } = getDateRangeForMode();
      console.log('[ConsumptionProvider] Fetching historical gas rates for range:', rangeStart, 'to', rangeEnd);
      
      const relevantAgreements = agreements.filter(a => {
        const agreementStart = a.validFrom;
        const agreementEnd = a.validTo || new Date();
        return agreementStart < rangeEnd && agreementEnd > rangeStart;
      });
      
      console.log('[ConsumptionProvider] Relevant gas agreements:', relevantAgreements.length);
      
      const periodRates: TariffPeriodRates[] = [];
      
      for (const agreement of relevantAgreements) {
        const periodStart = new Date(Math.max(agreement.validFrom.getTime(), rangeStart.getTime()));
        periodStart.setDate(periodStart.getDate() - 5);
        const periodEnd = agreement.validTo ? new Date(Math.min(agreement.validTo.getTime(), rangeEnd.getTime())) : rangeEnd;
        
        try {
          console.log(`[ConsumptionProvider] Fetching gas rates for ${agreement.productCode} from ${periodStart} to ${periodEnd}`);
          
          let data;
          if (agreement.productCode.includes('SILVER') || agreement.productCode.includes('TRACKER')) {
            data = await fetchGasTrackerRates(selectedRegion, periodStart.toISOString(), periodEnd.toISOString());
          } else {
            data = await fetchEnergyRates(
              selectedRegion,
              agreement.productCode,
              periodStart.toISOString(),
              periodEnd.toISOString(),
              'gas'
            );
          }
          
          const rates = processRates(data, true);
          const standingCharge = await fetchStandingCharge(agreement.productCode, selectedRegion, 'gas');
          
          periodRates.push({
            productCode: agreement.productCode,
            validFrom: agreement.validFrom,
            validTo: agreement.validTo,
            rates,
            standingCharge,
          });
          
          console.log(`[ConsumptionProvider] Got ${rates.length} gas rates for ${agreement.productCode}`);
        } catch (error) {
          console.error(`[ConsumptionProvider] Failed to fetch gas rates for ${agreement.productCode}:`, error);
        }
      }
      
      return periodRates;
    },
    enabled: !!accountData?.gas?.agreements && accountData.gas.agreements.length > 0 && !!gasConsumptionQuery.data,
    staleTime: 30 * 60 * 1000,
  });

  // Calculate the effective standing charge based on which tariff was active during the selected date range
  const effectiveElectricityStandingCharge = useMemo(() => {
    const historicalPeriods = historicalElectricityRatesQuery.data;
    if (!historicalPeriods || historicalPeriods.length === 0) {
      return currentElectricityStandingChargeQuery.data ?? null;
    }
    
    const { start: rangeStart } = getDateRangeForMode();
    
    // Find the period that covers the start of the date range
    const relevantPeriod = historicalPeriods.find(p => {
      const periodEnd = p.validTo || new Date();
      return p.validFrom <= rangeStart && periodEnd > rangeStart;
    });
    
    if (relevantPeriod && relevantPeriod.standingCharge !== null) {
      console.log(`[ConsumptionProvider] Using historical electricity standing charge: ${relevantPeriod.standingCharge}p for ${relevantPeriod.productCode}`);
      return relevantPeriod.standingCharge;
    }
    
    // If the first historical period starts after the range start, use its standing charge
    if (historicalPeriods.length > 0) {
      const sortedPeriods = [...historicalPeriods].sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
      const firstPeriod = sortedPeriods[0];
      if (firstPeriod.standingCharge !== null) {
        console.log(`[ConsumptionProvider] Using first historical electricity standing charge: ${firstPeriod.standingCharge}p for ${firstPeriod.productCode}`);
        return firstPeriod.standingCharge;
      }
    }
    
    return currentElectricityStandingChargeQuery.data ?? null;
  }, [historicalElectricityRatesQuery.data, currentElectricityStandingChargeQuery.data, getDateRangeForMode]);

  const effectiveGasStandingCharge = useMemo(() => {
    const historicalPeriods = historicalGasRatesQuery.data;
    if (!historicalPeriods || historicalPeriods.length === 0) {
      return currentGasStandingChargeQuery.data ?? null;
    }
    
    const { start: rangeStart } = getDateRangeForMode();
    
    // Find the period that covers the start of the date range
    const relevantPeriod = historicalPeriods.find(p => {
      const periodEnd = p.validTo || new Date();
      return p.validFrom <= rangeStart && periodEnd > rangeStart;
    });
    
    if (relevantPeriod && relevantPeriod.standingCharge !== null) {
      console.log(`[ConsumptionProvider] Using historical gas standing charge: ${relevantPeriod.standingCharge}p for ${relevantPeriod.productCode}`);
      return relevantPeriod.standingCharge;
    }
    
    // If the first historical period starts after the range start, use its standing charge
    if (historicalPeriods.length > 0) {
      const sortedPeriods = [...historicalPeriods].sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
      const firstPeriod = sortedPeriods[0];
      if (firstPeriod.standingCharge !== null) {
        console.log(`[ConsumptionProvider] Using first historical gas standing charge: ${firstPeriod.standingCharge}p for ${firstPeriod.productCode}`);
        return firstPeriod.standingCharge;
      }
    }
    
    return currentGasStandingChargeQuery.data ?? null;
  }, [historicalGasRatesQuery.data, currentGasStandingChargeQuery.data, getDateRangeForMode]);

  const findBestRate = useCallback((rates: ProcessedRate[], intervalStart: Date): ProcessedRate | null => {
    const exactMatch = rates.find(r => 
      r.validFrom <= intervalStart && r.validTo > intervalStart
    );
    if (exactMatch) return exactMatch;
    
    const intervalDay = new Date(intervalStart);
    intervalDay.setHours(0, 0, 0, 0);
    
    const dayMatch = rates.find(r => {
      const rateDay = new Date(r.validFrom);
      rateDay.setHours(0, 0, 0, 0);
      return rateDay.getTime() === intervalDay.getTime();
    });
    if (dayMatch) return dayMatch;
    
    const sortedRates = [...rates].sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
    const mostRecentBefore = sortedRates.find(r => r.validFrom <= intervalStart);
    if (mostRecentBefore) return mostRecentBefore;
    
    if (rates.length > 0) {
      const oldestFirst = [...rates].sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
      return oldestFirst[0];
    }
    
    return null;
  }, []);

  // Find the correct tariff period and rate for a given date
  const findRateFromPeriods = useCallback((periods: TariffPeriodRates[], intervalStart: Date): { rate: ProcessedRate | null; standingCharge: number | null } => {
    // Find the period that covers this interval
    const period = periods.find(p => {
      const periodEnd = p.validTo || new Date();
      return p.validFrom <= intervalStart && periodEnd > intervalStart;
    });
    
    if (!period) {
      // Fallback to any period that has rates for this date
      for (const p of periods) {
        const rate = findBestRate(p.rates, intervalStart);
        if (rate) {
          return { rate, standingCharge: p.standingCharge };
        }
      }
      return { rate: null, standingCharge: null };
    }
    
    const rate = findBestRate(period.rates, intervalStart);
    return { rate, standingCharge: period.standingCharge };
  }, [findBestRate]);

  // Check if comparison tariff was available during the date range
  const checkComparisonAvailability = useCallback((comparisonRates: ProcessedRate[], rangeStart: Date, rangeEnd: Date): ComparisonAvailability => {
    if (!comparisonRates || comparisonRates.length === 0) {
      return {
        isAvailable: false,
        availableFrom: null,
        missingPeriods: [{ from: rangeStart, to: rangeEnd }],
      };
    }
    
    // Sort rates by date
    const sortedRates = [...comparisonRates].sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
    const earliestRate = sortedRates[0];
    
    const missingPeriods: { from: Date; to: Date }[] = [];
    
    // Check if rates don't cover the start of the range
    if (earliestRate.validFrom > rangeStart) {
      missingPeriods.push({
        from: rangeStart,
        to: new Date(Math.min(earliestRate.validFrom.getTime(), rangeEnd.getTime())),
      });
    }
    
    return {
      isAvailable: missingPeriods.length === 0,
      availableFrom: earliestRate.validFrom,
      missingPeriods,
    };
  }, []);

  const processDailyConsumptionWithHistoricalRates = useCallback((
    consumption: ConsumptionEntry[],
    historicalPeriods: TariffPeriodRates[],
    comparisonRates: ProcessedRate[] | null,
    flexibleRate: number | null,
    fuelType: string,
    useFlexibleRate: boolean,
    comparisonStandingCharge: number | null
  ): DailyConsumption[] => {
    console.log(`[ConsumptionProvider] ========== PROCESSING ${fuelType.toUpperCase()} DAILY CONSUMPTION WITH HISTORICAL RATES ==========`);
    console.log(`[ConsumptionProvider] Historical periods: ${historicalPeriods.length}`);
    console.log(`[ConsumptionProvider] Comparison rates available: ${comparisonRates ? comparisonRates.length : 0}`);
    console.log(`[ConsumptionProvider] Use flexible rate: ${useFlexibleRate}, Flexible rate: ${flexibleRate}`);
    
    // Track standing charge per day based on which tariff was active
    const dailyMap = new Map<string, { entries: ConsumptionEntryWithRate[]; standingCharge: number | null }>();
    
    consumption.forEach(entry => {
      const date = new Date(entry.interval_start);
      const dateKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      
      const intervalStart = new Date(entry.interval_start);
      const { rate: matchedRate, standingCharge } = findRateFromPeriods(historicalPeriods, intervalStart);
      
      const roundedConsumption = roundHalfToEven(entry.consumption);
      const entryCost = matchedRate ? roundedConsumption * (matchedRate.price / 100) : 0;
      
      // Calculate comparison rate for this entry
      let comparisonRateForEntry: number | null = null;
      if (useFlexibleRate && flexibleRate !== null) {
        comparisonRateForEntry = flexibleRate;
      } else if (comparisonRates && comparisonRates.length > 0) {
        const matchedComparisonRate = findBestRate(comparisonRates, intervalStart);
        if (matchedComparisonRate) {
          comparisonRateForEntry = matchedComparisonRate.price;
        }
      }
      
      const entryWithRate: ConsumptionEntryWithRate = {
        ...entry,
        rate: matchedRate ? matchedRate.price : null,
        cost: entryCost,
        flexibleRate: comparisonRateForEntry,
      };
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { entries: [], standingCharge });
      }
      dailyMap.get(dateKey)?.entries.push(entryWithRate);
      // Update standing charge if we found one for this entry
      if (standingCharge !== null) {
        const dayData = dailyMap.get(dateKey);
        if (dayData) {
          dayData.standingCharge = standingCharge;
        }
      }
    });

    const dailyConsumption: DailyConsumption[] = [];

    dailyMap.forEach((dayData, date) => {
      const { entries, standingCharge: dayStandingCharge } = dayData;
      const totalConsumption = entries.reduce((sum, e) => sum + e.consumption, 0);
      let cost = entries.reduce((sum, e) => sum + e.cost, 0);
      
      // Add the standing charge for the tariff that was active on this day
      if (dayStandingCharge !== null) {
        cost += dayStandingCharge / 100;
      }

      let comparisonCost = 0;
      // Only calculate comparison cost if we have valid comparison data
      if (useFlexibleRate && flexibleRate) {
        comparisonCost = totalConsumption * (flexibleRate / 100);
        if (comparisonStandingCharge !== null) {
          comparisonCost += comparisonStandingCharge / 100;
        }
      } else if (comparisonRates && comparisonRates.length > 0) {
        entries.forEach(entry => {
          const intervalStart = new Date(entry.interval_start);
          const matchedComparisonRate = findBestRate(comparisonRates, intervalStart);
          if (matchedComparisonRate) {
            const roundedConsumption = roundHalfToEven(entry.consumption);
            comparisonCost += roundedConsumption * (matchedComparisonRate.price / 100);
          }
        });
        if (comparisonStandingCharge !== null) {
          comparisonCost += comparisonStandingCharge / 100;
        }
      } else {
        // No comparison data available - set comparison cost equal to actual cost (no difference)
        comparisonCost = cost;
        console.log(`[ConsumptionProvider] No comparison rates available for ${date}, setting comparison cost equal to actual cost`);
      }
      
      const difference = comparisonCost - cost;

      dailyConsumption.push({
        date,
        totalConsumption,
        cost,
        flexibleCost: comparisonCost,
        difference,
        entries,
      });
    });

    return dailyConsumption.sort((a, b) => {
      const dateA = new Date(a.entries[0].interval_start);
      const dateB = new Date(b.entries[0].interval_start);
      return dateB.getTime() - dateA.getTime();
    });
  }, [findBestRate, findRateFromPeriods]);

  const electricityDailyConsumption = useMemo(() => {
    if (!electricityConsumptionQuery.data?.results) return [];
    
    // Use historical rates if available, otherwise fall back to single tariff rates
    const historicalPeriods = historicalElectricityRatesQuery.data;
    if (!historicalPeriods || historicalPeriods.length === 0) {
      if (!electricityTariffRatesQuery.data) return [];
      // Fallback to single period
      const singlePeriod: TariffPeriodRates[] = [{
        productCode: selectedElectricityTariff?.productCode || DEFAULT_PRODUCT_CODE,
        validFrom: new Date(0),
        validTo: null,
        rates: electricityTariffRatesQuery.data,
        standingCharge: currentElectricityStandingChargeQuery.data ?? null,
      }];
      
      const useFlexible = isFlexibleElectricityComparison;
      if (useFlexible && !flexibleElectricityRate) return [];
      
      // If comparison rates aren't available (new tariff or API error), still process with empty comparison
      // This prevents the entire usage view from being blank
      const comparisonRates = (!useFlexible && comparisonElectricityRatesQuery.data) ? comparisonElectricityRatesQuery.data : null;
      
      return processDailyConsumptionWithHistoricalRates(
        electricityConsumptionQuery.data.results,
        singlePeriod,
        useFlexible ? null : comparisonRates,
        flexibleElectricityRate,
        'electricity',
        useFlexible,
        comparisonElectricityStandingChargeQuery.data ?? null
      );
    }
    
    const useFlexible = isFlexibleElectricityComparison;
    if (useFlexible && !flexibleElectricityRate) return [];
    
    // If comparison rates aren't available (new tariff or API error), still process with empty comparison
    const comparisonRates = (!useFlexible && comparisonElectricityRatesQuery.data) ? comparisonElectricityRatesQuery.data : null;
    
    return processDailyConsumptionWithHistoricalRates(
      electricityConsumptionQuery.data.results,
      historicalPeriods,
      useFlexible ? null : comparisonRates,
      flexibleElectricityRate,
      'electricity',
      useFlexible,
      comparisonElectricityStandingChargeQuery.data ?? null
    );
  }, [electricityConsumptionQuery.data, historicalElectricityRatesQuery.data, electricityTariffRatesQuery.data, flexibleElectricityRate, isFlexibleElectricityComparison, comparisonElectricityRatesQuery.data, currentElectricityStandingChargeQuery.data, comparisonElectricityStandingChargeQuery.data, selectedElectricityTariff, processDailyConsumptionWithHistoricalRates]);

  const gasDailyConsumption = useMemo(() => {
    if (!gasConsumptionQuery.data?.results) return [];
    
    // Use historical rates if available
    const historicalPeriods = historicalGasRatesQuery.data;
    if (!historicalPeriods || historicalPeriods.length === 0) {
      if (!gasTariffRatesQuery.data) return [];
      // Fallback to single period
      const singlePeriod: TariffPeriodRates[] = [{
        productCode: selectedGasTariff?.productCode || GAS_TRACKER_PRODUCT,
        validFrom: new Date(0),
        validTo: null,
        rates: gasTariffRatesQuery.data,
        standingCharge: currentGasStandingChargeQuery.data ?? null,
      }];
      
      const useFlexibleForGas = isFlexibleGasComparison;
      if (useFlexibleForGas && !flexibleGasRate) return [];
      
      // If comparison rates aren't available (new tariff or API error), still process with empty comparison
      const comparisonRates = (!useFlexibleForGas && comparisonGasRatesQuery.data) ? comparisonGasRatesQuery.data : null;
      
      return processDailyConsumptionWithHistoricalRates(
        gasConsumptionQuery.data.results,
        singlePeriod,
        useFlexibleForGas ? null : comparisonRates,
        flexibleGasRate,
        'gas',
        useFlexibleForGas,
        comparisonGasStandingChargeQuery.data ?? null
      );
    }
    
    const useFlexibleForGas = isFlexibleGasComparison;
    if (useFlexibleForGas && !flexibleGasRate) return [];
    
    // If comparison rates aren't available (new tariff or API error), still process with empty comparison
    const comparisonRates = (!useFlexibleForGas && comparisonGasRatesQuery.data) ? comparisonGasRatesQuery.data : null;
    
    return processDailyConsumptionWithHistoricalRates(
      gasConsumptionQuery.data.results,
      historicalPeriods,
      useFlexibleForGas ? null : comparisonRates,
      flexibleGasRate,
      'gas',
      useFlexibleForGas,
      comparisonGasStandingChargeQuery.data ?? null
    );
  }, [gasConsumptionQuery.data, historicalGasRatesQuery.data, gasTariffRatesQuery.data, flexibleGasRate, isFlexibleGasComparison, comparisonGasRatesQuery.data, currentGasStandingChargeQuery.data, comparisonGasStandingChargeQuery.data, selectedGasTariff, processDailyConsumptionWithHistoricalRates]);

  // Calculate comparison tariff availability
  const electricityComparisonAvailability = useMemo((): ComparisonAvailability => {
    if (isFlexibleElectricityComparison) {
      return { isAvailable: true, availableFrom: null, missingPeriods: [] };
    }
    if (!comparisonElectricityRatesQuery.data) {
      return { isAvailable: false, availableFrom: null, missingPeriods: [] };
    }
    const { start, end } = getDateRangeForMode();
    return checkComparisonAvailability(comparisonElectricityRatesQuery.data, start, end);
  }, [isFlexibleElectricityComparison, comparisonElectricityRatesQuery.data, getDateRangeForMode, checkComparisonAvailability]);

  const gasComparisonAvailability = useMemo((): ComparisonAvailability => {
    if (isFlexibleGasComparison) {
      return { isAvailable: true, availableFrom: null, missingPeriods: [] };
    }
    if (!comparisonGasRatesQuery.data) {
      return { isAvailable: false, availableFrom: null, missingPeriods: [] };
    }
    const { start, end } = getDateRangeForMode();
    return checkComparisonAvailability(comparisonGasRatesQuery.data, start, end);
  }, [isFlexibleGasComparison, comparisonGasRatesQuery.data, getDateRangeForMode, checkComparisonAvailability]);

  const hasAccountData = !!accountData;
  const isConfigured = hasAccountData && !!apiKey;

  return {
    apiKey,
    setApiKey: saveApiKeyMutation.mutate,
    accountNumber,
    setAccountNumber: saveAccountNumberMutation.mutate,
    accountData,
    fetchAndSaveAccountData,
    isAccountLoading,
    accountError,
    hasAccountData,
    isConfigured,
    movedInAt,
    
    selectedRegion,
    electricityMpan,
    gasMprn,
    electricitySerialNumbers,
    gasSerialNumbers,
    
    electricityAgreements: accountData?.electricity?.agreements || [],
    gasAgreements: accountData?.gas?.agreements || [],
    selectedElectricityTariff,
    selectedGasTariff,
    setSelectedElectricityTariff: saveSelectedElectricityTariffMutation.mutate,
    setSelectedGasTariff: saveSelectedGasTariffMutation.mutate,
    
    electricityComparisonTariff,
    gasComparisonTariff,
    setElectricityComparisonTariff: saveElectricityComparisonTariffMutation.mutate,
    setGasComparisonTariff: saveGasComparisonTariffMutation.mutate,
    
    gasCv,
    setGasCv: saveGasCvMutation.mutate,
    
    electricityDailyConsumption,
    gasDailyConsumption,
    isLoadingElectricity: electricityConsumptionQuery.isLoading || electricityTariffRatesQuery.isLoading,
    isLoadingGas: gasConsumptionQuery.isLoading || gasTariffRatesQuery.isLoading,
    refetchElectricityConsumption: electricityConsumptionQuery.refetch,
    refetchGasConsumption: gasConsumptionQuery.refetch,
    dateRangeDays,
    setDateRangeDays,
    dateRangeMode,
    setDateRangeMode,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    showGas,
    setShowGas: saveShowGasMutation.mutate,
    currentElectricityStandingCharge: effectiveElectricityStandingCharge,
    currentGasStandingCharge: effectiveGasStandingCharge,
    comparisonElectricityStandingCharge: comparisonElectricityStandingChargeQuery.data || null,
    comparisonGasStandingCharge: comparisonGasStandingChargeQuery.data || null,
    electricityComparisonAvailability,
    gasComparisonAvailability,
  };
});
