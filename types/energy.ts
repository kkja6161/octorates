export interface EnergyRate {
  value_exc_vat: number;
  value_inc_vat: number;
  valid_from: string;
  valid_to: string;
}

export interface EnergyRatesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EnergyRate[];
}

export interface ProcessedRate {
  price: number;
  time: string;
  validFrom: Date;
  validTo: Date;
  isCurrent: boolean;
  isUpcoming: boolean;
}

export type TariffType = 'AGILE-FLEX-22-11-25' | 'AGILE-23-12-06' | 'AGILE-OUTGOING-19-05-13';

export interface Product {
  code: string;
  full_name: string;
  display_name: string;
  description: string;
  is_variable: boolean;
  is_green: boolean;
  is_tracker: boolean;
  is_prepay: boolean;
  is_business: boolean;
  is_restricted: boolean;
  brand: string;
  term?: number;
  available_from: string;
  available_to?: string;
  links?: {
    href: string;
    method: string;
    rel: string;
  }[];
}

export interface ProductsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export interface TariffInfo {
  code: string;
  productCode: string;
  displayName: string;
  description: string;
  isVariable: boolean;
  isGreen: boolean;
}

export interface RateThresholds {
  veryLow: number;
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
}

export interface ThresholdSettings {
  electricity: RateThresholds;
  gas: RateThresholds;
}

export const DEFAULT_ELECTRICITY_THRESHOLDS: RateThresholds = {
  veryLow: 5,
  low: 10,
  medium: 15,
  high: 25,
  veryHigh: 39,
};

export const DEFAULT_GAS_THRESHOLDS: RateThresholds = {
  veryLow: 3,
  low: 5,
  medium: 7,
  high: 9,
  veryHigh: 11,
};

export const GSP_REGIONS = [
  { code: 'A', name: 'Eastern England' },
  { code: 'B', name: 'East Midlands' },
  { code: 'C', name: 'London' },
  { code: 'D', name: 'Merseyside and Northern Wales' },
  { code: 'E', name: 'West Midlands' },
  { code: 'F', name: 'North Eastern England' },
  { code: 'G', name: 'North Western England' },
  { code: 'H', name: 'Southern England' },
  { code: 'J', name: 'South Eastern England' },
  { code: 'K', name: 'Southern Wales' },
  { code: 'L', name: 'South Western England' },
  { code: 'M', name: 'Yorkshire' },
  { code: 'N', name: 'Southern Scotland' },
  { code: 'P', name: 'Northern Scotland' },
] as const;

export interface ConsumptionEntry {
  consumption: number;
  interval_start: string;
  interval_end: string;
}

export interface ConsumptionEntryWithRate extends ConsumptionEntry {
  rate: number | null;
  cost: number;
  flexibleRate?: number | null;
}

export interface ConsumptionResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ConsumptionEntry[];
}

export interface DailyConsumption {
  date: string;
  totalConsumption: number;
  cost: number;
  flexibleCost: number;
  difference: number;
  entries: ConsumptionEntryWithRate[];
}

export interface StandingCharge {
  value_exc_vat: number;
  value_inc_vat: number;
  valid_from: string;
  valid_to: string | null;
}

export interface StandingChargesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StandingCharge[];
}

// Account API Types
export interface MeterRegister {
  identifier: string;
  rate: string;
  is_settlement_register: boolean;
}

export interface Meter {
  serial_number: string;
  registers: MeterRegister[];
}

export interface TariffAgreement {
  tariff_code: string;
  valid_from: string;
  valid_to: string | null;
}

export interface ElectricityMeterPoint {
  mpan: string;
  profile_class: number;
  consumption_standard: number;
  meters: Meter[];
  agreements: TariffAgreement[];
  is_export: boolean;
}

export interface GasMeterPoint {
  mprn: string;
  consumption_standard: number;
  meters: Meter[];
  agreements: TariffAgreement[];
}

export interface AccountProperty {
  id: number;
  moved_in_at: string;
  moved_out_at: string | null;
  address_line_1: string;
  address_line_2: string;
  address_line_3: string;
  town: string;
  county: string;
  postcode: string;
  electricity_meter_points: ElectricityMeterPoint[];
  gas_meter_points: GasMeterPoint[];
}

