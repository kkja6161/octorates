import { EnergyRatesResponse, ProcessedRate, ProductsResponse, TariffInfo, ConsumptionResponse, StandingChargesResponse, AccountResponse, ProcessedAccountData, ProcessedTariffAgreement, AccountBalance, BillsResponse } from '@/types/energy';
import { DEFAULT_GSP_REGION, buildProductListUrl, buildFlexibleTariffUrl, buildGasTrackerTariffUrl, OCTOPUS_API_BASE, PRODUCT_CODE_MAPPING } from '@/constants/octopus';

function normalizeProductCode(productCode: string): string {
  return PRODUCT_CODE_MAPPING[productCode] || productCode;
}

function getProductAndTariffCodes(productCode: string, fuelType: 'electricity' | 'gas', region: string, registerType: '1R' | '2R' = '1R'): { product: string; tariff: string } {
  const normalizedCode = normalizeProductCode(productCode);
  const tariffPrefix = fuelType === 'gas' ? 'G-1R' : `E-${registerType}`;
  
  // The API product code is the same as the tariff code middle section for most products
  // But we need to handle the case where the product exists differently in the API
  return {
    product: normalizedCode,
    tariff: `${tariffPrefix}-${normalizedCode}-${region}`,
  };
}

function buildSmartTariffUrl(
  productCode: string,
  gspRegion: string,
  fuelType: 'electricity' | 'gas',
  registerType: '1R' | '2R' = '1R'
): string {
  const { product, tariff } = getProductAndTariffCodes(productCode, fuelType, gspRegion, registerType);
  const tariffType = fuelType === 'gas' ? 'gas-tariffs' : 'electricity-tariffs';
  
  const url = `${OCTOPUS_API_BASE}/v1/products/${product}/${tariffType}/${tariff}/standard-unit-rates/`;
  console.log(`[Energy API] Built tariff URL: ${url}`);
  return url;
}

function buildSmartStandingChargeUrl(
  productCode: string,
  gspRegion: string,
  fuelType: 'electricity' | 'gas'
): string {
  const { product, tariff } = getProductAndTariffCodes(productCode, fuelType, gspRegion, '1R');
  const tariffType = fuelType === 'gas' ? 'gas-tariffs' : 'electricity-tariffs';
  
  const url = `${OCTOPUS_API_BASE}/v1/products/${product}/${tariffType}/${tariff}/standing-charges/`;
  console.log(`[Energy API] Built standing charge URL: ${url}`);
  return url;
}

async function fetchRatesWithRegisterType(
  gspRegion: string,
  tariffCode: string,
  fuelType: 'electricity' | 'gas',
  registerType: '1R' | '2R',
  periodFrom?: string,
  periodTo?: string
): Promise<EnergyRatesResponse | null> {
  const url = buildSmartTariffUrl(tariffCode, gspRegion, fuelType, registerType);
  
  const allResults: EnergyRatesResponse['results'] = [];
  
  const params = new URLSearchParams();
  params.append('page_size', '17520');
  if (periodFrom) params.append('period_from', periodFrom);
  if (periodTo) params.append('period_to', periodTo);
  
  let nextUrl: string | null = params.toString() ? `${url}?${params.toString()}` : url;
  
  console.log(`[Energy API] Trying ${registerType} tariff: ${nextUrl}`);
  
  try {
    let pageCount = 0;
    while (nextUrl) {
      pageCount++;
      const response = await fetch(nextUrl);
      
      if (!response.ok) {
        console.log(`[Energy API] ${registerType} tariff returned status ${response.status}`);
        return null;
      }
      
      const data: EnergyRatesResponse = await response.json();
      console.log(`[Energy API] ${registerType} tariff - Page ${pageCount} received:`, data.results.length, 'rates');
      
      allResults.push(...data.results);
      nextUrl = data.next;
    }
    
    if (allResults.length === 0) {
      return null;
    }
    
    return {
      count: allResults.length,
      next: null,
      previous: null,
      results: allResults,
    };
  } catch (error) {
    console.log(`[Energy API] ${registerType} tariff fetch error:`, error);
    return null;
  }
}

