import Foundation

/// Errors thrown by the Octopus API service.
enum OctopusAPIError: LocalizedError {
    case invalidURL
    case unauthorized
    case http(Int)
    case decoding
    case network(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL."
        case .unauthorized: return "API key or account number is incorrect."
        case .http(let code): return "Server error (\(code))."
        case .decoding: return "Could not parse server response."
        case .network(let e): return e.localizedDescription
        }
    }
}

/// All Octopus Energy API calls.
/// Mirrors the Expo `energyApi.ts` endpoint shapes and resolution logic.
struct OctopusAPIService {
    static let shared = OctopusAPIService()

    private let base = "https://api.octopus.energy"
    private let session: URLSession

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.urlCache = URLCache(memoryCapacity: 8 * 1024 * 1024, diskCapacity: 32 * 1024 * 1024)
        session = URLSession(configuration: config)
    }

    // MARK: - Auth helpers

    /// Basic auth header value for a given API key (RFC 7617 with `key:`).
    private func basicAuth(apiKey: String) -> String {
        let combo = "\(apiKey):"
        let data = combo.data(using: .utf8)?.base64EncodedString() ?? ""
        return "Basic \(data)"
    }

    // MARK: - Account

    /// Fetches and validates account data; returns the raw `AccountResponse`.
    func fetchAccount(accountNumber: String, apiKey: String) async throws -> AccountResponse {
        let url = URL(string: "\(base)/v1/accounts/\(accountNumber)/")!
        var req = URLRequest(url: url)
        req.setValue(basicAuth(apiKey: apiKey), forHTTPHeaderField: "Authorization")
        return try await decode(AccountResponse.self, request: req)
    }

    // MARK: - Consumption

    /// Fetches half-hourly consumption for a meter.
    func fetchConsumption(
        mpanOrMprn: String,
        serial: String,
        apiKey: String,
        fuel: FuelType,
        periodFrom: Date? = nil,
        periodTo: Date? = nil
    ) async throws -> [ConsumptionEntryDTO] {
        let endpoint: String
        switch fuel {
        case .electricity:
            endpoint = "electricity-meter-points/\(mpanOrMprn)/meters/\(serial)/consumption"
        case .gas:
            endpoint = "gas-meter-points/\(mpanOrMprn)/meters/\(serial)/consumption"
        }
        let urlBase = "\(base)/v1/\(endpoint)/"

        var components = URLComponents(string: urlBase)!
        var items: [URLQueryItem] = [
            .init(name: "page_size", value: "17520"),
            .init(name: "order_by", value: "period"),
        ]
        if let periodFrom {
            items.append(.init(name: "period_from", value: Self.isoFormatter.string(from: periodFrom)))
        }
        if let periodTo {
            items.append(.init(name: "period_to", value: Self.isoFormatter.string(from: periodTo)))
        }
        components.queryItems = items

        var results: [ConsumptionEntryDTO] = []
        var nextURL: URL? = components.url
        while let url = nextURL {
            var req = URLRequest(url: url)
            req.setValue(basicAuth(apiKey: apiKey), forHTTPHeaderField: "Authorization")
            let page: ConsumptionResponse = try await decode(ConsumptionResponse.self, request: req)
            results.append(contentsOf: page.results)
            nextURL = page.next.flatMap(URL.init(string:))
        }
        return results
    }

    // MARK: - Unit rates

    /// Fetches standard unit rates for a product/region/fuel, with a fallback
    /// chain identical to the Expo app: resolved product-detail URL → 1R → 2R.
    func fetchUnitRates(
        productCode: String,
        region: String,
        fuel: FuelType,
        periodFrom: Date? = nil,
        periodTo: Date? = nil
    ) async -> [EnergyRateDTO] {
        let normalized = TariffResolver.normalize(productCode: productCode)

        // Try resolved product-detail URL first.
        if let resolved = await fetchRatesViaProductDetail(productCode: normalized, region: region, fuel: fuel, periodFrom: periodFrom, periodTo: periodTo) {
            return resolved
        }

        // Fallback to 1R then 2R for electricity; gas only has 1R.
        if fuel == .electricity {
            if let r1 = await fetchRatesPattern(productCode: normalized, region: region, fuel: .electricity, register: "1R", periodFrom: periodFrom, periodTo: periodTo), !r1.isEmpty {
                return r1
            }
            if let r2 = await fetchRatesPattern(productCode: normalized, region: region, fuel: .electricity, register: "2R", periodFrom: periodFrom, periodTo: periodTo), !r2.isEmpty {
                return r2
            }
        } else {
            if let g = await fetchRatesPattern(productCode: normalized, region: region, fuel: .gas, register: "1R", periodFrom: periodFrom, periodTo: periodTo), !g.isEmpty {
                return g
            }
        }
        return []
    }

    /// Fetches the gas tracker (SILVER) rates directly.
    func fetchGasTrackerRates(region: String, periodFrom: Date? = nil, periodTo: Date? = nil) async -> [EnergyRateDTO] {
        let product = "SILVER-24-12-31"
        let tariff = "G-1R-SILVER-24-12-31-\(region)"
        let url = "\(base)/v1/products/\(product)/gas-tariffs/\(tariff)/standard-unit-rates/"
        return await fetchRatesFromURLString(url, periodFrom: periodFrom, periodTo: periodTo) ?? []
    }

    /// Fetches the Flexible Octopus rate (used for comparison).
    func fetchFlexibleRate(region: String, fuel: FuelType) async -> Double? {
        let product = "VAR-22-11-01"
        let tariff: String
        if fuel == .gas {
            tariff = "G-1R-VAR-22-11-01-\(region)"
        } else {
            tariff = "E-1R-VAR-22-11-01-\(region)"
        }
        let type = fuel == .gas ? "gas-tariffs" : "electricity-tariffs"
        let url = "\(base)/v1/products/\(product)/\(type)/\(tariff)/standard-unit-rates/"
        let rates = await fetchRatesFromURLString(url, periodFrom: nil, periodTo: nil) ?? []
        return rates.last?.valueIncVat
    }

    // MARK: - Standing charges

    func fetchStandingCharge(productCode: String, region: String, fuel: FuelType) async -> Double? {
        let normalized = TariffResolver.normalize(productCode: productCode)
        let prefix = fuel == .gas ? "G-1R" : "E-1R"
        let type = fuel == .gas ? "gas-tariffs" : "electricity-tariffs"
        let tariff = "\(prefix)-\(normalized)-\(region)"
        let url = "\(base)/v1/products/\(normalized)/\(type)/\(tariff)/standing-charges/"
        guard let urlObj = URL(string: url) else { return nil }
        do {
            var req = URLRequest(url: urlObj)
            let response: StandingChargesResponse = try await decode(StandingChargesResponse.self, request: req)
            return response.results.first?.valueIncVat
        } catch {
            return nil
        }
    }

    // MARK: - Products

    func fetchProducts() async -> [ProductDTO] {
        let url = "\(base)/v1/products/?brand=OCTOPUS_ENERGY&page_size=200"
        guard let urlObj = URL(string: url) else { return [] }
        do {
            var req = URLRequest(url: urlObj)
            let response: ProductsResponse = try await decode(ProductsResponse.self, request: req)
            return response.results
        } catch {
            return []
        }
    }

    // MARK: - Private rate fetching

    private func fetchRatesViaProductDetail(
        productCode: String,
        region: String,
        fuel: FuelType,
        periodFrom: Date?,
        periodTo: Date?
    ) async -> [EnergyRateDTO]? {
        // Resolve the product detail to find the regional tariff code.
        let detailURL = URL(string: "\(base)/v1/products/\(productCode)/")!
        do {
            var req = URLRequest(url: detailURL)
            let detail: ProductDetailResponse = try await decode(ProductDetailResponse.self, request: req)
            let regionKey = "_\(region)"
            let regionData: ProductDetailRegion?
            if fuel == .electricity {
                regionData = detail.singleRegisterElectricityTariffs?[regionKey]
                    ?? detail.dualRegisterElectricityTariffs?[regionKey]
            } else {
                regionData = detail.singleRegisterGasTariffs?[regionKey]
            }
            guard let method = regionData?.directDebitMonthly ?? regionData?.prepayment,
                  let unitLink = method.links.first(where: { $0.rel == "standard_unit_rates" }) else {
                return nil
            }
            let url = unitLink.href
            return await fetchRatesFromURLString(url, periodFrom: periodFrom, periodTo: periodTo)
        } catch {
            return nil
        }
    }

    private func fetchRatesPattern(
        productCode: String,
        region: String,
        fuel: FuelType,
        register: String,
        periodFrom: Date?,
        periodTo: Date?
    ) async -> [EnergyRateDTO]? {
        let prefix = fuel == .gas ? "G-1R" : "E-\(register)"
        let type = fuel == .gas ? "gas-tariffs" : "electricity-tariffs"
        let tariff = "\(prefix)-\(productCode)-\(region)"
        let url = "\(base)/v1/products/\(productCode)/\(type)/\(tariff)/standard-unit-rates/"
        return await fetchRatesFromURLString(url, periodFrom: periodFrom, periodTo: periodTo)
    }

    private func fetchRatesFromURLString(_ urlString: String, periodFrom: Date?, periodTo: Date?) async -> [EnergyRateDTO]? {
        guard var components = URLComponents(string: urlString) else { return nil }
        var items = components.queryItems ?? []
        if items.first(where: { $0.name == "page_size" }) == nil {
            items.append(.init(name: "page_size", value: "17520"))
        }
        if let periodFrom {
            items.append(.init(name: "period_from", value: Self.isoFormatter.string(from: periodFrom)))
        }
        if let periodTo {
            items.append(.init(name: "period_to", value: Self.isoFormatter.string(from: periodTo)))
        }
        components.queryItems = items

        var results: [EnergyRateDTO] = []
        var nextURL: URL? = components.url
        while let url = nextURL {
            do {
                var req = URLRequest(url: url)
                let page: EnergyRatesResponse = try await decode(EnergyRatesResponse.self, request: req)
                results.append(contentsOf: page.results)
                nextURL = page.next.flatMap(URL.init(string:))
            } catch {
                return results.isEmpty ? nil : results
            }
        }
        return results
    }

    // MARK: - Helpers

    private func decode<T: Decodable>(_ type: T.Type, request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw OctopusAPIError.invalidURL }
        if http.statusCode == 401 { throw OctopusAPIError.unauthorized }
        guard (200..<300).contains(http.statusCode) else { throw OctopusAPIError.http(http.statusCode) }
        do {
            return try Self.decoder.decode(T.self, from: data)
        } catch {
            throw OctopusAPIError.decoding
        }
    }

    static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()
}

