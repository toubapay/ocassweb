// priceEstimate is a Prisma Decimal, which serializes as a JSON string.
double? _parseNullableDecimal(dynamic value) =>
    value == null ? null : double.parse(value.toString());

// pickupLat/Lng, dropoffLat/Lng, and riderLat/Lng are plain Prisma Float
// columns, which serialize as ordinary JSON numbers (not strings).
double? _parseNullableFloat(dynamic value) => value == null ? null : (value as num).toDouble();

class RideRiderSummary {
  final String id;
  final String? name;
  final String? phone;

  RideRiderSummary({required this.id, this.name, this.phone});

  factory RideRiderSummary.fromJson(Map<String, dynamic> json) => RideRiderSummary(
        id: json['id'] as String,
        name: json['name'] as String?,
        phone: json['phone'] as String?,
      );
}

class RideRequest {
  final String id;
  final String pickupAddress;
  final double? pickupLat;
  final double? pickupLng;
  final String dropoffAddress;
  final double? dropoffLat;
  final double? dropoffLng;
  final String vehicleType;
  final double? priceEstimate;
  final String status;
  final RideRiderSummary? assignedRider;
  final double? riderLat;
  final double? riderLng;
  final DateTime createdAt;

  RideRequest({
    required this.id,
    required this.pickupAddress,
    this.pickupLat,
    this.pickupLng,
    required this.dropoffAddress,
    this.dropoffLat,
    this.dropoffLng,
    required this.vehicleType,
    this.priceEstimate,
    required this.status,
    this.assignedRider,
    this.riderLat,
    this.riderLng,
    required this.createdAt,
  });

  factory RideRequest.fromJson(Map<String, dynamic> json) => RideRequest(
        id: json['id'] as String,
        pickupAddress: json['pickupAddress'] as String,
        pickupLat: _parseNullableFloat(json['pickupLat']),
        pickupLng: _parseNullableFloat(json['pickupLng']),
        dropoffAddress: json['dropoffAddress'] as String,
        dropoffLat: _parseNullableFloat(json['dropoffLat']),
        dropoffLng: _parseNullableFloat(json['dropoffLng']),
        vehicleType: json['vehicleType'] as String,
        priceEstimate: _parseNullableDecimal(json['priceEstimate']),
        status: json['status'] as String,
        assignedRider: json['assignedRider'] == null
            ? null
            : RideRiderSummary.fromJson(json['assignedRider'] as Map<String, dynamic>),
        riderLat: _parseNullableFloat(json['riderLat']),
        riderLng: _parseNullableFloat(json['riderLng']),
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
