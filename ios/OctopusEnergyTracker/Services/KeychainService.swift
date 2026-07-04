import Foundation
import Security

/// Keychain-backed storage for the Octopus API key and account number.
enum KeychainService {
    private static let service = "app.rork.octopus-energy-tracker"
    private static let apiKeyAccount = "octopus-api-key"
    private static let accountNumberAccount = "octopus-account-number"

    static func saveAPIKey(_ value: String) {
        save(value, for: apiKeyAccount)
    }

    static func loadAPIKey() -> String? {
        load(for: apiKeyAccount)
    }

    static func deleteAPIKey() {
        delete(for: apiKeyAccount)
    }

    static func saveAccountNumber(_ value: String) {
        save(value, for: accountNumberAccount)
    }

    static func loadAccountNumber() -> String? {
        load(for: accountNumberAccount)
    }

    static func deleteAccountNumber() {
        delete(for: accountNumberAccount)
    }

    static func clearAll() {
        deleteAPIKey()
        deleteAccountNumber()
    }

    private static func save(_ value: String, for account: String) {
        guard let data = value.data(using: .utf8) else { return }
        delete(for: account)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    private static func load(for account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func delete(for account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
