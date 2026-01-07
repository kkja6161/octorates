import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConsumptionEntry, ProcessedRate, ProcessedAccountData } from '@/types/energy';

const CACHE_PREFIX = '@api_cache:';

interface CachedConsumptionData {
  data: ConsumptionEntry[];
  lastFetchDate: string;
  mpanOrMprn: string;
  serialNumber: string;
  fuelType: 'electricity' | 'gas';
  timestamp: number;
}

interface CachedRatesData {
  rates: ProcessedRate[];
  productCode: string;
  region: string;
  fuelType: 'electricity' | 'gas';
  timestamp: number;
}

interface CachedAccountData {
  data: ProcessedAccountData;
  timestamp: number;
}

interface CachedBalance {
  balance: number;
  timestamp: number;
}

const CACHE_KEYS = {
  CONSUMPTION: (fuelType: string, mpanOrMprn: string) => `${CACHE_PREFIX}consumption:${fuelType}:${mpanOrMprn}`,
  RATES: (fuelType: string, productCode: string, region: string) => `${CACHE_PREFIX}rates:${fuelType}:${productCode}:${region}`,
  ACCOUNT: (accountNumber: string) => `${CACHE_PREFIX}account:${accountNumber}`,
  BALANCE: (accountNumber: string) => `${CACHE_PREFIX}balance:${accountNumber}`,
  COMPARISON_RATES: (fuelType: string, productCode: string, region: string) => `${CACHE_PREFIX}comparison_rates:${fuelType}:${productCode}:${region}`,
  STANDING_CHARGE: (fuelType: string, productCode: string, region: string) => `${CACHE_PREFIX}standing_charge:${fuelType}:${productCode}:${region}`,
};

const CACHE_DURATIONS = {
  CONSUMPTION: 15 * 60 * 1000, // 15 minutes
  RATES: 30 * 60 * 1000, // 30 minutes
  ACCOUNT: 24 * 60 * 60 * 1000, // 24 hours
  BALANCE: 5 * 60 * 1000, // 5 minutes
  STANDING_CHARGE: 24 * 60 * 60 * 1000, // 24 hours
};

export async function getCachedConsumption(
  fuelType: 'electricity' | 'gas',
  mpanOrMprn: string
): Promise<CachedConsumptionData | null> {
  try {
    const key = CACHE_KEYS.CONSUMPTION(fuelType, mpanOrMprn);
    const cached = await AsyncStorage.getItem(key);
    
    if (!cached) {
      console.log(`[Cache] No cached ${fuelType} consumption found`);
      return null;
    }
    
    const parsed: CachedConsumptionData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age > CACHE_DURATIONS.CONSUMPTION) {
      console.log(`[Cache] ${fuelType} consumption cache expired (${Math.round(age / 1000 / 60)}min old)`);
      return null;
    }
    
    console.log(`[Cache] Using cached ${fuelType} consumption (${parsed.data.length} entries, ${Math.round(age / 1000 / 60)}min old)`);
    return parsed;
  } catch (error) {
    console.error('[Cache] Error reading consumption cache:', error);
    return null;
  }
}

export async function setCachedConsumption(
  fuelType: 'electricity' | 'gas',
  mpanOrMprn: string,
  serialNumber: string,
  data: ConsumptionEntry[],
  lastFetchDate: string
): Promise<void> {
  try {
    const key = CACHE_KEYS.CONSUMPTION(fuelType, mpanOrMprn);
    const cacheData: CachedConsumptionData = {
      data,
      lastFetchDate,
      mpanOrMprn,
      serialNumber,
      fuelType,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`[Cache] Cached ${data.length} ${fuelType} consumption entries`);
  } catch (error) {
    console.error('[Cache] Error writing consumption cache:', error);
  }
}

export async function getCachedRates(
  fuelType: 'electricity' | 'gas',
  productCode: string,
  region: string
): Promise<CachedRatesData | null> {
  try {
    const key = CACHE_KEYS.RATES(fuelType, productCode, region);
    const cached = await AsyncStorage.getItem(key);
    
    if (!cached) {
      console.log(`[Cache] No cached ${fuelType} rates found`);
      return null;
    }
    
    const parsed: CachedRatesData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age > CACHE_DURATIONS.RATES) {
      console.log(`[Cache] ${fuelType} rates cache expired (${Math.round(age / 1000 / 60)}min old)`);
      return null;
    }
    
    // Restore dates
    const rates = parsed.rates.map(r => ({
      ...r,
      validFrom: new Date(r.validFrom),
      validTo: new Date(r.validTo),
    }));
    
    console.log(`[Cache] Using cached ${fuelType} rates (${rates.length} rates, ${Math.round(age / 1000 / 60)}min old)`);
    return { ...parsed, rates };
  } catch (error) {
    console.error('[Cache] Error reading rates cache:', error);
    return null;
  }
}

export async function setCachedRates(
  fuelType: 'electricity' | 'gas',
  productCode: string,
  region: string,
  rates: ProcessedRate[]
): Promise<void> {
  try {
    const key = CACHE_KEYS.RATES(fuelType, productCode, region);
    const cacheData: CachedRatesData = {
      rates,
      productCode,
      region,
      fuelType,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`[Cache] Cached ${rates.length} ${fuelType} rates`);
  } catch (error) {
    console.error('[Cache] Error writing rates cache:', error);
  }
}

