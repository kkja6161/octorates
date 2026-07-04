import SwiftUI

/// Detail view for a single day's half-hourly consumption breakdown.
struct DailyDetailView: View {
    let daily: DailyConsumption
    let fuel: FuelType
    let thresholds: RateThresholds

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                // Summary header
                VStack(alignment: .leading, spacing: 10) {
                    Text(daily.date, format: .dateTime.weekday().day().month().year())
                        .font(.title3.weight(.bold))

                    HStack(spacing: 16) {
                        summaryStat(label: "Usage", value: String(format: "%.1f kWh", daily.totalConsumption))
                        summaryStat(label: "Cost", value: PriceFormatter.formatCurrency(daily.cost))
                        summaryStat(label: "Comparison", value: PriceFormatter.formatCurrency(daily.comparisonCost))
                    }

                    let diff = daily.differenceVsComparison
                    HStack {
                        Image(systemName: diff >= 0 ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
                            .foregroundStyle(diff >= 0 ? AppTheme.success : AppTheme.error)
                        Text(diff >= 0
                             ? "\(PriceFormatter.formatCurrency(diff)) cheaper than \(fuel == .electricity ? "electricity" : "gas") comparison"
                             : "\(PriceFormatter.formatCurrency(-diff)) more expensive than comparison")
                            .font(.footnote)
                            .foregroundStyle(diff >= 0 ? AppTheme.success : AppTheme.error)
                    }
                }
                .padding(14)
                .glassSurface(cornerRadius: 16)
                .frame(maxWidth: .infinity, alignment: .leading)

                // Half-hourly breakdown
                VStack(alignment: .leading, spacing: 6) {
                    Text("Half-Hourly Breakdown")
                        .font(.subheadline.weight(.semibold))

                    ForEach(daily.entries) { entry in
                        halfHourRow(entry)
                    }
                }
                .padding(14)
                .glassSurface(cornerRadius: 16)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(14)
        }
        .background(AppTheme.backgroundGradient.ignoresSafeArea())
        .navigationTitle(daily.date.formatted(date: .abbreviated, time: .omitted))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func summaryStat(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.callout.weight(.semibold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func halfHourRow(_ entry: ConsumptionEntry) -> some View {
        HStack {
            Text(entry.intervalStart, format: .dateTime.hour().minute())
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 60, alignment: .leading)
            Text(String(format: "%.2f kWh", entry.consumption))
                .font(.caption)
            Spacer()
            if let rate = entry.rate {
                PriceLabel(rate, thresholds: thresholds, font: .caption, weight: .semibold)
            } else {
                Text("—")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Text(PriceFormatter.formatCurrency(entry.cost))
                .font(.caption.weight(.semibold))
                .frame(width: 60, alignment: .trailing)
        }
        .padding(.vertical, 2)
    }
}
