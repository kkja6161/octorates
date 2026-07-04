import SwiftUI

/// Centralized color palette and semantic mappings for the app.
/// Brand colors are kept as accents; surfaces and text use semantic
/// system colors so the app adapts naturally to light/dark and
/// accessibility settings.
enum AppTheme {
    // Brand
    static let primary = Color(red: 0.118, green: 0.533, blue: 0.898)    // #1E88E5
    static let secondary = Color(red: 0.0, green: 0.831, blue: 0.847)    // #00D4D8
    static let accent = Color(red: 1.0, green: 0.596, blue: 0.0)         // #FF9800

    // Fuel
    static let electricity = primary
    static let gas = Color(red: 0.961, green: 0.620, blue: 0.043)        // #F59E0B

    // Status
    static let success = Color(red: 0.063, green: 0.725, blue: 0.506)    // #10B981
    static let error = Color(red: 0.937, green: 0.267, blue: 0.267)      // #EF4444
    static let warning = Color(red: 0.961, green: 0.620, blue: 0.043)

    // Chart threshold colors (light)
    static let chartVeryLow = Color(red: 0.298, green: 0.686, blue: 0.314)   // #4CAF50
    static let chartLow = Color(red: 0.0, green: 0.831, blue: 0.847)         // #00D4D8
    static let chartMedium = Color(red: 1.0, green: 0.596, blue: 0.0)        // #FF9800
    static let chartHigh = Color(red: 1.0, green: 0.322, blue: 0.322)        // #FF5252
    static let chartVeryHigh = Color(red: 0.827, green: 0.184, blue: 0.184)  // #D32F2F
    static let chartExtreme = Color(red: 0.482, green: 0.122, blue: 0.635)   // #7B1FA2

    /// Background gradient used behind scrolling content.
    static var backgroundGradient: LinearGradient {
        LinearGradient(
            colors: [
                Color(.systemBackground),
                Color(.systemGroupedBackground)
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    /// Subtle brand-tinted hero gradient for the dashboard top section.
    static var heroGradient: LinearGradient {
        LinearGradient(
            colors: [
                primary.opacity(0.12),
                secondary.opacity(0.06),
                Color.clear
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

/// Maps a threshold level to a color.
enum ThresholdPalette {
    enum Level: String {
        case veryLow, low, medium, high, veryHigh, extreme
    }

    static func color(for level: Level) -> Color {
        switch level {
        case .veryLow:  return AppTheme.chartVeryLow
        case .low:      return AppTheme.chartLow
        case .medium:   return AppTheme.chartMedium
        case .high:     return AppTheme.chartHigh
        case .veryHigh: return AppTheme.chartVeryHigh
        case .extreme:  return AppTheme.chartExtreme
        }
    }

    static func label(for level: Level) -> String {
        switch level {
        case .veryLow:  return "Very Low"
        case .low:      return "Low"
        case .medium:   return "Medium"
        case .high:     return "High"
        case .veryHigh: return "Very High"
        case .extreme:  return "Extreme"
        }
    }

    /// Determines the threshold level for a price given threshold bounds.
    static func level(forPrice price: Double, thresholds: RateThresholds) -> Level {
        if price < thresholds.veryLow { return .veryLow }
        if price < thresholds.low { return .low }
        if price < thresholds.medium { return .medium }
        if price < thresholds.high { return .high }
        if price < thresholds.veryHigh { return .veryHigh }
        return .extreme
    }
}
