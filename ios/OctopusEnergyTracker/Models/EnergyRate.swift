import Foundation

/// A processed half-hourly rate used throughout the UI.
struct ProcessedRate: Identifiable, Equatable, Sendable {
    let id = UUID()
    let price: Double          // p/kWh inc VAT
    let validFrom: Date
    let validTo: Date
    var isCurrent: Bool
    var isUpcoming: Bool

    var timeLabel: String {
        Self.timeFormatter.string(from: validFrom)
    }

    var dayLabel: String {
        Self.dayFormatter.string(from: validFrom)
    }

    static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        return f
    }()

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEE dd/MM"
        return f
    }()
}

/// Raw API rate from Octopus.
struct EnergyRateDTO: Codable, Sendable {
    let valueExcVat: Double
    let valueIncVat: Double
    let validFrom: String
    let validTo: String?

    enum CodingKeys: String, CodingKey {
        case valueExcVat = "value_exc_vat"
        case valueIncVat = "value_inc_vat"
        case validFrom = "valid_from"
        case validTo = "valid_to"
    }
}

struct EnergyRatesResponse: Codable, Sendable {
    let count: Int
    let next: String?
    let previous: String?
    let results: [EnergyRateDTO]
}

/// Standing charge entry.
struct StandingChargeDTO: Codable, Sendable {
    let valueExcVat: Double
    let valueIncVat: Double
    let validFrom: String
    let validTo: String?

    enum CodingKeys: String, CodingKey {
        case valueExcVat = "value_exc_vat"
        case valueIncVat = "value_inc_vat"
        case validFrom = "valid_from"
        case validTo = "valid_to"
    }
}

struct StandingChargesResponse: Codable, Sendable {
    let count: Int
    let next: String?
    let previous: String?
    let results: [StandingChargeDTO]
}
