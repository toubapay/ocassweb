import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  bool _placing = false;
  static const double _deliveryFee = 500;

  Future<void> _placeOrder() async {
    setState(() => _placing = true);
    try {
      await apiClient.createOrder();
      if (!mounted) return;
      await context.read<CartProvider>().fetch();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order placed!')));
      context.go('/ecommerce/orders');
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
    final cart = context.watch<CartProvider>();
    final user = context.watch<AuthProvider>().user;
    final subtotal = cart.subtotal;
    final deliveryFee = cart.items.isEmpty ? 0 : _deliveryFee;
    final total = subtotal + deliveryFee;

    return Scaffold(
      appBar: const TopBar(title: 'Checkout', showCart: false, showSearch: false),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Delivery to', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.divider),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user?.name ?? 'You', style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(user?.phone ?? '', style: const TextStyle(color: AppColors.textSecondary)),
                const SizedBox(height: 4),
                const Text('Add a saved address to speed up future orders.',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Order summary', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          ...cart.items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text('${item.quantity} x ${item.product.name}',
                          style: const TextStyle(color: AppColors.textSecondary)),
                    ),
                    Text(formatCfa(item.lineTotal)),
                  ],
                ),
              )),
          const Divider(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Subtotal', style: TextStyle(color: AppColors.textSecondary)),
              Text(formatCfa(subtotal)),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Delivery fee', style: TextStyle(color: AppColors.textSecondary)),
              Text(formatCfa(deliveryFee)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              Text(formatCfa(total), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ],
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: (_placing || cart.items.isEmpty) ? null : _placeOrder,
            child: Text(_placing ? 'Placing order...' : 'Place order · ${formatCfa(total)}'),
          ),
        ),
      ),
    );
  }
}
