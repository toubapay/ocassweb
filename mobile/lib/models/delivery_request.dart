// priceEstimate is a Prisma Decimal, which serializes as a JSON string.
double? _parseNullableDecimal(dynamic value) =>
    value == null ? null : double.parse(value.toString());

// pickupLat/Lng, dropoffLat/Lng, and agentLat/Lng are plain Prisma Float
// columns, which serialize as ordinary JSON numbers (not strings).
double? _parseNullableFloat(dynamic value) => value == null ? null : (value as num).toDouble();

class DeliveryAgentSummary {
  final String id;
  final String? name;
  final String? phone;

  DeliveryAgentSummary({required this.id, this.name, this.phone});

  factory DeliveryAgentSummary.fromJson(Map<String, dynamic> json) => DeliveryAgentSummary(
        id: json['id'] as String,
        name: json['name'] as String?,
        phone: json['phone'] as String?,
      );
}

class DeliveryRequest {
  final String id;
  final String? senderName;
  final String? senderPhone;
  final String pickupAddress;
  final double? pickupLat;
  final double? pickupLng;
  final String? receiverName;
  final String? receiverPhone;
  final String dropoffAddress;
  final double? dropoffLat;
  final double? dropoffLng;
  final String? packageNote;
  final double? priceEstimate;
  final double? distanceKm;
  final String status;
  final DeliveryAgentSummary? assignedAgent;
  final double? agentLat;
  final double? agentLng;
  final DateTime createdAt;

  DeliveryRequest({
    required this.id,
    this.senderName,
    this.senderPhone,
    required this.pickupAddress,
    this.pickupLat,
    this.pickupLng,
    this.receiverName,
    this.receiverPhone,
    required this.dropoffAddress,
    this.dropoffLat,
    this.dropoffLng,
    this.packageNote,
    this.priceEstimate,
    this.distanceKm,
    required this.status,
    this.assignedAgent,
    this.agentLat,
    this.agentLng,
    required this.createdAt,
  });

  factory DeliveryRequest.fromJson(Map<String, dynamic> json) => DeliveryRequest(
        id: json['id'] as String,
        senderName: json['senderName'] as String?,
        senderPhone: json['senderPhone'] as String?,
        pickupAddress: json['pickupAddress'] as String,
        pickupLat: _parseNullableFloat(json['pickupLat']),
        pickupLng: _parseNullableFloat(json['pickupLng']),
        receiverName: json['receiverName'] as String?,
        receiverPhone: json['receiverPhone'] as String?,
        dropoffAddress: json['dropoffAddress'] as String,
        dropoffLat: _parseNullableFloat(json['dropoffLat']),
        dropoffLng: _parseNullableFloat(json['dropoffLng']),
        packageNote: json['packageNote'] as String?,
        priceEstimate: _parseNullableDecimal(json['priceEstimate']),
        distanceKm: _parseNullableFloat(json['distanceKm']),
        status: json['status'] as String,
        assignedAgent: json['assignedAgent'] == null
            ? null
            : DeliveryAgentSummary.fromJson(json['assignedAgent'] as Map<String, dynamic>),
        agentLat: _parseNullableFloat(json['agentLat']),
        agentLng: _parseNullableFloat(json['agentLng']),
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
