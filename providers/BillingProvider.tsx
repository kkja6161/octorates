import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchAccountBalance } from '@/services/energyApi';
import { EstimatedBilling } from '@/types/energy';
import { useConsumption } from './ConsumptionProvider';

export const [BillingProvider, useBilling] = createContextHook(() => {
  const { 
    apiKey, 
    accountNumber, 
    accountData,
    showGas,
    electricityDailyConsumption,
    gasDailyConsumption,
    isLoadingElectricity,
    isLoadingGas,
  } = useConsumption();

  const [electricityBillingStartDate, setElectricityBillingStartDate] = useState<Date | null>(null);
  const [gasBillingStartDate, setGasBillingStartDate] = useState<Date | null>(null);

  useEffect(() => {
    const loadBillingDates = async () => {
      try {
        const elecDate = await AsyncStorage.getItem('@billing:electricity_start_date');
        const gasDate = await AsyncStorage.getItem('@billing:gas_start_date');
        
        if (elecDate) {
          setElectricityBillingStartDate(new Date(elecDate));
          console.log('[Billing] Loaded electricity billing start date:', elecDate);
        }
        if (gasDate) {
          setGasBillingStartDate(new Date(gasDate));
          console.log('[Billing] Loaded gas billing start date:', gasDate);
        }
      } catch (error) {
        console.error('[Billing] Error loading billing dates:', error);
      }
    };
    
    loadBillingDates();
  }, []);

  const updateElectricityBillingStartDate = async (date: Date) => {
    try {
      await AsyncStorage.setItem('@billing:electricity_start_date', date.toISOString());
      setElectricityBillingStartDate(date);
      console.log('[Billing] Saved electricity billing start date:', date.toISOString());
    } catch (error) {
      console.error('[Billing] Error saving electricity billing date:', error);
    }
  };

  const updateGasBillingStartDate = async (date: Date) => {
    try {
      await AsyncStorage.setItem('@billing:gas_start_date', date.toISOString());
      setGasBillingStartDate(date);
      console.log('[Billing] Saved gas billing start date:', date.toISOString());
    } catch (error) {
      console.error('[Billing] Error saving gas billing date:', error);
    }
  };

  const balanceQuery = useQuery({
    queryKey: ['account-balance', accountNumber, apiKey],
    queryFn: async () => {
      if (!accountNumber || !apiKey) {
        return null;
      }
      try {
        return await fetchAccountBalance(accountNumber, apiKey);
      } catch (error) {
        console.error('[Billing] Error fetching account balance:', error);
        return null;
      }
    },
    enabled: !!accountNumber && !!apiKey,
    staleTime: 5 * 60 * 1000,
  });

  const estimatedBilling = useMemo((): EstimatedBilling | null => {
    console.log('[Billing] ========== CALCULATING ESTIMATED BILLING FROM USAGE DATA ==========');
    
    if (!accountData) {
      console.log('[Billing] No account data available');
      return null;
    }

    let electricityEstimate = null;
    let gasEstimate = null;

    if (electricityDailyConsumption && electricityDailyConsumption.length > 0) {
      console.log(`[Billing] Processing ${electricityDailyConsumption.length} days of electricity data from usage tab`);
      
      let totalConsumption = 0;
      let totalCost = 0;
      let filteredDays = electricityDailyConsumption;

      if (electricityBillingStartDate) {
        console.log('[Billing] Filtering electricity data from billing start date:', electricityBillingStartDate.toISOString());
        filteredDays = electricityDailyConsumption.filter(day => {
          if (day.entries.length === 0) return false;
          const dayDate = new Date(day.entries[0].interval_start);
          return dayDate >= electricityBillingStartDate;
        });
        console.log(`[Billing] Filtered to ${filteredDays.length} days after billing start date`);
      }

      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;

      filteredDays.forEach(day => {
        if (day.entries.length > 0) {
          totalConsumption += day.totalConsumption;
          totalCost += day.cost;
          
          const dayDate = new Date(day.entries[0].interval_start);
          if (!oldestDate || dayDate < oldestDate) {
            oldestDate = dayDate;
          }
          if (!newestDate || dayDate > newestDate) {
            newestDate = dayDate;
          }
        }
      });

      console.log(`[Billing] Electricity: ${filteredDays.length} days processed`);
      console.log(`[Billing] Electricity: Total consumption = ${totalConsumption.toFixed(2)} kWh`);
      console.log(`[Billing] Electricity: Total cost (inc. standing charge) = £${totalCost.toFixed(2)}`);
      
      if (oldestDate && newestDate) {
        const oldest = oldestDate as Date;
        const newest = newestDate as Date;
        console.log(`[Billing] Electricity: Period from ${oldest.toISOString()} to ${newest.toISOString()}`);
      }

      if (filteredDays.length > 0 && totalConsumption > 0) {
        const periodStart = electricityBillingStartDate || oldestDate || new Date();
        const periodEnd = newestDate || new Date();
        
        electricityEstimate = {
          consumption: totalConsumption,
          cost: totalCost,
          standingCharge: 0,
          totalCost: totalCost,
          periodStart,
          periodEnd,
        };
      }
    } else {
      console.log('[Billing] No electricity daily consumption data available');
    }

    if (showGas && gasDailyConsumption && gasDailyConsumption.length > 0) {
      console.log(`[Billing] Processing ${gasDailyConsumption.length} days of gas data from usage tab`);
      
      let totalConsumption = 0;
      let totalCost = 0;
      let filteredDays = gasDailyConsumption;

      if (gasBillingStartDate) {
        console.log('[Billing] Filtering gas data from billing start date:', gasBillingStartDate.toISOString());
        filteredDays = gasDailyConsumption.filter(day => {
          if (day.entries.length === 0) return false;
          const dayDate = new Date(day.entries[0].interval_start);
          return dayDate >= gasBillingStartDate;
        });
        console.log(`[Billing] Filtered to ${filteredDays.length} days after billing start date`);
      }

      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;

      filteredDays.forEach(day => {
        if (day.entries.length > 0) {
          totalConsumption += day.totalConsumption;
          totalCost += day.cost;
          
          const dayDate = new Date(day.entries[0].interval_start);
          if (!oldestDate || dayDate < oldestDate) {
            oldestDate = dayDate;
          }
          if (!newestDate || dayDate > newestDate) {
            newestDate = dayDate;
          }
        }
      });

      console.log(`[Billing] Gas: ${filteredDays.length} days processed`);
      console.log(`[Billing] Gas: Total consumption = ${totalConsumption.toFixed(2)} kWh`);
      console.log(`[Billing] Gas: Total cost (inc. standing charge) = £${totalCost.toFixed(2)}`);
      
      if (oldestDate && newestDate) {
        const oldest = oldestDate as Date;
        const newest = newestDate as Date;
        console.log(`[Billing] Gas: Period from ${oldest.toISOString()} to ${newest.toISOString()}`);
      }

      if (filteredDays.length > 0 && totalConsumption > 0) {
        const periodStart = gasBillingStartDate || oldestDate || new Date();
        const periodEnd = newestDate || new Date();
        
        gasEstimate = {
          consumption: totalConsumption,
          cost: totalCost,
          standingCharge: 0,
          totalCost: totalCost,
          periodStart,
          periodEnd,
        };
      }
    } else if (showGas) {
      console.log('[Billing] No gas daily consumption data available');
    }

    const totalEstimatedCost = 
      (electricityEstimate?.totalCost || 0) + 
      (gasEstimate?.totalCost || 0);

    console.log(`[Billing] Total estimated cost: £${totalEstimatedCost.toFixed(2)}`);

    return {
      electricity: electricityEstimate,
      gas: gasEstimate,
      totalEstimatedCost,
    };
  }, [accountData, electricityDailyConsumption, gasDailyConsumption, showGas, electricityBillingStartDate, gasBillingStartDate]);

  const accountBalance = useMemo(() => {
    return balanceQuery.data?.balance ?? null;
  }, [balanceQuery.data]);

  const isLoading = balanceQuery.isLoading || isLoadingElectricity || isLoadingGas;

  const refetch = () => {
    balanceQuery.refetch();
  };

  return {
    accountBalance,
    estimatedBilling,
    isLoading,
    refetch,
    electricityBillingStartDate,
    gasBillingStartDate,
    updateElectricityBillingStartDate,
    updateGasBillingStartDate,
  };
});
