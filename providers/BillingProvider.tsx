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
          console.log(`[Billing] Fetching electricity consumption from ${estimatedBillStartDate.toISOString()} to ${now.toISOString()}`);
          
          const elecConsumption = await fetchConsumption(
            accountData.electricity.mpan,
            accountData.electricity.serialNumbers[0],
            apiKey,
            'electricity',
            estimatedBillStartDate.toISOString(),
            now.toISOString()
          );

          console.log(`[Billing] Electricity consumption results: ${elecConsumption.results.length} entries`);

          const totalConsumption = elecConsumption.results.reduce(
            (sum, entry: ConsumptionEntry) => sum + entry.consumption,
            0
          );

          console.log(`[Billing] Total electricity consumption: ${totalConsumption} kWh`);

          // Get all agreements that overlap with the billing period
          const agreements = accountData.electricity.agreements.filter(a => {
            const start = a.validFrom;
            const end = a.validTo || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year from now if no end
            return start <= now && end >= estimatedBillStartDate;
          });

          // If no agreements match, use the most recent one
          const relevantAgreements = agreements.length > 0 
            ? agreements 
            : accountData.electricity.agreements.slice(-1);

          console.log(`[Billing] Found ${relevantAgreements.length} relevant electricity agreements`);
          
          const periodRates = await Promise.all(relevantAgreements.map(async (agreement) => {
            console.log(`[Billing] Processing agreement: ${agreement.productCode}`);
            
            // Add buffer to start date to ensure we get covering rates
            const queryStart = new Date(estimatedBillStartDate);
            queryStart.setDate(queryStart.getDate() - 14); // 14 day buffer

            const ratesData = await fetchEnergyRates(
              selectedRegion,
              agreement.productCode,
              queryStart.toISOString(),
              undefined,
              'electricity'
            );
            
            const rates = processRates(ratesData);
            console.log(`[Billing] Got ${rates.length} rates for ${agreement.productCode}`);
            
            const standingCharge = await fetchStandingCharge(agreement.productCode, selectedRegion, 'electricity');
            console.log(`[Billing] Standing charge for ${agreement.productCode}: ${standingCharge}p`);
            
            return {
              agreement,
              rates,
              standingCharge,
              validFrom: agreement.validFrom,
              validTo: agreement.validTo || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            };
          }));

          let totalCost = 0;
          let totalStandingCharge = 0;
          let matchedEntries = 0;
          let unmatchedEntries = 0;
          
          // Sort periods by date
          periodRates.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
          
          // Calculate standing charges for the period
          let standingChargeDate = new Date(estimatedBillStartDate);
          const endDate = new Date(now);
          let daysCount = 0;
          
          while (standingChargeDate < endDate) {
            const activePeriod = periodRates.find(p => 
              p.validFrom <= standingChargeDate && p.validTo > standingChargeDate
            );
            
            const charge = activePeriod?.standingCharge ?? periodRates[periodRates.length - 1]?.standingCharge ?? 0;
            totalStandingCharge += charge;
            daysCount++;
            
            standingChargeDate = new Date(standingChargeDate);
            standingChargeDate.setDate(standingChargeDate.getDate() + 1);
          }
          
          console.log(`[Billing] Standing charge calculated for ${daysCount} days: ${totalStandingCharge}p`);

          // Calculate consumption cost
          elecConsumption.results.forEach((entry: ConsumptionEntry) => {
            const entryTime = new Date(entry.interval_start);
            
            // Find the correct period/agreement for this entry
            let activePeriod = periodRates.find(p => 
              p.validFrom <= entryTime && p.validTo > entryTime
            );
            
            // Fallback to last period if no exact match
            if (!activePeriod && periodRates.length > 0) {
              activePeriod = periodRates[periodRates.length - 1];
            }
            
            if (activePeriod && activePeriod.rates.length > 0) {
              // Find the rate within this period
              let rate = activePeriod.rates.find(
                (r: ProcessedRate) => entryTime >= r.validFrom && entryTime < r.validTo
              );
              
              // Fallback: find rate for same day
              if (!rate) {
                rate = activePeriod.rates.find(r => {
                  const rDate = new Date(r.validFrom);
                  const eDate = new Date(entryTime);
                  return rDate.getDate() === eDate.getDate() && 
                         rDate.getMonth() === eDate.getMonth() &&
                         rDate.getFullYear() === eDate.getFullYear();
                });
              }
              
              // Fallback: use average rate for the period
              if (!rate && activePeriod.rates.length > 0) {
                const avgPrice = activePeriod.rates.reduce((sum, r) => sum + r.price, 0) / activePeriod.rates.length;
                totalCost += entry.consumption * (avgPrice / 100);
                matchedEntries++;
                return;
              }
              
              if (rate) {
                totalCost += entry.consumption * (rate.price / 100);
                matchedEntries++;
              } else {
                unmatchedEntries++;
              }
            } else {
              unmatchedEntries++;
            }
          });

          console.log(`[Billing] Rate matching: ${matchedEntries} matched, ${unmatchedEntries} unmatched`);
          console.log(`[Billing] Electricity calc: Consumption=${totalConsumption.toFixed(2)} kWh, Cost=£${totalCost.toFixed(2)}, Standing=£${(totalStandingCharge/100).toFixed(2)}`);

          electricityEstimate = {
            consumption: totalConsumption,
            cost: totalCost,
            standingCharge: totalStandingCharge / 100,
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
          console.log(`[Billing] Fetching gas consumption from ${estimatedBillStartDate.toISOString()} to ${now.toISOString()}`);
          
          const gasConsumption = await fetchConsumption(
            accountData.gas.mprn,
            accountData.gas.serialNumbers[0],
            apiKey,
            'gas',
            estimatedBillStartDate.toISOString(),
            now.toISOString()
          );

          console.log(`[Billing] Gas consumption results: ${gasConsumption.results.length} entries`);

          const totalConsumptionM3 = gasConsumption.results.reduce(
            (sum, entry: ConsumptionEntry) => sum + entry.consumption,
            0
          );

          const totalConsumptionKwh = totalConsumptionM3 * (gasCv || GAS_CV) * GAS_VCF / GAS_CF;
          console.log(`[Billing] Total gas consumption: ${totalConsumptionM3.toFixed(2)} m³ = ${totalConsumptionKwh.toFixed(2)} kWh`);

          // Get all agreements that overlap with the billing period
          const agreements = accountData.gas.agreements.filter(a => {
            const start = a.validFrom;
            const end = a.validTo || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            return start <= now && end >= estimatedBillStartDate;
          });

          // If no agreements match, use the most recent one
          const relevantAgreements = agreements.length > 0 
            ? agreements 
            : accountData.gas.agreements.slice(-1);

          console.log(`[Billing] Found ${relevantAgreements.length} relevant gas agreements`);

          const periodRates = await Promise.all(relevantAgreements.map(async (agreement) => {
            console.log(`[Billing] Processing gas agreement: ${agreement.productCode}`);
            
            const queryStart = new Date(estimatedBillStartDate);
            queryStart.setDate(queryStart.getDate() - 14);

            const ratesData = await fetchEnergyRates(
              selectedRegion,
              agreement.productCode,
              queryStart.toISOString(),
              undefined,
              'gas'
            );
            
            const rates = processRates(ratesData, true);
            console.log(`[Billing] Got ${rates.length} gas rates for ${agreement.productCode}`);
            
            const standingCharge = await fetchStandingCharge(agreement.productCode, selectedRegion, 'gas');
            console.log(`[Billing] Gas standing charge for ${agreement.productCode}: ${standingCharge}p`);
            
            return {
              agreement,
              rates,
              standingCharge,
              validFrom: agreement.validFrom,
              validTo: agreement.validTo || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            };
          }));

          let totalCost = 0;
          let totalStandingCharge = 0;
          let matchedEntries = 0;
          let unmatchedEntries = 0;
          
          periodRates.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
          
          let standingChargeDate = new Date(estimatedBillStartDate);
          const endDate = new Date(now);
          let daysCount = 0;
          
          while (standingChargeDate < endDate) {
            const activePeriod = periodRates.find(p => 
              p.validFrom <= standingChargeDate && p.validTo > standingChargeDate
            );
            const charge = activePeriod?.standingCharge ?? periodRates[periodRates.length - 1]?.standingCharge ?? 0;
            totalStandingCharge += charge;
            daysCount++;
            
            standingChargeDate = new Date(standingChargeDate);
            standingChargeDate.setDate(standingChargeDate.getDate() + 1);
          }
          
          console.log(`[Billing] Gas standing charge calculated for ${daysCount} days: ${totalStandingCharge}p`);

          gasConsumption.results.forEach((entry: ConsumptionEntry) => {
            const entryTime = new Date(entry.interval_start);
            let activePeriod = periodRates.find(p => 
              p.validFrom <= entryTime && p.validTo > entryTime
            );
            
            if (!activePeriod && periodRates.length > 0) {
              activePeriod = periodRates[periodRates.length - 1];
            }
            
            if (activePeriod && activePeriod.rates.length > 0) {
              let rate = activePeriod.rates.find(
                (r: ProcessedRate) => entryTime >= r.validFrom && entryTime < r.validTo
              );
              
              if (!rate) {
                rate = activePeriod.rates.find(r => {
                  const rDate = new Date(r.validFrom);
                  const eDate = new Date(entryTime);
                  return rDate.getDate() === eDate.getDate() && 
                         rDate.getMonth() === eDate.getMonth() &&
                         rDate.getFullYear() === eDate.getFullYear();
                });
              }
              
              if (!rate && activePeriod.rates.length > 0) {
                const avgPrice = activePeriod.rates.reduce((sum, r) => sum + r.price, 0) / activePeriod.rates.length;
                const kwh = entry.consumption * (gasCv || GAS_CV) * GAS_VCF / GAS_CF;
                totalCost += kwh * (avgPrice / 100);
                matchedEntries++;
                return;
              }
              
              if (rate) {
                const kwh = entry.consumption * (gasCv || GAS_CV) * GAS_VCF / GAS_CF;
                totalCost += kwh * (rate.price / 100);
                matchedEntries++;
              } else {
                unmatchedEntries++;
              }
            } else {
              unmatchedEntries++;
            }
          });

          console.log(`[Billing] Gas rate matching: ${matchedEntries} matched, ${unmatchedEntries} unmatched`);
          console.log(`[Billing] Gas calc: Consumption=${totalConsumptionKwh.toFixed(2)} kWh, Cost=£${totalCost.toFixed(2)}, Standing=£${(totalStandingCharge/100).toFixed(2)}`);

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
