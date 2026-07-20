import 'product.dart';

class CartItem {
  final String id;
  final String productId;
  final int quantity;
  final Product product;

  CartItem({
    required this.id,
    required this.productId,
    required this.quantity,
    required this.product,
  });

  double get lineTotal => product.displayPrice * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        id: json['id'] as String,
        productId: json['productId'] as String,
        quantity: json['quantity'] as int,
        product: Product.fromJson(json['product'] as Map<String, dynamic>),
      );
}
