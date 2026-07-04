import SwiftUI
import Charts

/// Bar chart showing daily cost over the selected date range.
struct UsageChart: View {
    let daily: [DailyConsumption]
    let fuel: FuelType

    var body: some View {
        Chart {
            ForEach(daily) { d in
                BarMark(
                    x: .value("Day", d.date, unit: .day),
                    y: .value("Cost", d.cost)
                )
                .foregroundStyle(fuel == .electricity ? AppTheme.primary : AppTheme.gas)
                .cornerRadius(3)
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 6)) { _ in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.day().month(.abbreviated))
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { _ in
                AxisGridLine()
                AxisValueLabel()
            }
        }
        .frame(height: 200)
    }
}
