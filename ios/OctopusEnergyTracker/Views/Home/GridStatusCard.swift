import SwiftUI

/// Carbon intensity + renewable mix card for the top of the Home screen.
struct GridStatusCard: View {
    let gridStatus: GridStatus?
    let isLoading: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "leaf.fill")
                    .foregroundStyle(AppTheme.success)
                Text("Grid Status")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                if let gridStatus {
                    Text(intensityLabel(gridStatus.intensityIndex))
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(intensityColor(gridStatus.intensityIndex).opacity(0.18))
                        .foregroundStyle(intensityColor(gridStatus.intensityIndex))
                        .clipShape(.capsule)
                }
            }

            if let gridStatus {
                HStack(spacing: 16) {
                    stat(label: "Carbon", value: "\(gridStatus.carbonIntensity)", unit: "gCO₂/kWh")
                    stat(label: "Renewable", value: String(format: "%.1f%%", gridStatus.renewablePercentage), unit: "")
                    stat(label: "Updated", value: timeAgo(gridStatus.lastUpdated), unit: "")
                }
            } else if isLoading {
                HStack(spacing: 16) {
                    ForEach(0..<3, id: \.self) { _ in
                        VStack(alignment: .leading, spacing: 4) {
                            skeletonBlock(width: 50, height: 12)
                            skeletonBlock(width: 70, height: 18)
                        }
                    }
                    Spacer()
                }
            } else {
                Text("Grid status unavailable")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .glassSurface(cornerRadius: 16)
    }

    private func stat(label: String, value: String, unit: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.headline)
                if !unit.isEmpty {
                    Text(unit)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func intensityLabel(_ index: String) -> String {
        switch index.lowercased() {
        case "very low": return "Very Low"
        case "low": return "Low"
        case "moderate": return "Moderate"
        case "high": return "High"
        case "very high": return "Very High"
        default: return index.capitalized
        }
    }

    private func intensityColor(_ index: String) -> Color {
        switch index.lowercased() {
        case "very low": return AppTheme.chartVeryLow
        case "low": return AppTheme.chartLow
        case "moderate": return AppTheme.chartMedium
        case "high": return AppTheme.chartHigh
        case "very high": return AppTheme.chartVeryHigh
        default: return AppTheme.primary
        }
    }

    private func timeAgo(_ date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "now" }
        if interval < 3600 { return "\(Int(interval/60))m ago" }
        return "\(Int(interval/3600))h ago"
    }

    private func skeletonBlock(width: CGFloat, height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(Color.secondary.opacity(0.18))
            .frame(width: width, height: height)
    }
}
