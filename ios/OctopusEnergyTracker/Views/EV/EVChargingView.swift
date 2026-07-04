import SwiftUI

/// EV charging optimizer view — profile management, cheapest slot finder, log.
struct EVChargingView: View {
    @Environment(SettingsStore.self) private var settings
    @Bindable var viewModel: EVViewModel
    @Bindable var appState: AppState
    @State private var showProfiles = false
    @State private var showLog = false
    @State private var currentChargeInput: Double = 30
    @State private var targetChargeInput: Double = 80

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    if let profile = viewModel.activeProfile {
                        profileCard(profile)
                        chargeRangeCard(profile)
                        cheapestSlotCard
                        actionsCard
                    } else {
                        noProfileCard
                    }
                }
                .padding(.horizontal, 14)
                .padding(.top, 6)
                .padding(.bottom, 24)
            }
            .background(AppTheme.backgroundGradient.ignoresSafeArea())
            .navigationTitle("EV Charging")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button { showProfiles = true } label: { Label("Manage Profiles", systemImage: "car.2") }
                        Button { showLog = true } label: { Label("Charging Log", systemImage: "clock.arrow.circlepath") }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .navigationDestination(isPresented: $showProfiles) { ProfileManagementView(viewModel: viewModel) }
            .navigationDestination(isPresented: $showLog) { ChargingLogView(viewModel: viewModel) }
            .task {
                if viewModel.cheapestSlots.isEmpty {
                    await viewModel.computeCheapestSlots()
                }
            }
        }
    }

    private func profileCard(_ profile: EVProfile) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "car.fill")
                    .foregroundStyle(AppTheme.primary)
                Text(profile.name)
                    .font(.headline)
                Spacer()
                Text("\(profile.batteryCapacity, specifier: "%.0f") kWh")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: 16) {
                stat(label: "Charger", value: String(format: "%.1f kW", profile.chargerPower))
                stat(label: "Current", value: "\(Int(currentChargeInput))%")
                stat(label: "Target", value: "\(Int(targetChargeInput))%")
            }
        }
        .padding(14)
        .glassSurface(cornerRadius: 16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func chargeRangeCard(_ profile: EVProfile) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Charge Range")
                .font(.subheadline.weight(.semibold))

            VStack(alignment: .leading, spacing: 4) {
                Text("Current Charge: \(Int(currentChargeInput))%")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Slider(value: $currentChargeInput, in: 0...100, step: 5)
                    .tint(AppTheme.primary)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Target Charge: \(Int(targetChargeInput))%")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Slider(value: $targetChargeInput, in: 0...100, step: 5)
                    .tint(AppTheme.success)
            }

            let energyNeeded = profile.batteryCapacity * max(0, targetChargeInput - currentChargeInput) / 100
            let minutes = profile.chargerPower > 0 ? Int((energyNeeded / profile.chargerPower) * 60) : 0
            HStack {
                Image(systemName: "bolt.fill")
                    .foregroundStyle(AppTheme.accent)
                Text(String(format: "%.1f kWh needed · %d min", energyNeeded, minutes))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .glassSurface(cornerRadius: 16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var cheapestSlotCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(AppTheme.secondary)
                Text("Cheapest Charging Slot")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Button {
                    Task { await viewModel.computeCheapestSlots() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }

            if viewModel.isLoading {
                HStack { ProgressView(); Text("Calculating…") }
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else if let slot = viewModel.cheapestSlots.first {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(slot.start, format: .dateTime.weekday(.short).hour().minute())
                                .font(.callout.weight(.semibold))
                            Text("– \(slot.end, format: .dateTime.hour().minute())")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(String(format: "%.1fp avg", slot.averageRate))
                                .font(.headline)
                                .foregroundStyle(AppTheme.chartVeryLow)
                            Text(PriceFormatter.formatCurrency(slot.totalCost))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Text(String(format: "%.1f kWh delivered", slot.energyKWh))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("No slots available. Make sure you have an Agile tariff selected and tomorrow's rates are published.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .glassSurface(cornerRadius: 16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var actionsCard: some View {
        VStack(spacing: 8) {
            Button {
                guard let slot = viewModel.cheapestSlots.first else { return }
                NotificationService.shared.scheduleCheapSlotReminder(start: slot.start, price: slot.averageRate)
                let log = ChargingLogEntry(
                    date: Date(),
                    durationMinutes: Int(slot.end.timeIntervalSince(slot.start) / 60),
                    energyKWh: slot.energyKWh,
                    cost: slot.totalCost,
                    slotStart: slot.start,
                    averageRate: slot.averageRate
                )
                viewModel.logCharge(entry: log)
            } label: {
                Label("Schedule Charge", systemImage: "calendar.badge.plus")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.cheapestSlots.isEmpty)
        }
        .padding(14)
        .glassSurface(cornerRadius: 16)
    }

    private var noProfileCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "car")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("No EV Profile")
                .font(.headline)
            Button { showProfiles = true } label: {
                Text("Create a Profile")
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .glassSurface(cornerRadius: 18)
    }

    private func stat(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.callout.weight(.semibold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
