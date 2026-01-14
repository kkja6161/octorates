import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVProfile, ChargingLogEntry, ChargingCalculation, ChargingSlot, SlotMode } from '@/types/ev';
import { useEnergyRates } from '@/providers/EnergyRatesProvider';
import { ProcessedRate } from '@/types/energy';

const STORAGE_KEY_PROFILES = '@ev:profiles';
const STORAGE_KEY_LOGS = '@ev:charging_logs';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const [EVProvider, useEV] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { allElectricityRates, todayElectricityRates, tomorrowElectricityRates } = useEnergyRates();
  const [profiles, setProfiles] = useState<EVProfile[]>([]);
  const [logs, setLogs] = useState<ChargingLogEntry[]>([]);

  const profilesQuery = useQuery({
    queryKey: ['ev-profiles'],
    queryFn: async () => {
      console.log('[EVProvider] Loading profiles from storage...');
      const stored = await AsyncStorage.getItem(STORAGE_KEY_PROFILES);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as EVProfile[];
          console.log('[EVProvider] Loaded profiles:', parsed.length);
          return parsed;
        } catch (error) {
          console.error('[EVProvider] Error parsing profiles:', error);
          await AsyncStorage.removeItem(STORAGE_KEY_PROFILES);
        }
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const logsQuery = useQuery({
    queryKey: ['ev-charging-logs'],
    queryFn: async () => {
      console.log('[EVProvider] Loading charging logs from storage...');
      const stored = await AsyncStorage.getItem(STORAGE_KEY_LOGS);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ChargingLogEntry[];
          console.log('[EVProvider] Loaded logs:', parsed.length);
          return parsed;
        } catch (error) {
          console.error('[EVProvider] Error parsing charging logs:', error);
          await AsyncStorage.removeItem(STORAGE_KEY_LOGS);
        }
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (profilesQuery.data) {
      setProfiles(profilesQuery.data);
    }
  }, [profilesQuery.data]);

  useEffect(() => {
    if (logsQuery.data) {
      setLogs(logsQuery.data);
    }
  }, [logsQuery.data]);

  const { mutate: saveProfiles } = useMutation({
    mutationFn: async (newProfiles: EVProfile[]) => {
      await AsyncStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(newProfiles));
      return newProfiles;
    },
    onSuccess: (newProfiles) => {
      setProfiles(newProfiles);
      queryClient.setQueryData(['ev-profiles'], newProfiles);
    },
  });

  const { mutate: saveLogs } = useMutation({
    mutationFn: async (newLogs: ChargingLogEntry[]) => {
      await AsyncStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(newLogs));
      return newLogs;
    },
    onSuccess: (newLogs) => {
      setLogs(newLogs);
      queryClient.setQueryData(['ev-charging-logs'], newLogs);
    },
  });

  const addProfile = useCallback((profile: Omit<EVProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProfile: EVProfile = {
      ...profile,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...profiles, newProfile];
    saveProfiles(updated);
    console.log('[EVProvider] Added profile:', newProfile.name);
    return newProfile;
  }, [profiles, saveProfiles]);

  const updateProfile = useCallback((id: string, updates: Partial<EVProfile>) => {
    const updated = profiles.map(p => 
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    saveProfiles(updated);
    console.log('[EVProvider] Updated profile:', id);
  }, [profiles, saveProfiles]);

  const deleteProfile = useCallback((id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    saveProfiles(updated);
    console.log('[EVProvider] Deleted profile:', id);
  }, [profiles, saveProfiles]);

  const getProfile = useCallback((id: string) => {
    return profiles.find(p => p.id === id) || null;
  }, [profiles]);

  const calculateCharging = useCallback((
    profileId: string,
    currentCharge: number,
    targetCharge: number,
    desiredFinishTime?: string,
    slotMode: SlotMode = 'individual'
  ): ChargingCalculation | null => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      console.log('[EVProvider] Profile not found for calculation');
      return null;
    }

    const energyNeeded = (profile.capacity * (targetCharge - currentCharge)) / 100;
    const estimatedDuration = (energyNeeded / profile.maxChargingRate) * 60; // minutes
    const slotsNeeded = Math.ceil(estimatedDuration / 30); // 30-min slots

    let parsedDesiredFinishTime: Date | undefined;
    if (desiredFinishTime) {
      const [hours, minutes] = desiredFinishTime.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        const now = new Date();
        parsedDesiredFinishTime = new Date(now);
        parsedDesiredFinishTime.setHours(hours, minutes, 0, 0);
        
        if (parsedDesiredFinishTime <= now) {
          parsedDesiredFinishTime.setDate(parsedDesiredFinishTime.getDate() + 1);
        }
      }
    }

    let availableRates: ProcessedRate[] = [
      ...todayElectricityRates,
      ...tomorrowElectricityRates,
    ].filter(r => new Date(r.validFrom) > new Date());

    if (parsedDesiredFinishTime) {
      availableRates = availableRates.filter(r => new Date(r.validTo) <= parsedDesiredFinishTime);
    }

    if (availableRates.length === 0) {
      console.log('[EVProvider] No future rates available');
      const now = new Date();
      return {
        profileId,
        currentCharge,
        targetCharge,
        energyNeeded,
        estimatedDuration,
        bestStartTime: now,
        bestEndTime: new Date(now.getTime() + estimatedDuration * 60 * 1000),
        desiredFinishTime: parsedDesiredFinishTime,
        estimatedCost: 0,
        averageRate: 0,
        cheapestSlots: [],
      };
    }

    let cheapestSlots: ChargingSlot[] = [];
    let totalCost = 0;

    if (slotMode === 'continuous') {
      const chronologicalRates = [...availableRates].sort((a, b) => 
        a.validFrom.getTime() - b.validFrom.getTime()
      );

      let bestWindowStart = 0;
      let bestWindowCost = Infinity;

      for (let i = 0; i <= chronologicalRates.length - slotsNeeded; i++) {
        let windowCost = 0;
        let windowEnergyRemaining = energyNeeded;
        
        for (let j = 0; j < slotsNeeded && windowEnergyRemaining > 0; j++) {
          const rate = chronologicalRates[i + j];
          const slotDuration = 30;
          const maxEnergyThisSlot = (profile.maxChargingRate * slotDuration) / 60;
          const energyThisSlot = Math.min(maxEnergyThisSlot, windowEnergyRemaining);
          windowCost += energyThisSlot * rate.price;
          windowEnergyRemaining -= energyThisSlot;
        }

        if (windowCost < bestWindowCost) {
          bestWindowCost = windowCost;
          bestWindowStart = i;
        }
      }

      let energyRemaining = energyNeeded;
      for (let j = 0; j < slotsNeeded && energyRemaining > 0; j++) {
        const rate = chronologicalRates[bestWindowStart + j];
        if (!rate) break;
        const slotDuration = 30;
        const maxEnergyThisSlot = (profile.maxChargingRate * slotDuration) / 60;
        const energyThisSlot = Math.min(maxEnergyThisSlot, energyRemaining);
        const costThisSlot = energyThisSlot * rate.price;

        cheapestSlots.push({
          startTime: rate.validFrom,
          endTime: rate.validTo,
          rate: rate.price,
          energyCharged: energyThisSlot,
          cost: costThisSlot,
        });

        totalCost += costThisSlot;
        energyRemaining -= energyThisSlot;
      }
    } else {
      const sortedRates = [...availableRates].sort((a, b) => a.price - b.price);
      let energyRemaining = energyNeeded;
      
      for (let i = 0; i < Math.min(slotsNeeded, sortedRates.length) && energyRemaining > 0; i++) {
        const rate = sortedRates[i];
        const slotDuration = 30;
        const maxEnergyThisSlot = (profile.maxChargingRate * slotDuration) / 60;
        const energyThisSlot = Math.min(maxEnergyThisSlot, energyRemaining);
        const costThisSlot = energyThisSlot * rate.price;

        cheapestSlots.push({
          startTime: rate.validFrom,
          endTime: rate.validTo,
          rate: rate.price,
          energyCharged: energyThisSlot,
          cost: costThisSlot,
        });

        totalCost += costThisSlot;
        energyRemaining -= energyThisSlot;
      }

      cheapestSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }

    const bestStartTime = cheapestSlots.length > 0 ? cheapestSlots[0].startTime : new Date();
    const bestEndTime = cheapestSlots.length > 0 
      ? cheapestSlots[cheapestSlots.length - 1].endTime 
      : new Date(Date.now() + estimatedDuration * 60 * 1000);

    const averageRate = cheapestSlots.length > 0
      ? cheapestSlots.reduce((sum, s) => sum + s.rate * s.energyCharged, 0) / energyNeeded
      : 0;

    console.log('[EVProvider] Calculated charging:', {
      energyNeeded: energyNeeded.toFixed(2),
      estimatedDuration: estimatedDuration.toFixed(0),
      totalCost: totalCost.toFixed(2),
      averageRate: averageRate.toFixed(2),
      slotsCount: cheapestSlots.length,
    });

    return {
      profileId,
      currentCharge,
      targetCharge,
      energyNeeded,
      estimatedDuration,
      desiredFinishTime: parsedDesiredFinishTime,
      bestStartTime,
      bestEndTime,
      estimatedCost: totalCost,
      averageRate,
      cheapestSlots,
    };
  }, [profiles, todayElectricityRates, tomorrowElectricityRates]);

  const addLogEntry = useCallback((
    calculation: ChargingCalculation,
    note?: string
  ): ChargingLogEntry => {
    const profile = profiles.find(p => p.id === calculation.profileId);
    const newEntry: ChargingLogEntry = {
      id: generateId(),
      profileId: calculation.profileId,
      profileName: profile?.name || 'Unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note,
      initialCurrentCharge: calculation.currentCharge,
      initialTargetCharge: calculation.targetCharge,
      estimatedEnergyNeeded: calculation.energyNeeded,
      estimatedCost: calculation.estimatedCost,
      estimatedAvgRate: calculation.averageRate,
      recommendedStartTime: calculation.bestStartTime.toISOString(),
      recommendedEndTime: calculation.bestEndTime.toISOString(),
      status: 'planned',
    };

    const updated = [newEntry, ...logs];
    saveLogs(updated);
    console.log('[EVProvider] Added log entry:', newEntry.id);
    return newEntry;
  }, [profiles, logs, saveLogs]);

  const updateLogEntry = useCallback((id: string, updates: Partial<ChargingLogEntry>) => {
    const updated = logs.map(log => {
      if (log.id !== id) return log;

      const updatedLog = { ...log, ...updates, updatedAt: new Date().toISOString() };

      if (updatedLog.actualStartTime && updatedLog.actualEndTime && updatedLog.actualEnergyDelivered) {
        const startTime = new Date(updatedLog.actualStartTime);
        const endTime = new Date(updatedLog.actualEndTime);
        const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        if (durationHours > 0) {
          updatedLog.actualChargingRate = updatedLog.actualEnergyDelivered / durationHours;
        }

        const relevantRates = allElectricityRates.filter(rate => {
          const rateStart = new Date(rate.validFrom);
          const rateEnd = new Date(rate.validTo);
          return rateStart < endTime && rateEnd > startTime;
        });

        if (relevantRates.length > 0) {
          let totalCost = 0;
          let totalEnergy = updatedLog.actualEnergyDelivered;
          const energyPerSlot = totalEnergy / relevantRates.length;

          for (const rate of relevantRates) {
            totalCost += energyPerSlot * rate.price;
          }

          updatedLog.actualCost = totalCost;
          updatedLog.actualAvgRate = totalCost / totalEnergy;
        }

        updatedLog.status = 'completed';
      } else if (updatedLog.actualStartTime) {
        updatedLog.status = 'in_progress';
      }

      return updatedLog;
    });

    saveLogs(updated);
    console.log('[EVProvider] Updated log entry:', id);
  }, [logs, allElectricityRates, saveLogs]);

  const deleteLogEntry = useCallback((id: string) => {
    const updated = logs.filter(l => l.id !== id);
    saveLogs(updated);
    console.log('[EVProvider] Deleted log entry:', id);
  }, [logs, saveLogs]);

  const getLogEntry = useCallback((id: string) => {
    return logs.find(l => l.id === id) || null;
  }, [logs]);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [logs]);

  return {
    profiles,
    logs: sortedLogs,
    isLoading: profilesQuery.isLoading || logsQuery.isLoading,
    addProfile,
    updateProfile,
    deleteProfile,
    getProfile,
    calculateCharging,
    addLogEntry,
    updateLogEntry,
    deleteLogEntry,
    getLogEntry,
  };
});
