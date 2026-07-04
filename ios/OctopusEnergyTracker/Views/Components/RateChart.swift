import SwiftUI
import Charts

/// Swift Charts wrapper for half-hourly rate visualization.
/// Line colored by threshold level, current-rate highlight, optional forecast overlay.
struct RateChart: View {
    let rates: [ProcessedRate]
    let thresholds: RateThresholds
    let showForecast: Bool
    let forecastPrices: [AgilePredictService.ForecastPrice]

    init(rates: [ProcessedRate], thresholds: RateThresholds, showForecast: Bool = false, forecastPrices: [AgilePredictService.ForecastPrice] = []) {
        self.rates = rates
        self.thresholds = thresholds
        self.showForecast = showForecast
        self.forecastPrices = forecastPrices
    }

    var body: some View {
        Chart {
            ForEach(rates) { rate in
                LineMark(
                    x: .value("Time", rate.validFrom),
                    y: .value("Price", rate.price)
                )
                .foregroundStyle(color(for: rate.price))
                .lineStyle(StrokeStyle(lineWidth: 2.5, lineJoin: .round))
                .interpolationMethod(.monotone)
            }
            if let current = rates.first(where: { $0.isCurrent }) {
                PointMark(
                    x: .value("Time", current.validFrom),
                    y: .value("Price", current.price)
                )
                .foregroundStyle(AppTheme.primary)
                .annotation(position: .top, alignment: .center) {
                    Text("Now")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(AppTheme.primary)
                }
            }
            if showForecast {
                ForEach(forecastPrices) { fp in
                    LineMark(
                        x: .value("Forecast", fp.validFrom),
                        y: .value("Forecast Price", fp.price)
                    )
                    .foregroundStyle(AppTheme.secondary.opacity(0.6))
                    .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                    .interpolationMethod(.monotone)
                }
            }
        }
        .chartYScale(domain: yDomain)
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 6)) { _ in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.hour())
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { _ in
                AxisGridLine()
                AxisValueLabel()
            }
        }
        .frame(height: 180)
    }

    private func color(for price: Double) -> Color {
        ThresholdPalette.color(for: ThresholdPalette.level(forPrice: price, thresholds: thresholds))
    }

    private var yDomain: ClosedRange<Double> {
        let prices = rates.map { $0.price } + forecastPrices.map { $0.price }
        guard let minP = prices.min(), let maxP = prices.max() else { return 0...40 }
        let pad = max((maxP - minP) * 0.15, 3)
        return max(0, minP - pad)...(maxP + pad)
    }
}
