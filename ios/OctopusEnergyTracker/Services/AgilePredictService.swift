import Foundation

/// Agile Predict API (https://agilepredict.com) for forecasted Agile prices.
struct AgilePredictService {
    static let shared = AgilePredictService()

    private let session = URLSession.shared
    private let base = "https://agilepredict.com/api"

    struct ForecastPrice: Identifiable, Sendable, Equatable {
        let id = UUID()
        let price: Double
        let lowPrice: Double?
        let highPrice: Double?
        let validFrom: Date
    }

    /// Fetches forecast prices for the given region & number of days.
    func fetchForecast(region: String, days: Int = 5) async -> [ForecastPrice] {
        let urlString = "\(base)/\(region)?days=\(days)&forecast_count=1&high_low=True"
        guard let url = URL(string: urlString) else { return [] }

        do {
            let (data, response) = try await session.data(from: url)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return [] }
            // The API returns an array of forecast objects.
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let raw = try decoder.decode([AgilePredictForecast].self, from: data)
            guard let first = raw.first else { return [] }
            return first.prices.map { p in
                ForecastPrice(
                    price: p.agilePred,
                    lowPrice: p.agilePredLow,
                    highPrice: p.agilePredHigh,
                    validFrom: p.date
                )
            }
        } catch {
            return []
        }
    }

    // MARK: - DTOs

    private struct AgilePredictForecast: Decodable {
        let name: String
        let createdAt: Date
        let prices: [AgilePredictPrice]
        enum CodingKeys: String, CodingKey {
            case name
            case createdAt = "created_at"
            case prices
        }
    }

    private struct AgilePredictPrice: Decodable {
        let date: Date
        let agilePred: Double
        let agilePredLow: Double?
        let agilePredHigh: Double?
        enum CodingKeys: String, CodingKey {
            case date
            case agilePred = "agile_pred"
            case agilePredLow = "agile_pred_low"
            case agilePredHigh = "agile_pred_high"
        }
    }
}
