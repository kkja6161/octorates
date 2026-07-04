import SwiftUI

/// Cheaper-than-gas periods card — shows tomorrow's electricity slots
/// that are cheaper than the gas price (for heat pump / cooking decisions).
struct CheaperThanGasCard: View {
    let periods: [(start: Date, end: Date, price: Double)]
    let gasPrice: Double?

    var body: some View {
        if periods.isEmpty || gasPrice == nil {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "arrow.down.circle.fill")
                        .foregroundStyle(AppTheme.success)
                    Text("Cheaper Than Gas")
                        .font(.subheadline.weight(.bold))
                    Spacer()
                    Text("Gas: \(PriceFormatter.format(gasPrice ?? 0))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                ForEach(periods.prefix(6).indices, id: \.self) { i in
                    let p = periods[i]
                    HStack {
                        Text("\(p.start, format: .dateTime.hour().minute()) – \(p.end, format: .dateTime.hour().minute())")
                            .font(.footnote)
                            .foregroundStyle(AppTheme.success)
                        Spacer()
                        Text(PriceFormatter.format(p.price))
                            .font(.footnote.weight(.bold))
                            .foregroundStyle(AppTheme.success)
                    }
                }
            }
            .padding(12)
            .background(AppTheme.success.opacity(0.08))
            .clipShape(.rect(cornerRadius: 12))
        }
    }
}
