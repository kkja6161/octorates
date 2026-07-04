import Foundation

/// Carbon Intensity API + Elexon BMRS for grid status.
struct GridStatusService {
    static let shared = GridStatusService()

    private let session = URLSession.shared
    private let carbonIntensityBase = "https://api.carbonintensity.org.uk"

    /// Fetches the current grid status: carbon intensity, renewable %, generation mix.
    func fetchGridStatus() async -> GridStatus? {
        async let intensity = fetchCarbonIntensity()
        async let mix = fetchGenerationMix()

        let (i, g) = await (intensity, mix)
        guard let i, let g else { return nil }

        let renewableFuels: Set<String> = ["wind", "solar", "hydro", "biomass", "nuclear"]
        let renewable = g.filter { renewableFuels.contains($0.fuel.lowercased()) }.reduce(0.0) { $0 + $1.perc }
        let nonRenewable = 100.0 - renewable

        return GridStatus(
            carbonIntensity: i.intensity.actual ?? i.intensity.forecast,
            intensityIndex: i.intensity.index,
            renewablePercentage: (renewable * 10).rounded() / 10,
            nonRenewablePercentage: (nonRenewable * 10).rounded() / 10,
            generationMix: g,
            lastUpdated: Date()
        )
    }

    private func fetchCarbonIntensity() async -> CarbonIntensityData? {
        guard let url = URL(string: "\(carbonIntensityBase)/intensity") else { return nil }
        do {
            let (data, _) = try await session.data(from: url)
            let response = try JSONDecoder().decode(CarbonIntensityResponse.self, from: data)
            return response.data.first
        } catch {
            return nil
        }
    }

    private func fetchGenerationMix() async -> [GenerationMixItem]? {
        guard let url = URL(string: "\(carbonIntensityBase)/generation") else { return nil }
        do {
            let (data, _) = try await session.data(from: url)
            let response = try JSONDecoder().decode(GenerationMixResponse.self, from: data)
            return response.data.generationmix
        } catch {
            return nil
        }
    }
}
