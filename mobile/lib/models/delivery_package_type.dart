/// Admin-managed catalog row (see DeliveryPackageType in schema.prisma /
/// AdminDeliveryPackageTypesTab.js on web) - fetched from
/// GET /delivery/package-types rather than hardcoded, so an admin can
/// add/edit/retire types without an app release.
class DeliveryPackageType {
  final String id;
  final String key;
  final String labelEn;
  final String labelFr;
  final String? hintEn;
  final String? hintFr;
  final String icon;
  final String colorKey;
  final int sortOrder;
  final bool isActive;

  DeliveryPackageType({
    required this.id,
    required this.key,
    required this.labelEn,
    required this.labelFr,
    this.hintEn,
    this.hintFr,
    required this.icon,
    required this.colorKey,
    required this.sortOrder,
    required this.isActive,
  });

  String label(String language) => language == 'fr' ? labelFr : labelEn;
  String? hint(String language) => language == 'fr' ? hintFr : hintEn;

  factory DeliveryPackageType.fromJson(Map<String, dynamic> json) => DeliveryPackageType(
        id: json['id'] as String,
        key: json['key'] as String,
        labelEn: json['labelEn'] as String,
        labelFr: json['labelFr'] as String,
        hintEn: json['hintEn'] as String?,
        hintFr: json['hintFr'] as String?,
        icon: json['icon'] as String,
        colorKey: json['colorKey'] as String,
        sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
        isActive: json['isActive'] as bool? ?? true,
      );
}
