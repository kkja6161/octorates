import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { fetchAgilePrediction } from '@/services/energyApi';
import { ProcessedForecastRate } from '@/types/energy';

const STORAGE_KEY_FORECAST_CACHE = '@forecast:cache';
const STORAGE_KEY_MORNING_FORECASTS = '@forecast:morning_cache';
const STORAGE_KEY_LAST_FETCH_TIME = '@forecast:last_fetch';
const STORAGE_KEY_FORECAST_REGION = '@forecast:region';

const BACKGROUND_FETCH_TASK = 'AGILE_FORECAST_FETCH';

const API_UPDATE_TIMES = [
  { hour: 6, minute: 15 },
  { hour: 10, minute: 15 },
  { hour: 16, minute: 15 },
  { hour: 22, minute: 15 },
];

const FETCH_DELAY_MINUTES = 10;

export interface CachedForecast {
  rates: ProcessedForecastRate[];
  fetchedAt: string;
  apiUpdateTime: string;
  region: string;
}

export interface MorningForecastCache {
  [dateKey: string]: {
    rates: ProcessedForecastRate[];
    fetchedAt: string;
    region: string;
  };
}

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getMostRecentApiUpdateTime(now: Date): { hour: number; minute: number; date: Date } | null {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  for (let i = API_UPDATE_TIMES.length - 1; i >= 0; i--) {
    const updateTime = API_UPDATE_TIMES[i];
    const updateMinutes = updateTime.hour * 60 + updateTime.minute;
    
    if (currentMinutes >= updateMinutes + FETCH_DELAY_MINUTES) {
      const updateDate = new Date(now);
      updateDate.setHours(updateTime.hour, updateTime.minute, 0, 0);
      return { ...updateTime, date: updateDate };
    }
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastUpdate = API_UPDATE_TIMES[API_UPDATE_TIMES.length - 1];
  yesterday.setHours(lastUpdate.hour, lastUpdate.minute, 0, 0);
  return { ...lastUpdate, date: yesterday };
}

function getNextFetchTime(now: Date): Date {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  for (const updateTime of API_UPDATE_TIMES) {
    const fetchMinutes = updateTime.hour * 60 + updateTime.minute + FETCH_DELAY_MINUTES;
    
    if (currentMinutes < fetchMinutes) {
      const nextFetch = new Date(now);
      nextFetch.setHours(Math.floor(fetchMinutes / 60), fetchMinutes % 60, 0, 0);
      return nextFetch;
    }
  }
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(
    API_UPDATE_TIMES[0].hour,
    API_UPDATE_TIMES[0].minute + FETCH_DELAY_MINUTES,
    0,
    0
  );
  return tomorrow;
}

function isMorningFetch(apiUpdateTime: { hour: number; minute: number }): boolean {
  return apiUpdateTime.hour === 6 && apiUpdateTime.minute === 15;
}

export async function shouldFetchForecast(region: string): Promise<boolean> {
  try {
    const [lastFetchStr, cachedRegion] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_LAST_FETCH_TIME),
      AsyncStorage.getItem(STORAGE_KEY_FORECAST_REGION),
    ]);
    
    if (cachedRegion !== region) {
      console.log('[ForecastCache] Region changed, should fetch');
      return true;
    }
    
    if (!lastFetchStr) {
      console.log('[ForecastCache] No previous fetch, should fetch');
      return true;
    }
    
    const lastFetch = new Date(lastFetchStr);
    const now = new Date();
    
    const lastApiUpdate = getMostRecentApiUpdateTime(now);
    if (!lastApiUpdate) return true;
    
    if (lastFetch < lastApiUpdate.date) {
      console.log('[ForecastCache] New API data available, should fetch');
      return true;
    }
    
    console.log('[ForecastCache] Cache is fresh, no need to fetch');
    return false;
  } catch (error) {
    console.error('[ForecastCache] Error checking fetch status:', error);
    return true;
  }
}

