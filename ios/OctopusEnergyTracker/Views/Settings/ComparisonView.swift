import SwiftUI

/// Comparison tariff selection — shows **current** tariffs (from hardcoded list),
/// not historical ones. This mirrors the fix applied to the Expo app.
struct ComparisonView: View {
    @Environment(SettingsStore.self) private var settings
    let fuel: FuelType

    private var options: [ComparisonTariffOption] {
        fuel == .electricity ? ComparisonTariffs.electricity : ComparisonTariffs.gas
    }

    private var selectedCode: String {
        get { fuel == .electricity ? settings.electricityComparisonTariff : settings.gasComparisonTariff }
        set {
            if fuel == .electricity { settings.electricityComparisonTariff = newValue }
            else { settings.gasComparisonTariff = newValue }
        }
    }

    var body: some View {
        Form {
            Section("Current Tariffs") {
                ForEach(options) { option in
                    Button {
                        selectedCode = option.code
                        UISelectionFeedbackGenerator().selectionChanged()
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(option.displayName)
                                    .foregroundStyle(.primary)
                                Text(option.description)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if selectedCode == option.code {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(AppTheme.primary)
                            }
                        }
                    }
                }
            } footer: {
                Text("These are currently available Octopus tariffs. The selected tariff will be used for cost comparison across the app.")
            }
        }
        .navigationTitle(fuel == .electricity ? "Electricity Comparison" : "Gas Comparison")
    }
}
