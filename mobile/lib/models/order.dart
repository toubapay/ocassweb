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
  // Sum of line items only - what the vendor's payout share is computed
  // from server-side. total is what was actually charged (subtotal +
  // feeAmount + taxAmount, from admin-configured per-store commission/TVA -
  // see AdminServiceFeesTab.js on web). feeAmount/taxAmount are 0 for
  // orders placed before that feature existed, or where nothing's been
  // configured for the store.
  final double subtotal;
  final double feeAmount;
  final double taxAmount;
  final double total;
  final DateTime createdAt;
  final List<OrderItem> items;
  // Populated on vendor order listings (server includes the buyer via
  // `user: {select: {id, name, phone}}`), null on the buyer's own /orders.
  final String? buyerName;
  final String? buyerPhone;

  Order({
    required this.id,
    required this.status,
    required this.subtotal,
    this.feeAmount = 0,
    this.taxAmount = 0,
    required this.total,
    required this.createdAt,
    this.items = const [],
    this.buyerName,
    this.buyerPhone,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        status: json['status'] as String,
        subtotal: _parseDecimal(json['subtotal'] ?? json['total']),
        feeAmount: _parseDecimal(json['feeAmount'] ?? 0),
        taxAmount: _parseDecimal(json['taxAmount'] ?? 0),
        total: _parseDecimal(json['total']),
        createdAt: DateTime.parse(json['createdAt'] as String),
        items: (json['items'] as List<dynamic>? ?? [])
            .map((i) => OrderItem.fromJson(i as Map<String, dynamic>))
            .toList(),
        buyerName: (json['user'] as Map<String, dynamic>?)?['name'] as String?,
        buyerPhone: (json['user'] as Map<String, dynamic>?)?['phone'] as String?,
      );
}
