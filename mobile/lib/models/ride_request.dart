double? _parseNullableDecimal(dynamic value) =>
    value == null ? null : double.parse(value.toString());

class RideRequest {
  final String id;
  final String pickupAddress;
  final String dropoffAddress;
  final String vehicleType;
  final double? priceEstimate;
  final String status;
  final DateTime createdAt;

  RideRequest({
    required this.id,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.vehicleType,
    this.priceEstimate,
    required this.status,
    required this.createdAt,
  });

  factory RideRequest.fromJson(Map<String, dynamic> json) => RideRequest(
        id: json['id'] as String,
        pickupAddress: json['pickupAddress'] as String,
        dropoffAddress: json['dropoffAddress'] as String,
        vehicleType: json['vehicleType'] as String,
        priceEstimate: _parseNullableDecimal(json['priceEstimate']),
        status: json['status'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