enum FuelType {
    case electricity, gas
}

/// Tariff code normalization & display name resolution.
enum TariffResolver {
    private static let displayNames: [String: String] = [
        "AGILE-FLEX-22-11-25": "Agile Octopus",
        "AGILE-23-12-06": "Agile Octopus December 2023",
        "AGILE-24-10-01": "Agile Octopus October 2024",
        "AGILE-BB-24-10-01": "Agile Octopus Business",
        "VAR-22-11-01": "Flexible Octopus",
        "VAR-24-05-16": "Flexible Octopus 2024",
        "SILVER-24-04-03": "Octopus Tracker April 2024",
        "SILVER-24-12-31": "Octopus Tracker",
        "SILVER-23-12-06": "Octopus Tracker December 2023",
        "GO-VAR-22-10-14": "Octopus Go",
        "COSY-22-12-08": "Cosy Octopus",
        "INTELLI-VAR-22-10-14": "Intelligent Octopus Go",
        "INTELLI-BB-VAR-22-10-14": "Intelligent Octopus Flux",
        "OE-FIX-12M-25-11-24": "Octopus 12M Fixed November 2025",
        "FIX-12M-25-11-24": "Octopus 12M Fixed November 2025",
        "LOYAL-FIX-12M-25-12-03": "Loyal Octopus 12M Fixed December 2025",
        "PREPAY-VAR-18-09-21": "Flexible Octopus Smart Pay As You Go",
        "FLUX-IMPORT-23-02-14": "Octopus Flux Import",
        "FLUX-EXPORT-23-02-14": "Octopus Flux Export",
        "OUTGOING-FIX-12M-19-05-13": "Outgoing Octopus Fixed",
        "OUTGOING-LITE-FIX-12M-25-01-28": "Outgoing Octopus Lite",
    ]

