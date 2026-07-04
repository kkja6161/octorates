import SwiftUI

/// EV profile management — add, edit, delete profiles.
struct ProfileManagementView: View {
    @Bindable var viewModel: EVViewModel
    @State private var editingProfile: EVProfile?
    @State private var showNewProfile = false

    var body: some View {
        List {
            Section("Profiles") {
                ForEach(viewModel.settings.evProfiles) { profile in
                    Button {
                        viewModel.settings.activeEVProfileId = profile.id
                        UISelectionFeedbackGenerator().selectionChanged()
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(profile.name)
                                    .foregroundStyle(.primary)
                                Text("\(Int(profile.batteryCapacity)) kWh · \(String(format: "%.1f", profile.chargerPower)) kW")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if viewModel.settings.activeEVProfileId == profile.id {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(AppTheme.primary)
                            }
                            Button { editingProfile = profile } label: {
                                Image(systemName: "pencil")
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .onDelete { offsets in
                    for i in offsets {
                        viewModel.deleteProfile(viewModel.settings.evProfiles[i].id)
                    }
                }
            }

            Section {
                Button { showNewProfile = true } label: {
                    Label("New Profile", systemImage: "plus.circle")
                }
            }
        }
        .navigationTitle("EV Profiles")
        .sheet(item: $editingProfile) { profile in
            ProfileEditorView(profile: profile) { saved in
                viewModel.saveProfile(saved)
                editingProfile = nil
            }
        }
        .sheet(isPresented: $showNewProfile) {
            ProfileEditorView(profile: EVProfile(name: "New EV", batteryCapacity: 60, chargerPower: 7.4, currentCharge: 30, targetCharge: 80, isDefault: false)) { saved in
                viewModel.saveProfile(saved)
                showNewProfile = false
            }
        }
    }
}

struct ProfileEditorView: View {
    @State var profile: EVProfile
    let onSave: (EVProfile) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Profile") {
                    TextField("Name", text: $profile.name)
                    LabeledContent("Battery (kWh)") {
                        TextField("", value: $profile.batteryCapacity, format: .number.precision(.fractionLength(0...1)))
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                    LabeledContent("Charger (kW)") {
                        TextField("", value: $profile.chargerPower, format: .number.precision(.fractionLength(1...2)))
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { onSave(profile) }
                        .disabled(profile.name.isEmpty)
                }
            }
        }
    }
}
