import SwiftUI

/// Root settings screen — lists all settings categories in a grouped Form.
struct SettingsView: View {
    @Environment(SettingsStore.self) private var settings
    @Bindable var appState: AppState
    @State private var showAccount = false
    @State private var showElectricityTariff = false
    @State private var showGasTariff = false
    @State private var showElectricityComparison = false
    @State private var showGasComparison = false
    @State private var showElecThresholds = false
    @State private var showGasThresholds = false
    @State private var showGasConversion = false
    @State private var showTheme = false
    @State private var showAccessibility = false
    @State private var showNotifications = false
    @State private var showPrivacy = false
    @State private var showClearCacheAlert = false

    var body: some View {
        Form {
            Section {
                Button { showAccount = true } label: {
                    HStack {
                        Image(systemName: "person.crop.circle.badge.questionmark")
                            .foregroundStyle(AppTheme.primary)
                            .frame(width: 28)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Octopus Account")
                                .foregroundStyle(.primary)
                            Text(appState.accountData == nil ? "Not connected" : "Account \(appState.accountData?.accountNumber ?? "")")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            } header: {
                Text("Account")
            } footer: {
                Text("Enter your Octopus API key and account number to unlock personal usage, account tariffs, and per-tariff comparison.")
            }

            Section("Tariffs") {
                settingsRow(icon: "bolt.fill", iconColor: AppTheme.primary, title: "Electricity Tariff", subtitle: currentElecTariffName) { showElectricityTariff = true }
                if settings.showGas {
                    settingsRow(icon: "flame.fill", iconColor: AppTheme.gas, title: "Gas Tariff", subtitle: currentGasTariffName) { showGasTariff = true }
                }
                Toggle("Show Gas", isOn: Binding(get: { settings.showGas }, set: { settings.showGas = $0 }))
            }

            Section("Comparison") {
                settingsRow(icon: "arrow.left.arrow.right", iconColor: AppTheme.secondary, title: "Electricity Comparison", subtitle: TariffResolver.displayName(for: settings.electricityComparisonTariff)) { showElectricityComparison = true }
                if settings.showGas {
                    settingsRow(icon: "arrow.left.arrow.right", iconColor: AppTheme.secondary, title: "Gas Comparison", subtitle: TariffResolver.displayName(for: settings.gasComparisonTariff)) { showGasComparison = true }
                }
            }

            Section("Thresholds") {
                settingsRow(icon: "chart.bar.fill", iconColor: AppTheme.accent, title: "Electricity Thresholds", subtitle: thresholdSummary(settings.electricityThresholds)) { showElecThresholds = true }
                if settings.showGas {
                    settingsRow(icon: "chart.bar.fill", iconColor: AppTheme.accent, title: "Gas Thresholds", subtitle: thresholdSummary(settings.gasThresholds)) { showGasThresholds = true }
                }
            }

            Section("Preferences") {
                settingsRow(icon: "paintpalette.fill", iconColor: .purple, title: "Theme", subtitle: themeName) { showTheme = true }
                settingsRow(icon: "accessibility", iconColor: .indigo, title: "Accessibility", subtitle: accessibilitySummary) { showAccessibility = true }
                if settings.showGas {
                    settingsRow(icon: "wand.and.rays", iconColor: .teal, title: "Gas Conversion", subtitle: "m³ → kWh") { showGasConversion = true }
                }
                settingsRow(icon: "bell.badge.fill", iconColor: .pink, title: "Notifications", subtitle: settings.notificationsEnabled ? "On" : "Off") { showNotifications = true }
            }

            Section("About") {
                settingsRow(icon: "lock.shield.fill", iconColor: .gray, title: "Privacy Policy", subtitle: "") { showPrivacy = true }
                Button(role: .destructive) {
                    showClearCacheAlert = true
                } label: {
                    HStack {
                        Image(systemName: "trash.fill")
                            .frame(width: 28)
                        Text("Clear Cache")
                    }
                }
            }
        }
        .navigationTitle("Settings")
        .navigationDestination(isPresented: $showAccount) { AccountView(appState: appState) }
        .navigationDestination(isPresented: $showElectricityTariff) { TariffSelectionView(fuel: .electricity, appState: appState) }
        .navigationDestination(isPresented: $showGasTariff) { TariffSelectionView(fuel: .gas, appState: appState) }
        .navigationDestination(isPresented: $showElectricityComparison) { ComparisonView(fuel: .electricity) }
        .navigationDestination(isPresented: $showGasComparison) { ComparisonView(fuel: .gas) }
        .navigationDestination(isPresented: $showElecThresholds) { ThresholdsView(fuel: .electricity) }
        .navigationDestination(isPresented: $showGasThresholds) { ThresholdsView(fuel: .gas) }
        .navigationDestination(isPresented: $showGasConversion) { GasConversionView() }
        .navigationDestination(isPresented: $showTheme) { ThemeView() }
        .navigationDestination(isPresented: $showAccessibility) { AccessibilityView() }
        .navigationDestination(isPresented: $showNotifications) { NotificationsView() }
        .navigationDestination(isPresented: $showPrivacy) { PrivacyView() }
        .alert("Clear Cache?", isPresented: $showClearCacheAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Clear", role: .destructive) {
                settings.clearCache()
                Task { await appState.refreshRates() }
            }
        } message: {
            Text("This will clear cached rate and account data. Your settings will be preserved.")
        }
    }

    private func settingsRow(icon: String, iconColor: Color, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(iconColor)
                    .frame(width: 28)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .foregroundStyle(.primary)
                    if !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private var currentElecTariffName: String {
        appState.accountData?.electricity?.currentAgreement?.displayName
            ?? TariffResolver.displayName(for: settings.selectedElectricityProductCode)
    }

    private var currentGasTariffName: String {
        appState.accountData?.gas?.currentAgreement?.displayName
            ?? (settings.selectedGasProductCode.isEmpty ? "Not set" : TariffResolver.displayName(for: settings.selectedGasProductCode))
    }

    private var themeName: String {
        switch settings.colorSchemePreference {
        case .light: return "Light"
        case .dark: return "Dark"
        default: return "System"
        }
    }

    private var accessibilitySummary: String {
        var parts: [String] = []
        if settings.isHighContrast { parts.append("High Contrast") }
        if settings.isBoldText { parts.append("Bold Text") }
        return parts.isEmpty ? "Default" : parts.joined(separator: ", ")
    }

    private func thresholdSummary(_ t: RateThresholds) -> String {
        "VL<\(t.veryLow) L<\(t.low) M<\(t.medium) H<\(t.high) VH<\(t.veryHigh)"
    }
}
