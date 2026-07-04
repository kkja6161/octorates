import Foundation
import SwiftUI

/// Single observable store for all persisted app settings.
/// Injected via `.environment()` and read with `@Environment(SettingsStore.self)`.
@Observable
final class SettingsStore {
    // Account / region / tariff selection
    var apiKey: String? { KeychainService.loadAPIKey() }
    var accountNumber: String {
        get { UserDefaults.standard.string(forKey: Keys.accountNumber) ?? KeychainService.loadAccountNumber() ?? "" }
        set {
            UserDefaults.standard.set(newValue, forKey: Keys.accountNumber)
            KeychainService.saveAccountNumber(newValue)
        }
    }

    var region: String {
        get { UserDefaults.standard.string(forKey: Keys.region) ?? "C" }
        set { UserDefaults.standard.set(newValue, forKey: Keys.region) }
    }

    var selectedElectricityTariffCode: String {
        get { UserDefaults.standard.string(forKey: Keys.elecTariff) ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: Keys.elecTariff) }
    }

    var selectedElectricityProductCode: String {
        get { UserDefaults.standard.string(forKey: Keys.elecProduct) ?? "AGILE-FLEX-22-11-25" }
        set { UserDefaults.standard.set(newValue, forKey: Keys.elecProduct) }
    }

    var selectedGasTariffCode: String {
        get { UserDefaults.standard.string(forKey: Keys.gasTariff) ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: Keys.gasTariff) }
    }

    var selectedGasProductCode: String {
        get { UserDefaults.standard.string(forKey: Keys.gasProduct) ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: Keys.gasProduct) }
    }

    var showGas: Bool {
        get { UserDefaults.standard.object(forKey: Keys.showGas) as? Bool ?? false }
        set { UserDefaults.standard.set(newValue, forKey: Keys.showGas) }
    }

    // Comparison tariff selections
    var electricityComparisonTariff: String {
        get { UserDefaults.standard.string(forKey: Keys.elecComparison) ?? "VAR-22-11-01" }
        set { UserDefaults.standard.set(newValue, forKey: Keys.elecComparison) }
    }

    var gasComparisonTariff: String {
        get { UserDefaults.standard.string(forKey: Keys.gasComparison) ?? "VAR-22-11-01" }
        set { UserDefaults.standard.set(newValue, forKey: Keys.gasComparison) }
    }

    // Thresholds
    var electricityThresholds: RateThresholds {
        get { loadThresholds(for: Keys.elecThresholds, default: .defaultElectricity) }
        set { saveThresholds(newValue, for: Keys.elecThresholds) }
    }

    var gasThresholds: RateThresholds {
        get { loadThresholds(for: Keys.gasThresholds, default: .defaultGas) }
        set { saveThresholds(newValue, for: Keys.gasThresholds) }
    }

    // Theme
    var colorSchemePreference: ColorScheme? {
        get {
            switch UserDefaults.standard.string(forKey: Keys.theme) ?? "system" {
            case "light": return .light
            case "dark": return .dark
            default: return nil
            }
        }
        set {
            let raw = newValue == .light ? "light" : newValue == .dark ? "dark" : "system"
            UserDefaults.standard.set(raw, forKey: Keys.theme)
        }
    }

    // Accessibility
    var isHighContrast: Bool {
        get { UserDefaults.standard.bool(forKey: Keys.highContrast) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.highContrast) }
    }

    var isBoldText: Bool {
        get { UserDefaults.standard.bool(forKey: Keys.boldText) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.boldText) }
    }

    // Gas conversion
    var gasCalorificValue: Double {
        get { UserDefaults.standard.object(forKey: Keys.gasCV) == nil ? 39.3 : UserDefaults.standard.double(forKey: Keys.gasCV) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.gasCV) }
    }

    var gasVolumeCorrectionFactor: Double {
        get { UserDefaults.standard.object(forKey: Keys.gasVCF) == nil ? 1.02264 : UserDefaults.standard.double(forKey: Keys.gasVCF) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.gasVCF) }
    }

    var gasCorrectionFactor: Double {
        get { UserDefaults.standard.object(forKey: Keys.gasCorrection) == nil ? 1.0 : UserDefaults.standard.double(forKey: Keys.gasCorrection) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.gasCorrection) }
    }

    // Notifications
    var notificationsEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: Keys.notifEnabled) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.notifEnabled) }
    }
    var notifyPriceThreshold: Bool {
        get { UserDefaults.standard.bool(forKey: Keys.notifThreshold) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.notifThreshold) }
    }
    var notifyNewAgileRates: Bool {
        get { UserDefaults.standard.bool(forKey: Keys.notifAgile) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.notifAgile) }
    }
    var notifyCheapSlots: Bool {
        get { UserDefaults.standard.bool(forKey: Keys.notifCheapSlots) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.notifCheapSlots) }
    }
    var priceThresholdValue: Double {
        get { UserDefaults.standard.object(forKey: Keys.notifThresholdValue) == nil ? 15.0 : UserDefaults.standard.double(forKey: Keys.notifThresholdValue) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.notifThresholdValue) }
    }

    // EV
    var evProfiles: [EVProfile] {
        get { loadJSON(for: Keys.evProfiles, default: DefaultEVProfiles.presets) }
        set { saveJSON(newValue, for: Keys.evProfiles) }
    }

    var activeEVProfileId: UUID {
        get {
            if let s = UserDefaults.standard.string(forKey: Keys.activeEVProfile),
               let u = UUID(uuidString: s) { return u }
            return evProfiles.first?.id ?? UUID()
        }
        set { UserDefaults.standard.set(newValue.uuidString, forKey: Keys.activeEVProfile) }
    }

    var chargingLog: [ChargingLogEntry] {
        get { loadJSON(for: Keys.chargingLog, default: []) }
        set { saveJSON(newValue, for: Keys.chargingLog) }
    }

    // Cached account data
    var cachedAccountData: ProcessedAccountData? {
        get { loadJSONDecodable(for: Keys.accountData) }
        set { saveJSONEncodable(newValue, for: Keys.accountData) }
    }

    // MARK: - Helpers

    private enum Keys {
        static let accountNumber = "accountNumber"
        static let region = "region"
        static let elecTariff = "elecTariffCode"
        static let elecProduct = "elecProductCode"
        static let gasTariff = "gasTariffCode"
        static let gasProduct = "gasProductCode"
        static let showGas = "showGas"
        static let elecComparison = "elecComparisonTariff"
        static let gasComparison = "gasComparisonTariff"
        static let elecThresholds = "elecThresholds"
        static let gasThresholds = "gasThresholds"
        static let theme = "themePreference"
        static let highContrast = "accessibilityHighContrast"
        static let boldText = "accessibilityBoldText"
        static let gasCV = "gasCalorificValue"
        static let gasVCF = "gasVolumeCorrectionFactor"
        static let gasCorrection = "gasCorrectionFactor"
        static let notifEnabled = "notificationsEnabled"
        static let notifThreshold = "notifyPriceThreshold"
        static let notifAgile = "notifyNewAgileRates"
        static let notifCheapSlots = "notifyCheapSlots"
        static let notifThresholdValue = "priceThresholdValue"
        static let evProfiles = "evProfiles"
        static let activeEVProfile = "activeEVProfileId"
        static let chargingLog = "chargingLog"
        static let accountData = "cachedAccountData"
    }

    private func loadThresholds(for key: String, `default`: RateThresholds) -> RateThresholds {
        guard let data = UserDefaults.standard.data(forKey: key) else { return `default` }
        return try? JSONDecoder().decode(RateThresholds.self, from: data) ?? `default`
    }

    private func saveThresholds(_ value: RateThresholds, for key: String) {
        if let data = try? JSONEncoder().encode(value) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private func loadJSON<T: Decodable>(for key: String, `default`: T) -> T {
        guard let data = UserDefaults.standard.data(forKey: key) else { return `default` }
        return (try? JSONDecoder().decode(T.self, from: data)) ?? `default`
    }

    private func saveJSON<T: Encodable>(_ value: T, for key: String) {
        if let data = try? JSONEncoder().encode(value) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private func loadJSONDecodable<T: Decodable>(for key: String) -> T? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    private func saveJSONEncodable<T: Encodable>(_ value: T?, for key: String) {
        if let value, let data = try? JSONEncoder().encode(value) {
            UserDefaults.standard.set(data, forKey: key)
        } else {
            UserDefaults.standard.removeObject(forKey: key)
        }
    }

    func saveAPIKey(_ key: String) {
        KeychainService.saveAPIKey(key)
    }

    func clearAPIKey() {
        KeychainService.clearAll()
    }

    /// Clears all cached data (rates cache, account data) but keeps settings.
    func clearCache() {
        UserDefaults.standard.removeObject(forKey: Keys.accountData)
        URLCache.shared.removeAllCachedResponses()
    }

    /// Returns the active EV profile.
    var activeEVProfile: EVProfile? {
        evProfiles.first(where: { $0.id == activeEVProfileId }) ?? evProfiles.first
    }
}
