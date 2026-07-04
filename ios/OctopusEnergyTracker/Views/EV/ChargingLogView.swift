import SwiftUI

/// Charging log history view.
struct ChargingLogView: View {
    @Bindable var viewModel: EVViewModel

    var body: some View {
        List {
            if viewModel.settings.chargingLog.isEmpty {
                ContentUnavailableView("No Charges Logged", systemImage: "bolt.slash", description: Text("Scheduled charges will appear here."))
            } else {
                ForEach(viewModel.settings.chargingLog) { entry in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(entry.date, format: .dateTime.weekday().day().month().hour().minute())
                                .font(.subheadline.weight(.semibold))
                            Spacer()
                            Text(PriceFormatter.formatCurrency(entry.cost))
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(AppTheme.success)
                        }
                        Text(String(format: "%.1f kWh · %d min · %.1fp avg", entry.energyKWh, entry.durationMinutes, entry.averageRate))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Charging Log")
    }
}
