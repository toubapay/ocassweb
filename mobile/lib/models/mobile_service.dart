double? _parseNullableDecimal(dynamic value) =>
    value == null ? null : double.parse(value.toString());

/// Catalog entry for a top-up operator or bill payment biller. Managed from
/// the backend (seeded there), never hardcoded client-side.
class MobileService {
  final String id;
  final String name;
  final String? logoUrl;
  final String type; // AIRTIME | DATA_BUNDLE | BILL
  final String? billCategory;
  final List<String> phonePrefixes;
  final double? minAmount;
  final double? maxAmount;

  MobileService({
    required this.id,
    required this.name,
    this.logoUrl,
    required this.type,
    this.billCategory,
    this.phonePrefixes = const [],
    this.minAmount,
    this.maxAmount,
  });

  factory MobileService.fromJson(Map<String, dynamic> json) => MobileService(
        id: json['id'] as String,
        name: json['name'] as String,
        logoUrl: json['logoUrl'] as String?,
        type: json['type'] as String,
        billCategory: json['billCategory'] as String?,
        phonePrefixes:
            (json['phonePrefixes'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
        minAmount: _parseNullableDecimal(json['minAmount']),
        maxAmount: _parseNullableDecimal(json['maxAmount']),
      );
}
