import Foundation

/// Octopus product reference.
struct ProductDTO: Codable, Sendable, Identifiable, Equatable {
    var id: String { code }
    let code: String
    let fullName: String
    let displayName: String
    let description: String
    let isVariable: Bool
    let isGreen: Bool
    let isTracker: Bool
    let isPrepay: Bool
    let isBusiness: Bool
    let isRestricted: Bool
    let brand: String
    let term: Int?
    let availableFrom: String
    let availableTo: String?

    enum CodingKeys: String, CodingKey {
        case code
        case fullName = "full_name"
        case displayName = "display_name"
        case description
        case isVariable = "is_variable"
        case isGreen = "is_green"
        case isTracker = "is_tracker"
        case isPrepay = "is_prepay"
        case isBusiness = "is_business"
        case isRestricted = "is_restricted"
        case brand, term
        case availableFrom = "available_from"
        case availableTo = "available_to"
    }
}

struct ProductsResponse: Codable, Sendable {
    let count: Int
    let next: String?
    let previous: String?
    let results: [ProductDTO]
}

/// A selectable comparison tariff option.
struct ComparisonTariffOption: Identifiable, Hashable, Sendable {
    var id: String { code }
    let code: String
    let displayName: String
    let description: String
    let hasGas: Bool
    let availableFrom: Date?
    let availableTo: Date?
    let isVariable: Bool
    let isTracker: Bool
}

/// Hardcoded lists of currently-available tariffs for comparison.
/// These mirror the Expo app's `ELECTRICITY_COMPARISON_TARIFFS` /
/// `GAS_COMPARISON_TARIFFS` so the comparison page always shows
/// current tariffs (not historical ones) even if the API is unavailable.
enum ComparisonTariffs {
    static let electricity: [ComparisonTariffOption] = [
        .init(code: "AGILE-FLEX-22-11-25", displayName: "Agile Octopus", description: "Half-hourly rates that change daily.", hasGas: false, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: false),
        .init(code: "AGILE-24-10-01", displayName: "Agile Octopus 2024", description: "Updated Agile with BB variant.", hasGas: false, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: false),
        .init(code: "VAR-22-11-01", displayName: "Flexible Octopus", description: "Standard variable tariff.", hasGas: true, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: false),
        .init(code: "VAR-24-05-16", displayName: "Flexible Octopus 2024", description: "Standard variable tariff (2024).", hasGas: true, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: false),
        .init(code: "GO-VAR-22-10-14", displayName: "Octopus Go", description: "Cheap overnight EV charging.", hasGas: false, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: false),
        .init(code: "INTELLI-VAR-22-10-14", displayName: "Intelligent Octopus Go", description: "Smart EV charging with cheap slots.", hasGas: false, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: false),
        .init(code: "COSY-22-12-08", displayName: "Cosy Octopus", description: "Two cheap afternoon periods for heat pumps.", hasGas: false, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: false),
        .init(code: "FLUX-IMPORT-23-02-14", displayName: "Octopus Flux", description: "Import/export with peak & off-peak.", hasGas: false, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: false),
        .init(code: "OE-FIX-12M-25-11-24", displayName: "Octopus 12M Fixed Nov 2025", description: "Fixed for 12 months.", hasGas: true, availableFrom: nil, availableTo: nil, isVariable: false, isTracker: false),
        .init(code: "LOYAL-FIX-12M-25-12-03", displayName: "Loyal Fix 12M Dec 2025", description: "Loyal fixed for 12 months.", hasGas: true, availableFrom: nil, availableTo: nil, isVariable: false, isTracker: false),
    ]

    static let gas: [ComparisonTariffOption] = [
        .init(code: "VAR-22-11-01", displayName: "Flexible Octopus Gas", description: "Standard variable gas tariff.", hasGas: true, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: false),
        .init(code: "VAR-24-05-16", displayName: "Flexible Octopus Gas 2024", description: "Standard variable gas (2024).", hasGas: true, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: false),
        .init(code: "SILVER-24-12-31", displayName: "Octopus Tracker", description: "Tracker tariff that follows wholesale prices.", hasGas: true, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: true),
        .init(code: "SILVER-24-04-03", displayName: "Octopus Tracker Apr 2024", description: "Previous tracker tariff.", hasGas: true, availableFrom: nil, availableTo: nil, isVariable: true, isTracker: true),
        .init(code: "OE-FIX-12M-25-11-24", displayName: "Octopus 12M Fixed Gas Nov 2025", description: "Fixed gas for 12 months.", hasGas: true, availableFrom: nil, availableTo: nil, isVariable: false, isTracker: false),
        .init(code: "LOYAL-FIX-12M-25-12-03", displayName: "Loyal Fix 12M Gas Dec 2025", description: "Loyal fixed gas for 12 months.", hasGas: true, availableFrom: nil, availableTo: nil, isVariable: false, isTracker: false),
    ]
}
