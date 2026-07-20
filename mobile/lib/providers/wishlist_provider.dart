import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/wishlist_item.dart';

class WishlistProvider extends ChangeNotifier {
  List<WishlistItem> _items = [];

  List<WishlistItem> get items => _items;

  bool isWishlisted(String productId) => _items.any((w) => w.productId == productId);

  Future<void> fetch() async {
    _items = await apiClient.fetchWishlist();
    notifyListeners();
  }

  Future<void> toggle(String productId) async {
    await apiClient.toggleWishlist(productId);
    await fetch();
  }

  void clear() {
    _items = [];
    notifyListeners();
  }
}