export async function fetchAndCacheForecast(region: string): Promise<CachedForecast | null> {
  try {
    console.log('[ForecastCache] Fetching forecast for region:', region);
    
    const rates = await fetchAgilePrediction(region, 7);
    
    if (!rates || rates.length === 0) {
      console.log('[ForecastCache] No forecast data received');
      return null;
    }
    
    const now = new Date();
    const apiUpdateTime = getMostRecentApiUpdateTime(now);
    
    const cached: CachedForecast = {
      rates: rates.map(r => ({
        ...r,
        validFrom: r.validFrom,
      })),
      fetchedAt: now.toISOString(),
      apiUpdateTime: apiUpdateTime ? `${apiUpdateTime.hour}:${apiUpdateTime.minute}` : 'unknown',
      region,
    };
    
    await AsyncStorage.setItem(STORAGE_KEY_FORECAST_CACHE, JSON.stringify(cached));
    await AsyncStorage.setItem(STORAGE_KEY_LAST_FETCH_TIME, now.toISOString());
    await AsyncStorage.setItem(STORAGE_KEY_FORECAST_REGION, region);
    
    if (apiUpdateTime && isMorningFetch(apiUpdateTime)) {
      await saveMorningForecast(region, rates);
    }
    
    console.log('[ForecastCache] Forecast cached successfully, rates:', rates.length);
    return cached;
  } catch (error) {
    console.error('[ForecastCache] Error fetching forecast:', error);
    return null;
  }
}

async function saveMorningForecast(region: string, rates: ProcessedForecastRate[]): Promise<void> {
  try {
    const now = new Date();
    const dateKey = getDateKey(now);
    
    const existingStr = await AsyncStorage.getItem(STORAGE_KEY_MORNING_FORECASTS);
    let morningCache: MorningForecastCache = {};
    
    if (existingStr) {
      try {
        morningCache = JSON.parse(existingStr);
      } catch {
        morningCache = {};
      }
    }
    
    morningCache[dateKey] = {
      rates: rates.map(r => ({
        ...r,
        validFrom: r.validFrom,
      })),
      fetchedAt: now.toISOString(),
      region,
    };
    
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const cutoffKey = getDateKey(twoDaysAgo);
    
    const keysToRemove = Object.keys(morningCache).filter(key => key < cutoffKey);
    keysToRemove.forEach(key => delete morningCache[key]);
    
    await AsyncStorage.setItem(STORAGE_KEY_MORNING_FORECASTS, JSON.stringify(morningCache));
    console.log('[ForecastCache] Morning forecast saved for', dateKey);
  } catch (error) {
    console.error('[ForecastCache] Error saving morning forecast:', error);
  }
}

export async function getMorningForecastForDate(targetDate: Date, region: string): Promise<ProcessedForecastRate[] | null> {
  try {
    const dateKey = getDateKey(targetDate);
    const existingStr = await AsyncStorage.getItem(STORAGE_KEY_MORNING_FORECASTS);
    
    if (!existingStr) {
      console.log('[ForecastCache] No morning forecasts cached');
      return null;
    }
    
    const morningCache: MorningForecastCache = JSON.parse(existingStr);
    const cached = morningCache[dateKey];
    
    if (!cached) {
      console.log('[ForecastCache] No morning forecast for date:', dateKey);
      return null;
    }
    
    if (cached.region !== region) {
      console.log('[ForecastCache] Morning forecast region mismatch');
      return null;
    }
    
    const rates = cached.rates.map(r => ({
      ...r,
      validFrom: new Date(r.validFrom),
    }));
    
    console.log('[ForecastCache] Retrieved morning forecast for', dateKey, 'rates:', rates.length);
    return rates;
  } catch (error) {
    console.error('[ForecastCache] Error getting morning forecast:', error);
    return null;
  }
}

