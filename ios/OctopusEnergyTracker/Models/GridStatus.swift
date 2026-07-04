import Foundation

/// Carbon Intensity API data.
struct CarbonIntensityResponse: Codable, Sendable {
    let data: [CarbonIntensityData]
}

struct CarbonIntensityData: Codable, Sendable {
    let from: String
    let to: String
    let intensity: CarbonIntensity

    struct CarbonIntensity: Codable, Sendable {
        let forecast: Int
        let actual: Int?
        let index: String
    }
}

/// Generation mix from Carbon Intensity API.
struct GenerationMixResponse: Codable, Sendable {
    let data: GenerationMixPayload
}

struct GenerationMixPayload: Codable, Sendable {
    let from: String
    let to: String
    let generationmix: [GenerationMixItem]
}

struct GenerationMixItem: Codable, Sendable, Identifiable, Equatable {
    var id: String { fuel }
    let fuel: String
    let perc: Double
}

/// Aggregated grid status used by the UI.
struct GridStatus: Sendable, Equatable {
    let carbonIntensity: Int
    let intensityIndex: String
    let renewablePercentage: Double
    let nonRenewablePercentage: Double
    let generationMix: [GenerationMixItem]
    let lastUpdated: Date
}
