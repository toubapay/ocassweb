import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/wallet.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/address_picker.dart';
import '../../widgets/top_bar.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  bool _placing = false;
  String? _addressId;
  String _paymentMethod = 'cash';
  Wallet? _wallet;
  Map<String, dynamic>? _quote;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadWallet();
      _loadQuote();
    });
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

  /// What the cart costs, priced by the server.
  ///
  /// This screen used to hold `_deliveryFee = 500` and add it to the
  /// total it displayed. The backend charges no such thing - it adds each
  /// store's admin-configured fee and tax, 0 until one is set - so the
  /// customer confirmed 3 500 FCFA and was debited 3 000, and had an
  /// admin configured a real fee the figure would have been wrong the
  /// other, worse way round. Same rule as every other money screen here:
  /// the client may estimate for feedback, the server decides the money.
  Future<void> _loadQuote() async {
    try {
      final quote = await apiClient.fetchCartQuote();
      if (mounted) setState(() => _quote = quote);
    } catch (_) {
      // Falls back to the line-item subtotal, which is what the customer
      // can already add up from the list above it.
    }
  }

  Future<void> _placeOrder(num total) async {
    setState(() => _placing = true);
    try {
      // The address is what makes the order deliverable: without one the
      // vendor's hand-off to the couriers has nowhere to send them.
      final (_, paymentUrl) = await apiClient.createOrder(
        paymentMethod: _paymentMethod,
        deliveryAddressId: _addressId,
      );
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
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(context.tr('ecommerce.checkout.orderPlaced'))));
      }
      // launchUrl above is awaited, so the screen may be gone by now -
      // navigating from a disposed State is what this guard is for.
      if (!mounted) return;
      context.go('/ecommerce/orders');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('ecommerce.checkout.couldNotPlaceOrder'))));
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final user = context.watch<AuthProvider>().user;
    final subtotal = cart.subtotal;
    final fees = (_quote?['feeAmount'] as num? ?? 0) + (_quote?['taxAmount'] as num? ?? 0);
    final total = _quote != null ? (_quote!['total'] as num) : subtotal;
    final walletInsufficient = _wallet != null && _wallet!.balance < total;

    return Scaffold(
      appBar: TopBar(
          title: context.t('ecommerce.checkout.title'), showCart: false, showSearch: false),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(context.t('ecommerce.checkout.deliveryTo'),
              style: const TextStyle(fontWeight: FontWeight.w800)),
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
                Text(user?.name ?? context.t('ecommerce.checkout.you'),
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(user?.phone ?? '', style: const TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          AddressPicker(
            selectedId: _addressId,
            onChanged: (id) => setState(() => _addressId = id),
          ),
          const SizedBox(height: 12),
          Text(context.t('ecommerce.checkout.orderSummary'),
              style: const TextStyle(fontWeight: FontWeight.w800)),
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
              Text(context.t('ecommerce.checkout.subtotal'),
                  style: const TextStyle(color: AppColors.textSecondary)),
              Text(formatCfa(subtotal)),
            ],
          ),
          // Only when there is one. An admin can set a fee per store, and
          // until somebody does there is nothing to put on this line - a
          // row reading "CFA 0" invites the question of what it is for,
          // and the courier's fare is not the customer's to pay here.
          if (fees > 0) ...[
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(context.t('ecommerce.checkout.serviceFee'),
                    style: const TextStyle(color: AppColors.textSecondary)),
                Text(formatCfa(fees)),
              ],
            ),
          ],
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('ecommerce.checkout.total'),
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              Text(formatCfa(total), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ],
          ),
          const Divider(height: 32),
          Text(context.t('ecommerce.checkout.payWith'),
              style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.divider),
              borderRadius: BorderRadius.circular(14),
            ),
            child: RadioListTile<String>(
              value: 'cash',
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
              title: Text(context.t('ecommerce.checkout.cashOnDelivery'),
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              secondary: const Icon(Icons.payments_rounded, color: AppColors.green),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.divider),
              borderRadius: BorderRadius.circular(14),
            ),
            child: RadioListTile<String>(
              value: 'paydunya',
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
              title: Text(context.t('ecommerce.checkout.payDunya'),
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
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
              title: Text(context.t('ecommerce.checkout.wallet'),
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              subtitle: Text(_wallet != null
                  ? context.t('ecommerce.checkout.walletBalance',
                      {'amount': formatCfa(_wallet!.balance)})
                  : '...'),
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
            child: Text(_placing
                ? context.t('ecommerce.checkout.placingOrder')
                : context.t('ecommerce.checkout.placeOrder', {'total': formatCfa(total)})),
          ),
        ),
      ),
    );
  }
}
