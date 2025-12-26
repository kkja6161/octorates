import { TariffType } from '@/types/energy';

export const OCTOPUS_API_BASE = 'https://api.octopus.energy';

export const DEFAULT_PRODUCT_CODE = 'AGILE-FLEX-22-11-25';
export const DEFAULT_TARIFF_CODE: TariffType = 'AGILE-FLEX-22-11-25';
export const DEFAULT_GSP_REGION = 'C';

// Gas tracker tariff base - region letter is appended
export const GAS_TRACKER_PRODUCT = 'SILVER-24-12-31';
export const GAS_TRACKER_TARIFF_PREFIX = 'G-1R-SILVER-24-12-31';
export const FLEXIBLE_OCTOPUS_PRODUCT = 'VAR-22-11-01';
export const FLEXIBLE_ELECTRICITY_TARIFF = 'VAR-22-11-01';
// Flexible gas tariff base - region letter is appended
export const FLEXIBLE_GAS_TARIFF_PREFIX = 'G-1R-VAR-22-11-01';

// Map GSP (electricity) region to gas region letter
// Gas regions use different letters than electricity GSP regions
export const GSP_TO_GAS_REGION: Record<string, string> = {
  'A': 'EA',  // East Anglia
  'B': 'EM',  // East Midlands
  'C': 'LO',  // London
  'D': 'MN',  // Merseyside & North Wales
  'E': 'WM',  // West Midlands
  'F': 'NE',  // North East
  'G': 'NW',  // North West
  'H': 'SC',  // Scotland
  'J': 'SE',  // South East
  'K': 'SO',  // Southern
  'L': 'SW',  // South West
  'M': 'YK',  // Yorkshire
  'N': 'SM',  // South Wales
  'P': 'WN',  // North Wales & Mersey (alternate)
};

// Map product code variations to canonical product codes
// Some product codes have different formats in different contexts
export const PRODUCT_CODE_MAPPING: Record<string, string> = {
  // Standard variable tariffs
  'VAR-22-11-01': 'VAR-22-11-01',
  
  // Tracker tariffs (current)
  'SILVER-24-04-03': 'SILVER-24-04-03',
  'SILVER-24-12-31': 'SILVER-24-12-31',
  'SILVER-23-12-06': 'SILVER-23-12-06',
  
  // Agile tariffs
  'AGILE-FLEX-22-11-25': 'AGILE-FLEX-22-11-25',
  'AGILE-23-12-06': 'AGILE-23-12-06',
  'AGILE-24-10-01': 'AGILE-24-10-01',
  'AGILE-BB-24-10-01': 'AGILE-BB-24-10-01',
  
  // Go tariffs
  'GO-VAR-22-10-14': 'GO-VAR-22-10-14',
  
  // Cosy tariffs
  'COSY-22-12-08': 'COSY-22-12-08',
  
  // Intelligent tariffs
  'INTELLI-VAR-22-10-14': 'INTELLI-VAR-22-10-14',
  'INTELLI-BB-VAR-22-10-14': 'INTELLI-BB-VAR-22-10-14',
  
  // Fixed tariffs - Note: These use OE- prefix in the API
  'OE-FIX-12M-25-11-24': 'OE-FIX-12M-25-11-24',
  'FIX-12M-25-11-24': 'OE-FIX-12M-25-11-24',
  
  // Loyal fixed tariffs
  'LOYAL-FIX-12M-25-12-03': 'LOYAL-FIX-12M-25-12-03',
  
  // Prepay tariffs - Smart PAYG
  'PREPAY-VAR-18-09-21': 'PREPAY-VAR-18-09-21',
  
  // Flux tariffs
  'FLUX-IMPORT-23-02-14': 'FLUX-IMPORT-23-02-14',
  'FLUX-EXPORT-23-02-14': 'FLUX-EXPORT-23-02-14',
  
  // Outgoing/Export tariffs
  'OUTGOING-FIX-12M-19-05-13': 'OUTGOING-FIX-12M-19-05-13',
  'OUTGOING-LITE-FIX-12M-25-01-28': 'OUTGOING-LITE-FIX-12M-25-01-28',
};

export function buildTariffUrl(
  productCode: string,
  tariffCode: string,
  gspRegion: string,
  fuelType: 'electricity' | 'gas' = 'electricity',
  registerType: '1R' | '2R' = '1R'
): string {
  if (fuelType === 'gas') {
    // Gas tariffs use G-1R- prefix with the product code and region
    return `${OCTOPUS_API_BASE}/v1/products/${productCode}/gas-tariffs/G-1R-${productCode}-${gspRegion}/standard-unit-rates/`;
  }
  return `${OCTOPUS_API_BASE}/v1/products/${productCode}/${fuelType}-tariffs/E-${registerType}-${tariffCode}-${gspRegion}/standard-unit-rates/`;
}

// Build gas tracker tariff URL using the specific tracker product
export function buildGasTrackerTariffUrl(gspRegion: string): string {
  return `${OCTOPUS_API_BASE}/v1/products/${GAS_TRACKER_PRODUCT}/gas-tariffs/${GAS_TRACKER_TARIFF_PREFIX}-${gspRegion}/standard-unit-rates/`;
}

export function buildProductListUrl(): string {
  return `${OCTOPUS_API_BASE}/v1/products/`;
}

export function buildFlexibleTariffUrl(
  gspRegion: string,
  fuelType: 'electricity' | 'gas' = 'electricity'
): string {
  if (fuelType === 'gas') {
    // Gas tariffs use the GSP region letter directly at the end
    return `${OCTOPUS_API_BASE}/v1/products/${FLEXIBLE_OCTOPUS_PRODUCT}/gas-tariffs/${FLEXIBLE_GAS_TARIFF_PREFIX}-${gspRegion}/standard-unit-rates/`;
  }
  return `${OCTOPUS_API_BASE}/v1/products/${FLEXIBLE_OCTOPUS_PRODUCT}/${fuelType}-tariffs/E-1R-${FLEXIBLE_ELECTRICITY_TARIFF}-${gspRegion}/standard-unit-rates/`;
}

export function buildStandingChargeUrl(
  productCode: string,
  gspRegion: string,
  fuelType: 'electricity' | 'gas' = 'electricity'
): string {
  if (fuelType === 'gas') {
    return `${OCTOPUS_API_BASE}/v1/products/${productCode}/gas-tariffs/G-1R-${productCode}-${gspRegion}/standing-charges/`;
  }
  return `${OCTOPUS_API_BASE}/v1/products/${productCode}/${fuelType}-tariffs/E-1R-${productCode}-${gspRegion}/standing-charges/`;
}
