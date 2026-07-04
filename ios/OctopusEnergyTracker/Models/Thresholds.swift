import Foundation

/// Threshold bounds for rate color-coding (p/kWh).
struct RateThresholds: Codable, Equatable, Sendable {
    var veryLow: Double
    var low: Double
    var medium: Double
    var high: Double
    var veryHigh: Double

    static let defaultElectricity = RateThresholds(veryLow: 5, low: 10, medium: 15, high: 25, veryHigh: 39)
    static let defaultGas = RateThresholds(veryLow: 3, low: 5, medium: 7, high: 9, veryHigh: 11)
}

/// GSP region reference (electricity).
struct GSPRegion: Identifiable, Hashable, Sendable {
    let code: String
    let name: String
    var id: String { code }
}

enum GSPRegions {
    static let all: [GSPRegion] = [
        .init(code: "A", name: "Eastern England"),
        .init(code: "B", name: "East Midlands"),
        .init(code: "C", name: "London"),
        .init(code: "D", name: "Merseyside & Northern Wales"),
        .init(code: "E", name: "West Midlands"),
        .init(code: "F", name: "North Eastern England"),
        .init(code: "G", name: "North Western England"),
        .init(code: "H", name: "Southern England"),
        .init(code: "J", name: "South Eastern England"),
        .init(code: "K", name: "Southern Wales"),
        .init(code: "L", name: "South Western England"),
        .init(code: "M", name: "Yorkshire"),
        .init(code: "N", name: "Southern Scotland"),
        .init(code: "P", name: "Northern Scotland"),
    ]

    /// Gas region letter differs from electricity GSP; maps the same way the Expo app does.
    static let gspToGasRegion: [String: String] = [
        "A": "EA", "B": "EM", "C": "LO", "D": "MN", "E": "WM",
        "F": "NE", "G": "NW", "H": "SC", "J": "SE", "K": "SO",
        "L": "SW", "M": "YK", "N": "SM", "P": "WN",
    ]
}
