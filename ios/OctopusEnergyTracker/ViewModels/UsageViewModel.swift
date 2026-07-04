import Foundation

/// Consumption fetching & aggregation.
@Observable
final class UsageViewModel {
    var electricityDaily: [DailyConsumption] = []
    var gasDaily: [DailyConsumption] = []
    var isLoading = false
    var error: String?

    enum DateRangeMode: String, CaseIterable, Identifiable {
        case lastMonth = "Last Month"
        case currentMonth = "Current Month"
        case custom = "Custom"
        case billPeriod = "Bill Period"
        var id: String { rawValue }
    }

    var rangeMode: DateRangeMode = .lastMonth
    var customStart: Date = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
    var customEnd: Date = Date()

    let settings: SettingsStore
    let appState: AppState

    init(settings: SettingsStore, appState: AppState) {
        self.settings = settings
        self.appState = appState
    }

    private var apiKey: String? { settings.apiKey }

    var canFetch: Bool {
        apiKey != nil && !settings.accountNumber.isEmpty && appState.accountData != nil
    }

    @MainActor
    func refresh() async {
        guard canFetch else {
            error = "Connect your Octopus account in Settings to view usage."
            return
        }
        isLoading = true
        error = nil
        defer { isLoading = false }

        let (from, to) = dateRange()
        guard let apiKey = apiKey, let account = appState.accountData else { return }

        async let elecDaily = fetchDaily(
            fuel: .electricity,
            mpanOrMprn: account.electricity?.mpan ?? "",
            serial: account.electricity?.serialNumbers.first ?? "",
            apiKey: apiKey,
            from: from, to: to,
            rates: appState.electricityRates,
            comparisonRates: appState.comparisonElectricityRates,
            flexibleRate: appState.flexibleElectricityRate,
            isGas: false)

        async let gasDaily: [DailyConsumption] = settings.showGas && account.gas != nil
            ? fetchDaily(
                fuel: .gas,
                mpanOrMprn: account.gas?.mprn ?? "",
                serial: account.gas?.serialNumbers.first ?? "",
                apiKey: apiKey,
                from: from, to: to,
                rates: appState.gasRates,
                comparisonRates: appState.comparisonGasRates,
                flexibleRate: appState.flexibleGasRate,
                isGas: true)
            : []

        self.electricityDaily = await elecDaily
        self.gasDaily = await gasDaily
    }

    private func dateRange() -> (Date, Date) {
        let cal = Calendar.current
        switch rangeMode {
        case .lastMonth:
            let end = cal.startOfDay(for: Date())
            let start = cal.date(byAdding: .month, value: -1, to: end)!
            return (start, end)
        case .currentMonth:
            let now = Date()
            let start = cal.date(from: cal.dateComponents([.year, .month], from: now))!
            return (start, now)
        case .custom:
            return (cal.startOfDay(for: customStart), customEnd)
        case .billPeriod:
            let end = Date()
            let start = cal.date(byAdding: .month, value: -1, to: end)!
            return (start, end)
        }
    }

    private func fetchDaily(
        fuel: FuelType,
        mpanOrMprn: String,
        serial: String,
        apiKey: String,
        from: Date,
        to: Date,
        rates: [ProcessedRate],
        comparisonRates: [ProcessedRate],
        flexibleRate: Double?,
        isGas: Bool
    ) async -> [DailyConsumption] {
        guard !mpanOrMprn.isEmpty, !serial.isEmpty else { return [] }
        do {
            let entries = try await OctopusAPIService.shared.fetchConsumption(
                mpanOrMprn: mpanOrMprn, serial: serial, apiKey: apiKey,
                fuel: fuel, periodFrom: from, periodTo: to)
            return aggregateDaily(
                entries: entries,
                rates: rates,
                comparisonRates: comparisonRates,
                flexibleRate: flexibleRate,
                isGas: isGas,
                settings: settings)
        } catch {
            self.error = error.localizedDescription
            return []
        }
    }

    /// Aggregates half-hourly entries into daily summaries with cost calculations.
    static func aggregateDaily(
        entries: [ConsumptionEntryDTO],
        rates: [ProcessedRate],
        comparisonRates: [ProcessedRate],
        flexibleRate: Double?,
        isGas: Bool,
        settings: SettingsStore
    ) -> [DailyConsumption] {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let cal = Calendar.current

        // Group by day
        var grouped: [Date: [ConsumptionEntryDTO]] = [:]
        for entry in entries {
            guard let start = formatter.date(from: entry.intervalStart) else { continue }
            let day = cal.startOfDay(for: start)
            grouped[day, default: []].append(entry)
        }

        return grouped.keys.sorted().map { day in
            let dayEntries = grouped[day] ?? []
            var totalConsumption: Double = 0
            var totalCost: Double = 0
            var totalComparisonCost: Double = 0
            var totalFlexibleCost: Double = 0
            var processedEntries: [ConsumptionEntry] = []

            for entry in dayEntries {
                guard let start = formatter.date(from: entry.intervalStart),
                      let end = formatter.date(from: entry.intervalEnd) else { continue }

                let consumption = isGas ? convertGasToKWh(m3: entry.consumption, settings: settings) : entry.consumption
                totalConsumption += consumption

                // Find matching rate by half-hour slot
                let rate = rates.first { $0.validFrom <= start && $0.validTo > start }?.price
                let comparisonRate = comparisonRates.first { $0.validFrom <= start && $0.validTo > start }?.price
                let cost = (rate ?? 0) * consumption / 100  // p → £
                let comparisonCost = (comparisonRate ?? 0) * consumption / 100
                let flexibleCost = (flexibleRate ?? 0) * consumption / 100

                totalCost += cost
                totalComparisonCost += comparisonCost
                totalFlexibleCost += flexibleCost

                processedEntries.append(ConsumptionEntry(
                    consumption: consumption,
                    intervalStart: start,
                    intervalEnd: end,
                    rate: rate,
                    cost: cost,
                    comparisonRate: comparisonRate,
                    comparisonCost: comparisonCost,
                    flexibleRate: flexibleRate,
                    flexibleCost: flexibleCost
                ))
            }

            return DailyConsumption(
                date: day,
                totalConsumption: totalConsumption,
                cost: totalCost,
                comparisonCost: totalComparisonCost,
                flexibleCost: totalFlexibleCost,
                entries: processedEntries.sorted { $0.intervalStart < $1.intervalStart }
            )
        }
    }

    /// Converts m³ → kWh using the user's gas conversion settings.
    static func convertGasToKWh(m3: Double, settings: SettingsStore) -> Double {
        let cv = settings.gasCalorificValue
        let vcf = settings.gasVolumeCorrectionFactor
        let cf = settings.gasCorrectionFactor
        return (m3 * cv * vcf * cf) / 3.6
    }
}
