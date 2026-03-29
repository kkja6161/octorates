import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

import {
  shouldFetchForecast,
  fetchAndCacheForecast,
  getMorningForecastForOverlay,
  getCachedForecast,
  registerBackgroundFetch,
  getTimeUntilNextFetch,
} from '@/services/forecastCacheService';

export const [ForecastProvider, useForecast] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [region, setRegion] = useState<string>('');
  const [isAgile, setIsAgile] = useState<boolean>(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      registerBackgroundFetch().catch(err => {
        console.log('[ForecastProvider] Background fetch registration error:', err);
      });
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[ForecastProvider] App became active, checking forecast');
        queryClient.invalidateQueries({ queryKey: ['forecast-check'] });
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState, queryClient]);

  const { data: cachedForecast, isLoading: isCacheLoading } = useQuery({
    queryKey: ['cached-forecast', region],
    queryFn: async () => {
      if (!region) return null;
      return getCachedForecast();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!region && isAgile,
  });

  const { data: morningOverlay, refetch: refetchMorningOverlay } = useQuery({
    queryKey: ['morning-forecast-overlay', region],
    queryFn: async () => {
      if (!region) return null;
      return getMorningForecastForOverlay(region);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!region && isAgile,
  });

  useQuery({
    queryKey: ['forecast-check', region, isAgile],
    queryFn: async () => {
      if (!region || !isAgile) return false;
      
      const shouldFetch = await shouldFetchForecast(region);
      console.log('[ForecastProvider] Should fetch forecast:', shouldFetch);
      
      if (shouldFetch) {
        await fetchAndCacheForecast(region);
        queryClient.invalidateQueries({ queryKey: ['cached-forecast'] });
        queryClient.invalidateQueries({ queryKey: ['morning-forecast-overlay'] });
      }
      
      return shouldFetch;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!region && isAgile,
    refetchInterval: () => {
      const timeUntilNext = getTimeUntilNextFetch();
      const interval = Math.min(timeUntilNext, 15 * 60 * 1000);
      console.log('[ForecastProvider] Next check in', Math.round(interval / 1000 / 60), 'minutes');
      return interval;
    },
  });

  const fetchForecastMutation = useMutation({
    mutationFn: async (forceRegion?: string) => {
      const targetRegion = forceRegion || region;
      if (!targetRegion) throw new Error('No region set');
      return fetchAndCacheForecast(targetRegion);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cached-forecast'] });
      queryClient.invalidateQueries({ queryKey: ['morning-forecast-overlay'] });
    },
  });

  const updateRegion = useCallback((newRegion: string) => {
    console.log('[ForecastProvider] Region updated:', newRegion);
    setRegion(newRegion);
  }, []);

  const updateIsAgile = useCallback((newIsAgile: boolean) => {
    console.log('[ForecastProvider] Is Agile updated:', newIsAgile);
    setIsAgile(newIsAgile);
  }, []);

  const todayMorningForecast = useMemo(() => {
    return morningOverlay?.todayForecast || [];
  }, [morningOverlay]);

  const tomorrowMorningForecast = useMemo(() => {
    return morningOverlay?.tomorrowForecast || [];
  }, [morningOverlay]);

  const latestForecast = useMemo(() => {
    return cachedForecast?.rates || [];
  }, [cachedForecast]);

  const forecastLastUpdated = useMemo(() => {
    if (!cachedForecast?.fetchedAt) return null;
    return new Date(cachedForecast.fetchedAt);
  }, [cachedForecast]);

  const forecastApiUpdateTime = useMemo(() => {
    return cachedForecast?.apiUpdateTime || null;
  }, [cachedForecast]);

  return {
    region,
    isAgile,
    updateRegion,
    updateIsAgile,
    todayMorningForecast,
    tomorrowMorningForecast,
    latestForecast,
    forecastLastUpdated,
    forecastApiUpdateTime,
    isLoading: isCacheLoading || fetchForecastMutation.isPending,
    refetchForecast: fetchForecastMutation.mutate,
    refetchMorningOverlay,
  };
});

export function useForecastOverlay() {
  const { todayMorningForecast, tomorrowMorningForecast, isAgile } = useForecast();
  
  return useMemo(() => ({
    todayForecast: isAgile ? todayMorningForecast : [],
    tomorrowForecast: isAgile ? tomorrowMorningForecast : [],
    hasForecast: todayMorningForecast.length > 0 || tomorrowMorningForecast.length > 0,
  }), [todayMorningForecast, tomorrowMorningForecast, isAgile]);
}
