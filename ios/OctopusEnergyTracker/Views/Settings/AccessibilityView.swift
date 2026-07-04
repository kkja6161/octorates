import SwiftUI

/// Accessibility settings — high contrast, bold text.
struct AccessibilityView: View {
    @Environment(SettingsStore.self) private var settings

    var body: some View {
        Form {
            Section("Display") {
                Toggle("High Contrast", isOn: Binding(get: { settings.isHighContrast }, set: { settings.isHighContrast = $0 }))
                Toggle("Bold Text", isOn: Binding(get: { settings.isBoldText }, set: { settings.isBoldText = $0 }))
            } footer: {
                Text("High contrast increases border visibility and uses stronger chart colors. Bold text increases the weight of labels throughout the app.")
            }

            Section("System") {
                Link("Open iOS Accessibility Settings", destination: URL(string: UIApplication.openSettingsURLString)!)
            }
        }
        .navigationTitle("Accessibility")
    }
}
