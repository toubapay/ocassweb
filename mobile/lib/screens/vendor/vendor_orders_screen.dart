import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/order.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/vendor/orders.js: every order containing at least one of
/// this vendor's products, with the buyer's name/phone and only the
/// line items belonging to this store (server already scopes `items`).
class VendorOrdersScreen extends StatefulWidget {
  const VendorOrdersScreen({super.key});

  @override
  State<VendorOrdersScreen> createState() => _VendorOrdersScreenState();
}

class _VendorOrdersScreenState extends State<VendorOrdersScreen> {
  List<Order> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted || context.read<AuthProvider>().user?.role != 'VENDOR') return;
    setState(() => _loading = true);
    try {
      final orders = await apiClient.fetchMyVendorOrders();
      if (mounted) setState(() => _orders = orders);
    } finally {
      if (mounted) setState(() => _loading = false);
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
                                    label: Text(
                                        context.tOr('ecommerce.orders.status.${o.status}', o.status)),
                                    visualDensity: VisualDensity.compact),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(itemsLabel, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                            const SizedBox(height: 6),
                            Text(formatCfa(o.total), style: const TextStyle(fontWeight: FontWeight.w800)),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
    );
  }
}
