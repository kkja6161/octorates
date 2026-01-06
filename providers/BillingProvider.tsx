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

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let estimatedBillStartDate = new Date(currentYear, currentMonth, 1);
    const estimatedBillEndDate = new Date(currentYear, currentMonth + 1, 0);

    if (lastBillDateQuery.data) {
      const newStartDate = new Date(lastBillDateQuery.data);
      newStartDate.setDate(newStartDate.getDate() + 1);
      if (newStartDate < now) {
        estimatedBillStartDate = newStartDate;
        console.log('[Billing] Using last bill date + 1 day as start:', estimatedBillStartDate.toISOString());
      }
    }

    let electricityEstimate = null;
    let gasEstimate = null;

    if (electricityDailyConsumption && electricityDailyConsumption.length > 0) {
      console.log(`[Billing] Processing ${electricityDailyConsumption.length} days of electricity data from usage tab`);
      
      let totalConsumption = 0;
      let totalCost = 0;
      let daysInPeriod = 0;

      electricityDailyConsumption.forEach(day => {
        if (day.entries.length > 0) {
          const dayDate = new Date(day.entries[0].interval_start);
          dayDate.setHours(0, 0, 0, 0);
          
          const startCheck = new Date(estimatedBillStartDate);
          startCheck.setHours(0, 0, 0, 0);
          
          if (dayDate >= startCheck) {
            totalConsumption += day.totalConsumption;
            totalCost += day.cost;
            daysInPeriod++;
          }
        }
      });

      console.log(`[Billing] Electricity: ${daysInPeriod} days in billing period`);
      console.log(`[Billing] Electricity: Total consumption = ${totalConsumption.toFixed(2)} kWh`);
      console.log(`[Billing] Electricity: Total cost (inc. standing charge from usage) = £${totalCost.toFixed(2)}`);

      if (daysInPeriod > 0) {
        electricityEstimate = {
          consumption: totalConsumption,
          cost: totalCost,
          standingCharge: 0,
          totalCost: totalCost,
          periodStart: estimatedBillStartDate,
          periodEnd: estimatedBillEndDate,
          lastBillDate: estimatedBillStartDate,
        };
      }
    }

    if (showGas && gasDailyConsumption && gasDailyConsumption.length > 0) {
      console.log(`[Billing] Processing ${gasDailyConsumption.length} days of gas data from usage tab`);
      
      let totalConsumption = 0;
      let totalCost = 0;
      let daysInPeriod = 0;

      gasDailyConsumption.forEach(day => {
        if (day.entries.length > 0) {
          const dayDate = new Date(day.entries[0].interval_start);
          dayDate.setHours(0, 0, 0, 0);
          
          const startCheck = new Date(estimatedBillStartDate);
          startCheck.setHours(0, 0, 0, 0);
          
          if (dayDate >= startCheck) {
            totalConsumption += day.totalConsumption;
            totalCost += day.cost;
            daysInPeriod++;
          }
        }
      });

      console.log(`[Billing] Gas: ${daysInPeriod} days in billing period`);
      console.log(`[Billing] Gas: Total consumption = ${totalConsumption.toFixed(2)} kWh`);
      console.log(`[Billing] Gas: Total cost (inc. standing charge from usage) = £${totalCost.toFixed(2)}`);

      if (daysInPeriod > 0) {
        gasEstimate = {
          consumption: totalConsumption,
          cost: totalCost,
          standingCharge: 0,
          totalCost: totalCost,
          periodStart: estimatedBillStartDate,
          periodEnd: estimatedBillEndDate,
          lastBillDate: estimatedBillStartDate,
        };
      }
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