export async function fetchEnergyRates(
  gspRegion: string = DEFAULT_GSP_REGION,
  productCode?: string,
  periodFrom?: string,
  periodTo?: string,
  fuelType: 'electricity' | 'gas' = 'electricity'
): Promise<EnergyRatesResponse> {
  const rawTariffCode = productCode || 'AGILE-FLEX-22-11-25';
  const tariffCode = normalizeProductCode(rawTariffCode);
  
  console.log(`[Energy API] ========== FETCH ${fuelType.toUpperCase()} RATES ==========`);
  console.log(`[Energy API] Product: ${tariffCode}, Region: ${gspRegion}`);
  console.log('[Energy API] Period from:', periodFrom);
  
  // For electricity, try single register (1R) first, then two register (2R) for Eco 7 tariffs
  if (fuelType === 'electricity') {
    // Try 1R (single register / standard) first
    let result = await fetchRatesWithRegisterType(gspRegion, tariffCode, fuelType, '1R', periodFrom, periodTo);
    
    if (result && result.results.length > 0) {
      console.log(`[Energy API] Found ${result.results.length} rates with 1R (single register)`);
      return result;
    }
    
    // Try 2R (two register / Eco 7) if 1R fails
    console.log('[Energy API] 1R failed, trying 2R (Eco 7 / two register)...');
    result = await fetchRatesWithRegisterType(gspRegion, tariffCode, fuelType, '2R', periodFrom, periodTo);
    
    if (result && result.results.length > 0) {
      console.log(`[Energy API] Found ${result.results.length} rates with 2R (two register)`);
      // For Eco 7 tariffs, filter to get only the standard/day rate (not the off-peak/night rate)
      // Standard rates typically have valid_from times that don't start at 00:30 or similar off-peak times
      return result;
    }
    
    console.log('[Energy API] No rates found with either register type');
    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
  }
  
  // For gas, use the smart URL builder
  const url = buildSmartTariffUrl(tariffCode, gspRegion, fuelType);
  
  console.log(`[Energy API] Built URL: ${url}`);
  
  const allResults: EnergyRatesResponse['results'] = [];
  
  const params = new URLSearchParams();
  params.append('page_size', '17520');
  if (periodFrom) params.append('period_from', periodFrom);
  if (periodTo) params.append('period_to', periodTo);
  
  let nextUrl: string | null = params.toString() ? `${url}?${params.toString()}` : url;
  
  try {
    let pageCount = 0;
    while (nextUrl) {
      pageCount++;
      console.log(`[Energy API] ${fuelType} rates - Fetching page ${pageCount}...`);
      
      const response = await fetch(nextUrl);
      
      console.log(`[Energy API] ${fuelType} rates - Response status:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Energy API] Failed to fetch rates:', response.status, errorText);
        throw new Error(`Failed to fetch energy rates: ${response.status}`);
      }
      
      const data: EnergyRatesResponse = await response.json();
      console.log(`[Energy API] ${fuelType} rates - Page ${pageCount} received:`, data.results.length, 'rates');
      
      allResults.push(...data.results);
      nextUrl = data.next;
    }
    
    console.log(`[Energy API] ${fuelType} rates - Total rates:`, allResults.length);
    
    return {
      count: allResults.length,
      next: null,
      previous: null,
      results: allResults,
    };
  } catch (error) {
    console.error('[Energy API] Error fetching rates:', error);
    throw error;
  }
}

export function processRates(rates: EnergyRatesResponse, isDailyRate: boolean = false): ProcessedRate[] {
  const now = new Date();
  
  return rates.results.map((rate) => {
    const validFrom = new Date(rate.valid_from);
    const validTo = rate.valid_to ? new Date(rate.valid_to) : new Date('2099-12-31T23:59:59Z');
    
    const isCurrent = now >= validFrom && now < validTo;
    const isUpcoming = validFrom > now;
    
    return {
      price: rate.value_inc_vat,
      time: isDailyRate 
        ? validFrom.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        : validFrom.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      validFrom,
      validTo,
      isCurrent,
      isUpcoming,
    };
  }).sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
}

export function getCurrentRate(processedRates: ProcessedRate[]): ProcessedRate | null {
  return processedRates.find(rate => rate.isCurrent) || null;
}

export function getTodayRates(processedRates: ProcessedRate[]): ProcessedRate[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return processedRates.filter(rate => {
    return rate.validFrom >= today && rate.validFrom < tomorrow;
  });
}

export function getTomorrowRates(processedRates: ProcessedRate[]): ProcessedRate[] {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  
  return processedRates.filter(rate => {
    return rate.validFrom >= tomorrow && rate.validFrom < dayAfter;
  });
}

export async function fetchProducts(): Promise<ProductsResponse> {
  const url = buildProductListUrl();
  
  console.log('[Energy API] Fetching products from:', url);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Energy API] Failed to fetch products:', response.status, errorText);
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[Energy API] Received', data.count, 'products');
    
    return data;
  } catch (error) {
    console.error('[Energy API] Error fetching products:', error);
    throw error;
  }
}

export function getAvailableTariffs(products: ProductsResponse): TariffInfo[] {
  const tariffs: TariffInfo[] = [];
  
  products.results.forEach(product => {
    const isOctopusBranded = product.brand === 'OCTOPUS_ENERGY' || 
                             product.code.includes('AGILE') || 
                             product.code.includes('TRACKER') || 
                             product.code.includes('GO') ||
                             product.code.includes('COSY') ||
                             product.code.includes('INTELLI');
    
    if (isOctopusBranded && !product.is_business && !product.is_prepay && !product.is_restricted) {
      tariffs.push({
        code: product.code,
        productCode: product.code,
        displayName: product.display_name,
        description: product.description,
        isVariable: product.is_variable,
        isGreen: product.is_green,
      });
    }
  });
  
  return tariffs;
}

export async function fetchFlexibleRate(
  gspRegion: string = DEFAULT_GSP_REGION,
  fuelType: 'electricity' | 'gas' = 'electricity'
): Promise<number | null> {
  const url = buildFlexibleTariffUrl(gspRegion, fuelType);
  
  const params = new URLSearchParams();
  params.append('page_size', '1');
  
  const fullUrl = `${url}?${params.toString()}`;
  
  console.log('[Energy API] Fetching Flexible Octopus rate from:', fullUrl);
  
  try {
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      console.error('[Energy API] Failed to fetch Flexible rate:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].value_inc_vat;
    }
    
    return null;
  } catch (error) {
    console.error('[Energy API] Error fetching Flexible rate:', error);
    return null;
  }
}

export async function fetchGasTrackerRates(
  gspRegion: string = DEFAULT_GSP_REGION,
  periodFrom?: string,
  periodTo?: string
): Promise<EnergyRatesResponse> {
  const url = buildGasTrackerTariffUrl(gspRegion);
  
  console.log(`[Energy API] ========== FETCH GAS TRACKER RATES ==========`);
  console.log(`[Energy API] Gas Tracker URL: ${url}`);
  console.log(`[Energy API] Region: ${gspRegion}`);
  
  const allResults: EnergyRatesResponse['results'] = [];
  
  const params = new URLSearchParams();
  params.append('page_size', '17520');
  if (periodFrom) params.append('period_from', periodFrom);
  if (periodTo) params.append('period_to', periodTo);
  
  let nextUrl: string | null = params.toString() ? `${url}?${params.toString()}` : url;
  
  try {
    let pageCount = 0;
    while (nextUrl) {
      pageCount++;
      console.log(`[Energy API] Gas Tracker - Fetching page ${pageCount}...`);
      
      const response = await fetch(nextUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Energy API] Failed to fetch Gas Tracker rates:', response.status, errorText);
        throw new Error(`Failed to fetch Gas Tracker rates: ${response.status}`);
      }
      
      const data: EnergyRatesResponse = await response.json();
      console.log(`[Energy API] Gas Tracker - Page ${pageCount} received:`, data.results.length, 'rates');
      
      allResults.push(...data.results);
      nextUrl = data.next;
    }
    
    console.log(`[Energy API] Gas Tracker - Total rates:`, allResults.length);
    
    return {
      count: allResults.length,
      next: null,
      previous: null,
      results: allResults,
    };
  } catch (error) {
    console.error('[Energy API] Error fetching Gas Tracker rates:', error);
    throw error;
  }
}

export async function fetchComparisonTariffRates(
  gspRegion: string = DEFAULT_GSP_REGION,
  productCode: string,
  fuelType: 'electricity' | 'gas' = 'electricity',
  periodFrom?: string,
  periodTo?: string
): Promise<ProcessedRate[]> {
  console.log(`[Energy API] ========== FETCH COMPARISON TARIFF RATES ==========`);
  console.log(`[Energy API] Comparison tariff: ${productCode}`);
  console.log(`[Energy API] Region: ${gspRegion}`);
  console.log(`[Energy API] Fuel type: ${fuelType}`);
  console.log(`[Energy API] Period from: ${periodFrom}`);
  
  try {
    // First try with the provided date range
    let data = await fetchEnergyRates(
      gspRegion,
      productCode,
      periodFrom,
      periodTo,
      fuelType
    );
    
    // If no results and we have a date filter, try without it
    if (data.results.length === 0 && periodFrom) {
      console.log(`[Energy API] No comparison rates found with date filter, trying without...`);
      data = await fetchEnergyRates(
        gspRegion,
        productCode,
        undefined,
        undefined,
        fuelType
      );
    }
    
    const isDailyRate = !productCode.includes('AGILE');
    const processed = processRates(data, isDailyRate);
    console.log(`[Energy API] Comparison tariff rates processed count: ${processed.length}`);
    
    if (processed.length > 0) {
      console.log(`[Energy API] Comparison rate sample - first: ${processed[0].price}p, last: ${processed[processed.length - 1].price}p`);
    } else {
      console.log(`[Energy API] No comparison rates available for ${productCode} (${fuelType})`);
    }
    
    return processed;
  } catch (error) {
    // Silently handle errors for comparison rates - they're not critical
    console.log(`[Energy API] Comparison rates not available for ${productCode} (${fuelType}):`, error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

export async function fetchStandingCharge(
  productCode: string,
  gspRegion: string = DEFAULT_GSP_REGION,
  fuelType: 'electricity' | 'gas' = 'electricity',
  periodFrom?: string,
  periodTo?: string
): Promise<number | null> {
  const url = buildSmartStandingChargeUrl(productCode, gspRegion, fuelType);
  
  const params = new URLSearchParams();
  if (periodFrom) params.append('period_from', periodFrom);
  if (periodTo) params.append('period_to', periodTo);
  
  const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
  
  console.log(`[Energy API] Fetching standing charge from: ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      // Silently handle 404s - product may not exist
      if (response.status === 404) {
        console.log(`[Energy API] Standing charge not available for ${productCode} (${fuelType})`);
        return null;
      }
      const errorText = await response.text();
      console.error('[Energy API] Failed to fetch standing charge:', response.status, errorText);
      return null;
    }
    
    const data: StandingChargesResponse = await response.json();
    
    if (data.results && data.results.length > 0) {
      const mostRecent = data.results[0];
      console.log(`[Energy API] Standing charge for ${productCode} (${fuelType}):`, mostRecent.value_inc_vat, 'p/day');
      return mostRecent.value_inc_vat;
    }
    
    return null;
  } catch (error) {
    console.log('[Energy API] Standing charge fetch error (non-critical):', error);
    return null;
  }
}

// Tariff code to friendly name mapping
const TARIFF_DISPLAY_NAMES: Record<string, string> = {
  'AGILE-FLEX-22-11-25': 'Agile Octopus November 2022',
  'AGILE-23-12-06': 'Agile Octopus December 2023',
  'AGILE-24-10-01': 'Agile Octopus October 2024',
  'AGILE-BB-24-10-01': 'Agile Octopus Business',
  'VAR-22-11-01': 'Flexible Octopus',
  'SILVER-24-04-03': 'Octopus Tracker April 2024',
  'SILVER-24-12-31': 'Octopus Tracker December 2024',
  'GO-VAR-22-10-14': 'Octopus Go',
  'COSY-22-12-08': 'Cosy Octopus',
  'INTELLI-VAR-22-10-14': 'Intelligent Octopus Go',
  'INTELLI-BB-VAR-22-10-14': 'Intelligent Octopus Flux',
  'OE-FIX-12M-25-11-24': 'Octopus 12M Fixed November 2025',
  'FIX-12M-25-11-24': 'Octopus 12M Fixed November 2025',
  'LOYAL-FIX-12M-25-12-03': 'Loyal Octopus 12M Fixed December 2025',
  'PREPAY-VAR-18-09-21': 'Flexible Octopus Smart Pay as You Go',
  'FLUX-IMPORT-23-02-14': 'Octopus Flux Import',
  'FLUX-EXPORT-23-02-14': 'Octopus Flux Export',
  'OUTGOING-FIX-12M-19-05-13': 'Outgoing Octopus Fixed',
  'OUTGOING-LITE-FIX-12M-25-01-28': 'Outgoing Octopus Lite',
};

function getTariffDisplayName(tariffCode: string): string {
  // Extract the product code part (remove E-1R- or G-1R- prefix and region suffix)
  const parts = tariffCode.split('-');
  if (parts.length >= 3) {
    // Remove the first two parts (E or G, and 1R or 2R)
    const withoutPrefix = parts.slice(2);
    // Remove the last part (region code)
    const productParts = withoutPrefix.slice(0, -1);
    const productCode = productParts.join('-');
    
    if (TARIFF_DISPLAY_NAMES[productCode]) {
      return TARIFF_DISPLAY_NAMES[productCode];
    }
  }
  
  // Fallback: try matching the raw code
  for (const [key, name] of Object.entries(TARIFF_DISPLAY_NAMES)) {
    if (tariffCode.includes(key)) {
      return name;
    }
  }
  
  // Final fallback: return formatted code
  return tariffCode.replace(/-/g, ' ').replace(/^[EG] [12]R /i, '');
}

function getProductCodeFromTariff(tariffCode: string): string {
  // Extract product code from tariff code (e.g., "E-1R-AGILE-FLEX-22-11-25-J" -> "AGILE-FLEX-22-11-25")
  const parts = tariffCode.split('-');
  if (parts.length >= 3) {
    // Remove first two parts (E/G and 1R/2R) and last part (region)
    return parts.slice(2, -1).join('-');
  }
  return tariffCode;
}

function isEco7Tariff(tariffCode: string): boolean {
  return tariffCode.includes('-2R-');
}

function getRegionFromTariff(tariffCode: string): string {
  // Region is the last character of the tariff code
  return tariffCode.charAt(tariffCode.length - 1);
}

export async function fetchAccountData(
  accountNumber: string,
  apiKey: string
): Promise<AccountResponse> {
  const url = `${OCTOPUS_API_BASE}/v1/accounts/${accountNumber}/`;
  
  console.log('[Energy API] ========== FETCH ACCOUNT DATA ==========');
  console.log('[Energy API] Account:', accountNumber);
  console.log('[Energy API] URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Energy API] Failed to fetch account data:', response.status, errorText);
      throw new Error(`Failed to fetch account data: ${response.status}`);
    }
    
    const data: AccountResponse = await response.json();
    console.log('[Energy API] Account data keys:', Object.keys(data));
    if (data.properties?.length > 0) {
      console.log('[Energy API] First property keys:', Object.keys(data.properties[0]));
    }
    console.log('[Energy API] Account data received:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('[Energy API] Error fetching account data:', error);
    throw error;
  }
}

