import SwiftUI

/// The Usage tab — daily consumption cards, date range selector, cost charts.
struct UsageView: View {
    @Environment(SettingsStore.self) private var settings
    @Bindable var viewModel: UsageViewModel
    @Bindable var appState: AppState
    @State private var selectedDay: DailyConsumption?
    @State private var selectedDayFuel: FuelType = .electricity
    @State private var expandedDayId: UUID?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    if !viewModel.canFetch {
                        notConnectedBanner
                    } else {
                        // Date range picker
                        Picker("Range", selection: Binding(get: { viewModel.rangeMode }, set: { viewModel.rangeMode = $0 })) {
                            ForEach(UsageViewModel.DateRangeMode.allCases) { mode in
                                Text(mode.rawValue).tag(mode)
                            }
                        }
                        .pickerStyle(.segmented)

                        if viewModel.rangeMode == .custom {
                            HStack {
                                DatePicker("From", selection: Binding(get: { viewModel.customStart }, set: { viewModel.customStart = $0 }), displayedComponents: .date)
                                DatePicker("To", selection: Binding(get: { viewModel.customEnd }, set: { viewModel.customEnd = $0 }), in: viewModel.customStart..., displayedComponents: .date)
                            }
                            .labelsHidden()
                            .padding(.horizontal, 4)
                        }

                        // Electricity section
                        if !viewModel.electricityDaily.isEmpty {
                            sectionHeader(title: "Electricity", icon: "bolt.fill", color: AppTheme.primary)
                            UsageChart(daily: viewModel.electricityDaily, fuel: .electricity)
                                .padding(14)
                                .glassSurface(cornerRadius: 16)

                            ForEach(viewModel.electricityDaily) { day in
                                DailyConsumptionCard(
                                    daily: day,
                                    fuel: .electricity,
                                    isExpanded: expandedDayId == day.id,
                                    onTap: {
                                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                            expandedDayId = expandedDayId == day.id ? nil : day.id
                                        }
                                    }
                                )
                                .contentShape(.rect)
                                .onTapGesture(count: 2) {
                                    selectedDayFuel = .electricity
                                    selectedDay = day
                                }
                                .accessibilityAddTraits(.isButton)
                            }
                        }

                        // Gas section
                        if settings.showGas && !viewModel.gasDaily.isEmpty {
                            sectionHeader(title: "Gas", icon: "flame.fill", color: AppTheme.gas)
                            UsageChart(daily: viewModel.gasDaily, fuel: .gas)
                                .padding(14)
                                .glassSurface(cornerRadius: 16)

                            ForEach(viewModel.gasDaily) { day in
                                DailyConsumptionCard(
                                    daily: day,
                                    fuel: .gas,
                                    isExpanded: expandedDayId == day.id,
                                    onTap: {
                                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                            expandedDayId = expandedDayId == day.id ? nil : day.id
                                        }
                                    }
                                )
                                .onTapGesture(count: 2) {
                                    selectedDayFuel = .gas
                                    selectedDay = day
                                }
                            }
                        }

                        if viewModel.electricityDaily.isEmpty && viewModel.gasDaily.isEmpty && !viewModel.isLoading {
                            emptyState
                        }

                        if viewModel.isLoading {
                            ProgressView("Loading usage…")
                                .padding(.top, 40)
                        }

                        if let err = viewModel.error {
                            Text(err)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .padding()
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.top, 6)
                .padding(.bottom, 24)
            }
            .background(AppTheme.backgroundGradient.ignoresSafeArea())
            .navigationTitle("Usage")
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                if viewModel.electricityDaily.isEmpty && viewModel.canFetch {
                    await viewModel.refresh()
                }
            }
            .navigationDestination(item: $selectedDay) { day in
                DailyDetailView(
                    daily: day,
                    fuel: selectedDayFuel,
                    thresholds: selectedDayFuel == .electricity ? settings.electricityThresholds : settings.gasThresholds
                )
            }
        }
    }

    private func sectionHeader(title: String, icon: String, color: Color) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(title)
                .font(.headline)
            Spacer()
        }
        .padding(.top, 6)
    }

    private var notConnectedBanner: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.largeTitle)
                .foregroundStyle(AppTheme.primary)
            Text("Connect your Octopus account")
                .font(.headline)
            Text("Usage data requires your API key and account number. Connect your account in Settings to see your consumption history.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .glassSurface(cornerRadius: 18)
        .padding(.top, 30)
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "chart.bar.xaxis")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("No usage data for this period")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}
