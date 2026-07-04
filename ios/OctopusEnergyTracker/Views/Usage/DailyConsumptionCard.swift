import SwiftUI

/// Daily consumption card — shows total consumption, cost, and comparison.
struct DailyConsumptionCard: View {
    let daily: DailyConsumption
    let fuel: FuelType
    let isExpanded: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: fuel == .electricity ? "bolt.fill" : "flame.fill")
                        .foregroundStyle(fuel == .electricity ? AppTheme.primary : AppTheme.gas)
                    Text(daily.date, format: .dateTime.weekday(.short).day().month())
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }

                HStack(spacing: 16) {
                    statBlock(label: "Usage", value: String(format: "%.1f kWh", daily.totalConsumption))
                    statBlock(label: "Cost", value: PriceFormatter.formatCurrency(daily.cost))
                    statBlock(label: "Comparison", value: PriceFormatter.formatCurrency(daily.comparisonCost))
                }

                if isExpanded {
                    Divider()
                    HStack(spacing: 16) {
                        statBlock(label: "Flexible", value: PriceFormatter.formatCurrency(daily.flexibleCost))
                        statBlock(label: "vs Comparison", value: differenceText(daily.differenceVsComparison), color: daily.differenceVsComparison >= 0 ? AppTheme.success : AppTheme.error)
                        statBlock(label: "vs Flexible", value: differenceText(daily.differenceVsFlexible), color: daily.differenceVsFlexible >= 0 ? AppTheme.success : AppTheme.error)
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassSurface(cornerRadius: 14)
        }
        .buttonStyle(.plain)
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: isExpanded)
    }

    private func statBlock(label: String, value: String, color: Color = .primary) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.callout.weight(.semibold))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func differenceText(_ value: Double) -> String {
        if value >= 0 {
            return "−\(PriceFormatter.formatCurrency(value))"
        } else {
            return "+\(PriceFormatter.formatCurrency(-value))"
        }
    }
}
