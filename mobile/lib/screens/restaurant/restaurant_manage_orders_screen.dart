import 'package:flutter/material.dart';
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
  'CONFIRMED': AppColors.amber,
  'PREPARING': AppColors.amber,
  'OUT_FOR_DELIVERY': AppColors.green,
  'DELIVERED': AppColors.green,
  'CANCELLED': AppColors.red,
};

/// Mirrors pages/restaurant/manage/orders.js: each order shows its items,
/// the customer, delivery address/status, and - only while the order is
/// CONFIRMED or PREPARING (OWNER_TRANSITIONS in orders.controller.js) -
/// the buttons to advance or cancel it. DELIVERED is never set from here.
class RestaurantManageOrdersScreen extends StatefulWidget {
  const RestaurantManageOrdersScreen({super.key});

  @override
  State<RestaurantManageOrdersScreen> createState() => _RestaurantManageOrdersScreenState();
}

class _RestaurantManageOrdersScreenState extends State<RestaurantManageOrdersScreen> {
  List<OwnerRestaurantOrder> _orders = [];
  bool _loading = true;
  final Set<String> _busyIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted || context.read<AuthProvider>().user?.role != 'RESTAURANT_OWNER') return;
    setState(() => _loading = true);
    try {
      final orders = await apiClient.fetchMyRestaurantOrders();
      if (!mounted) return;
      setState(() => _orders = orders);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _setStatus(String id, String status) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.updateRestaurantOrderStatus(id, status);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('restaurant.manage.statusSet.$status'))));
      await _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('restaurant.manage.couldNotUpdateStatus'))));
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(title: context.t('restaurant.manage.orders'), showCart: false, showSearch: false),
      body: _loading
          ? Center(child: Text(context.t('common.loading')))
          : _orders.isEmpty
              ? Center(child: Text(context.t('restaurant.manage.noOrders')))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: _orders.map((order) {
                      final busy = _busyIds.contains(order.id);
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                            border: Border.all(color: AppColors.divider),
                            borderRadius: BorderRadius.circular(12)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(context.t('vendor.orderNumber', {'id': order.id.substring(0, 8)}),
                                          style: const TextStyle(fontWeight: FontWeight.w700)),
                                      Text(
                                        '${order.user.name ?? order.user.phone} · ${order.createdAt.toLocal().toString()}',
                                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                                Chip(
                                  label: Text(context.tOr('ecommerce.orders.status.${order.status}',
                                      order.status.replaceAll('_', ' '))),
                                  backgroundColor: _statusColors[order.status] ?? AppColors.textSecondary,
                                  labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                                  visualDensity: VisualDensity.compact,
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ...order.items.map((item) => Text(
                                  '${item.quantity} × ${item.menuItem.name} — ${formatCfa(item.price)}',
                                  style: const TextStyle(fontSize: 12),
                                )),
                            if (order.deliveryAddress != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                context.t('restaurant.manage.deliverTo', {'address': order.deliveryAddress!}),
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                              ),
                            ],
                            if (order.deliveryRequest != null) ...[
                              Text(
                                context.t('restaurant.manage.deliveryStatus', {
                                  'status': context.tOr('delivery.status.${order.deliveryRequest!.status}',
                                      order.deliveryRequest!.status),
                                }),
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                              ),
                            ],
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (order.feeAmount > 0 || order.taxAmount > 0)
                                      Text(
                                        [
                                          context.t('ecommerce.orders.subtotal',
                                              {'amount': formatCfa(order.subtotal)}),
                                          if (order.feeAmount > 0)
                                            '${context.t('topup.airtime.fee')} ${formatCfa(order.feeAmount)}',
                                          if (order.taxAmount > 0)
                                            '${context.t('topup.airtime.tva')} ${formatCfa(order.taxAmount)}',
                                        ].join(' · '),
                                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                      ),
                                    Text(formatCfa(order.total),
                                        style: const TextStyle(fontWeight: FontWeight.w800)),
                                  ],
                                ),
                                if (order.status == 'CONFIRMED' || order.status == 'PREPARING')
                                  Row(
                                    children: [
                                      TextButton(
                                        onPressed: busy ? null : () => _setStatus(order.id, 'CANCELLED'),
                                        child: Text(context.t('restaurant.manage.cancel'),
                                            style: const TextStyle(color: AppColors.red)),
                                      ),
                                      const SizedBox(width: 8),
                                      ElevatedButton(
                                        onPressed: busy
                                            ? null
                                            : () => _setStatus(
                                                order.id,
                                                order.status == 'CONFIRMED' ? 'PREPARING' : 'OUT_FOR_DELIVERY'),
                                        child: Text(order.status == 'CONFIRMED'
                                            ? context.t('restaurant.manage.startPreparing')
                                            : context.t('restaurant.manage.readyForDelivery')),
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
    );
  }
}
