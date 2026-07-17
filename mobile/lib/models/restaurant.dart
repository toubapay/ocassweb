double _parseDecimal(dynamic value) => double.parse(value.toString());

class MenuItem {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String? imageUrl;
  final String? category;

  MenuItem({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.imageUrl,
    this.category,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        price: _parseDecimal(json['price']),
        imageUrl: json['imageUrl'] as String?,
        category: json['category'] as String?,
      );
}

class Restaurant {
  final String id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String? cuisine;
  final String? address;
  final double rating;
  final List<MenuItem> menuItems;

  Restaurant({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    this.cuisine,
    this.address,
    this.rating = 0,
    this.menuItems = const [],
  });

  factory Restaurant.fromJson(Map<String, dynamic> json) => Restaurant(
        id: json['id'] as String,
        name: json['name'] as String,
        slug: json['slug'] as String,
        logoUrl: json['logoUrl'] as String?,
        cuisine: json['cuisine'] as String?,
        address: json['address'] as String?,
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        menuItems: (json['menuItems'] as List<dynamic>? ?? [])
            .map((m) => MenuItem.fromJson(m as Map<String, dynamic>))
            .toList(),
      );
}
