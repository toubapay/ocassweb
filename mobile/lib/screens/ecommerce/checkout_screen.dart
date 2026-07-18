import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../models/wallet.dart';
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
  String _paymentMethod = 'paydunya';
  Wallet? _wallet;
  static const double _deliveryFee = 500;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadWallet());
  }

  Future<void> _loadWallet() async {
    try {
      final wallet = await apiClient.fetchWallet();
      if (mounted) setState(() => _wallet = wallet);
    } catch (_) {
      // Balance stays null - the wallet radio just shows "..." and (since
      // walletInsufficient only trips when _wallet is non-null) remains
      // selectable; the backend still enforces the real balance check.
    }
  }

  Future<void> _placeOrder(num total) async {
    setState(() => _placing = true);
    try {
      final (_, paymentUrl) = await apiClient.createOrder(paymentMethod: _paymentMethod);
      if (!mounted) return;
      await context.read<CartProvider>().fetch();
      if (!mounted) return;

      if (paymentUrl != null) {
        // PayDunya's hosted checkout is a web page with no way back into
        // this app (no custom URL scheme registered for its return_url),
        // so this opens it in the device's browser rather than in-app -
        // the customer completes payment there and the order settles via
        // PayDunya's IPN webhook same as on the web app.
        await launchUrl(Uri.parse(paymentUrl), mode: LaunchMode.externalApplication);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order placed!')));
      }
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
    final walletInsufficient = _wallet != null && _wallet!.balance < total;

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
          const Divider(height: 32),
          const Text('Pay with', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.divider),
              borderRadius: BorderRadius.circular(14),
            ),
            child: RadioListTile<String>(
              value: 'paydunya',
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
              title: const Text('PayDunya (mobile money, card)',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              secondary: const Icon(Icons.credit_card_rounded, color: AppColors.green),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.divider),
              borderRadius: BorderRadius.circular(14),
            ),
            child: RadioListTile<String>(
              value: 'wallet',
              groupValue: _paymentMethod,
              onChanged: walletInsufficient ? null : (v) => setState(() => _paymentMethod = v!),
              title: const Text('Ocass Wallet', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              subtitle: Text(_wallet != null ? 'Balance: ${formatCfa(_wallet!.balance)}' : '...'),
              secondary: const Icon(Icons.account_balance_wallet_rounded, color: AppColors.green),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: (_placing || cart.items.isEmpty) ? null : () => _placeOrder(total),
            child: Text(_placing ? 'Placing order...' : 'Place order · ${formatCfa(total)}'),
          ),
        ),
      ),
    );
  }
}
