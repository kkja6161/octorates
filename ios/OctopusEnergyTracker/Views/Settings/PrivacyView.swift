import SwiftUI

/// Privacy policy screen.
struct PrivacyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                privacySection(
                    title: "Your Data Stays On Your Device",
                    body: "Octopus Energy Tracker stores all of your data locally on your device. Your API key is kept in the iOS Keychain. Usage data, tariff selections, and settings never leave your device unless you explicitly call the Octopus Energy API."
                )
                privacySection(
                    title: "API Connections",
                    body: "The app connects directly to the Octopus Energy API (api.octopus-energy.com) to fetch your tariff rates and consumption data. It also connects to the Carbon Intensity API (api.carbonintensity.org.uk) and Agile Predict (agilepredict.com) for grid status and forecasts. No intermediary servers are used."
                )
                privacySection(
                    title: "Notifications",
                    body: "All notifications are scheduled locally on your device using iOS's built-in notification system. No push notification servers are involved."
                )
                privacySection(
                    title: "No Tracking",
                    body: "This app does not track your activity, does not use analytics SDKs, and does not share your data with third parties."
                )
                privacySection(
                    title: "Deleting Your Data",
                    body: "You can clear cached data at any time from Settings → Clear Cache. Disconnecting your account removes your API key from the Keychain. Uninstalling the app removes all stored data."
                )
            }
            .padding()
        }
        .navigationTitle("Privacy Policy")
    }

    private func privacySection(title: String, body: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.headline)
            Text(body)
                .font(.body)
                .foregroundStyle(.secondary)
        }
    }
}
