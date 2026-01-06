import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchAccountBalance, fetchConsumption, fetchStandingCharge, fetchEnergyRates, processRates, fetchLastBillDate } from '@/services/energyApi';
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
      
      // Default to 1st of current month for billing period
      // We will try to fetch the last bill date to be more accurate
      let estimatedBillStartDate = new Date(currentYear, currentMonth, 1);
      const estimatedBillEndDate = new Date(currentYear, currentMonth + 1, 0);

      try {
        const lastBillDate = await fetchLastBillDate(accountNumber, apiKey);
        if (lastBillDate) {
          // Start the new period from the day after the last bill
          const newStartDate = new Date(lastBillDate);
          newStartDate.setDate(newStartDate.getDate() + 1);
          
          // Ensure the start date is not in the future (unlikely but possible with weird bill dates)
          if (newStartDate < now) {
            estimatedBillStartDate = newStartDate;
            console.log('[Billing] Using last bill date + 1 day as start:', estimatedBillStartDate.toISOString());
          }
        }
      } catch (error) {
        console.error('[Billing] Failed to fetch last bill date, using default:', error);
      }

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

          // Get all agreements that overlap with the billing period
          const agreements = accountData.electricity.agreements.filter(a => {
            const start = a.validFrom;
            const end = a.validTo || new Date();
            return start < now && end > estimatedBillStartDate;
          });

          // Fetch rates for each relevant agreement
          console.log(`[Billing] Found ${agreements.length} relevant electricity agreements`);
          
          const periodRates = await Promise.all(agreements.map(async (agreement) => {
            const rangeStart = new Date(Math.max(agreement.validFrom.getTime(), estimatedBillStartDate.getTime()));
            const rangeEnd = agreement.validTo ? new Date(Math.min(agreement.validTo.getTime(), now.getTime())) : now;
            
            console.log(`[Billing] Fetching rates for ${agreement.productCode} from ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`);

            // Add buffer to start date to ensure we get covering rates
            const queryStart = new Date(rangeStart);
            queryStart.setDate(queryStart.getDate() - 7); // Increased buffer to 7 days

            // Fetch rates without end date to ensure we get all relevant future rates
            // This is safer than restricting to rangeEnd if the API has pagination or gaps
            const ratesData = await fetchEnergyRates(
              selectedRegion,
              agreement.productCode,
              queryStart.toISOString(),
              undefined, // Open-ended to ensure we get everything
              'electricity'
            );
            
            const rates = processRates(ratesData);
            console.log(`[Billing] Got ${rates.length} rates for ${agreement.productCode}`);
            
            const standingCharge = await fetchStandingCharge(agreement.productCode, selectedRegion, 'electricity');
            
            return {
              agreement,
              rates,
              standingCharge,
              validFrom: agreement.validFrom,
              validTo: agreement.validTo || new Date(),
            };
          }));

          let totalCost = 0;
          let totalStandingCharge = 0;
          
          // Calculate standing charge based on days in each tariff period within the billing window
          
          // Sort periods by date
          periodRates.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
          
          // Calculate standing charges for the period
          let standingChargeDate = new Date(estimatedBillStartDate);
          const endDate = new Date(); // now
          
          while (standingChargeDate < endDate) {
            // Find active agreement for this day
            const activePeriod = periodRates.find(p => 
              p.validFrom <= standingChargeDate && p.validTo > standingChargeDate
            );
            
            // Use the active period's standing charge, or fallback to the most recent one if none matches exactly
            const charge = activePeriod?.standingCharge ?? periodRates[periodRates.length - 1]?.standingCharge ?? 0;
            totalStandingCharge += charge;
            
            // Move to next day
            standingChargeDate = new Date(standingChargeDate);
            standingChargeDate.setDate(standingChargeDate.getDate() + 1);
          }

          // Calculate consumption cost
          elecConsumption.results.forEach((entry: ConsumptionEntry) => {
            const entryTime = new Date(entry.interval_start);
            
            // Find the correct period/agreement for this entry
            const activePeriod = periodRates.find(p => 
              p.validFrom <= entryTime && p.validTo > entryTime
            );
            
            if (activePeriod && activePeriod.rates.length > 0) {
              // Find the rate within this period
              const rate = activePeriod.rates.find(
                (r: ProcessedRate) => entryTime >= r.validFrom && entryTime < r.validTo
              );
              
              // Fallback logic for finding rate if exact match fails
              if (rate) {
                totalCost += entry.consumption * (rate.price / 100);
              } else {
                 // Try to find closest rate or day rate
                 const dayMatch = activePeriod.rates.find(r => {
                   const rDate = new Date(r.validFrom);
                   const eDate = new Date(entryTime);
                   return rDate.getDate() === eDate.getDate() && rDate.getMonth() === eDate.getMonth();
                 });
                 if (dayMatch) {
                    totalCost += entry.consumption * (dayMatch.price / 100);
                 } else {
                   // console.log(`[Billing] No rate match for ${entryTime.toISOString()} in ${activePeriod.agreement.productCode}`);
                 }
              }
            } else {
               // console.log(`[Billing] No active period or rates for ${entryTime.toISOString()}`);
            }
          });

          console.log(`[Billing] Electricity calc: Consumption=${totalConsumption}, Cost=£${totalCost.toFixed(2)}, Standing=£${(totalStandingCharge/100).toFixed(2)}`);

          electricityEstimate = {
            consumption: totalConsumption,
            cost: totalCost,
            standingCharge: totalStandingCharge / 100, // Convert to pounds
            totalCost: totalCost + (totalStandingCharge / 100),
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

          // Get all agreements that overlap with the billing period
          const agreements = accountData.gas.agreements.filter(a => {
            const start = a.validFrom;
            const end = a.validTo || new Date();
            return start < now && end > estimatedBillStartDate;
          });

          // Fetch rates for each relevant agreement
          const periodRates = await Promise.all(agreements.map(async (agreement) => {
            const rangeStart = new Date(Math.max(agreement.validFrom.getTime(), estimatedBillStartDate.getTime()));
            
            // Add buffer
            const queryStart = new Date(rangeStart);
            queryStart.setDate(queryStart.getDate() - 7);

            const ratesData = await fetchEnergyRates(
              selectedRegion,
              agreement.productCode,
              queryStart.toISOString(),
              undefined,
              'gas'
            );
            
            const rates = processRates(ratesData, true); // true for daily rates (gas)
            const standingCharge = await fetchStandingCharge(agreement.productCode, selectedRegion, 'gas');
            
            return {
              agreement,
              rates,
              standingCharge,
              validFrom: agreement.validFrom,
              validTo: agreement.validTo || new Date(),
            };
          }));

          let totalCost = 0;
          let totalStandingCharge = 0;
          
          // Sort periods
          periodRates.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
          
          // Calculate standing charges
          let standingChargeDate = new Date(estimatedBillStartDate);
          const endDate = new Date();
          
          while (standingChargeDate < endDate) {
            const activePeriod = periodRates.find(p => 
              p.validFrom <= standingChargeDate && p.validTo > standingChargeDate
            );
            const charge = activePeriod?.standingCharge ?? periodRates[periodRates.length - 1]?.standingCharge ?? 0;
            totalStandingCharge += charge;
            
            standingChargeDate = new Date(standingChargeDate);
            standingChargeDate.setDate(standingChargeDate.getDate() + 1);
          }

          // Calculate consumption cost
          gasConsumption.results.forEach((entry: ConsumptionEntry) => {
            const entryTime = new Date(entry.interval_start);
            const activePeriod = periodRates.find(p => 
              p.validFrom <= entryTime && p.validTo > entryTime
            );
            
            if (activePeriod && activePeriod.rates.length > 0) {
              const rate = activePeriod.rates.find(
                (r: ProcessedRate) => entryTime >= r.validFrom && entryTime < r.validTo
              );
              
              if (rate) {
                const kwh = entry.consumption * (gasCv || GAS_CV) * GAS_VCF / GAS_CF;
                totalCost += kwh * (rate.price / 100);
              } else if (activePeriod.rates.length > 0) {
                // For gas (daily), just find the rate for that day
                const dayRate = activePeriod.rates.find(r => {
                   const rDate = new Date(r.validFrom);
                   const eDate = new Date(entryTime);
                   return rDate.getDate() === eDate.getDate() && rDate.getMonth() === eDate.getMonth();
                });
                if (dayRate) {
                   const kwh = entry.consumption * (gasCv || GAS_CV) * GAS_VCF / GAS_CF;
                   totalCost += kwh * (dayRate.price / 100);
                }
              }
            }
          });

          gasEstimate = {
            consumption: totalConsumptionKwh,
            cost: totalCost,
            standingCharge: totalStandingCharge / 100,
            totalCost: totalCost + (totalStandingCharge / 100),
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
    return balanceQuery.data?.balance ?? null;
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
