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
  final bool paid;
  // Only present when the order was placed against a saved Address (see
  // Order.deliveryAddress in schema.prisma) - orders paid in cash/at
  // pickup or predating this field have none of these set.
  final String? deliveryAddressLabel;
  final String? deliveryAddressLine1;
  final String? deliveryAddressCity;
  // Set once a vendor marks a single-store order ready and it's auto-
  // dispatched to the delivery module (see dispatchForDelivery in
  // vendor/vendor.controller.js) - null until then. deliveryRequestStatus
  // is only ever present alongside deliveryRequestId.
  final String? deliveryRequestId;
  final String? deliveryRequestStatus;
  // Only present on the vendor's own order listing (GET /vendor/orders) -
  // null on the buyer's own /orders, where every order is implicitly "not
  // this vendor's to dispatch". True only when every item in the whole
  // order (not just this vendor's slice) belongs to this vendor's store.
  final bool? isSingleVendor;

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
    this.paid = false,
    this.deliveryAddressLabel,
    this.deliveryAddressLine1,
    this.deliveryAddressCity,
    this.deliveryRequestId,
    this.deliveryRequestStatus,
    this.isSingleVendor,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final deliveryAddress = json['deliveryAddress'] as Map<String, dynamic>?;
    final deliveryRequest = json['deliveryRequest'] as Map<String, dynamic>?;
    return Order(
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
      paid: json['paid'] as bool? ?? false,
      deliveryAddressLabel: deliveryAddress?['label'] as String?,
      deliveryAddressLine1: deliveryAddress?['line1'] as String?,
      deliveryAddressCity: deliveryAddress?['city'] as String?,
      deliveryRequestId: json['deliveryRequestId'] as String?,
      deliveryRequestStatus: deliveryRequest?['status'] as String?,
      isSingleVendor: json['isSingleVendor'] as bool?,
    );
  }
}