export function processAccountData(accountData: AccountResponse): ProcessedAccountData | null {
  console.log('[Energy API] Processing account data...');
  
  if (!accountData.properties || accountData.properties.length === 0) {
    console.error('[Energy API] No properties found in account data');
    return null;
  }
  
  // Get the active property (no moved_out_at date)
  const activeProperty = accountData.properties.find(p => !p.moved_out_at) || accountData.properties[0];
  
  const movedInAt = new Date(activeProperty.moved_in_at);
  
  // Process electricity meter points (exclude export meters)
  const electricityPoints = activeProperty.electricity_meter_points.filter(mp => !mp.is_export);
  let electricityData = null;
  let region = '';
  
  if (electricityPoints.length > 0) {
    const elecPoint = electricityPoints[0];
    const serialNumbers = elecPoint.meters.map(m => m.serial_number);
    
    // Check if any meter has Eco 7 (E-2R) rates
    const hasEco7 = elecPoint.meters.some(m => 
      m.registers.some(r => r.rate === 'OFFPEAK' || r.rate === 'NIGHT')
    );
    
    // Process agreements
    const agreements: ProcessedTariffAgreement[] = elecPoint.agreements.map(a => {
      const isEco7 = isEco7Tariff(a.tariff_code);
      const validFrom = new Date(a.valid_from);
      const validTo = a.valid_to ? new Date(a.valid_to) : null;
      const now = new Date();
      const isActive = validFrom <= now && (validTo === null || validTo > now);
      
      // Get region from first tariff
      if (!region) {
        region = getRegionFromTariff(a.tariff_code);
      }
      
      return {
        tariffCode: a.tariff_code,
        productCode: getProductCodeFromTariff(a.tariff_code),
        displayName: getTariffDisplayName(a.tariff_code),
        validFrom,
        validTo,
        isActive,
        isEco7,
      };
    }).sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
    
    const currentAgreement = agreements.find(a => a.isActive) || null;
    
    electricityData = {
      mpan: elecPoint.mpan,
      serialNumbers,
      agreements,
      currentAgreement,
      isEco7: hasEco7 || (currentAgreement?.isEco7 ?? false),
    };
  }
  
  // Process gas meter points
  let gasData = null;
  if (activeProperty.gas_meter_points.length > 0) {
    const gasPoint = activeProperty.gas_meter_points[0];
    const serialNumbers = gasPoint.meters.map(m => m.serial_number);
    
    const agreements: ProcessedTariffAgreement[] = gasPoint.agreements.map(a => {
      const validFrom = new Date(a.valid_from);
      const validTo = a.valid_to ? new Date(a.valid_to) : null;
      const now = new Date();
      const isActive = validFrom <= now && (validTo === null || validTo > now);
      
      // Get region from gas tariff if we don't have it
      if (!region) {
        region = getRegionFromTariff(a.tariff_code);
      }
      
      return {
        tariffCode: a.tariff_code,
        productCode: getProductCodeFromTariff(a.tariff_code),
        displayName: getTariffDisplayName(a.tariff_code),
        validFrom,
        validTo,
        isActive,
        isEco7: false,
      };
    }).sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
    
    const currentAgreement = agreements.find(a => a.isActive) || null;
    
    gasData = {
      mprn: gasPoint.mprn,
      serialNumbers,
      agreements,
      currentAgreement,
    };
  }
  
  const result: ProcessedAccountData = {
    accountNumber: accountData.number,
    movedInAt,
    region,
    electricity: electricityData,
    gas: gasData,
  };
  
  console.log('[Energy API] Processed account data:', JSON.stringify(result, null, 2));
  
  return result;
}