    private static let mapping: [String: String] = [
        "FIX-12M-25-11-24": "OE-FIX-12M-25-11-24",
    ]

    static func normalize(productCode: String) -> String {
        mapping[productCode] ?? productCode
    }

    /// Extracts the product code from a full tariff code like
    /// `E-1R-AGILE-FLEX-22-11-25-J` → `AGILE-FLEX-22-11-25`.
    static func productCode(from tariffCode: String) -> String {
        let parts = tariffCode.split(separator: "-").map(String.init)
        guard parts.count >= 3 else { return tariffCode }
        // Drop E/G prefix, drop 1R/2R register, drop last segment (region).
        return parts.dropFirst(2).dropLast().joined(separator: "-")
    }

    static func region(from tariffCode: String) -> String {
        tariffCode.last.map(String.init) ?? "C"
    }

    static func isEco7(tariffCode: String) -> Bool {
        tariffCode.contains("-2R-")
    }

    static func displayName(for tariffCode: String) -> String {
        let product = productCode(from: tariffCode)
        if let name = displayNames[normalize(productCode: product)] { return name }
        if let name = displayNames.first(where: { tariffCode.contains($0.key) })?.value { return name }
        return product.replacingOccurrences(of: "-", with: " ")
    }
}

// MARK: - Product detail helpers (for rate URL resolution)

