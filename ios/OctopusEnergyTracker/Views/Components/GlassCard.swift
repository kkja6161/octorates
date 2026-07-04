import SwiftUI

/// Reusable glass-effect card. Uses `glassEffect()` on iOS 26+,
/// `.ultraThinMaterial` fallback for iOS 18–25.
struct GlassCard<Content: View>: View {
    let cornerRadius: CGFloat
    let content: () -> Content

    init(cornerRadius: CGFloat = 16, @ViewBuilder content: @escaping () -> Content) {
        self.cornerRadius = cornerRadius
        self.content = content
    }

    var body: some View {
        if #available(iOS 26.0, *) {
            content()
                .padding(14)
                .glassEffect(.regular.interactive())
                .clipShape(.rect(cornerRadius: cornerRadius))
        } else {
            content()
                .padding(14)
                .background(.ultraThinMaterial)
                .clipShape(.rect(cornerRadius: cornerRadius))
                .shadow(color: .black.opacity(0.08), radius: 8, y: 2)
        }
    }
}

/// A simpler non-interactive glass surface for static cards.
struct GlassSurface: ViewModifier {
    let cornerRadius: CGFloat

    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .glassEffect(.regular)
                .clipShape(.rect(cornerRadius: cornerRadius))
        } else {
            content
                .background(.ultraThinMaterial)
                .clipShape(.rect(cornerRadius: cornerRadius))
                .shadow(color: .black.opacity(0.08), radius: 8, y: 2)
        }
    }
}

extension View {
    func glassSurface(cornerRadius: CGFloat = 16) -> some View {
        modifier(GlassSurface(cornerRadius: cornerRadius))
    }
}

/// A colored price label that uses threshold-based coloring.
struct PriceLabel: View {
    let price: Double
    let thresholds: RateThresholds
    let font: Font
    let fontWeight: Font.Weight

    init(_ price: Double, thresholds: RateThresholds, font: Font = .title2, weight: Font.Weight = .bold) {
        self.price = price
        self.thresholds = thresholds
        self.font = font
        self.fontWeight = weight
    }

    var body: some View {
        let level = ThresholdPalette.level(forPrice: price, thresholds: thresholds)
        Text(String(format: "%.1fp", price))
            .font(font.weight(fontWeight))
            .foregroundStyle(ThresholdPalette.color(for: level))
    }
}

/// Formats a price in p/kWh with one decimal place.
enum PriceFormatter {
    static func format(_ price: Double) -> String {
        String(format: "%.1fp", price)
    }

    static func formatCurrency(_ pounds: Double) -> String {
        String(format: "£%.2f", pounds)
    }
}
