class Store {
  final String id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String? address;
  final double? lat;
  final double? lng;
  final double rating;
  final bool isActive;

  Store({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    this.address,
    this.lat,
    this.lng,
    this.rating = 0,
    this.isActive = true,
  });

  factory Store.fromJson(Map<String, dynamic> json) => Store(
        id: json['id'] as String,
        name: json['name'] as String,
        slug: json['slug'] as String,
        logoUrl: json['logoUrl'] as String?,
        address: json['address'] as String?,
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        isActive: json['isActive'] as bool? ?? true,
      );
}
