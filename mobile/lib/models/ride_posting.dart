double? _parseNullableDecimal(dynamic value) =>
    value == null ? null : double.parse(value.toString());

// originLat/Lng, destinationLat/Lng, and driverLat/Lng are plain Prisma
// Float columns, which serialize as ordinary JSON numbers (not strings).
double? _parseNullableFloat(dynamic value) => value == null ? null : (value as num).toDouble();

/// Minimal driver info embedded in a posting (server/src/modules/anando/anando.controller.js
/// DRIVER_SELECT: {id, name, phone}).
class AnandoDriver {
  final String id;
  final String? name;
  final String phone;

  AnandoDriver({required this.id, this.name, required this.phone});

  factory AnandoDriver.fromJson(Map<String, dynamic> json) => AnandoDriver(
        id: json['id'] as String,
        name: json['name'] as String?,
        phone: json['phone'] as String,
      );
}

class RidePosting {
  final String id;
  final String driverId;
  final AnandoDriver? driver;
  final String originAddress;
  final double? originLat;
  final double? originLng;
  final String destinationAddress;
  final double? destinationLat;
  final double? destinationLng;
  final DateTime departureAt;
  final bool isInstant;
  final int seatsTotal;
  final int seatsAvailable;
  final double? pricePerSeat;
  final String? note;
  final String status;
  final double? driverLat;
  final double? driverLng;

  RidePosting({
    required this.id,
    required this.driverId,
    this.driver,
    required this.originAddress,
    this.originLat,
    this.originLng,
    required this.destinationAddress,
    this.destinationLat,
    this.destinationLng,
    required this.departureAt,
    this.isInstant = false,
    required this.seatsTotal,
    required this.seatsAvailable,
    this.pricePerSeat,
    this.note,
    required this.status,
    this.driverLat,
    this.driverLng,
  });

  factory RidePosting.fromJson(Map<String, dynamic> json) => RidePosting(
        id: json['id'] as String,
        driverId: json['driverId'] as String,
        driver: json['driver'] != null
            ? AnandoDriver.fromJson(json['driver'] as Map<String, dynamic>)
            : null,
        originAddress: json['originAddress'] as String,
        originLat: _parseNullableFloat(json['originLat']),
        originLng: _parseNullableFloat(json['originLng']),
        destinationAddress: json['destinationAddress'] as String,
        destinationLat: _parseNullableFloat(json['destinationLat']),
        destinationLng: _parseNullableFloat(json['destinationLng']),
        departureAt: DateTime.parse(json['departureAt'] as String),
        isInstant: json['isInstant'] as bool? ?? false,
        seatsTotal: json['seatsTotal'] as int,
        seatsAvailable: json['seatsAvailable'] as int,
        pricePerSeat: _parseNullableDecimal(json['pricePerSeat']),
        note: json['note'] as String?,
        status: json['status'] as String,
        driverLat: _parseNullableFloat(json['driverLat']),
        driverLng: _parseNullableFloat(json['driverLng']),
      );
}

class RideBooking {
  final String id;
  final String postingId;
  final RidePosting? posting;
  final int seatsBooked;
  final String paymentMethod;
  final bool paid;
  final String status;
  final DateTime createdAt;

  RideBooking({
    required this.id,
    required this.postingId,
    this.posting,
    required this.seatsBooked,
    required this.paymentMethod,
    this.paid = false,
    required this.status,
    required this.createdAt,
  });

  factory RideBooking.fromJson(Map<String, dynamic> json) => RideBooking(
        id: json['id'] as String,
        postingId: json['postingId'] as String,
        posting: json['posting'] != null
            ? RidePosting.fromJson(json['posting'] as Map<String, dynamic>)
            : null,
        seatsBooked: json['seatsBooked'] as int,
        paymentMethod: json['paymentMethod'] as String,
        paid: json['paid'] as bool? ?? false,
        status: json['status'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
