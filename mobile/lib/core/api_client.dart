import 'package:dio/dio.dart';

import 'constants.dart';
import 'secure_storage.dart';
import '../models/user.dart';
import '../models/category.dart';
import '../models/product.dart';
import '../models/cart_item.dart';
import '../models/order.dart';
import '../models/wishlist_item.dart';
import '../models/delivery_request.dart';
import '../models/insurance.dart';
import '../models/restaurant.dart';
import '../models/ride_request.dart';
import '../models/mobile_service.dart';
import '../models/mobile_transaction.dart';
import '../models/wallet.dart';

/// Thin wrapper around every backend endpoint the app calls. Kept as one
/// file (rather than one per module) so every route string lives next to
/// the server's actual routes.js files for easy cross-checking, since none
/// of this can be compile- or runtime-checked in the environment it was
/// written in.
class ApiClient {
  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await TokenStorage.read();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (DioException error, handler) async {
        if (error.response?.statusCode == 401) {
          await TokenStorage.clear();
        }
        handler.next(error);
      },
    ));
  }

  static final ApiClient instance = ApiClient._internal();
  late final Dio _dio;

  Map<String, dynamic> _data(Response res) => res.data as Map<String, dynamic>;

  // ---------------- Auth ----------------

  Future<String?> requestOtp(String phone) async {
    final res = await _dio.post('/auth/otp/request', data: {'phone': phone});
    return _data(res)['devCode'] as String?;
  }

  Future<(String token, User user)> verifyOtp(String phone, String code, {String? name}) async {
    final res = await _dio.post('/auth/otp/verify', data: {
      'phone': phone,
      'code': code,
      if (name != null && name.isNotEmpty) 'name': name,
    });
    final data = _data(res);
    return (data['token'] as String, User.fromJson(data['user'] as Map<String, dynamic>));
  }

  Future<User> fetchMe() async {
    final res = await _dio.get('/auth/me');
    return User.fromJson(_data(res)['user'] as Map<String, dynamic>);
  }

  // ---------------- Ecommerce ----------------

  Future<List<Category>> fetchCategories() async {
    final res = await _dio.get('/ecommerce/categories');
    return (_data(res)['categories'] as List<dynamic>)
        .map((c) => Category.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  Future<ProductListResult> fetchProducts({
    String? category,
    String? store,
    String? search,
    int page = 1,
    int pageSize = 20,
  }) async {
    final res = await _dio.get('/ecommerce/products', queryParameters: {
      if (category != null) 'category': category,
      if (store != null) 'store': store,
      if (search != null) 'search': search,
      'page': page,
      'pageSize': pageSize,
    });
    return ProductListResult.fromJson(_data(res));
  }

  Future<Product> fetchProduct(String slug) async {
    final res = await _dio.get('/ecommerce/products/$slug');
    return Product.fromJson(_data(res)['product'] as Map<String, dynamic>);
  }

  Future<List<CartItem>> fetchCart() async {
    final res = await _dio.get('/ecommerce/cart');
    return (_data(res)['items'] as List<dynamic>)
        .map((i) => CartItem.fromJson(i as Map<String, dynamic>))
        .toList();
  }

  Future<CartItem> addToCart(String productId, {int quantity = 1}) async {
    final res = await _dio.post('/ecommerce/cart', data: {
      'productId': productId,
      'quantity': quantity,
    });
    return CartItem.fromJson(_data(res)['item'] as Map<String, dynamic>);
  }

  Future<CartItem> updateCartItem(String id, int quantity) async {
    final res = await _dio.patch('/ecommerce/cart/$id', data: {'quantity': quantity});
    return CartItem.fromJson(_data(res)['item'] as Map<String, dynamic>);
  }

  Future<void> removeCartItem(String id) => _dio.delete('/ecommerce/cart/$id');

  Future<List<Order>> fetchOrders() async {
    final res = await _dio.get('/ecommerce/orders');
    return (_data(res)['orders'] as List<dynamic>)
        .map((o) => Order.fromJson(o as Map<String, dynamic>))
        .toList();
  }

  /// Returns the created order and, for `paymentMethod: 'paydunya'`, the
  /// PayDunya checkout URL to redirect the customer to (null for
  /// `'wallet'`, which settles synchronously - no redirect needed).
  Future<(Order, String?)> createOrder({
    String? deliveryAddressId,
    String paymentMethod = 'paydunya',
  }) async {
    final res = await _dio.post('/ecommerce/orders', data: {
      if (deliveryAddressId != null) 'deliveryAddressId': deliveryAddressId,
      'paymentMethod': paymentMethod,
    });
    final data = _data(res);
    return (
      Order.fromJson(data['order'] as Map<String, dynamic>),
      data['paymentUrl'] as String?,
    );
  }

  Future<Wallet> fetchWallet() async {
    final res = await _dio.get('/wallet');
    return Wallet.fromJson(_data(res)['wallet'] as Map<String, dynamic>);
  }

  Future<List<WalletTransaction>> fetchWalletTransactions() async {
    final res = await _dio.get('/wallet/transactions');
    return (_data(res)['transactions'] as List<dynamic>)
        .map((t) => WalletTransaction.fromJson(t as Map<String, dynamic>))
        .toList();
  }

  /// Starts a PayDunya top-up invoice; returns the checkout URL to open.
  /// The wallet is credited once the payment confirms (IPN or a status
  /// poll), same as an ecommerce order paid via PayDunya.
  Future<String?> topUpWallet(double amount) async {
    final res = await _dio.post('/wallet/topup', data: {'amount': amount});
    return _data(res)['paymentUrl'] as String?;
  }

  Future<List<WishlistItem>> fetchWishlist() async {
    final res = await _dio.get('/ecommerce/wishlist');
    return (_data(res)['items'] as List<dynamic>)
        .map((w) => WishlistItem.fromJson(w as Map<String, dynamic>))
        .toList();
  }

  Future<bool> toggleWishlist(String productId) async {
    final res = await _dio.post('/ecommerce/wishlist/toggle', data: {'productId': productId});
    return _data(res)['wishlisted'] as bool;
  }

  // ---------------- Delivery ----------------

  Future<List<DeliveryRequest>> fetchDeliveryRequests() async {
    final res = await _dio.get('/delivery/requests');
    return (_data(res)['requests'] as List<dynamic>)
        .map((r) => DeliveryRequest.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  Future<DeliveryRequest> createDeliveryRequest({
    required String pickupAddress,
    required String dropoffAddress,
    String? packageNote,
  }) async {
    final res = await _dio.post('/delivery/requests', data: {
      'pickupAddress': pickupAddress,
      'dropoffAddress': dropoffAddress,
      if (packageNote != null && packageNote.isNotEmpty) 'packageNote': packageNote,
    });
    return DeliveryRequest.fromJson(_data(res)['request'] as Map<String, dynamic>);
  }

  Future<DeliveryRequest> cancelDeliveryRequest(String id) async {
    final res = await _dio.patch('/delivery/requests/$id/cancel');
    return DeliveryRequest.fromJson(_data(res)['request'] as Map<String, dynamic>);
  }

  // ---------------- Insurance ----------------

  Future<List<InsurancePlan>> fetchInsurancePlans({String? category}) async {
    final res = await _dio.get('/insurance/plans', queryParameters: {
      if (category != null) 'category': category,
    });
    return (_data(res)['plans'] as List<dynamic>)
        .map((p) => InsurancePlan.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  Future<List<InsurancePolicy>> fetchInsurancePolicies() async {
    final res = await _dio.get('/insurance/policies');
    return (_data(res)['policies'] as List<dynamic>)
        .map((p) => InsurancePolicy.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  Future<InsurancePolicy> subscribeInsurancePlan(String planId) async {
    final res = await _dio.post('/insurance/policies', data: {'planId': planId});
    return InsurancePolicy.fromJson(_data(res)['policy'] as Map<String, dynamic>);
  }

  Future<InsurancePolicy> cancelInsurancePolicy(String id) async {
    final res = await _dio.patch('/insurance/policies/$id/cancel');
    return InsurancePolicy.fromJson(_data(res)['policy'] as Map<String, dynamic>);
  }

  // ---------------- Restaurant ----------------

  Future<List<Restaurant>> fetchRestaurants({String? search}) async {
    final res = await _dio.get('/restaurants', queryParameters: {
      if (search != null) 'search': search,
    });
    return (_data(res)['restaurants'] as List<dynamic>)
        .map((r) => Restaurant.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  Future<Restaurant> fetchRestaurant(String slug) async {
    final res = await _dio.get('/restaurants/$slug');
    return Restaurant.fromJson(_data(res)['restaurant'] as Map<String, dynamic>);
  }

  Future<List<RestaurantOrder>> fetchRestaurantOrders() async {
    final res = await _dio.get('/restaurants/orders');
    return (_data(res)['orders'] as List<dynamic>)
        .map((o) => RestaurantOrder.fromJson(o as Map<String, dynamic>))
        .toList();
  }

  /// [items] is a list of {menuItemId, quantity} maps, matching the
  /// backend's createOrder payload shape (server/src/modules/restaurant/orders.controller.js).
  Future<RestaurantOrder> createRestaurantOrder(
    String restaurantSlug,
    List<Map<String, dynamic>> items, {
    String? note,
  }) async {
    final res = await _dio.post('/restaurants/$restaurantSlug/orders', data: {
      'items': items,
      if (note != null && note.isNotEmpty) 'note': note,
    });
    return RestaurantOrder.fromJson(_data(res)['order'] as Map<String, dynamic>);
  }

  // ---------------- Ride sharing ----------------

  Future<List<RideRequest>> fetchMyRides() async {
    final res = await _dio.get('/rideshare/rides');
    return (_data(res)['rides'] as List<dynamic>)
        .map((r) => RideRequest.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  Future<RideRequest> createRideRequest({
    required String pickupAddress,
    required String dropoffAddress,
    String vehicleType = 'ECONOMY',
  }) async {
    final res = await _dio.post('/rideshare/rides', data: {
      'pickupAddress': pickupAddress,
      'dropoffAddress': dropoffAddress,
      'vehicleType': vehicleType,
    });
    return RideRequest.fromJson(_data(res)['ride'] as Map<String, dynamic>);
  }

  Future<RideRequest> cancelRide(String id) async {
    final res = await _dio.patch('/rideshare/rides/$id/cancel');
    return RideRequest.fromJson(_data(res)['ride'] as Map<String, dynamic>);
  }

  // ---------------- Mobile top-up / bill payment ----------------

  Future<List<MobileService>> fetchMobileServices({String? type}) async {
    final res = await _dio.get('/mobile/services', queryParameters: {
      if (type != null) 'type': type,
    });
    return (_data(res)['services'] as List<dynamic>)
        .map((s) => MobileService.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  Future<MobileService?> detectOperator(String phone) async {
    final res = await _dio.get('/mobile/detect-operator', queryParameters: {'phone': phone});
    final service = _data(res)['service'];
    return service == null ? null : MobileService.fromJson(service as Map<String, dynamic>);
  }

  Future<MobileTransaction> createTopup({
    required String serviceId,
    required String phoneNumber,
    required double amount,
  }) async {
    final res = await _dio.post('/mobile/topup', data: {
      'serviceId': serviceId,
      'phoneNumber': phoneNumber,
      'amount': amount,
    });
    return MobileTransaction.fromJson(_data(res)['transaction'] as Map<String, dynamic>);
  }

  Future<MobileTransaction> createBillPayment({
    required String serviceId,
    required String accountNumber,
    required double amount,
  }) async {
    final res = await _dio.post('/mobile/bill-payment', data: {
      'serviceId': serviceId,
      'accountNumber': accountNumber,
      'amount': amount,
    });
    return MobileTransaction.fromJson(_data(res)['transaction'] as Map<String, dynamic>);
  }

  Future<List<MobileTransaction>> fetchMyMobileTransactions() async {
    final res = await _dio.get('/mobile/transactions');
    return (_data(res)['transactions'] as List<dynamic>)
        .map((t) => MobileTransaction.fromJson(t as Map<String, dynamic>))
        .toList();
  }
}

final apiClient = ApiClient.instance;
