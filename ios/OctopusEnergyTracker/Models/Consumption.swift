import Foundation

/// Half-hourly consumption entry from the Octopus consumption API.
struct ConsumptionEntryDTO: Codable, Sendable {
    let consumption: Double
    let intervalStart: String
    let intervalEnd: String

    enum CodingKeys: String, CodingKey {
        case consumption
        case intervalStart = "interval_start"
        case intervalEnd = "interval_end"
    }
}

struct ConsumptionResponse: Codable, Sendable {
    let count: Int
    let next: String?
    let previous: String?
    let results: [ConsumptionEntryDTO]
}

/// Domain-level consumption entry annotated with rate + cost.
struct ConsumptionEntry: Identifiable, Sendable, Equatable {
    let id = UUID()
    let consumption: Double      // kWh
    let intervalStart: Date
    let intervalEnd: Date
    let rate: Double?            // p/kWh inc VAT
    let cost: Double             // £
    let comparisonRate: Double?
    let comparisonCost: Double
    let flexibleRate: Double?
    let flexibleCost: Double

    var differenceVsComparison: Double { comparisonCost - cost }
    var differenceVsFlexible: Double { flexibleCost - cost }
}

/// Aggregated daily consumption.
struct DailyConsumption: Identifiable, Sendable, Equatable {
    let id = UUID()
    let date: Date
    let totalConsumption: Double   // kWh
    let cost: Double                // £
    let comparisonCost: Double
    let flexibleCost: Double
    let entries: [ConsumptionEntry]

    var differenceVsComparison: Double { comparisonCost - cost }
    var differenceVsFlexible: Double { flexibleCost - cost }
}
