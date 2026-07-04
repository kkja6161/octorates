import Foundation

/// EV charging optimizer view model.
@Observable
final class EVViewModel {
    var cheapestSlots: [ChargingSlot] = []
    var isLoading = false

    let settings: SettingsStore
    let appState: AppState

    init(settings: SettingsStore, appState: AppState) {
        self.settings = settings
        self.appState = appState
    }

    var activeProfile: EVProfile? {
        settings.activeEVProfile
    }

    /// Energy needed to reach target from current charge (kWh).
    func energyNeeded(profile: EVProfile) -> Double {
        let pct = max(0, profile.targetCharge - profile.currentCharge) / 100.0
        return profile.batteryCapacity * pct
    }

    /// Charging duration in minutes for the given energy.
    func chargingMinutes(profile: EVProfile, energyKWh: Double) -> Int {
        guard profile.chargerPower > 0 else { return 0 }
        let hours = energyKWh / profile.chargerPower
        return Int(hours * 60)
    }

    /// Computes the cheapest contiguous charging slots from tomorrow's Agile rates.
    @MainActor
    func computeCheapestSlots() async {
        guard let profile = activeProfile else { return }
        isLoading = true
        defer { isLoading = false }

        let energy = energyNeeded(profile: profile)
        let minutes = chargingMinutes(profile: profile, energyKWh: energy)
        let slotsNeeded = Int((Double(minutes) / 30).rounded(.up))

        let rates = appState.tomorrowElectricityRates.isEmpty
            ? appState.todayElectricityRates
            : appState.tomorrowElectricityRates

        guard rates.count >= slotsNeeded, slotsNeeded > 0 else {
            cheapestSlots = []
            return
        }

        // Sliding window: find the contiguous block with lowest average price.
        var bestStart = 0
        var bestAvg = Double.greatestFiniteMagnitude
        for i in 0...(rates.count - slotsNeeded) {
            let window = rates[i..<(i + slotsNeeded)]
            let avg = window.reduce(0.0) { $0 + $1.price } / Double(slotsNeeded)
            if avg < bestAvg {
                bestAvg = avg
                bestStart = i
            }
        }

        let block = Array(rates[bestStart..<(bestStart + slotsNeeded)])
        let totalCost = block.reduce(0.0) { $0 + $1.price * 0.5 * profile.chargerPower / 100 }
        cheapestSlots = [ChargingSlot(
            start: block.first?.validFrom ?? Date(),
            end: block.last?.validTo ?? Date(),
            averageRate: bestAvg,
            totalCost: totalCost,
            energyKWh: energy
        )]
    }

    /// Logs a completed charge.
    func logCharge(entry: ChargingLogEntry) {
        var log = settings.chargingLog
        log.insert(entry, at: 0)
        if log.count > 100 { log = Array(log.prefix(100)) }
        settings.chargingLog = log
    }

    /// Adds or updates an EV profile.
    func saveProfile(_ profile: EVProfile) {
        var profiles = settings.evProfiles
        if let idx = profiles.firstIndex(where: { $0.id == profile.id }) {
            profiles[idx] = profile
        } else {
            profiles.append(profile)
        }
        settings.evProfiles = profiles
    }

    /// Deletes a profile by id.
    func deleteProfile(_ id: UUID) {
        settings.evProfiles = settings.evProfiles.filter { $0.id != id }
        if settings.activeEVProfileId == id, let first = settings.evProfiles.first {
            settings.activeEVProfileId = first.id
        }
    }
}

struct ChargingSlot: Identifiable, Equatable, Sendable {
    let id = UUID()
    let start: Date
    let end: Date
    let averageRate: Double
    let totalCost: Double
    let energyKWh: Double
}