export async function getMorningForecastForOverlay(region: string): Promise<{
  todayForecast: ProcessedForecastRate[];
  tomorrowForecast: ProcessedForecastRate[];
} | null> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    const morningForecast = await getMorningForecastForDate(today, region);
    
    if (!morningForecast || morningForecast.length === 0) {
      console.log('[ForecastCache] No morning forecast available for overlay');
      return null;
    }
    
    const todayForecast = morningForecast.filter(rate => {
      const rateDate = new Date(rate.validFrom);
      return rateDate >= today && rateDate < tomorrow;
    });
    
    const tomorrowForecast = morningForecast.filter(rate => {
      const rateDate = new Date(rate.validFrom);
      return rateDate >= tomorrow && rateDate < dayAfterTomorrow;
    });
    
    console.log('[ForecastCache] Overlay forecasts - today:', todayForecast.length, 'tomorrow:', tomorrowForecast.length);
    
    return { todayForecast, tomorrowForecast };
  } catch (error) {
    console.error('[ForecastCache] Error getting overlay forecasts:', error);
    return null;
  }
}

export async function getCachedForecast(): Promise<CachedForecast | null> {
  try {
    const cachedStr = await AsyncStorage.getItem(STORAGE_KEY_FORECAST_CACHE);
    if (!cachedStr) return null;
    
    const cached: CachedForecast = JSON.parse(cachedStr);
    cached.rates = cached.rates.map(r => ({
      ...r,
      validFrom: new Date(r.validFrom),
    }));
    
    return cached;
  } catch (error) {
    console.error('[ForecastCache] Error getting cached forecast:', error);
    return null;
  }
}

export function getTimeUntilNextFetch(): number {
  const now = new Date();
  const nextFetch = getNextFetchTime(now);
  return nextFetch.getTime() - now.getTime();
}

export function getNextFetchTimeString(): string {
  const now = new Date();
  const nextFetch = getNextFetchTime(now);
  return nextFetch.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
      console.log('[ForecastCache] Background fetch task running');
      
      const region = await AsyncStorage.getItem(STORAGE_KEY_FORECAST_REGION);
      if (!region) {
        console.log('[ForecastCache] No region set, skipping background fetch');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
      
      const shouldFetch = await shouldFetchForecast(region);
      if (!shouldFetch) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
      
      const result = await fetchAndCacheForecast(region);
      
      if (result) {
        console.log('[ForecastCache] Background fetch completed successfully');
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
      
      return BackgroundFetch.BackgroundFetchResult.Failed;
    } catch (error) {
      console.error('[ForecastCache] Background fetch error:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerBackgroundFetch(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('[ForecastCache] Background fetch not supported on web');
    return;
  }
  
  try {
    const status = await BackgroundFetch.getStatusAsync();
    
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
        status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.log('[ForecastCache] Background fetch not available:', status);
      return;
    }
    
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (isRegistered) {
      console.log('[ForecastCache] Background fetch already registered');
      return;
    }
    
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('[ForecastCache] Background fetch registered successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('UIBackgroundModes') || errorMessage.includes('Background Fetch has not been configured')) {
      console.log('[ForecastCache] Background fetch not available in Expo Go - using foreground fetch only');
    } else {
      console.log('[ForecastCache] Background fetch registration skipped:', errorMessage);
    }
  }
}

export async function unregisterBackgroundFetch(): Promise<void> {
  if (Platform.OS === 'web') return;
  
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('[ForecastCache] Background fetch unregistered');
    }
  } catch (error) {
    console.error('[ForecastCache] Error unregistering background fetch:', error);
  }
}

export async function clearForecastCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEY_FORECAST_CACHE,
      STORAGE_KEY_MORNING_FORECASTS,
      STORAGE_KEY_LAST_FETCH_TIME,
      STORAGE_KEY_FORECAST_REGION,
    ]);
    console.log('[ForecastCache] Cache cleared');
  } catch (error) {
    console.error('[ForecastCache] Error clearing cache:', error);
  }
}
