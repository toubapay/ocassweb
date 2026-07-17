class Store {
  final String id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String? address;
  final double rating;

  Store({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    this.address,
    this.rating = 0,
  });

  factory Store.fromJson(Map<String, dynamic> json) => Store(
        id: json['id'] as String,
        name: json['name'] as String,
        slug: json['slug'] as String,
        logoUrl: json['logoUrl'] as String?,
        address: json['address'] as String?,
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
      );
}
