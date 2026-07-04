import SwiftUI

/// Fuel type selector card (Electricity / Gas).
struct FuelTypeCard: View {
    let type: FuelTypeKind
    let isExpanded: Bool
    let currentPrice: Double?
    let thresholds: RateThresholds
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 10) {
                Image(systemName: type == .electricity ? "bolt.fill" : "flame.fill")
                    .font(.title3)
                    .foregroundStyle(isExpanded ? .white : iconColor)
                    .frame(width: 44, height: 44)
                    .background(isExpanded ? Color.white.opacity(0.22) : iconBg)
                    .clipShape(.circle)

                if let currentPrice {
                    Text(PriceFormatter.format(currentPrice))
                        .font(.title2.weight(.bold))
                        .foregroundStyle(isExpanded ? .white : .primary)
                } else {
                    Text("No data")
                        .font(.footnote.italic())
                        .foregroundStyle(isExpanded ? .white : .secondary)
                }

                Text(type == .electricity ? "Electricity" : "Gas")
                    .font(.caption)
                    .foregroundStyle(isExpanded ? .white.opacity(0.85) : .secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .padding(.horizontal, 8)
            .background(isExpanded ? AnyShapeStyle(AppTheme.primary) : AnyShapeStyle(.ultraThinMaterial))
            .clipShape(.rect(cornerRadius: 14))
            .scaleEffect(isExpanded ? 1.02 : 1.0)
            .animation(.spring(response: 0.35, dampingFraction: 0.7), value: isExpanded)
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: isExpanded)
    }

    private var iconColor: Color {
        type == .electricity ? AppTheme.primary : AppTheme.gas
    }
    private var iconBg: Color {
        type == .electricity ? AppTheme.primary.opacity(0.12) : AppTheme.gas.opacity(0.12)
    }
}

enum FuelTypeKind {
    case electricity, gas
}
