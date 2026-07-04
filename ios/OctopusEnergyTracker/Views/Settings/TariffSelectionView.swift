import SwiftUI

/// Tariff selection view — pick from account's tariff agreements (history).
/// The selected tariff determines which rates are fetched for the home dashboard.
struct TariffSelectionView: View {
    @Environment(SettingsStore.self) private var settings
    let fuel: FuelType
    @Bindable var appState: AppState

    var body: some View {
        Form {
            if let agreements = currentAgreements, !agreements.isEmpty {
                Section("Your Tariff History") {
                    ForEach(agreements) { agreement in
                        Button {
                            selectAgreement(agreement)
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(agreement.displayName)
                                        .foregroundStyle(.primary)
                                    Text("\(agreement.validFrom.formatted(date: .abbreviated, time: .omitted)) – \(agreement.validTo?.formatted(date: .abbreviated, time: .omitted) ?? "now")")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if isSelected(agreement) {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(AppTheme.primary)
                                }
                            }
                        }
                    }
                }
            } else {
                Section {
                    Text("Connect your Octopus account to see your tariff history.")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle(fuel == .electricity ? "Electricity Tariff" : "Gas Tariff")
    }

    private var currentAgreements: [ProcessedAccountData.ProcessedAgreement]? {
        if fuel == .electricity {
            return appState.accountData?.electricity?.agreements
        } else {
            return appState.accountData?.gas?.agreements
        }
    }

    private func isSelected(_ a: ProcessedAccountData.ProcessedAgreement) -> Bool {
        if fuel == .electricity {
            return settings.selectedElectricityTariffCode == a.tariffCode
        } else {
            return settings.selectedGasTariffCode == a.tariffCode
        }
    }

    private func selectAgreement(_ a: ProcessedAccountData.ProcessedAgreement) {
        if fuel == .electricity {
            settings.selectedElectricityTariffCode = a.tariffCode
            settings.selectedElectricityProductCode = a.productCode
        } else {
            settings.selectedGasTariffCode = a.tariffCode
            settings.selectedGasProductCode = a.productCode
        }
        UISelectionFeedbackGenerator().selectionChanged()
        Task { await appState.refreshRates() }
    }
}
