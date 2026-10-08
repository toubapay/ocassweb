import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Every courier run this shop raised, newest first - the Flutter half of
/// pages/vendor/deliveries.js.
///
/// A vendor marking an order "out for delivery" puts a real run on the
/// couriers' job board, and before this screen that was the last they saw
/// of it: the run existed for the agents and for the admin console, but
/// the shop that raised it could not tell whether anyone had picked it up,
/// which is exactly what their customer rings to ask.
class VendorDeliveriesScreen extends StatefulWidget {
  const VendorDeliveriesScreen({super.key});

  @override
  State<VendorDeliveriesScreen> createState() => _VendorDeliveriesScreenState();
}

class _VendorDeliveriesScreenState extends State<VendorDeliveriesScreen> {
  List<Map<String, dynamic>> _deliveries = [];
  bool _loading = true;
  bool _loadError = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _loadError = false;
    });
    try {
      final deliveries = await apiClient.fetchVendorDeliveries();
      if (!mounted) return;
      setState(() {
        _deliveries = deliveries;
        _loading = false;
      });
    } catch (_) {
      // Keeps whatever is on screen and offers a retry rather than
      // sitting on a spinner forever.
      if (!mounted) return;
      setState(() {
        _loadError = true;
        _loading = false;
      });
    }
  }

  static const _statusColor = {
    'REQUESTED': AppColors.textSecondary,
    'ACCEPTED': AppColors.blue,
    'PICKED_UP': AppColors.amber,
    'DELIVERED': AppColors.green,
    'CANCELLED': AppColors.red,
  };

  @override
  Widget build(BuildContext context) {
    final hasStore = context.watch<AuthProvider>().user?.store != null;

    if (!hasStore) {
      return Scaffold(
        appBar: TopBar(title: context.t('vendor.deliveries'), showCart: false, showSearch: false),
        body: Center(child: Text(context.t('vendor.notAVendor'))),
      );
    }

    return Scaffold(
      appBar: TopBar(title: context.t('vendor.deliveries'), showCart: false, showSearch: false),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loadError)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  children: [
                    Text(context.t('common.loadFailed'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.textSecondary)),
                    const SizedBox(height: 8),
                    ElevatedButton(onPressed: _load, child: Text(context.t('common.retry'))),
                  ],
                ),
              ),
            if (_loading)
              Text(context.t('common.loading'),
                  style: const TextStyle(color: AppColors.textSecondary)),
            if (!_loading && _deliveries.isEmpty && !_loadError)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Column(
                  children: [
                    const Icon(Icons.two_wheeler_rounded, size: 40, color: AppColors.textSecondary),
                    const SizedBox(height: 8),
                    Text(context.t('vendor.noDeliveries'),
                        style: const TextStyle(color: AppColors.textSecondary)),
                  ],
                ),
              ),
            for (final row in _deliveries) _deliveryTile(context, row),
          ],
        ),
      ),
    );
  }

  Widget _deliveryTile(BuildContext context, Map<String, dynamic> row) {
    final run = row['deliveryRequest'] as Map<String, dynamic>?;
    if (run == null) return const SizedBox.shrink();
    final status = run['status'] as String? ?? '';
    final agent = run['assignedAgent'] as Map<String, dynamic>?;
    final orderId = (row['id'] as String? ?? '').substring(0, 8);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('vendor.orderRef', {'ref': orderId}),
                  style: const TextStyle(fontWeight: FontWeight.w800)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: (_statusColor[status] ?? AppColors.textSecondary).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  context.tOr('delivery.status.$status', status),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: _statusColor[status] ?? AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(run['dropoffAddress'] as String? ?? '',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          if (run['priceEstimate'] != null)
            Text(formatCfa(run['priceEstimate'] as num),
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          const SizedBox(height: 8),
          // The courier's name and number once one has taken it: a vendor
          // fielding "where is my parcel" had the status and nothing else.
          if (agent != null)
            Row(
              children: [
                const Icon(Icons.two_wheeler_rounded, size: 16, color: AppColors.green),
                const SizedBox(width: 6),
                Text(agent['name'] as String? ?? context.t('vendor.courier'),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => launchUrl(Uri.parse('tel:${agent['phone']}')),
                  icon: const Icon(Icons.phone_rounded, size: 15),
                  label: Text(agent['phone'] as String? ?? '',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                ),
              ],
            )
          else
            Text(context.t('vendor.waitingForCourier'),
                style: const TextStyle(
                    color: AppColors.amber, fontWeight: FontWeight.w700, fontSize: 12)),
        ],
      ),
    );
  }
}
