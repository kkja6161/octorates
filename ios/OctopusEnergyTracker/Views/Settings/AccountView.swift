import SwiftUI

/// Account connection screen — API key + account number, stored in Keychain.
struct AccountView: View {
    @Environment(SettingsStore.self) private var settings
    @Bindable var appState: AppState
    @State private var apiKeyInput = ""
    @State private var accountNumberInput = ""
    @State private var showAPIKey = false
    @State private var showDisconnectAlert = false

    var body: some View {
        Form {
            if appState.accountData != nil {
                Section("Connected Account") {
                    LabeledContent("Account Number", value: appState.accountData?.accountNumber ?? "")
                    LabeledContent("Region", value: appState.accountData?.region ?? settings.region)
                    LabeledContent("MPAN", value: appState.accountData?.electricity?.mpan ?? "—")
                    if let gas = appState.accountData?.gas {
                        LabeledContent("MPRN", value: gas.mprn)
                    }
                    LabeledContent("Moved In", value: appState.accountData?.movedInAt?.formatted(date: .abbreviated, time: .omitted) ?? "—")
                }

                Section {
                    Button(role: .destructive) {
                        showDisconnectAlert = true
                    } label: {
                        Label("Disconnect Account", systemImage: "trash")
                    }
                }
            } else {
                Section {
                    SecureField("API Key", text: $apiKeyInput, prompt: Text("sk_live_..."))
                        .textContentType(.password)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)

                    TextField("Account Number", text: $accountNumberInput, prompt: Text("A-1234567"))
                        .textContentType(.username)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("Connect Account")
                } footer: {
                    Text("Your API key is stored securely in the iOS Keychain and never leaves your device except to call Octopus Energy directly.")
                }

                Section {
                    Button {
                        Task {
                            let ok = await appState.connectAccount(apiKey: apiKeyInput, accountNumber: accountNumberInput)
                            if ok {
                                await appState.refreshRates()
                            }
                        }
                    } label: {
                        HStack {
                            if appState.isLoadingAccount { ProgressView().controlSize(.small) }
                            Text("Connect")
                        }
                    }
                    .disabled(apiKeyInput.isEmpty || accountNumberInput.isEmpty || appState.isLoadingAccount)

                    if let err = appState.accountError {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    Link("Get your API key →", destination: URL(string: "https://octopus.energy/dashboard/new/")!)
                }
            }
        }
        .navigationTitle("Account")
        .alert("Disconnect Account?", isPresented: $showDisconnectAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Disconnect", role: .destructive) {
                appState.disconnectAccount()
            }
        } message: {
            Text("This will remove your API key and all cached account data from this device.")
        }
    }
}
