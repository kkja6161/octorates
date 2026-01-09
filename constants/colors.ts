const octopusBlue = "#1E88E5";
const octopusCyan = "#00D4D8";
const octopusOrange = "#FF9800";

export const HIGH_CONTRAST_LIGHT = {
  primary: "#0D47A1",
  secondary: "#00838F",
  accent: "#E65100",
  
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceElevated: "#F5F5F5",
  
  text: {
    primary: "#000000",
    secondary: "#212121",
    tertiary: "#424242",
  },
  
  chart: {
    veryLow: "#1B5E20",
    low: "#00695C",
    medium: "#E65100",
    high: "#B71C1C",
    veryHigh: "#880E4F",
    extreme: "#4A148C",
  },
  
  border: "#000000",
  borderLight: "#424242",
  
  overlay: "rgba(0, 0, 0, 0.7)",
  
  success: "#1B5E20",
  error: "#B71C1C",
  warning: "#E65100",
  
  gasColor: "#E65100",
  gasBackground: "#FFF3E0",
  
  chartGrid: "#424242",
  chartAxisLabel: "#000000",
};

export const HIGH_CONTRAST_DARK = {
  primary: "#64B5F6",
  secondary: "#4DD0E1",
  accent: "#FFB74D",
  
  background: "#000000",
  surface: "#121212",
  surfaceElevated: "#1E1E1E",
  
  text: {
    primary: "#FFFFFF",
    secondary: "#E0E0E0",
    tertiary: "#BDBDBD",
  },
  
  chart: {
    veryLow: "#81C784",
    low: "#4DD0E1",
    medium: "#FFB74D",
    high: "#EF5350",
    veryHigh: "#F48FB1",
    extreme: "#CE93D8",
  },
  
  border: "#FFFFFF",
  borderLight: "#BDBDBD",
  
  overlay: "rgba(0, 0, 0, 0.85)",
  
  success: "#81C784",
  error: "#EF5350",
  warning: "#FFB74D",
  
  gasColor: "#FFB74D",
  gasBackground: "#2E2410",
  
  chartGrid: "#424242",
  chartAxisLabel: "#FFFFFF",
};

export const CHART_COLORS_LIGHT = {
  veryLow: "#4CAF50",
  low: "#00D4D8",
  medium: "#FF9800",
  high: "#FF5252",
  veryHigh: "#D32F2F",
  extreme: "#7B1FA2",
};

export const CHART_COLORS_DARK = {
  veryLow: "#66BB6A",
  low: "#26C6DA",
  medium: "#FFA726",
  high: "#EF5350",
  veryHigh: "#E53935",
  extreme: "#AB47BC",
};

export const LIGHT_THEME = {
  primary: octopusBlue,
  secondary: octopusCyan,
  accent: octopusOrange,
  
  background: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  
  text: {
    primary: "#1A1A1A",
    secondary: "#6B7280",
    tertiary: "#9CA3AF",
  },
  
  chart: CHART_COLORS_LIGHT,
  
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  
  overlay: "rgba(0, 0, 0, 0.5)",
  
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  
  gasColor: "#F59E0B",
  gasBackground: "#FEF3C7",
  
  chartGrid: "#E5E7EB",
  chartAxisLabel: "#6B7280",
};

export const DARK_THEME = {
  primary: "#42A5F5",
  secondary: "#26C6DA",
  accent: "#FFA726",
  
  background: "#000000",
  surface: "#1C1C1E",
  surfaceElevated: "#2C2C2E",
  
  text: {
    primary: "#FFFFFF",
    secondary: "#9CA3AF",
    tertiary: "#6B7280",
  },
  
  chart: CHART_COLORS_DARK,
  
  border: "#2C2C2E",
  borderLight: "#3A3A3C",
  
  overlay: "rgba(0, 0, 0, 0.7)",
  
  success: "#34D399",
  error: "#F87171",
  warning: "#FBB040",
  
  gasColor: "#FBB040",
  gasBackground: "#3A3110",
  
  chartGrid: "#2C2C2E",
  chartAxisLabel: "#9CA3AF",
};

export function useColors(isDark: boolean, isHighContrast: boolean = false) {
  if (isHighContrast) {
    return isDark ? HIGH_CONTRAST_DARK : HIGH_CONTRAST_LIGHT;
  }
  return isDark ? DARK_THEME : LIGHT_THEME;
}

export type Theme = typeof LIGHT_THEME;

export default LIGHT_THEME;
