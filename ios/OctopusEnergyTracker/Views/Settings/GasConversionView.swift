import SwiftUI

/// Gas conversion settings — m³ → kWh formula parameters.
struct GasConversionView: View {
    @Environment(SettingsStore.self) private var settings

    var body: some View {
        Form {
            Section {
                LabeledContent {
                    TextField("", value: Binding(get: { settings.gasCalorificValue }, set: { settings.gasCalorificValue = $0 }), format: .number.precision(.fractionLength(1...2)))
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                } label: {
                    Text("Calorific Value (MJ/m³)")
                }
                LabeledContent {
                    TextField("", value: Binding(get: { settings.gasVolumeCorrectionFactor }, set: { settings.gasVolumeCorrectionFactor = $0 }), format: .number.precision(.fractionLength(3...5)))
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                } label: {
                    Text("Volume Correction Factor")
                }
                LabeledContent {
                    TextField("", value: Binding(get: { settings.gasCorrectionFactor }, set: { settings.gasCorrectionFactor = $0 }), format: .number.precision(.fractionLength(2...3)))
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                } label: {
                    Text("Correction Factor")
                }
            } header: {
                Text("Conversion Factors")
            } footer: {
                Text("Formula: kWh = (m³ × CV × VCF × CF) ÷ 3.6. Default values match Octopus Energy's standard conversion (CV 39.3, VCF 1.02264, CF 1.0).")
            }

            Section("Conversion Preview") {
                let exampleM3 = 10.0
                let kWh = (exampleM3 * settings.gasCalorificValue * settings.gasVolumeCorrectionFactor * settings.gasCorrectionFactor) / 3.6
                LabeledContent("10 m³ →", value: String(format: "%.2f kWh", kWh))
            }
        }
        .navigationTitle("Gas Conversion")
    }
}
