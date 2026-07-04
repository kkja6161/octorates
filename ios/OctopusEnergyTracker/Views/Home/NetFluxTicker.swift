import SwiftUI

/// Net Flux ticker — shows live import/export rate vs. current load.
/// Only shown for Agile tariffs.
struct NetFluxTicker: View {
    let importRate: Double?
    let exportRate: Double?
    let currentLoad: Double?
    let currentGeneration: Double?

    var body: some View {
        HStack(spacing: 12) {
            fluxItem(
                icon: "arrow.down.right",
                label: "Import",
                value: importRate,
                color: AppTheme.error
            )
            Divider()
                .frame(height: 32)
            fluxItem(
                icon: "arrow.up.right",
                label: "Export",
                value: exportRate,
                color: AppTheme.success
            )
            Divider()
                .frame(height: 32)
            fluxItem(
                icon: "bolt.fill",
                label: "Load",
                value: currentLoad,
                color: AppTheme.primary,
                unit: "kW"
            )
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .glassSurface(cornerRadius: 14)
    }

    private func fluxItem(icon: String, label: String, value: Double?, color: Color, unit: String = "p") -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.callout)
                .foregroundStyle(color)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            if let value {
                HStack(alignment: .firstTextBaseline, spacing: 1) {
                    Text(String(format: "%.1f", value))
                        .font(.subheadline.weight(.bold))
                    Text(unit)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("—")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
    }
}
