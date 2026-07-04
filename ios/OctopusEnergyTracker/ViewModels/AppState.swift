import Foundation
import SwiftUI

/// Shared app-wide state — region/tariff selection derived from account,
/// plus cached rates and account data. Injected via `.environment()`.
@Observable
final class AppState {
    // Account
    var accountData: ProcessedAccountData?
    var isLoadingAccount = false
    var accountError: String?

    // Rates
    var electricityRates: [ProcessedRate] = []
    var gasRates: [ProcessedRate] = []
    var comparisonElectricityRates: [ProcessedRate] = []
    var comparisonGasRates: [ProcessedRate] = []
    var flexibleElectricityRate: Double?
    var flexibleGasRate: Double?
    var electricityStandingCharge: Double?
    var gasStandingCharge: Double?
    var comparisonElectricityStandingCharge: Double?
    var comparisonGasStandingCharge: Double?

    var isLoadingRates = false
    var lastRatesFetch: Date?

    // Grid
    var gridStatus: GridStatus?
    var isLoadingGrid = false

    // Agile forecast
    var agileForecast: [AgilePredictService.ForecastPrice] = []
    var isLoadingForecast = false

    // Live demand (placeholder; Octopus telemetry is not available in simulator)
    var liveDemand: Double? = nil

    let settings: SettingsStore

    init(settings: SettingsStore) {
        self.settings = settings
        self.accountData = settings.cachedAccountData
    }

    // MARK: - Account

    @MainActor
    func connectAccount(apiKey: String, accountNumber: String) async -> Bool {
        isLoadingAccount = true
        accountError = nil
        defer { isLoadingAccount = false }

        do {
            let response = try await OctopusAPIService.shared.fetchAccount(accountNumber: accountNumber, apiKey: apiKey)
            if let processed = AccountProcessor.process(response) {
                accountData = processed
                settings.cachedAccountData = processed
                settings.saveAPIKey(apiKey)
                settings.accountNumber = accountNumber
                // Apply region & current tariff from account.
                settings.region = processed.region
                if let elec = processed.electricity?.currentAgreement {
                    settings.selectedElectricityTariffCode = elec.tariffCode
                    settings.selectedElectricityProductCode = elec.productCode
                }
                if let gas = processed.gas?.currentAgreement {
                    settings.selectedGasTariffCode = gas.tariffCode
                    settings.selectedGasProductCode = gas.productCode
                    settings.showGas = true
                }
                return true
            } else {
                accountError = "No active properties found on this account."
                return false
            }
        } catch let OctopusAPIError.unauthorized {
            accountError = "API key or account number is incorrect."
            return false
        } catch {
            accountError = error.localizedDescription
            return false
        }
    }

    @MainActor
    func disconnectAccount() {
        settings.clearAPIKey()
        settings.cachedAccountData = nil
        accountData = nil
        electricityRates = []
        gasRates = []
    }

    // MARK: - Rates

    @MainActor
    func refreshRates() async {
        guard !settings.selectedElectricityProductCode.isEmpty else { return }
        isLoadingRates = true
        defer { isLoadingRates = false }

        // Fetch all rates in parallel using TaskGroup-style concurrency.
        async let elecRates = OctopusAPIService.shared.fetchUnitRates(
            productCode: settings.selectedElectricityProductCode,
            region: settings.region, fuel: .electricity)
        async let gasRates: [EnergyRateDTO] = fetchGasRatesIfEnabled()
        async let compElecRates = OctopusAPIService.shared.fetchUnitRates(
            productCode: TariffResolver.normalize(productCode: settings.electricityComparisonTariff),
            region: settings.region, fuel: .electricity)
        async let compGasRates: [EnergyRateDTO] = fetchComparisonGasRatesIfEnabled()
        async let flexElec = OctopusAPIService.shared.fetchFlexibleRate(region: settings.region, fuel: .electricity)
        async let flexGas: Double? = fetchFlexibleGasIfEnabled()

        let (e, g, ce, cg, fe, fg) = await (elecRates, gasRates, compElecRates, compGasRates, flexElec, flexGas)

        self.electricityRates = ProcessedRateMapper.map(e)
        self.gasRates = ProcessedRateMapper.map(g)
        self.comparisonElectricityRates = ProcessedRateMapper.map(ce)
        self.comparisonGasRates = ProcessedRateMapper.map(cg)
        self.flexibleElectricityRate = fe
        self.flexibleGasRate = fg
        self.lastRatesFetch = Date()

        // Standing charges in parallel.
        async let elecSC = OctopusAPIService.shared.fetchStandingCharge(
            productCode: settings.selectedElectricityProductCode, region: settings.region, fuel: .electricity)
        async let gasSC: Double? = fetchGasStandingChargeIfEnabled()
        async let compElecSC = OctopusAPIService.shared.fetchStandingCharge(
            productCode: settings.electricityComparisonTariff, region: settings.region, fuel: .electricity)
        async let compGasSC: Double? = fetchCompGasStandingChargeIfEnabled()

        let (eSC, gSC, ceSC, cgSC) = await (elecSC, gasSC, compElecSC, compGasSC)
        self.electricityStandingCharge = eSC
        self.gasStandingCharge = gSC
        self.comparisonElectricityStandingCharge = ceSC
        self.comparisonGasStandingCharge = cgSC
    }

