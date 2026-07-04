import Foundation

/// Octopus account & tariff agreement models.
struct AccountResponse: Codable, Sendable {
    let number: String
    let properties: [AccountPropertyDTO]
}

struct AccountPropertyDTO: Codable, Sendable {
    let id: Int
    let movedInAt: String?
    let movedOutAt: String?
    let addressLine1: String?
    let addressLine2: String?
    let addressLine3: String?
    let town: String?
    let county: String?
    let postcode: String?
    let electricityMeterPoints: [ElectricityMeterPointDTO]?
    let gasMeterPoints: [GasMeterPointDTO]?

    enum CodingKeys: String, CodingKey {
        case id
        case movedInAt = "moved_in_at"
        case movedOutAt = "moved_out_at"
        case addressLine1 = "address_line_1"
        case addressLine2 = "address_line_2"
        case addressLine3 = "address_line_3"
        case town, county, postcode
        case electricityMeterPoints = "electricity_meter_points"
        case gasMeterPoints = "gas_meter_points"
    }
}

struct ElectricityMeterPointDTO: Codable, Sendable {
    let mpan: String
    let profileClass: Int?
    let consumptionStandard: Double?
    let meters: [MeterDTO]?
    let agreements: [TariffAgreementDTO]?
    let isExport: Bool?

    enum CodingKeys: String, CodingKey {
        case mpan
        case profileClass = "profile_class"
        case consumptionStandard = "consumption_standard"
        case meters, agreements
        case isExport = "is_export"
    }
}

struct GasMeterPointDTO: Codable, Sendable {
    let mprn: String
    let consumptionStandard: Double?
    let meters: [MeterDTO]?
    let agreements: [TariffAgreementDTO]?
}

struct MeterDTO: Codable, Sendable {
    let serialNumber: String?
    let registers: [MeterRegisterDTO]?

    enum CodingKeys: String, CodingKey {
        case serialNumber = "serial_number"
        case registers
    }
}

struct MeterRegisterDTO: Codable, Sendable {
    let identifier: String?
    let rate: String?
    let isSettlementRegister: Bool?

    enum CodingKeys: String, CodingKey {
        case identifier, rate
        case isSettlementRegister = "is_settlement_register"
    }
}

struct TariffAgreementDTO: Codable, Sendable {
    let tariffCode: String
    let validFrom: String
    let validTo: String?

    enum CodingKeys: String, CodingKey {
        case tariffCode = "tariff_code"
        case validFrom = "valid_from"
        case validTo = "valid_to"
    }
}

/// Domain-level processed account data.
struct ProcessedAccountData: Codable, Sendable, Equatable {
    let accountNumber: String
    let region: String
    let movedInAt: Date?
    let electricity: ProcessedElectricity?
    let gas: ProcessedGas?

    struct ProcessedElectricity: Codable, Sendable, Equatable {
        let mpan: String
        let serialNumbers: [String]
        let agreements: [ProcessedAgreement]
        let currentAgreement: ProcessedAgreement?
        let isEco7: Bool
    }

    struct ProcessedGas: Codable, Sendable, Equatable {
        let mprn: String
        let serialNumbers: [String]
        let agreements: [ProcessedAgreement]
        let currentAgreement: ProcessedAgreement?
    }

    struct ProcessedAgreement: Codable, Sendable, Equatable, Identifiable {
        var id: String { tariffCode + validFrom.ISO8601Format() }
        let tariffCode: String
        let productCode: String
        let displayName: String
        let validFrom: Date
        let validTo: Date?
        let isActive: Bool
        let isEco7: Bool
    }
}
