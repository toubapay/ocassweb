import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/restaurant.dart';
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

const _cancellableStatuses = ['CONFIRMED', 'PREPARING'];

/// Mirrors pages/restaurant/orders/[id].js. The "Track" button is kept
/// reachable for the life of the order, not just while OUT_FOR_DELIVERY -
/// a DELIVERED order still benefits from seeing its route/agent info via
/// the same DeliveryTrackScreen every other tracked delivery uses.
class RestaurantOrderDetailScreen extends StatefulWidget {
  final String orderId;
  const RestaurantOrderDetailScreen({super.key, required this.orderId});

  @override
  State<RestaurantOrderDetailScreen> createState() => _RestaurantOrderDetailScreenState();
}

class _RestaurantOrderDetailScreenState extends State<RestaurantOrderDetailScreen> {
  RestaurantOrder? _order;
  bool _loading = true;
  bool _notFound = false;
  bool _cancelling = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    try {
      final order = await apiClient.fetchRestaurantOrder(widget.orderId);
      if (mounted) setState(() => _order = order);
    } catch (_) {
      if (mounted) setState(() => _notFound = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cancel() async {
    setState(() => _cancelling = true);
    try {
      final order = await apiClient.cancelRestaurantOrder(widget.orderId);
      if (!mounted) return;
      setState(() => _order = order);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('restaurant.orders.cancelled'))));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('restaurant.orders.couldNotCancel'))));
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!isAuthenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('restaurant.orders.detailTitle'), showCart: false, showSearch: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('restaurant.orders.loginToView')),
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
        appBar: TopBar(title: context.t('restaurant.orders.detailTitle'), showCart: false, showSearch: false),
        body: Center(
          child:
              Text(context.t('restaurant.orders.notFound'), style: const TextStyle(color: AppColors.textSecondary)),
        ),
      );
    }

    if (_loading || _order == null) {
      return Scaffold(
        appBar: TopBar(title: context.t('restaurant.orders.detailTitle'), showCart: false, showSearch: false),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final order = _order!;

    return Scaffold(
      appBar: TopBar(title: context.t('restaurant.orders.detailTitle'), showCart: false, showSearch: false),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                  child:
                      Text(order.restaurant.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
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
          const SizedBox(height: 16),
          if (order.deliveryRequestId != null)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => context.push('/delivery/track/${order.deliveryRequestId}'),
                icon: const Icon(Icons.location_on_rounded),
                label: Text(context.t('restaurant.orders.track')),
              ),
            ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration:
                BoxDecoration(border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(14)),
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
                              child: Text('${item.quantity} x ${item.menuItem.name}',
                                  style: const TextStyle(color: AppColors.textSecondary))),
                          Text(formatCfa(item.price * item.quantity), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    )),
                if (order.note != null && order.note!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(context.t('restaurant.orders.note', {'note': order.note!}),
                      style: const TextStyle(color: AppColors.textSecondary, fontStyle: FontStyle.italic)),
                ],
              ],
            ),
          ),
          if (order.deliveryAddress != null) ...[
            const SizedBox(height: 16),
            Text(context.t('common.deliveryAddress'), style: const TextStyle(color: AppColors.textSecondary)),
            Text(order.deliveryAddress!, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
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
          Text(context.t('restaurant.orders.total', {'amount': formatCfa(order.total)}),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          if (_cancellableStatuses.contains(order.status)) ...[
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: _cancelling ? null : _cancel,
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.red),
              child: Text(context.t('restaurant.orders.cancel')),
            ),
          ],
        ],
      ),
    );
  }
}