export async function fetchConsumption(
  mpanOrMprn: string,
  serialNumber: string,
  apiKey: string,
  fuelType: 'electricity' | 'gas' = 'electricity',
  periodFrom?: string,
  periodTo?: string,
  days?: number
): Promise<ConsumptionResponse> {
  const endpoint = fuelType === 'electricity' 
    ? `electricity-meter-points/${mpanOrMprn}/meters/${serialNumber}/consumption`
    : `gas-meter-points/${mpanOrMprn}/meters/${serialNumber}/consumption`;
  
  const baseUrl = `${OCTOPUS_API_BASE}/v1/${endpoint}/`;
  
  const allResults: ConsumptionResponse['results'] = [];
  
  const params = new URLSearchParams();
  // Fixed page size of 17520 to ensure we get all consumption data
  const pageSize = 17520;
  params.append('page_size', pageSize.toString());
  params.append('order_by', 'period');
  if (periodFrom) params.append('period_from', periodFrom);
  if (periodTo) params.append('period_to', periodTo);
  
  let nextUrl: string | null = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  
  console.log(`[Energy API] ========== FETCH ${fuelType.toUpperCase()} CONSUMPTION ==========`);
  console.log(`[Energy API] MPAN/MPRN: ${mpanOrMprn}`);
  console.log(`[Energy API] Serial: ${serialNumber}`);
  console.log(`[Energy API] Days requested: ${days}`);
  console.log(`[Energy API] Period from: ${periodFrom}`);
  console.log(`[Energy API] Page size: ${pageSize}`);
  console.log(`[Energy API] Initial URL:`, nextUrl);
  
  try {
    let pageCount = 0;
    while (nextUrl) {
      pageCount++;
      console.log(`[Energy API] ${fuelType} - Fetching page ${pageCount}...`);
      
      const response: Response = await fetch(nextUrl, {
        headers: {
          'Authorization': `Basic ${btoa(apiKey + ':')}`,
        },
      });
      
      console.log(`[Energy API] ${fuelType} - Response status:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Energy API] ${fuelType} - FAILED:`, response.status, errorText);
        throw new Error(`Failed to fetch consumption: ${response.status}`);
      }
      
      const data: ConsumptionResponse = await response.json();
      console.log(`[Energy API] ${fuelType} - Page ${pageCount} received:`, data.results.length, 'entries');
      console.log(`[Energy API] ${fuelType} - API total count:`, data.count);
      console.log(`[Energy API] ${fuelType} - Has next page:`, !!data.next);
      
      if (data.results.length > 0) {
        const firstInPage = data.results[0];
        const lastInPage = data.results[data.results.length - 1];
        console.log(`[Energy API] ${fuelType} - Page ${pageCount} date range: ${lastInPage.interval_start} to ${firstInPage.interval_end}`);
      }
      
      allResults.push(...data.results);
      nextUrl = data.next;
      
      if (nextUrl) {
        console.log(`[Energy API] ${fuelType} - Next page URL:`, nextUrl);
      }
    }
    
    console.log(`[Energy API] ${fuelType} - ========== FETCH COMPLETE ==========`);
    console.log(`[Energy API] ${fuelType} - Total pages fetched:`, pageCount);
    console.log(`[Energy API] ${fuelType} - Total entries:`, allResults.length);
    
    if (allResults.length > 0) {
      const firstEntry = allResults[0];
      const lastEntry = allResults[allResults.length - 1];
      console.log(`[Energy API] ${fuelType} - Overall date range: ${lastEntry.interval_start} to ${firstEntry.interval_end}`);
      
      // Count unique days
      const uniqueDays = new Set<string>();
      allResults.forEach(entry => {
        const date = new Date(entry.interval_start).toISOString().split('T')[0];
        uniqueDays.add(date);
      });
      console.log(`[Energy API] ${fuelType} - Unique days in data:`, uniqueDays.size);
      console.log(`[Energy API] ${fuelType} - Days list:`, Array.from(uniqueDays).sort().join(', '));
    } else {
      console.log(`[Energy API] ${fuelType} - WARNING: No results returned!`);
    }
    
    return {
      count: allResults.length,
      next: null,
      previous: null,
      results: allResults,
    };
  } catch (error) {
    console.error(`[Energy API] ${fuelType} - ERROR:`, error);
    throw error;
  }
}