export async function getCachedAccount(accountNumber: string): Promise<CachedAccountData | null> {
  try {
    const key = CACHE_KEYS.ACCOUNT(accountNumber);
    const cached = await AsyncStorage.getItem(key);
    
    if (!cached) {
      console.log('[Cache] No cached account data found');
      return null;
    }
    
    const parsed: CachedAccountData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age > CACHE_DURATIONS.ACCOUNT) {
      console.log(`[Cache] Account cache expired (${Math.round(age / 1000 / 60 / 60)}h old)`);
      return null;
    }
    
    console.log(`[Cache] Using cached account data (${Math.round(age / 1000 / 60 / 60)}h old)`);
    return parsed;
  } catch (error) {
    console.error('[Cache] Error reading account cache:', error);
    return null;
  }
}

export async function setCachedAccount(accountNumber: string, data: ProcessedAccountData): Promise<void> {
  try {
    const key = CACHE_KEYS.ACCOUNT(accountNumber);
    const cacheData: CachedAccountData = {
      data,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    console.log('[Cache] Cached account data');
  } catch (error) {
    console.error('[Cache] Error writing account cache:', error);
  }
}

export async function getCachedBalance(accountNumber: string): Promise<CachedBalance | null> {
  try {
    const key = CACHE_KEYS.BALANCE(accountNumber);
    const cached = await AsyncStorage.getItem(key);
    
    if (!cached) {
      console.log('[Cache] No cached balance found');
      return null;
    }
    
    const parsed: CachedBalance = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age > CACHE_DURATIONS.BALANCE) {
      console.log(`[Cache] Balance cache expired (${Math.round(age / 1000 / 60)}min old)`);
      return null;
    }
    
    console.log(`[Cache] Using cached balance (${Math.round(age / 1000)}s old)`);
    return parsed;
  } catch (error) {
    console.error('[Cache] Error reading balance cache:', error);
    return null;
  }
}

export async function setCachedBalance(accountNumber: string, balance: number): Promise<void> {
  try {
    const key = CACHE_KEYS.BALANCE(accountNumber);
    const cacheData: CachedBalance = {
      balance,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    console.log('[Cache] Cached balance');
  } catch (error) {
    console.error('[Cache] Error writing balance cache:', error);
  }
}

export async function getCachedComparisonRates(
  fuelType: 'electricity' | 'gas',
  productCode: string,
  region: string
): Promise<CachedRatesData | null> {
  try {
    const key = CACHE_KEYS.COMPARISON_RATES(fuelType, productCode, region);
    const cached = await AsyncStorage.getItem(key);
    
    if (!cached) {
      return null;
    }
    
    const parsed: CachedRatesData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age > CACHE_DURATIONS.RATES) {
      return null;
    }
    
    const rates = parsed.rates.map(r => ({
      ...r,
      validFrom: new Date(r.validFrom),
      validTo: new Date(r.validTo),
    }));
    
    console.log(`[Cache] Using cached comparison ${fuelType} rates (${rates.length} rates)`);
    return { ...parsed, rates };
  } catch (error) {
    console.error('[Cache] Error reading comparison rates cache:', error);
    return null;
  }
}

export async function setCachedComparisonRates(
  fuelType: 'electricity' | 'gas',
  productCode: string,
  region: string,
  rates: ProcessedRate[]
): Promise<void> {
  try {
    const key = CACHE_KEYS.COMPARISON_RATES(fuelType, productCode, region);
    const cacheData: CachedRatesData = {
      rates,
      productCode,
      region,
      fuelType,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`[Cache] Cached ${rates.length} comparison ${fuelType} rates`);
  } catch (error) {
    console.error('[Cache] Error writing comparison rates cache:', error);
  }
}

export async function getCachedStandingCharge(
  fuelType: 'electricity' | 'gas',
  productCode: string,
  region: string
): Promise<number | null> {
  try {
    const key = CACHE_KEYS.STANDING_CHARGE(fuelType, productCode, region);
    const cached = await AsyncStorage.getItem(key);
    
    if (!cached) {
      return null;
    }
    
    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age > CACHE_DURATIONS.STANDING_CHARGE) {
      return null;
    }
    
    console.log(`[Cache] Using cached ${fuelType} standing charge: ${parsed.value}p`);
    return parsed.value;
  } catch (error) {
    console.error('[Cache] Error reading standing charge cache:', error);
    return null;
  }
}

export async function setCachedStandingCharge(
  fuelType: 'electricity' | 'gas',
  productCode: string,
  region: string,
  value: number
): Promise<void> {
  try {
    const key = CACHE_KEYS.STANDING_CHARGE(fuelType, productCode, region);
    const cacheData = {
      value,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`[Cache] Cached ${fuelType} standing charge: ${value}p`);
  } catch (error) {
    console.error('[Cache] Error writing standing charge cache:', error);
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
    
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`[Cache] Cleared ${cacheKeys.length} cache entries`);
    }
  } catch (error) {
    console.error('[Cache] Error clearing cache:', error);
  }
}
