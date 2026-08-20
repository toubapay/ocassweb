double _parseDecimal(dynamic value) => double.parse(value.toString());

class MenuItem {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String? imageUrl;
  final String? category;
  final bool isActive;

  MenuItem({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.imageUrl,
    this.category,
    this.isActive = true,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        price: _parseDecimal(json['price']),
        imageUrl: json['imageUrl'] as String?,
        category: json['category'] as String?,
        isActive: json['isActive'] as bool? ?? true,
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

class RestaurantOrderItem {
  final String id;
  final int quantity;
  final double price;
  final MenuItem menuItem;

  RestaurantOrderItem({
    required this.id,
    required this.quantity,
    required this.price,
    required this.menuItem,
  });

  factory RestaurantOrderItem.fromJson(Map<String, dynamic> json) => RestaurantOrderItem(
        id: json['id'] as String,
        quantity: json['quantity'] as int,
        price: _parseDecimal(json['price']),
        menuItem: MenuItem.fromJson(json['menuItem'] as Map<String, dynamic>),
      );
}

class RestaurantOrder {
  final String id;
  final String status;
  // subtotal is what payoutOwnerForOrder's owner share is computed from;
  // total is what was actually charged (subtotal + feeAmount + taxAmount,
  // from admin-configured per-restaurant commission/TVA). feeAmount/
  // taxAmount are 0 for orders placed before that feature existed.
  final double subtotal;
  final double feeAmount;
  final double taxAmount;
  final double total;
  final String? note;
  final DateTime createdAt;
  final Restaurant restaurant;
  final List<RestaurantOrderItem> items;

  RestaurantOrder({
    required this.id,
    required this.status,
    required this.subtotal,
    this.feeAmount = 0,
    this.taxAmount = 0,
    required this.total,
    this.note,
    required this.createdAt,
    required this.restaurant,
    this.items = const [],
  });

  factory RestaurantOrder.fromJson(Map<String, dynamic> json) => RestaurantOrder(
        id: json['id'] as String,
        status: json['status'] as String,
        subtotal: _parseDecimal(json['subtotal'] ?? json['total']),
        feeAmount: _parseDecimal(json['feeAmount'] ?? 0),
        taxAmount: _parseDecimal(json['taxAmount'] ?? 0),
        total: _parseDecimal(json['total']),
        note: json['note'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        restaurant: Restaurant.fromJson(json['restaurant'] as Map<String, dynamic>),
        items: (json['items'] as List<dynamic>? ?? [])
            .map((i) => RestaurantOrderItem.fromJson(i as Map<String, dynamic>))
            .toList(),
      );
}

/// The owner's-eye view of one of their restaurant's orders (GET
/// /restaurants/owner/orders) - a distinct shape from RestaurantOrder
/// above (the customer's own order history), since the backend nests the
/// customer's contact info and never re-nests the restaurant itself
/// (every order in this list is implicitly "my restaurant").
class OwnerOrderCustomer {
  final String id;
  final String? name;
  final String phone;

  OwnerOrderCustomer({required this.id, this.name, required this.phone});

  factory OwnerOrderCustomer.fromJson(Map<String, dynamic> json) => OwnerOrderCustomer(
        id: json['id'] as String,
        name: json['name'] as String?,
        phone: json['phone'] as String,
      );
}

class OwnerOrderDeliveryRequest {
  final String id;
  final String status;

  OwnerOrderDeliveryRequest({required this.id, required this.status});

  factory OwnerOrderDeliveryRequest.fromJson(Map<String, dynamic> json) =>
      OwnerOrderDeliveryRequest(id: json['id'] as String, status: json['status'] as String);
}

class OwnerRestaurantOrder {
  final String id;
  final String status;
  // Same subtotal/fee/tax split as RestaurantOrder above - the owner's
  // own payout share is computed from subtotal, never total.
  final double subtotal;
  final double feeAmount;
  final double taxAmount;
  final double total;
  final String? note;
  final String? deliveryAddress;
  final DateTime createdAt;
  final OwnerOrderCustomer user;
  final List<RestaurantOrderItem> items;
  final OwnerOrderDeliveryRequest? deliveryRequest;

  OwnerRestaurantOrder({
    required this.id,
    required this.status,
    required this.subtotal,
    this.feeAmount = 0,
    this.taxAmount = 0,
    required this.total,
    this.note,
    this.deliveryAddress,
    required this.createdAt,
    required this.user,
    this.items = const [],
    this.deliveryRequest,
  });

  factory OwnerRestaurantOrder.fromJson(Map<String, dynamic> json) => OwnerRestaurantOrder(
        id: json['id'] as String,
        status: json['status'] as String,
        subtotal: _parseDecimal(json['subtotal'] ?? json['total']),
        feeAmount: _parseDecimal(json['feeAmount'] ?? 0),
        taxAmount: _parseDecimal(json['taxAmount'] ?? 0),
        total: _parseDecimal(json['total']),
        note: json['note'] as String?,
        deliveryAddress: json['deliveryAddress'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        user: OwnerOrderCustomer.fromJson(json['user'] as Map<String, dynamic>),
        items: (json['items'] as List<dynamic>? ?? [])
            .map((i) => RestaurantOrderItem.fromJson(i as Map<String, dynamic>))
            .toList(),
        deliveryRequest: json['deliveryRequest'] != null
            ? OwnerOrderDeliveryRequest.fromJson(json['deliveryRequest'] as Map<String, dynamic>)
            : null,
      );
}
