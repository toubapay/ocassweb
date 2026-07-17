double? _parseNullableDecimal(dynamic value) =>
    value == null ? null : double.parse(value.toString());

class DeliveryRequest {
  final String id;
  final String pickupAddress;
  final String dropoffAddress;
  final String? packageNote;
  final double? priceEstimate;
  final String status;
  final DateTime createdAt;

  DeliveryRequest({
    required this.id,
    required this.pickupAddress,
    required this.dropoffAddress,
    this.packageNote,
    this.priceEstimate,
    required this.status,
    required this.createdAt,
  });

  factory DeliveryRequest.fromJson(Map<String, dynamic> json) => DeliveryRequest(
        id: json['id'] as String,
        pickupAddress: json['pickupAddress'] as String,
        dropoffAddress: json['dropoffAddress'] as String,
        packageNote: json['packageNote'] as String?,
        priceEstimate: _parseNullableDecimal(json['priceEstimate']),
        status: json['status'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
