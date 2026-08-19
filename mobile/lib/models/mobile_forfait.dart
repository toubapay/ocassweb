double _parseDecimal(dynamic value) => double.parse(value.toString());

/// A named bundle plan (e.g. Expresso Sénégal's "Disso 100") - see
/// server/prisma/schema.prisma's MobileForfait model comment for why
/// callMinutesLabel/internetLabel/validityLabel are free-text display
/// strings rather than parsed numeric fields: they're copied verbatim from
/// each operator's own rate card, which don't share a common unit
/// convention (e.g. "20mn tous réseaux" vs "500FCFA tous réseaux").
class MobileForfait {
  final String id;
  final String serviceId;
  final String category;
  final String name;
  final double price;
  final String? callMinutesLabel;
  final String? internetLabel;
  final String validityLabel;

  MobileForfait({
    required this.id,
    required this.serviceId,
    required this.category,
    required this.name,
    required this.price,
    this.callMinutesLabel,
    this.internetLabel,
    required this.validityLabel,
  });

  factory MobileForfait.fromJson(Map<String, dynamic> json) => MobileForfait(
        id: json['id'] as String,
        serviceId: json['serviceId'] as String,
        category: json['category'] as String,
        name: json['name'] as String,
        price: _parseDecimal(json['price']),
        callMinutesLabel: json['callMinutesLabel'] as String?,
        internetLabel: json['internetLabel'] as String?,
        validityLabel: json['validityLabel'] as String,
      );
}
