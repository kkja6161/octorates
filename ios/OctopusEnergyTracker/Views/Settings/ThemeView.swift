import SwiftUI

/// Theme picker — light/dark/system.
struct ThemeView: View {
    @Environment(SettingsStore.self) private var settings

    var body: some View {
        Form {
            Picker("Appearance", selection: Binding(get: { settings.colorSchemePreference }, set: { settings.colorSchemePreference = $0 })) {
                Text("System").tag(ColorScheme?.none)
                Text("Light").tag(ColorScheme?.light)
                Text("Dark").tag(ColorScheme?.dark)
            }
            .pickerStyle(.inline)
            .labelsHidden()
        }
        .navigationTitle("Theme")
    }
}
