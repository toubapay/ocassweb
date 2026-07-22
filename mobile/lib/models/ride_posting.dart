double? _parseNullableDecimal(dynamic value) =>
    value == null ? null : double.parse(value.toString());

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
  final String destinationAddress;
  final DateTime departureAt;
  final bool isInstant;
  final int seatsTotal;
  final int seatsAvailable;
  final double? pricePerSeat;
  final String? note;
  final String status;

  RidePosting({
    required this.id,
    required this.driverId,
    this.driver,
    required this.originAddress,
    required this.destinationAddress,
    required this.departureAt,
    this.isInstant = false,
    required this.seatsTotal,
    required this.seatsAvailable,
    this.pricePerSeat,
    this.note,
    required this.status,
  });

  factory RidePosting.fromJson(Map<String, dynamic> json) => RidePosting(
        id: json['id'] as String,
        driverId: json['driverId'] as String,
        driver: json['driver'] != null
            ? AnandoDriver.fromJson(json['driver'] as Map<String, dynamic>)
            : null,
        originAddress: json['originAddress'] as String,
        destinationAddress: json['destinationAddress'] as String,
        departureAt: DateTime.parse(json['departureAt'] as String),
        isInstant: json['isInstant'] as bool? ?? false,
        seatsTotal: json['seatsTotal'] as int,
        seatsAvailable: json['seatsAvailable'] as int,
        pricePerSeat: _parseNullableDecimal(json['pricePerSeat']),
        note: json['note'] as String?,
        status: json['status'] as String,
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
