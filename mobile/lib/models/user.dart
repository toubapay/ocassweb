import 'store.dart';
import 'restaurant.dart';

class User {
  final String id;
  final String phone;
  final String? name;
  final String? email;
  final String? avatarUrl;
  final String role;
  // Store/restaurant ownership is independent of the self-serve `role`
  // toggle (PATCH /auth/role) - see server/src/middleware/auth.js
  // requireStoreOwner/requireRestaurantOwner. profile_screen.dart uses
  // these to show "My boutique"/"My restaurant" links and
  // Commerçant/Restaurateur badges regardless of which gig role is
  // currently active.
  final Store? store;
  final Restaurant? restaurant;

  User({
    required this.id,
    required this.phone,
    this.name,
    this.email,
    this.avatarUrl,
    this.role = 'CUSTOMER',
    this.store,
    this.restaurant,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        phone: json['phone'] as String,
        name: json['name'] as String?,
        email: json['email'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        role: json['role'] as String? ?? 'CUSTOMER',
        store: json['store'] == null ? null : Store.fromJson(json['store'] as Map<String, dynamic>),
        restaurant:
            json['restaurant'] == null ? null : Restaurant.fromJson(json['restaurant'] as Map<String, dynamic>),
      );
}
