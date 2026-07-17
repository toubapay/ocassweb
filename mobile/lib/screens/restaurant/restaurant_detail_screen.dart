import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../models/restaurant.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Matches pages/restaurant/[slug].js: a per-restaurant quantity cart with
/// no persistent server-side cart - the whole item list is submitted as one
/// order at once.
class RestaurantDetailScreen extends StatefulWidget {
  final String slug;
  const RestaurantDetailScreen({super.key, required this.slug});

  @override
  State<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends State<RestaurantDetailScreen> {
  late final Future<Restaurant> _future;
  final Map<String, int> _quantities = {};
  bool _placing = false;

  @override
  void initState() {
    super.initState();
    _future = apiClient.fetchRestaurant(widget.slug);
  }

  void _setQuantity(String menuItemId, int quantity) {
    if (!context.read<AuthProvider>().isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Log in to order')));
      context.push('/auth/login');
      return;
    }
    setState(() => _quantities[menuItemId] = quantity < 0 ? 0 : quantity);
  }

  Future<void> _placeOrder() async {
    final items = _quantities.entries
        .where((e) => e.value > 0)
        .map((e) => {'menuItemId': e.key, 'quantity': e.value})
        .toList();
    if (items.isEmpty) return;

    setState(() => _placing = true);
    try {
      await apiClient.createRestaurantOrder(widget.slug, items);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order placed!')));
      setState(() => _quantities.clear());
      context.push('/restaurant/orders');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Could not place order')));
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const TopBar(title: 'Restaurant', showSearch: false, showCart: false),
      body: FutureBuilder<Restaurant>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!snapshot.hasData) {
            return const Center(child: Text('Could not load this restaurant.'));
          }
          final restaurant = snapshot.data!;

          int itemCount = 0;
          double total = 0;
          for (final item in restaurant.menuItems) {
            final qty = _quantities[item.id] ?? 0;
            itemCount += qty;
            total += item.price * qty;
          }

          return Stack(
            children: [
              ListView(
                padding: EdgeInsets.fromLTRB(16, 16, 16, itemCount > 0 ? 90 : 16),
                children: [
                  Text('${restaurant.cuisine ?? ''} · ${restaurant.address ?? ''}',
                      style: const TextStyle(color: AppColors.textSecondary)),
                  const SizedBox(height: 16),
                  ...restaurant.menuItems.map((item) {
                    final qty = _quantities[item.id] ?? 0;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                          border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(14)),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: SizedBox(
                              width: 56,
                              height: 56,
                              child: item.imageUrl != null
                                  ? Image.network(item.imageUrl!,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Container(color: AppColors.background))
                                  : Container(color: AppColors.background),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.w700)),
                                Text(formatCfa(item.price),
                                    style: const TextStyle(fontWeight: FontWeight.w800)),
                              ],
                            ),
                          ),
                          if (qty == 0)
                            OutlinedButton(
                              onPressed: () => _setQuantity(item.id, 1),
                              child: const Text('ADD'),
                            )
                          else
                            Container(
                              decoration: BoxDecoration(
                                border: Border.all(color: AppColors.divider),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                children: [
                                  IconButton(
                                    iconSize: 18,
                                    icon: const Icon(Icons.remove_rounded),
                                    onPressed: () => _setQuantity(item.id, qty - 1),
                                  ),
                                  Text('$qty', style: const TextStyle(fontWeight: FontWeight.w700)),
                                  IconButton(
                                    iconSize: 18,
                                    icon: const Icon(Icons.add_rounded),
                                    onPressed: () => _setQuantity(item.id, qty + 1),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
              if (itemCount > 0)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: AppColors.divider)),
                    ),
                    child: SafeArea(
                      top: false,
                      child: ElevatedButton(
                        onPressed: _placing ? null : _placeOrder,
                        child: Text(_placing
                            ? 'Placing order...'
                            : 'Place order · $itemCount item${itemCount > 1 ? 's' : ''} · ${formatCfa(total)}'),
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
