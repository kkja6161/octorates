import SwiftUI

/// Daily rate card — for tariffs with a single daily rate (gas, fixed, etc.).
struct DailyRateCard: View {
    let label: String
    let price: Double
    let date: Date
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Text(label.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .tracking(0.5)
            Text(PriceFormatter.format(price))
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text(date, format: .dateTime.day().month())
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .glassSurface(cornerRadius: 14)
    }
}
