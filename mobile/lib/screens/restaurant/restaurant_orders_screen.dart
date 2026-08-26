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

class RestaurantOrdersScreen extends StatefulWidget {
  const RestaurantOrdersScreen({super.key});

  @override
  State<RestaurantOrdersScreen> createState() => _RestaurantOrdersScreenState();
}

class _RestaurantOrdersScreenState extends State<RestaurantOrdersScreen> {
  Future<List<RestaurantOrder>>? _future;
  String? _cancellingId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (context.read<AuthProvider>().isAuthenticated) {
      _future ??= apiClient.fetchRestaurantOrders();
    }
  }

  Future<void> _cancel(String id) async {
    setState(() => _cancellingId = id);
    try {
      await apiClient.cancelRestaurantOrder(id);
      if (!mounted) return;
      setState(() => _future = apiClient.fetchRestaurantOrders());
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('restaurant.orders.cancelled'))));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('restaurant.orders.couldNotCancel'))));
    } finally {
      if (mounted) setState(() => _cancellingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!isAuthenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('restaurant.orders.title'), showCart: false, showSearch: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('restaurant.orders.loginToView')),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => context.push('/auth/login'),
                  child: Text(context.t('common.logIn'))),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: TopBar(title: context.t('restaurant.orders.title'), showCart: false, showSearch: false),
      body: FutureBuilder<List<RestaurantOrder>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final orders = snapshot.data ?? const <RestaurantOrder>[];
          if (orders.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(context.t('restaurant.orders.empty')),
                  const SizedBox(height: 16),
                  ElevatedButton(
                      onPressed: () => context.go('/restaurant'),
                      child: Text(context.t('restaurant.orders.browseRestaurants'))),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: orders.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final order = orders[index];
              return InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => context.push('/restaurant/orders/${order.id}'),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.divider),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                              child: Text(order.restaurant.name,
                                  style: const TextStyle(fontWeight: FontWeight.w700))),
                          Chip(
                            label: Text(
                                context.tOr('ecommerce.orders.status.${order.status}',
                                    order.status.replaceAll('_', ' ')),
                                style: const TextStyle(color: Colors.white, fontSize: 11)),
                            backgroundColor: _statusColors[order.status] ?? AppColors.textSecondary,
                            visualDensity: VisualDensity.compact,
                          ),
                        ],
                      ),
                      Text(order.createdAt.toLocal().toString(),
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      const SizedBox(height: 8),
                      ...order.items.map((item) => Text('${item.quantity} x ${item.menuItem.name}',
                          style: const TextStyle(color: AppColors.textSecondary))),
                      if (order.note != null && order.note!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(context.t('restaurant.orders.note', {'note': order.note!}),
                            style: const TextStyle(
                                color: AppColors.textSecondary, fontStyle: FontStyle.italic, fontSize: 12)),
                      ],
                      const SizedBox(height: 8),
                      if (order.feeAmount > 0 || order.taxAmount > 0)
                        Text(
                          [
                            context.t('ecommerce.orders.subtotal', {'amount': formatCfa(order.subtotal)}),
                            if (order.feeAmount > 0)
                              '${context.t('topup.airtime.fee')} ${formatCfa(order.feeAmount)}',
                            if (order.taxAmount > 0)
                              '${context.t('topup.airtime.tva')} ${formatCfa(order.taxAmount)}',
                          ].join(' · '),
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                        ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(context.t('restaurant.orders.total', {'amount': formatCfa(order.total)}),
                              style: const TextStyle(fontWeight: FontWeight.w800)),
                          Row(
                            children: [
                              // Kept reachable for the life of the order, not just
                              // while OUT_FOR_DELIVERY - a DELIVERED order still
                              // benefits from seeing its route/agent info.
                              if (order.deliveryRequestId != null)
                                TextButton(
                                  onPressed: () =>
                                      context.push('/delivery/track/${order.deliveryRequestId}'),
                                  style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero),
                                  child: Text(context.t('restaurant.orders.track'),
                                      style: const TextStyle(fontWeight: FontWeight.w700)),
                                ),
                              if (_cancellableStatuses.contains(order.status))
                                TextButton(
                                  onPressed: _cancellingId == order.id ? null : () => _cancel(order.id),
                                  style: TextButton.styleFrom(
                                      foregroundColor: AppColors.red, padding: EdgeInsets.zero, minimumSize: Size.zero),
                                  child: Text(context.t('restaurant.orders.cancel'),
                                      style: const TextStyle(fontWeight: FontWeight.w700)),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
