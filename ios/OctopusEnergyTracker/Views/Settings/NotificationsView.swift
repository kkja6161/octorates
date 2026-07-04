import SwiftUI

/// Notifications settings — price alerts, Agile rate alerts, cheap-slot reminders.
struct NotificationsView: View {
    @Environment(SettingsStore.self) private var settings
    @State private var permissionGranted: Bool? = nil

    var body: some View {
        Form {
            Section {
                Toggle("Enable Notifications", isOn: Binding(get: { settings.notificationsEnabled }, set: { newValue in
                    if newValue {
                        Task {
                            let granted = await NotificationService.shared.requestPermission()
                            permissionGranted = granted
                            if granted { settings.notificationsEnabled = true }
                        }
                    } else {
                        settings.notificationsEnabled = false
                        NotificationService.shared.clearAll()
                    }
                }))

                if let granted = permissionGranted, !granted {
                    Button {
                        NotificationService.shared.openSystemSettings()
                    } label: {
                        Label("Open Settings to Allow Notifications", systemImage: "gear")
                    }
                }
            } footer: {
                Text("Notifications are delivered locally on your device. No data is sent to any server.")
            }

            if settings.notificationsEnabled {
                Section("Price Alerts") {
                    Toggle("Price Threshold Alert", isOn: Binding(get: { settings.notifyPriceThreshold }, set: { settings.notifyPriceThreshold = $0 }))
                    if settings.notifyPriceThreshold {
                        HStack {
                            Text("Threshold")
                            Spacer()
                            TextField("", value: Binding(get: { settings.priceThresholdValue }, set: { settings.priceThresholdValue = $0 }), format: .number.precision(.fractionLength(0...2)))
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 70)
                            Text("p")
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section("Agile") {
                    Toggle("New Agile Rates Available", isOn: Binding(get: { settings.notifyNewAgileRates }, set: { settings.notifyNewAgileRates = $0 }))
                    Toggle("Cheap Slot Reminders", isOn: Binding(get: { settings.notifyCheapSlots }, set: { settings.notifyCheapSlots = $0 }))
                }
            }
        }
        .navigationTitle("Notifications")
    }
}
