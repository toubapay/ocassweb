import 'product.dart';

/// The currently-live campaign for one placement, as returned by
/// GET /ecommerce/flash-sales/active - see server FlashSale model /
/// flashSaleSchedule.js for how "live" is decided. Only ever constructed
/// when a campaign is actually live right now; the API returns a null
/// flashSale otherwise, which callers treat as "don't show this section".
class FlashSale {
  final String id;
  final String title;
  final DateTime endsAt;
  final List<Product> products;

  FlashSale({
    required this.id,
    required this.title,
    required this.endsAt,
    this.products = const [],
  });

  factory FlashSale.fromJson(Map<String, dynamic> json) => FlashSale(
        id: json['id'] as String,
        title: json['title'] as String,
        endsAt: DateTime.parse(json['endsAt'] as String),
        products: (json['products'] as List<dynamic>? ?? [])
            .map((p) => Product.fromJson(p as Map<String, dynamic>))
            .toList(),
      );
}
