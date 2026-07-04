import SwiftUI

/// Agile forecast card — shows the cheapest upcoming Agile slot and a
/// sparkline of the next 24h forecast.
struct AgileForecastCard: View {
    let region: String
    let forecast: [AgilePredictService.ForecastPrice]
    let thresholds: RateThresholds
    let isLoading: Bool
    let tomorrowRatesAvailable: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(AppTheme.secondary)
                Text("Agile Forecast")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(region)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            if !forecast.isEmpty {
                let cheapest = forecast.min(by: { $0.price < $1.price })
                let next24 = forecast.filter { $0.validFrom <= Date().addingTimeInterval(24 * 3600) }
                if let cheapest {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Cheapest forecast")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            HStack(alignment: .firstTextBaseline, spacing: 2) {
                                Text(String(format: "%.1fp", cheapest.price))
                                    .font(.title3.weight(.bold))
                                    .foregroundStyle(ThresholdPalette.color(for: .veryLow)
                                )
                                Text(cheapest.validFrom, format: .dateTime.hour().minute().weekday(.short))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        // Sparkline of next 24h
                        Sparkline(values: next24.map { $0.price })
                            .frame(width: 120, height: 36)
                    }
                }
            } else if isLoading {
                HStack {
                    ProgressView()
                    Text("Loading forecast…")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            } else {
                Text(tomorrowRatesAvailable ? "Forecast unavailable for this region." : "Awaiting tomorrow's rates for forecast.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .glassSurface(cornerRadius: 16)
    }
}

/// Minimal sparkline using SwiftUI Path.
struct Sparkline: View {
    let values: [Double]

    var body: some View {
        Canvas { context, size in
            guard values.count > 1 else { return }
            let minV = values.min() ?? 0
            let maxV = values.max() ?? 1
            let range = max(maxV - minV, 0.001)
            let stepX = size.width / CGFloat(values.count - 1)
            var path = Path()
            for (i, v) in values.enumerated() {
                let x = CGFloat(i) * stepX
                let y = size.height - CGFloat((v - minV) / range) * size.height
                if i == 0 { path.move(to: .init(x: x, y: y)) }
                else { path.addLine(to: .init(x: x, y: y)) }
            }
            context.stroke(path, with: .color(AppTheme.secondary), lineWidth: 2)
        }
    }
}
