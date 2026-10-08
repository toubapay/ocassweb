/// A customer's saved delivery address.
///
/// Named SavedAddress rather than Address to stay out of the way of
/// Flutter's own Address types and of the free-text `deliveryAddress`
/// string that DeliveryRequest carries - this one is a row the customer
/// owns and reuses, and the thing an order points at so a courier has
/// somewhere to go.
class SavedAddress {
  const SavedAddress({
    required this.id,
    required this.label,
    required this.line1,
    required this.city,
    this.lat,
    this.lng,
    this.isDefault = false,
  });

  final String id;
  final String label;
  final String line1;
  final String city;
  final double? lat;
  final double? lng;
  final bool isDefault;

  /// True when this address can be priced as a real distance. Without
  /// coordinates the delivery module falls back to an estimate, and the
  /// picker says so rather than letting the customer find out from the
  /// fare.
  bool get hasPoint => lat != null && lng != null;

  factory SavedAddress.fromJson(Map<String, dynamic> json) => SavedAddress(
        id: json['id'] as String,
        label: json['label'] as String? ?? '',
        line1: json['line1'] as String? ?? '',
        city: json['city'] as String? ?? '',
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
        isDefault: json['isDefault'] as bool? ?? false,
      );
}
