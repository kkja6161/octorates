import SwiftUI

/// Root TabView — three tabs (Home, Usage, EV) + settings pushed from Home.
struct ContentView: View {
    @Environment(SettingsStore.self) private var settings
    @State private var appState: AppState?
    @State private var usageVM: UsageViewModel?
    @State private var evVM: EVViewModel?
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            if let appState {
                HomeView(appState: appState)
                    .tabItem {
                        Label("Home", systemImage: "house.fill")
                    }
                    .tag(0)

                if let usageVM {
                    UsageView(viewModel: usageVM, appState: appState)
                        .tabItem {
                            Label("Usage", systemImage: "chart.bar.fill")
                        }
                        .tag(1)
                }

                if let evVM {
                    EVChargingView(viewModel: evVM, appState: appState)
                        .tabItem {
                            Label("EV", systemImage: "bolt.car.fill")
                        }
                        .tag(2)
                }
            } else {
                // Placeholder while state initializes.
                ProgressView()
                    .tabItem { Label("Home", systemImage: "house.fill") }
                    .tag(0)
            }
        }
        .tint(AppTheme.primary)
        .onAppear { setupState() }
    }

    private func setupState() {
        guard appState == nil else { return }
        let state = AppState(settings: settings)
        appState = state
        usageVM = UsageViewModel(settings: settings, appState: state)
        evVM = EVViewModel(settings: settings, appState: state)
    }
}
