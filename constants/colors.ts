const octopusBlue = "#1E88E5";
const octopusCyan = "#00D4D8";
const octopusOrange = "#FF9800";

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

export function useColors(isDark: boolean) {
  return isDark ? DARK_THEME : LIGHT_THEME;
}

export type Theme = typeof LIGHT_THEME;

export default LIGHT_THEME;