    private func fetchGasRatesIfEnabled() async -> [EnergyRateDTO] {
        guard settings.showGas, !settings.selectedGasProductCode.isEmpty else { return [] }
        return await fetchGasRates()
    }

    private func fetchComparisonGasRatesIfEnabled() async -> [EnergyRateDTO] {
        guard settings.showGas else { return [] }
        return await OctopusAPIService.shared.fetchUnitRates(
            productCode: TariffResolver.normalize(productCode: settings.gasComparisonTariff),
            region: settings.region, fuel: .gas)
    }

    private func fetchFlexibleGasIfEnabled() async -> Double? {
        guard settings.showGas else { return nil }
        return await OctopusAPIService.shared.fetchFlexibleRate(region: settings.region, fuel: .gas)
    }

    private func fetchGasStandingChargeIfEnabled() async -> Double? {
        guard settings.showGas, !settings.selectedGasProductCode.isEmpty else { return nil }
        return await OctopusAPIService.shared.fetchStandingCharge(
            productCode: settings.selectedGasProductCode, region: settings.region, fuel: .gas)
    }

    private func fetchCompGasStandingChargeIfEnabled() async -> Double? {
        guard settings.showGas else { return nil }
        return await OctopusAPIService.shared.fetchStandingCharge(
            productCode: settings.gasComparisonTariff, region: settings.region, fuel: .gas)
    }

    private func fetchGasRates() async -> [EnergyRateDTO] {
        let product = settings.selectedGasProductCode
        if product.contains("SILVER") || product.contains("TRACKER") {
            return await OctopusAPIService.shared.fetchGasTrackerRates(region: settings.region)
        }
        return await OctopusAPIService.shared.fetchUnitRates(
            productCode: product, region: settings.region, fuel: .gas)
    }

    // MARK: - Grid status

    @MainActor
    func refreshGridStatus() async {
        isLoadingGrid = true
        defer { isLoadingGrid = false }
        if let status = await GridStatusService.shared.fetchGridStatus() {
            gridStatus = status
        }
    }

    // MARK: - Agile forecast

    @MainActor
    func refreshAgileForecast() async {
        guard isAgileTariff else { return }
        isLoadingForecast = true
        defer { isLoadingForecast = false }
        agileForecast = await AgilePredictService.shared.fetchForecast(region: settings.region)
    }

    // MARK: - Derived helpers

    var isAgileTariff: Bool {
        settings.selectedElectricityProductCode.uppercased().contains("AGILE")
    }

    var currentElectricityRate: ProcessedRate? {
        let now = Date()
        return electricityRates.first(where: { $0.validFrom <= now && $0.validTo > now })
    }

    var todayElectricityRates: [ProcessedRate] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let tomorrow = cal.date(byAdding: .day, value: 1, to: today)!
        return electricityRates
            .filter { $0.validFrom >= today && $0.validFrom < tomorrow }
            .map { rate -> ProcessedRate in
                var r = rate
                r.isCurrent = Date() >= r.validFrom && Date() < r.validTo
                return r
            }
    }

    var tomorrowElectricityRates: [ProcessedRate] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let tomorrow = cal.date(byAdding: .day, value: 1, to: today)!
        let dayAfter = cal.date(byAdding: .day, value: 2, to: today)!
        return electricityRates.filter { $0.validFrom >= tomorrow && $0.validFrom < dayAfter }
    }

    var currentGasRate: ProcessedRate? {
        let now = Date()
        return gasRates.first(where: { $0.validFrom <= now && $0.validTo > now })
    }

    var todayGasRates: [ProcessedRate] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let tomorrow = cal.date(byAdding: .day, value: 1, to: today)!
        return gasRates.filter { $0.validFrom >= today && $0.validFrom < tomorrow }
    }

    var tomorrowGasRates: [ProcessedRate] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let tomorrow = cal.date(byAdding: .day, value: 1, to: today)!
        let dayAfter = cal.date(byAdding: .day, value: 2, to: today)!
        return gasRates.filter { $0.validFrom >= tomorrow && $0.validFrom < dayAfter }
    }

    var currentComparisonElectricityRate: Double? {
        let now = Date()
        return comparisonElectricityRates.first(where: { $0.validFrom <= now && $0.validTo > now })?.price
            ?? comparisonElectricityRates.last?.price
    }

    var currentComparisonGasRate: Double? {
        let now = Date()
        return comparisonGasRates.first(where: { $0.validFrom <= now && $0.validTo > now })?.price
            ?? comparisonGasRates.last?.price
    }

    /// Periods where tomorrow's electricity is cheaper than tomorrow's gas price.
    var cheaperThanGasPeriods: [(start: Date, end: Date, price: Double)] {
        guard !tomorrowElectricityRates.isEmpty, let gasPrice = tomorrowGasRates.first?.price else { return [] }
        var periods: [(start: Date, end: Date, price: Double)] = []
        var periodStart: Date?
        var periodPrice: Double = 0
        for (i, rate) in tomorrowElectricityRates.enumerated() {
            if rate.price < gasPrice {
                if periodStart == nil {
                    periodStart = rate.validFrom
                    periodPrice = rate.price
                }
            } else if let start = periodStart {
                periods.append((start: start, end: rate.validFrom, price: periodPrice))
                periodStart = nil
            }
            if i == tomorrowElectricityRates.count - 1, let start = periodStart {
                periods.append((start: start, end: rate.validTo, price: periodPrice))
            }
        }
        return periods
    }
}

