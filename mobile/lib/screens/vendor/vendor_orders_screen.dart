import 'package:flutter/material.dart';
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
  'CONFIRMED': AppColors.amber,
  'PREPARING': AppColors.amber,
  'OUT_FOR_DELIVERY': AppColors.green,
  'DELIVERED': AppColors.green,
  'CANCELLED': AppColors.red,
};

/// Mirrors pages/vendor/orders.js: every order containing at least one of
/// this vendor's products, with the buyer's name/phone and only the line
/// items belonging to this store (server already scopes `items`). A
/// single-store order (isSingleVendor) can be advanced CONFIRMED ->
/// PREPARING -> OUT_FOR_DELIVERY (or cancelled from either) - the last
/// step auto-dispatches a real DeliveryRequest, same as restaurant orders.
class VendorOrdersScreen extends StatefulWidget {
  const VendorOrdersScreen({super.key});

  @override
  State<VendorOrdersScreen> createState() => _VendorOrdersScreenState();
}

class _VendorOrdersScreenState extends State<VendorOrdersScreen> {
  List<Order> _orders = [];
  bool _loading = true;
  final Set<String> _busyIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted || context.read<AuthProvider>().user?.store == null) return;
    setState(() => _loading = true);
    try {
      final orders = await apiClient.fetchMyVendorOrders();
      if (mounted) setState(() => _orders = orders);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _setStatus(String id, String status) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.updateVendorOrderStatus(id, status);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('vendor.manage.statusSet.$status'))));
      await _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('vendor.manage.couldNotUpdateStatus'))));
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(title: context.t('vendor.viewOrders'), showCart: false, showSearch: false),
      body: _loading
          ? Center(child: Text(context.t('common.loading')))
          : _orders.isEmpty
              ? Center(child: Text(context.t('vendor.noOrders')))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: _orders.map((o) {
                      final busy = _busyIds.contains(o.id);
                      final itemsLabel = o.items.map((i) => '${i.quantity}× ${i.product.name}').join(', ');
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                            border: Border.all(color: AppColors.divider),
                            borderRadius: BorderRadius.circular(12)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(o.buyerName ?? o.buyerPhone ?? '—',
                                    style: const TextStyle(fontWeight: FontWeight.w700)),
                                Chip(
                                  label: Text(context.tOr(
                                      'ecommerce.orders.status.${o.status}', o.status.replaceAll('_', ' '))),
                                  backgroundColor: _statusColors[o.status] ?? AppColors.textSecondary,
                                  labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                                  visualDensity: VisualDensity.compact,
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(itemsLabel, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                            if (o.deliveryRequestStatus != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                context.t('vendor.manage.deliveryStatus', {
                                  'status': context.tOr(
                                      'delivery.status.${o.deliveryRequestStatus}', o.deliveryRequestStatus!),
                                }),
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                              ),
                            ],
                            if (o.isSingleVendor == false) ...[
                              const SizedBox(height: 4),
                              Text(
                                context.t('vendor.manage.multiVendorNote'),
                                style: const TextStyle(
                                    color: AppColors.textSecondary, fontSize: 12, fontStyle: FontStyle.italic),
                              ),
                            ],
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(formatCfa(o.total), style: const TextStyle(fontWeight: FontWeight.w800)),
                                if (o.isSingleVendor == true &&
                                    (o.status == 'CONFIRMED' || o.status == 'PREPARING'))
                                  Row(
                                    children: [
                                      TextButton(
                                        onPressed: busy ? null : () => _setStatus(o.id, 'CANCELLED'),
                                        child: Text(context.t('vendor.manage.cancel'),
                                            style: const TextStyle(color: AppColors.red)),
                                      ),
                                      const SizedBox(width: 8),
                                      ElevatedButton(
                                        onPressed: busy
                                            ? null
                                            : () => _setStatus(
                                                o.id, o.status == 'CONFIRMED' ? 'PREPARING' : 'OUT_FOR_DELIVERY'),
                                        child: Text(o.status == 'CONFIRMED'
                                            ? context.t('vendor.manage.startPreparing')
                                            : context.t('vendor.manage.readyForDelivery')),
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