export async function fetchAccountBalance(
  accountNumber: string,
  apiKey: string
): Promise<AccountBalance> {
  const url = `${OCTOPUS_API_BASE}/v1/accounts/${accountNumber}/`;
  
  console.log('[Energy API] ========== FETCH ACCOUNT BALANCE ==========');
  console.log('[Energy API] Account:', accountNumber);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Energy API] Failed to fetch account balance:', response.status, errorText);
      throw new Error(`Failed to fetch account balance: ${response.status}`);
    }
    
    const data = await response.json();
    
    let balance = 0;
    
    // Check for ledger_balance first (most accurate for current balance)
    if (typeof data.ledger_balance === 'number') {
      balance = data.ledger_balance;
      console.log('[Energy API] Using ledger_balance:', balance);
    } else if (typeof data.balance === 'number') {
      balance = data.balance;
      console.log('[Energy API] Using balance:', balance);
    } else if (data.properties?.[0]?.balance !== undefined) {
      balance = data.properties[0].balance;
      console.log('[Energy API] Using property balance:', balance);
    } else {
      console.log('[Energy API] No balance found in account response');
    }
    
    return { balance };
  } catch (error) {
    console.error('[Energy API] Error fetching account balance:', error);
    throw error;
  }
}

export async function fetchBills(
  accountNumber: string,
  apiKey: string
): Promise<BillsResponse> {
  const url = `${OCTOPUS_API_BASE}/v1/accounts/${accountNumber}/`;
  
  console.log('[Energy API] ========== FETCH BILLS ==========');
  console.log('[Energy API] Account:', accountNumber);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Energy API] Failed to fetch bills:', response.status, errorText);
      throw new Error(`Failed to fetch bills: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[Energy API] Bills received:', data.count);
    
    return data;
  } catch (error) {
    console.error('[Energy API] Error fetching bills:', error);
    throw error;
  }
}

async function obtainKrakenToken(apiKey: string): Promise<string | null> {
  const url = 'https://api.octopus.energy/v1/graphql/';
  
  const mutation = `
    mutation {
      obtainKrakenToken(input: {APIKey: "${apiKey}"}) {
        token
      }
    }
  `;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Energy API] Failed to obtain Kraken token:', response.status, errorText);
      return null;
    }
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('[Energy API] Kraken token errors:', JSON.stringify(result.errors, null, 2));
      return null;
    }
    
    const token = result.data?.obtainKrakenToken?.token;
    if (token) {
      console.log('[Energy API] Successfully obtained Kraken token');
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('[Energy API] Error obtaining Kraken token:', error);
    return null;
  }
}

export async function fetchLastBillDate(
  accountNumber: string,
  apiKey: string
): Promise<Date | null> {
  const url = 'https://api.octopus.energy/v1/graphql/';
  
  console.log('[Energy API] ========== FETCH LAST BILL DATE (GraphQL) ==========');
  console.log('[Energy API] Account:', accountNumber);
  
  // First, obtain a Kraken token
  const krakenToken = await obtainKrakenToken(apiKey);
  if (!krakenToken) {
    console.error('[Energy API] Could not obtain Kraken token');
    return null;
  }
  
  // Query to get the last bill's end date
  const query = `
    query AccountBills($accountNumber: String!) {
      account(accountNumber: $accountNumber) {
        bills(first: 12) {
          edges {
            node {
              toDate
              fromDate
              issuedDate
            }
          }
        }
      }
    }
  `;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': krakenToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { accountNumber },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Energy API] Failed to fetch bills via GraphQL:', response.status, errorText);
      return null;
    }
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('[Energy API] GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      return null;
    }
    
    const bills = result.data?.account?.bills?.edges;
    
    if (bills && bills.length > 0) {
      // Sort bills by periodEndDate descending to get the latest one
      // The API might return them in any order
      const sortedBills = bills
        .map((edge: any) => edge.node)
        .sort((a: any, b: any) => {
          return new Date(b.toDate).getTime() - new Date(a.toDate).getTime();
        });
        
      const lastBill = sortedBills[0];
      console.log('[Energy API] Found last bill:', lastBill);
      
      // We want to return the toDate of the last bill
      // The new billing period starts the day after this date
      if (lastBill.toDate) {
        return new Date(lastBill.toDate);
      }
    } else {
      console.log('[Energy API] No bills found in GraphQL response');
    }
    
    return null;
  } catch (error) {
    console.error('[Energy API] Error fetching last bill date:', error);
    return null;
  }
}
