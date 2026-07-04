import SwiftUI

/// Tariff comparison card — compares current rate vs. selected comparison tariff.
struct TariffComparisonCard: View {
    let comparisonTariffName: String
    let comparisonRate: Double?
    let currentRate: Double?
    let thresholds: RateThresholds

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Tariff Rate Comparison")
                .font(.subheadline.weight(.bold))

            HStack {
                Text(comparisonTariffName)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Spacer()
                if let comparisonRate {
                    Text(PriceFormatter.format(comparisonRate))
                        .font(.callout)
                } else {
                    Text("—").foregroundStyle(.secondary)
                }
            }

            HStack {
                Text("Current Tariff")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Spacer()
                if let currentRate {
                    PriceLabel(currentRate, thresholds: thresholds, font: .callout, weight: .semibold)
                } else {
                    Text("—").foregroundStyle(.secondary)
                }
            }

            Divider()

            HStack {
                Text("Difference")
                    .font(.footnote.weight(.bold))
                Spacer()
                if let currentRate, let comparisonRate {
                    let diff = abs(currentRate - comparisonRate)
                    let cheaper = currentRate < comparisonRate
                    Text("\(PriceFormatter.format(diff)) \(cheaper ? "cheaper" : "more")")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(cheaper ? AppTheme.success : AppTheme.error)
                } else {
                    Text("—").foregroundStyle(.secondary)
                }
            }
        }
        .padding(14)
        .glassSurface(cornerRadius: 16)
    }
}
