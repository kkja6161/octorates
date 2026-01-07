import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchAccountBalance, fetchLastBillDate } from '@/services/energyApi';
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

  const lastBillDateQuery = useQuery({
    queryKey: ['last-bill-date', accountNumber, apiKey],
    queryFn: async () => {
      if (!accountNumber || !apiKey) {
        return null;
      }
      try {
        return await fetchLastBillDate(accountNumber, apiKey);
      } catch (error) {
        console.error('[Billing] Error fetching last bill date:', error);
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
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;

      electricityDailyConsumption.forEach(day => {
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

      console.log(`[Billing] Electricity: ${electricityDailyConsumption.length} days processed`);
      console.log(`[Billing] Electricity: Total consumption = ${totalConsumption.toFixed(2)} kWh`);
      console.log(`[Billing] Electricity: Total cost (inc. standing charge) = £${totalCost.toFixed(2)}`);
      
      if (oldestDate && newestDate) {
        const oldest = oldestDate as Date;
        const newest = newestDate as Date;
        console.log(`[Billing] Electricity: Period from ${oldest.toISOString()} to ${newest.toISOString()}`);
      }

      if (electricityDailyConsumption.length > 0 && totalConsumption > 0) {
        const periodStart = oldestDate || new Date();
        const periodEnd = newestDate || new Date();
        
        electricityEstimate = {
          consumption: totalConsumption,
          cost: totalCost,
          standingCharge: 0,
          totalCost: totalCost,
          periodStart,
          periodEnd,
          lastBillDate: lastBillDateQuery.data ? new Date(lastBillDateQuery.data) : periodStart,
        };
      }
    } else {
      console.log('[Billing] No electricity daily consumption data available');
    }

    if (showGas && gasDailyConsumption && gasDailyConsumption.length > 0) {
      console.log(`[Billing] Processing ${gasDailyConsumption.length} days of gas data from usage tab`);
      
      let totalConsumption = 0;
      let totalCost = 0;
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;

      gasDailyConsumption.forEach(day => {
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

      console.log(`[Billing] Gas: ${gasDailyConsumption.length} days processed`);
      console.log(`[Billing] Gas: Total consumption = ${totalConsumption.toFixed(2)} kWh`);
      console.log(`[Billing] Gas: Total cost (inc. standing charge) = £${totalCost.toFixed(2)}`);
      
      if (oldestDate && newestDate) {
        const oldest = oldestDate as Date;
        const newest = newestDate as Date;
        console.log(`[Billing] Gas: Period from ${oldest.toISOString()} to ${newest.toISOString()}`);
      }

      if (gasDailyConsumption.length > 0 && totalConsumption > 0) {
        const periodStart = oldestDate || new Date();
        const periodEnd = newestDate || new Date();
        
        gasEstimate = {
          consumption: totalConsumption,
          cost: totalCost,
          standingCharge: 0,
          totalCost: totalCost,
          periodStart,
          periodEnd,
          lastBillDate: lastBillDateQuery.data ? new Date(lastBillDateQuery.data) : periodStart,
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
  }, [accountData, electricityDailyConsumption, gasDailyConsumption, showGas, lastBillDateQuery.data]);

  const accountBalance = useMemo(() => {
    return balanceQuery.data?.balance ?? null;
  }, [balanceQuery.data]);

  const isLoading = balanceQuery.isLoading || isLoadingElectricity || isLoadingGas;

  const refetch = () => {
    balanceQuery.refetch();
    lastBillDateQuery.refetch();
  };

  return {
    accountBalance,
    estimatedBilling,
    isLoading,
    refetch,
  };
});