/// Maps raw DTO rates to processed domain rates.
enum ProcessedRateMapper {
    static func map(_ dtos: [EnergyRateDTO]) -> [ProcessedRate] {
        let now = Date()
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return dtos.compactMap { dto -> ProcessedRate? in
            guard let from = formatter.date(from: dto.validFrom) else { return nil }
            let to: Date
            if let validTo = dto.validTo, let parsed = formatter.date(from: validTo) {
                to = parsed
            } else {
                to = from.addingTimeInterval(30 * 60)
            }
            return ProcessedRate(
                price: dto.valueIncVat,
                validFrom: from,
                validTo: to,
                isCurrent: now >= from && now < to,
                isUpcoming: from > now
            )
        }
        .sorted { $0.validFrom < $1.validFrom }
    }
}

/// Processes a raw `AccountResponse` into domain `ProcessedAccountData`.
enum AccountProcessor {
    static func process(_ response: AccountResponse) -> ProcessedAccountData? {
        guard let active = response.properties.first(where: { $0.movedOutAt == nil }) ?? response.properties.first else {
            return nil
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let movedIn = active.movedInAt.flatMap { formatter.date(from: $0) }

        var region = "C"

        // Electricity (exclude export meters)
        var electricity: ProcessedAccountData.ProcessedElectricity?
        if let elecPoints = active.electricityMeterPoints {
            let nonExport = elecPoints.filter { $0.isExport != true }
            if let point = nonExport.first {
                let serials = (point.meters ?? []).compactMap { $0.serialNumber }
                let hasEco7 = (point.meters ?? []).contains { meter in
                    (meter.registers ?? []).contains { $0.rate == "OFFPEAK" || $0.rate == "NIGHT" }
                }
                let agreements: [ProcessedAccountData.ProcessedAgreement] = (point.agreements ?? []).compactMap { a in
                    guard let from = formatter.date(from: a.validFrom) else { return nil }
                    let to = a.validTo.flatMap { formatter.date(from: $0) }
                    let now = Date()
                    let isActive = from <= now && (to == nil || to! > now)
                    if region == "C" { region = TariffResolver.region(from: a.tariffCode) }
                    return ProcessedAccountData.ProcessedAgreement(
                        tariffCode: a.tariffCode,
                        productCode: TariffResolver.productCode(from: a.tariffCode),
                        displayName: TariffResolver.displayName(for: a.tariffCode),
                        validFrom: from,
                        validTo: to,
                        isActive: isActive,
                        isEco7: TariffResolver.isEco7(tariffCode: a.tariffCode)
                    )
                }.sorted { $0.validFrom > $1.validFrom }
                let current = agreements.first(where: { $0.isActive })
                electricity = .init(
                    mpan: point.mpan,
                    serialNumbers: serials,
                    agreements: agreements,
                    currentAgreement: current,
                    isEco7: hasEco7 || (current?.isEco7 ?? false)
                )
            }
        }

        // Gas
        var gas: ProcessedAccountData.ProcessedGas?
        if let gasPoints = active.gasMeterPoints, let point = gasPoints.first {
            let serials = (point.meters ?? []).compactMap { $0.serialNumber }
            let agreements: [ProcessedAccountData.ProcessedAgreement] = (point.agreements ?? []).compactMap { a in
                guard let from = formatter.date(from: a.validFrom) else { return nil }
                let to = a.validTo.flatMap { formatter.date(from: $0) }
                let now = Date()
                let isActive = from <= now && (to == nil || to! > now)
                if region == "C" { region = TariffResolver.region(from: a.tariffCode) }
                return ProcessedAccountData.ProcessedAgreement(
                    tariffCode: a.tariffCode,
                    productCode: TariffResolver.productCode(from: a.tariffCode),
                    displayName: TariffResolver.displayName(for: a.tariffCode),
                    validFrom: from,
                    validTo: to,
                    isActive: isActive,
                    isEco7: false
                )
            }.sorted { $0.validFrom > $1.validFrom }
            let current = agreements.first(where: { $0.isActive })
            gas = .init(
                mprn: point.mprn,
                serialNumbers: serials,
                agreements: agreements,
                currentAgreement: current
            )
        }

        return ProcessedAccountData(
            accountNumber: response.number,
            region: region,
            movedInAt: movedIn,
            electricity: electricity,
            gas: gas
        )
    }
}
