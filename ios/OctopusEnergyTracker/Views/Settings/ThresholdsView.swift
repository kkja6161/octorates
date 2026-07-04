import SwiftUI

/// Thresholds editor — color-coding thresholds for rate levels.
struct ThresholdsView: View {
    @Environment(SettingsStore.self) private var settings
    let fuel: FuelType

    private var thresholds: RateThresholds {
        get { fuel == .electricity ? settings.electricityThresholds : settings.gasThresholds }
        set {
            if fuel == .electricity { settings.electricityThresholds = newValue }
            else { settings.gasThresholds = newValue }
        }
    }

    var body: some View {
        Form {
            Section("Color Thresholds (p/kWh)") {
                thresholdRow(label: "Very Low", color: AppTheme.chartVeryLow, binding: $thresholds.veryLow)
                thresholdRow(label: "Low", color: AppTheme.chartLow, binding: $thresholds.low)
                thresholdRow(label: "Medium", color: AppTheme.chartMedium, binding: $thresholds.medium)
                thresholdRow(label: "High", color: AppTheme.chartHigh, binding: $thresholds.high)
                thresholdRow(label: "Very High", color: AppTheme.chartVeryHigh, binding: $thresholds.veryHigh)
            } footer: {
                Text("Rates below each threshold will be color-coded with the matching color. Thresholds must be in increasing order.")
            }

            Section("Preview") {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach([0.0, 4.0, 8.0, 12.0, 20.0, 35.0, 50.0], id: \.self) { price in
                        HStack {
                            PriceLabel(price, thresholds: thresholds, font: .body, weight: .semibold)
                            Spacer()
                            Text(ThresholdPalette.label(for: ThresholdPalette.level(forPrice: price, thresholds: thresholds)))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle(fuel == .electricity ? "Electricity Thresholds" : "Gas Thresholds")
    }

    private func thresholdRow(label: String, color: Color, binding: Binding<Double>) -> some View {
        HStack {
            Circle()
                .fill(color)
                .frame(width: 14, height: 14)
            Text(label)
            Spacer()
            TextField("", value: binding, format: .number.precision(.fractionLength(0...2)))
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 70)
            Text("p")
                .foregroundStyle(.secondary)
        }
    }
}
