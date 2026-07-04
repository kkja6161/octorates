import Foundation

/// EV charging profile.
struct EVProfile: Codable, Sendable, Identifiable, Equatable {
    var id: UUID = UUID()
    var name: String
    var batteryCapacity: Double        // kWh
    var chargerPower: Double           // kW
    var currentCharge: Double          // % (0–100)
    var targetCharge: Double           // % (0–100)
    var isDefault: Bool
}

/// A charging log entry.
struct ChargingLogEntry: Codable, Sendable, Identifiable, Equatable {
    var id: UUID = UUID()
    let date: Date
    let durationMinutes: Int
    let energyKWh: Double
    let cost: Double
    let slotStart: Date
    let averageRate: Double           // p/kWh
}

/// Default EV profiles seeded on first launch.
enum DefaultEVProfiles {
    static let presets: [EVProfile] = [
        .init(name: "Standard EV", batteryCapacity: 60, chargerPower: 7.4, currentCharge: 30, targetCharge: 80, isDefault: true),
        .init(name: "Large Battery", batteryCapacity: 100, chargerPower: 11, currentCharge: 20, targetCharge: 90, isDefault: false),
        .init(name: "Plug-in Hybrid", batteryCapacity: 15, chargerPower: 3.7, currentCharge: 40, targetCharge: 100, isDefault: false),
    ]
}
