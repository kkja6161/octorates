import { RateThresholds } from '@/types/energy';

export interface ValidatedThresholds extends RateThresholds {
  isValid: boolean;
  errors: string[];
}

export function validateThresholds(thresholds: RateThresholds): ValidatedThresholds {
  const errors: string[] = [];
  
  const sortedThresholds = [
    { key: 'veryLow', value: thresholds.veryLow },
    { key: 'low', value: thresholds.low },
    { key: 'medium', value: thresholds.medium },
    { key: 'high', value: thresholds.high },
    { key: 'veryHigh', value: thresholds.veryHigh },
  ];

  for (let i = 0; i < sortedThresholds.length - 1; i++) {
    if (sortedThresholds[i].value >= sortedThresholds[i + 1].value) {
      errors.push(
        `${sortedThresholds[i].key} (${sortedThresholds[i].value}) must be less than ${sortedThresholds[i + 1].key} (${sortedThresholds[i + 1].value})`
      );
    }
  }

  return {
    ...thresholds,
    isValid: errors.length === 0,
    errors,
  };
}

export function normalizeThresholds(thresholds: RateThresholds): RateThresholds {
  const values = [
    thresholds.veryLow,
    thresholds.low,
    thresholds.medium,
    thresholds.high,
    thresholds.veryHigh,
  ].sort((a, b) => a - b);

  return {
    veryLow: values[0],
    low: values[1],
    medium: values[2],
    high: values[3],
    veryHigh: values[4],
  };
}

export type ThresholdLevel = 'veryLow' | 'low' | 'medium' | 'high' | 'veryHigh' | 'extreme';

export function getRateThresholdLevel(
  price: number,
  thresholds: RateThresholds
): ThresholdLevel {
  if (price < thresholds.veryLow) {
    return 'veryLow';
  } else if (price < thresholds.low) {
    return 'low';
  } else if (price < thresholds.medium) {
    return 'medium';
  } else if (price < thresholds.high) {
    return 'high';
  } else if (price < thresholds.veryHigh) {
    return 'veryHigh';
  } else {
    return 'extreme';
  }
}

export function getThresholdColor(level: ThresholdLevel, isDark: boolean = false): string {
  if (isDark) {
    switch (level) {
      case 'veryLow':
        return '#66BB6A';
      case 'low':
        return '#26C6DA';
      case 'medium':
        return '#FFA726';
      case 'high':
        return '#EF5350';
      case 'veryHigh':
        return '#E53935';
      case 'extreme':
        return '#AB47BC';
      default:
        return '#9CA3AF';
    }
  }
  
  switch (level) {
    case 'veryLow':
      return '#4CAF50';
    case 'low':
      return '#00D4D8';
    case 'medium':
      return '#FF9800';
    case 'high':
      return '#FF5252';
    case 'veryHigh':
      return '#D32F2F';
    case 'extreme':
      return '#7B1FA2';
    default:
      return '#6B7280';
  }
}

export function getThresholdLabel(level: ThresholdLevel): string {
  switch (level) {
    case 'veryLow':
      return 'Very Low';
    case 'low':
      return 'Low';
    case 'medium':
      return 'Medium';
    case 'high':
      return 'High';
    case 'veryHigh':
      return 'Very High';
    case 'extreme':
      return 'Extreme';
    default:
      return 'Unknown';
  }
}
