import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/cart_item.dart';

class CartProvider extends ChangeNotifier {
  List<CartItem> _items = [];
  bool _loading = false;

  List<CartItem> get items => _items;
  bool get loading => _loading;
  int get itemCount => _items.fold(0, (sum, i) => sum + i.quantity);
  double get subtotal => _items.fold(0.0, (sum, i) => sum + i.lineTotal);

  Future<void> fetch() async {
    _loading = true;
    notifyListeners();
    try {
      _items = await apiClient.fetchCart();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> add(String productId, {int quantity = 1}) async {
    await apiClient.addToCart(productId, quantity: quantity);
    await fetch();
  }

  Future<void> updateQuantity(String id, int quantity) async {
    await apiClient.updateCartItem(id, quantity);
    await fetch();
  }

  Future<void> remove(String id) async {
    await apiClient.removeCartItem(id);
    await fetch();
  }

  /// Called on logout - the cart itself lives server-side per user, this
  /// just clears the locally cached view.
  void clear() {
    _items = [];
    notifyListeners();
  }
}
