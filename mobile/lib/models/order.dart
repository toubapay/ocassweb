import 'product.dart';

double _parseDecimal(dynamic value) => double.parse(value.toString());

class OrderItem {
  final String id;
  final int quantity;
  final double price;
  final Product product;

  OrderItem({
    required this.id,
    required this.quantity,
    required this.price,
    required this.product,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        id: json['id'] as String,
        quantity: json['quantity'] as int,
        price: _parseDecimal(json['price']),
        product: Product.fromJson(json['product'] as Map<String, dynamic>),
      );
}

class Order {
  final String id;
  final String status;
  final double total;
  final DateTime createdAt;
  final List<OrderItem> items;

  Order({
    required this.id,
    required this.status,
    required this.total,
    required this.createdAt,
    this.items = const [],
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        status: json['status'] as String,
        total: _parseDecimal(json['total']),
        createdAt: DateTime.parse(json['createdAt'] as String),
        items: (json['items'] as List<dynamic>? ?? [])
            .map((i) => OrderItem.fromJson(i as Map<String, dynamic>))
            .toList(),
      );
}
