import 'category.dart';
import 'store.dart';
import 'review.dart';

/// Prisma serializes Decimal fields (price, discountPrice, ...) as JSON
/// strings, not numbers - parse defensively via toString() either way.
double _parseDecimal(dynamic value) => double.parse(value.toString());

double? _parseNullableDecimal(dynamic value) =>
    value == null ? null : double.parse(value.toString());

class Product {
  final String id;
  final String storeId;
  final String categoryId;
  final String name;
  final String slug;
  final String? description;
  final List<String> images;
  final double price;
  final double? discountPrice;
  final int? discountPercent;
  final int stock;
  final double rating;
  final List<String> tags;
  final Category? category;
  final Store? store;
  final List<Review> reviews;

  Product({
    required this.id,
    required this.storeId,
    required this.categoryId,
    required this.name,
    required this.slug,
    this.description,
    this.images = const [],
    required this.price,
    this.discountPrice,
    this.discountPercent,
    this.stock = 0,
    this.rating = 0,
    this.tags = const [],
    this.category,
    this.store,
    this.reviews = const [],
  });

  double get displayPrice => discountPrice ?? price;
  bool get hasDiscount => discountPrice != null;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        storeId: json['storeId'] as String,
        categoryId: json['categoryId'] as String,
        name: json['name'] as String,
        slug: json['slug'] as String,
        description: json['description'] as String?,
        images: (json['images'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
        price: _parseDecimal(json['price']),
        discountPrice: _parseNullableDecimal(json['discountPrice']),
        discountPercent: json['discountPercent'] as int?,
        stock: json['stock'] as int? ?? 0,
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        tags: (json['tags'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
        category: json['category'] != null
            ? Category.fromJson(json['category'] as Map<String, dynamic>)
            : null,
        store: json['store'] != null ? Store.fromJson(json['store'] as Map<String, dynamic>) : null,
        reviews: (json['reviews'] as List<dynamic>? ?? [])
            .map((r) => Review.fromJson(r as Map<String, dynamic>))
            .toList(),
      );
}

class ProductListResult {
  final List<Product> items;
  final int total;

  ProductListResult({required this.items, required this.total});

  factory ProductListResult.fromJson(Map<String, dynamic> json) => ProductListResult(
        items: (json['items'] as List<dynamic>? ?? [])
            .map((p) => Product.fromJson(p as Map<String, dynamic>))
            .toList(),
        total: json['total'] as int? ?? 0,
      );
}