export interface AccountResponse {
  number: string;
  properties: AccountProperty[];
}

// Processed account data for easier use
export interface ProcessedAccountData {
  accountNumber: string;
  movedInAt: Date;
  region: string;
  electricity: {
    mpan: string;
    serialNumbers: string[];
    agreements: ProcessedTariffAgreement[];
    currentAgreement: ProcessedTariffAgreement | null;
    isEco7: boolean;
  } | null;
  gas: {
    mprn: string;
    serialNumbers: string[];
    agreements: ProcessedTariffAgreement[];
    currentAgreement: ProcessedTariffAgreement | null;
  } | null;
}

export interface ProcessedTariffAgreement {
  tariffCode: string;
  productCode: string;
  displayName: string;
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
  isEco7: boolean;
}

// Comparison tariff options
export interface ComparisonTariffOption {
  code: string;
  displayName: string;
  description: string;
  hasGas: boolean;
  availableFrom?: Date | null;
  availableTo?: Date | null;
  isVariable?: boolean;
  isTracker?: boolean;
}

// Historical product available for comparison
export interface HistoricalProduct {
  code: string;
  displayName: string;
  description: string;
  availableFrom: Date | null;
  availableTo: Date | null;
  isVariable: boolean;
  isTracker: boolean;
  isGreen: boolean;
  hasElectricity: boolean;
  hasGas: boolean;
}

// Carbon Intensity API Types
export interface CarbonIntensityData {
  from: string;
  to: string;
  intensity: {
    forecast: number;
    actual: number | null;
    index: 'very low' | 'low' | 'moderate' | 'high' | 'very high';
  };
}

export interface CarbonIntensityResponse {
  data: CarbonIntensityData[];
}

export interface GenerationMixItem {
  fuel: string;
  perc: number;
}

export interface GenerationMixResponse {
  data: {
    from: string;
    to: string;
    generationmix: GenerationMixItem[];
  };
}

export interface GridStatusData {
  carbonIntensity: number;
  intensityIndex: string;
  renewablePercentage: number;
  nonRenewablePercentage: number;
  generationMix: GenerationMixItem[];
  detailedMix?: ElexonGenerationData;
  lastUpdated: Date;
}

// Elexon BMRS API Types
export type ElexonFuelType = 
  | 'coal' | 'ccgt' | 'ocgt' | 'nuclear' | 'oil' | 'wind' | 'hydro' 
  | 'pumped' | 'biomass' | 'battery' | 'other' | 'solar'
  | 'ifa' | 'moyle' | 'britned' | 'ewic' | 'nemo' | 'ifa2' 
  | 'nsl' | 'eleclink' | 'viking' | 'greenlink';

export interface ElexonFuelInstItem {
  startTime: string;
  fuelType: string;
  generation: number;
}

export interface ElexonGenerationEntry {
  fuel: ElexonFuelType;
  generation: number; // in GW
  perc: number;
}

export interface ElexonGenerationData {
  timestamp: Date;
  total: number; // Total generation in GW
  entries: ElexonGenerationEntry[];
  interconnectors: {
    total: number;
    imports: ElexonGenerationEntry[];
  };
  gas: {
    ccgt: number;
    ocgt: number;
    total: number;
  };
  storage: {
    battery: number;
    pumped: number;
  };
}

// Agile Predict API Types
export interface AgilePredictPrice {
  date_time: string;
  agile_pred: number;
  agile_pred_low?: number;
  agile_pred_high?: number;
}

export interface AgilePredictForecast {
  name: string;
  created_at: string;
  prices: AgilePredictPrice[];
}

export interface ProcessedForecastRate {
  price: number;
  lowPrice?: number;
  highPrice?: number;
  time: string;
  date: string;
  validFrom: Date;
}

export interface PeriodTariffOverride {
  periodFrom: Date;
  periodTo: Date;
  tariffCode: string;
  tariffDisplayName: string;
  fuelType: 'electricity' | 'gas';
}

export interface ComparisonAvailability {
  isAvailable: boolean;
  availableFrom: Date | null;
  missingPeriods: { from: Date; to: Date }[];
}
