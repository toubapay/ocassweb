import 'product.dart';

class WishlistItem {
  final String id;
  final String productId;
  final Product product;

  WishlistItem({required this.id, required this.productId, required this.product});

  factory WishlistItem.fromJson(Map<String, dynamic> json) => WishlistItem(
        id: json['id'] as String,
        productId: json['productId'] as String,
        product: Product.fromJson(json['product'] as Map<String, dynamic>),
      );
}
