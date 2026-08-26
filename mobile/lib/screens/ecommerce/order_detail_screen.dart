import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/order.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

const Map<String, Color> _statusColors = {
  'PENDING': AppColors.amber,
  'CONFIRMED': AppColors.blue,
  'PREPARING': AppColors.blue,
  'OUT_FOR_DELIVERY': AppColors.blue,
  'DELIVERED': AppColors.green,
  'CANCELLED': AppColors.red,
};

/// Mirrors pages/ecommerce/orders/[id].js - a single order's full detail
/// (items, delivery address, fee/tax/total breakdown). No status track
/// like the restaurant/delivery detail screens: ecommerce Order status
/// only ever reaches CONFIRMED today (no vendor fulfillment-progress
/// endpoint exists yet), so a multi-step tracker here would imply
/// progress the backend can't actually report.
class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Order? _order;
  bool _loading = true;
  bool _notFound = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    try {
      final order = await apiClient.fetchOrder(widget.orderId);
      if (mounted) setState(() => _order = order);
    } catch (_) {
      if (mounted) setState(() => _notFound = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!isAuthenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('ecommerce.orders.detailTitle'), showCart: false, showSearch: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('ecommerce.orders.loginToView')),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => context.push('/auth/login'), child: Text(context.t('common.logIn'))),
            ],
          ),
        ),
      );
    }

    if (_notFound) {
      return Scaffold(
        appBar: TopBar(title: context.t('ecommerce.orders.detailTitle'), showCart: false, showSearch: false),
        body: Center(
          child: Text(context.t('ecommerce.orders.notFound'), style: const TextStyle(color: AppColors.textSecondary)),
        ),
      );
    }

    if (_loading || _order == null) {
      return Scaffold(
        appBar: TopBar(title: context.t('ecommerce.orders.detailTitle'), showCart: false, showSearch: false),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final order = _order!;
    final address = [order.deliveryAddressLine1, order.deliveryAddressCity]
        .whereType<String>()
        .where((s) => s.isNotEmpty)
        .join(', ');

    return Scaffold(
      appBar: TopBar(title: context.t('ecommerce.orders.detailTitle'), showCart: false, showSearch: false),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('ecommerce.orders.orderNumber', {'id': order.id.substring(0, 8)}),
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              Chip(
                label: Text(
                    context.tOr('ecommerce.orders.status.${order.status}', order.status.replaceAll('_', ' ')),
                    style: const TextStyle(color: Colors.white, fontSize: 12)),
                backgroundColor: _statusColors[order.status] ?? AppColors.textSecondary,
              ),
            ],
          ),
          Text(order.createdAt.toLocal().toString(),
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: Chip(
              label: Text(
                order.paid ? context.t('ecommerce.orders.paid') : context.t('ecommerce.orders.unpaid'),
                style: TextStyle(
                    color: order.paid ? AppColors.green : AppColors.amber, fontWeight: FontWeight.w700, fontSize: 12),
              ),
              backgroundColor: order.paid ? AppColors.greenSoft : AppColors.amberSoft,
            ),
          ),
          if (address.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(context.t('common.deliveryAddress'), style: const TextStyle(color: AppColors.textSecondary)),
            Text(
              order.deliveryAddressLabel != null ? '${order.deliveryAddressLabel} - $address' : address,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(14)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(context.t('ecommerce.orders.items'), style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                ...order.items.map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                              child: Text('${item.quantity} x ${item.product.name}',
                                  style: const TextStyle(color: AppColors.textSecondary))),
                          Text(formatCfa(item.price * item.quantity), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    )),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(context.t('ecommerce.orders.subtotal', {'amount': formatCfa(order.subtotal)}),
              style: const TextStyle(color: AppColors.textSecondary)),
          if (order.feeAmount > 0)
            Text('${context.t('topup.airtime.fee')}: ${formatCfa(order.feeAmount)}',
                style: const TextStyle(color: AppColors.textSecondary)),
          if (order.taxAmount > 0)
            Text('${context.t('topup.airtime.tva')}: ${formatCfa(order.taxAmount)}',
                style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          Text(context.t('ecommerce.orders.total', {'amount': formatCfa(order.total)}),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        ],
      ),
    );
  }
}