struct ProductDetailResponse: Codable, Sendable {
    let code: String
    let fullName: String
    let displayName: String
    let description: String
    let isVariable: Bool
    let isGreen: Bool
    let isTracker: Bool
    let isPrepay: Bool
    let isBusiness: Bool
    let isRestricted: Bool
    let brand: String
    let availableFrom: String?
    let availableTo: String?
    let singleRegisterElectricityTariffs: [String: ProductDetailRegion]?
    let dualRegisterElectricityTariffs: [String: ProductDetailRegion]?
    let singleRegisterGasTariffs: [String: ProductDetailRegion]?

    enum CodingKeys: String, CodingKey {
        case code
        case fullName = "full_name"
        case displayName = "display_name"
        case description
        case isVariable = "is_variable"
        case isGreen = "is_green"
        case isTracker = "is_tracker"
        case isPrepay = "is_prepay"
        case isBusiness = "is_business"
        case isRestricted = "is_restricted"
        case brand
        case availableFrom = "available_from"
        case availableTo = "available_to"
        case singleRegisterElectricityTariffs = "single_register_electricity_tariffs"
        case dualRegisterElectricityTariffs = "dual_register_electricity_tariffs"
        case singleRegisterGasTariffs = "single_register_gas_tariffs"
    }
}

struct ProductDetailRegion: Codable, Sendable {
    let directDebitMonthly: ProductDetailPaymentMethod?
    let directDebitQuarterly: ProductDetailPaymentMethod?
    let prepayment: ProductDetailPaymentMethod?

    enum CodingKeys: String, CodingKey {
        case directDebitMonthly = "direct_debit_monthly"
        case directDebitQuarterly = "direct_debit_quarterly"
        case prepayment
    }
}

struct ProductDetailPaymentMethod: Codable, Sendable {
    let code: String
    let standingChargeExcVat: Double?
    let standingChargeIncVat: Double?
    let links: [ProductDetailLink]

    enum CodingKeys: String, CodingKey {
        case code
        case standingChargeExcVat = "standing_charge_exc_vat"
        case standingChargeIncVat = "standing_charge_inc_vat"
        case links
    }
}

struct ProductDetailLink: Codable, Sendable {
    let href: String
    let method: String
    let rel: String
}
