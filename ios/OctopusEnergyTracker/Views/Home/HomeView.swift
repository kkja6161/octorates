import SwiftUI

/// The main Home / Dashboard screen.
struct HomeView: View {
    @Environment(SettingsStore.self) private var settings
    @Bindable var appState: AppState
    @State private var expandedFuel: FuelTypeKind? = .electricity
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    // Fuel type selector
                    HStack(spacing: 8) {
                        FuelTypeCard(
                            type: .electricity,
                            isExpanded: expandedFuel == .electricity,
                            currentPrice: appState.currentElectricityRate?.price,
                            thresholds: settings.electricityThresholds,
                            onTap: { toggleFuel(.electricity) }
                        )
                        if settings.showGas {
                            FuelTypeCard(
                                type: .gas,
                                isExpanded: expandedFuel == .gas,
                                currentPrice: appState.currentGasRate?.price,
                                thresholds: settings.gasThresholds,
                                onTap: { toggleFuel(.gas) }
                            )
                        }
                    }

                    // Content for expanded fuel
                    if let fuel = expandedFuel {
                        fuelContent(for: fuel)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.top, 6)
                .padding(.bottom, 24)
            }
            .background(AppTheme.backgroundGradient.ignoresSafeArea())
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Settings")
                }
            }
            .navigationDestination(isPresented: $showSettings) {
                SettingsView(appState: appState)
            }
            .refreshable {
                await appState.refreshRates()
                await appState.refreshGridStatus()
                if appState.isAgileTariff {
                    await appState.refreshAgileForecast()
                }
            }
            .task {
                if appState.electricityRates.isEmpty {
                    await appState.refreshRates()
                }
                if appState.gridStatus == nil {
                    await appState.refreshGridStatus()
                }
                if appState.isAgileTariff && appState.agileForecast.isEmpty {
                    await appState.refreshAgileForecast()
                }
            }
        }
    }

    @ViewBuilder
    private func fuelContent(for fuel: FuelTypeKind) -> some View {
        let isElec = fuel == .electricity
        let today = isElec ? appState.todayElectricityRates : appState.todayGasRates
        let tomorrow = isElec ? appState.tomorrowElectricityRates : appState.tomorrowGasRates
        let thresholds = isElec ? settings.electricityThresholds : settings.gasThresholds
        let isAgile = isElec && appState.isAgileTariff

        // Determine if this fuel is a daily-rate (gas/variable) or half-hourly.
        let isDailyRate = !isElec || today.count <= 4 || (today.count > 0 && allSamePrice(today))

        // Grid status + Net flux only appear above the fuel content when electricity
        if isElec {
            GridStatusCard(gridStatus: appState.gridStatus, isLoading: appState.isLoadingGrid)

            if isAgile {
                NetFluxTicker(
                    importRate: appState.currentElectricityRate?.price,
                    exportRate: nil,
                    currentLoad: appState.liveDemand,
                    currentGeneration: nil
                )
            }
        }

        if today.isEmpty {
            placeholder
        } else if isDailyRate {
            HStack(spacing: 8) {
                DailyRateCard(label: "Today", price: today[0].price, date: today[0].validFrom, color: isElec ? AppTheme.primary : AppTheme.gas)
                if !tomorrow.isEmpty {
                    DailyRateCard(label: "Tomorrow", price: tomorrow[0].price, date: tomorrow[0].validFrom, color: isElec ? AppTheme.primary : AppTheme.gas)
                }
            }
        } else {
            // Today's rates chart
            VStack(alignment: .leading, spacing: 8) {
                Text("Today's Rates")
                    .font(.subheadline.weight(.bold))
                RateChart(
                    rates: today,
                    thresholds: thresholds,
                    showForecast: isAgile,
                    forecastPrices: appState.agileForecast
                )
            }
            .padding(14)
            .glassSurface(cornerRadius: 16)

            // Tomorrow's rates chart
            if !tomorrow.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Tomorrow's Rates")
                        .font(.subheadline.weight(.bold))
                    RateChart(
                        rates: tomorrow,
                        thresholds: thresholds,
                        showForecast: isAgile,
                        forecastPrices: appState.agileForecast
                    )

                    if isAgile && !appState.cheaperThanGasPeriods.isEmpty && !appState.tomorrowGasRates.isEmpty {
                        CheaperThanGasCard(
                            periods: appState.cheaperThanGasPeriods,
                            gasPrice: appState.tomorrowGasRates.first?.price
                        )
                    }
                }
                .padding(14)
                .glassSurface(cornerRadius: 16)
            }
        }

        // Tariff comparison
        if isElec, let current = appState.currentElectricityRate, let comp = appState.currentComparisonElectricityRate {
            TariffComparisonCard(
                comparisonTariffName: TariffResolver.displayName(for: settings.electricityComparisonTariff),
                comparisonRate: comp,
                currentRate: current.price,
                thresholds: thresholds
            )
        } else if !isElec, let current = appState.currentGasRate, let comp = appState.currentComparisonGasRate {
            TariffComparisonCard(
                comparisonTariffName: TariffResolver.displayName(for: settings.gasComparisonTariff),
                comparisonRate: comp,
                currentRate: current.price,
                thresholds: thresholds
            )
        }

        // Agile forecast card
        if isAgile {
            AgileForecastCard(
                region: settings.region,
                forecast: appState.agileForecast,
                thresholds: thresholds,
                isLoading: appState.isLoadingForecast,
                tomorrowRatesAvailable: !appState.tomorrowElectricityRates.isEmpty
            )
        }
    }

    private var placeholder: some View {
        VStack(spacing: 8) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("No Data Available")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func allSamePrice(_ rates: [ProcessedRate]) -> Bool {
        guard let first = rates.first else { return true }
        return rates.allSatisfy { abs($0.price - first.price) < 0.01 }
    }

    private func toggleFuel(_ fuel: FuelTypeKind) {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
            expandedFuel = expandedFuel == fuel ? nil : fuel
        }
    }
}
