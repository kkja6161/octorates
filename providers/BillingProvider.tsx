import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchAccountBalance, fetchConsumption, fetchStandingCharge, fetchEnergyRates, processRates } from '@/services/energyApi';
import { EstimatedBilling, ConsumptionEntry, ProcessedRate } from '@/types/energy';
import { useConsumption } from './ConsumptionProvider';

const GAS_CV = 39.0;
const GAS_VCF = 1.02264;
const GAS_CF = 3.6;

export const [BillingProvider, useBilling] = createContextHook(() => {
  const { 
    apiKey, 
    accountNumber, 
    accountData,
    showGas,
    gasCv,
    selectedRegion,
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

  const estimatedBillingQuery = useQuery({
    queryKey: ['estimated-billing', accountNumber, apiKey, accountData, showGas],
    queryFn: async (): Promise<EstimatedBilling | null> => {
      if (!accountNumber || !apiKey || !accountData) {
        return null;
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const estimatedBillStartDate = new Date(currentYear, currentMonth, 1);
      const estimatedBillEndDate = new Date(currentYear, currentMonth + 1, 0);

      let electricityEstimate = null;
      let gasEstimate = null;

      if (accountData.electricity?.mpan && accountData.electricity.serialNumbers.length > 0) {
        try {
          const elecConsumption = await fetchConsumption(
            accountData.electricity.mpan,
            accountData.electricity.serialNumbers[0],
            apiKey,
            'electricity',
            estimatedBillStartDate.toISOString(),
            now.toISOString()
          );

          const totalConsumption = elecConsumption.results.reduce(
            (sum, entry: ConsumptionEntry) => sum + entry.consumption,
            0
          );

          const elecRatesData = accountData.electricity.currentAgreement?.productCode
            ? await fetchEnergyRates(
                selectedRegion,
                accountData.electricity.currentAgreement.productCode,
                estimatedBillStartDate.toISOString(),
                now.toISOString(),
                'electricity'
              )
            : null;

          const elecRates = elecRatesData ? processRates(elecRatesData) : [];

          let totalCost = 0;
          elecConsumption.results.forEach((entry: ConsumptionEntry) => {
            const entryTime = new Date(entry.interval_start);
            const rate = elecRates.find(
              (r: ProcessedRate) => entryTime >= r.validFrom && entryTime < r.validTo
            );
            if (rate) {
              totalCost += entry.consumption * (rate.price / 100);
            }
          });

          const daysElapsed = Math.ceil((now.getTime() - estimatedBillStartDate.getTime()) / (1000 * 60 * 60 * 24));
          
          const standingCharge = accountData.electricity.currentAgreement?.productCode
            ? await fetchStandingCharge(
                accountData.electricity.currentAgreement.productCode,
                accountData.region,
                'electricity'
              )
            : null;

          const standingChargeTotal = standingCharge ? (standingCharge / 100) * daysElapsed : 0;

          electricityEstimate = {
            consumption: totalConsumption,
            cost: totalCost,
            standingCharge: standingChargeTotal,
            totalCost: totalCost + standingChargeTotal,
            periodStart: estimatedBillStartDate,
            periodEnd: estimatedBillEndDate,
            lastBillDate: estimatedBillStartDate,
          };
        } catch (error) {
          console.error('[Billing] Error calculating electricity estimate:', error);
        }
      }

      if (showGas && accountData.gas?.mprn && accountData.gas.serialNumbers.length > 0) {
        try {
          const gasConsumption = await fetchConsumption(
            accountData.gas.mprn,
            accountData.gas.serialNumbers[0],
            apiKey,
            'gas',
            estimatedBillStartDate.toISOString(),
            now.toISOString()
          );

          const totalConsumptionM3 = gasConsumption.results.reduce(
            (sum, entry: ConsumptionEntry) => sum + entry.consumption,
            0
          );

          const totalConsumptionKwh = totalConsumptionM3 * (gasCv || GAS_CV) * GAS_VCF / GAS_CF;

          const gasRatesData = accountData.gas.currentAgreement?.productCode
            ? await fetchEnergyRates(
                selectedRegion,
                accountData.gas.currentAgreement.productCode,
                estimatedBillStartDate.toISOString(),
                now.toISOString(),
                'gas'
              )
            : null;

          const gasRates = gasRatesData ? processRates(gasRatesData, true) : [];

          let totalCost = 0;
          gasConsumption.results.forEach((entry: ConsumptionEntry) => {
            const entryTime = new Date(entry.interval_start);
            const rate = gasRates.find(
              (r: ProcessedRate) => entryTime >= r.validFrom && entryTime < r.validTo
            );
            if (rate) {
              const kwh = entry.consumption * (gasCv || GAS_CV) * GAS_VCF / GAS_CF;
              totalCost += kwh * (rate.price / 100);
            }
          });

          const daysElapsed = Math.ceil((now.getTime() - estimatedBillStartDate.getTime()) / (1000 * 60 * 60 * 24));

          const standingCharge = accountData.gas.currentAgreement?.productCode
            ? await fetchStandingCharge(
                accountData.gas.currentAgreement.productCode,
                accountData.region,
                'gas'
              )
            : null;

          const standingChargeTotal = standingCharge ? (standingCharge / 100) * daysElapsed : 0;

          gasEstimate = {
            consumption: totalConsumptionKwh,
            cost: totalCost,
            standingCharge: standingChargeTotal,
            totalCost: totalCost + standingChargeTotal,
            periodStart: estimatedBillStartDate,
            periodEnd: estimatedBillEndDate,
            lastBillDate: estimatedBillStartDate,
          };
        } catch (error) {
          console.error('[Billing] Error calculating gas estimate:', error);
        }
      }

      const totalEstimatedCost = 
        (electricityEstimate?.totalCost || 0) + 
        (gasEstimate?.totalCost || 0);

      return {
        electricity: electricityEstimate,
        gas: gasEstimate,
        totalEstimatedCost,
      };
    },
    enabled: !!accountNumber && !!apiKey && !!accountData,
    staleTime: 5 * 60 * 1000,
  });

  const accountBalance = useMemo(() => {
    return balanceQuery.data?.balance || 0;
  }, [balanceQuery.data]);

  const estimatedBilling = useMemo(() => {
    return estimatedBillingQuery.data || null;
  }, [estimatedBillingQuery.data]);

  const isLoading = balanceQuery.isLoading || estimatedBillingQuery.isLoading;

  const refetch = () => {
    balanceQuery.refetch();
    estimatedBillingQuery.refetch();
  };

  return {
    accountBalance,
    estimatedBilling,
    isLoading,
    refetch,
  };
});
