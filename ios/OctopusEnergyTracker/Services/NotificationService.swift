import Foundation
import UserNotifications

/// Local notification scheduling for price alerts, new Agile rates, cheap slots.
struct NotificationService {
    static let shared = NotificationService()

    func requestPermission() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
        } catch {
            return false
        }
    }

    func openSystemSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }

    /// Schedules a local notification 15 minutes before a threshold-crossing rate.
    func schedulePriceThresholdAlert(rate: ProcessedRate, threshold: Double) {
        let lead = 15 * 60
        let triggerDate = rate.validFrom.addingTimeInterval(TimeInterval(-lead))
        guard triggerDate > Date() else { return }

        let content = UNMutableNotificationContent()
        content.title = "Price Alert"
        content.body = String(format: "Electricity rate hits %.1fp at %@.", rate.price, rate.timeLabel)
        content.sound = .default

        let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: triggerDate), repeats: false)
        let request = UNNotificationRequest(identifier: "price-\(rate.id.uuidString)", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    /// Schedules a notification when new Agile rates are published (tomorrow's rates).
    func scheduleNewAgileRatesAlert(prices: [ProcessedRate]) {
        guard let lowest = prices.min(by: { $0.price < $1.price }) else { return }
        let content = UNMutableNotificationContent()
        content.title = "New Agile Rates Available"
        content.body = String(format: "Cheapest tomorrow: %.1fp at %@.", lowest.price, lowest.timeLabel)
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: "new-agile-\(lowest.validFrom.timeIntervalSince1970)", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    /// Schedules a reminder for a cheap charging slot.
    func scheduleCheapSlotReminder(start: Date, price: Double) {
        let lead = 5 * 60
        let triggerDate = start.addingTimeInterval(TimeInterval(-lead))
        guard triggerDate > Date() else { return }
        let content = UNMutableNotificationContent()
        content.title = "Cheap Slot Starting Soon"
        content.body = String(format: "Electricity is %.1fp at %@ — good time to charge.", price, ProcessedRate.timeFormatter.string(from: start))
        content.sound = .default
        let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: triggerDate), repeats: false)
        let request = UNNotificationRequest(identifier: "cheap-slot-\(start.timeIntervalSince1970)", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    func clearAll() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }
}
