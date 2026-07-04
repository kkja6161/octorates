import SwiftUI

@main
struct OctopusEnergyTrackerApp: App {
    @State private var settingsStore = SettingsStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(settingsStore)
                .preferredColorScheme(settingsStore.colorSchemePreference)
                .tint(AppTheme.primary)
        }
    }
}
