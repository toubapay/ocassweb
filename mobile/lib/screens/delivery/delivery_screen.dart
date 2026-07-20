import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../l10n/app_localizations.dart';
import '../../models/delivery_request.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

class DeliveryScreen extends StatefulWidget {
  const DeliveryScreen({super.key});

  @override
  State<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends State<DeliveryScreen> {
  final _pickupController = TextEditingController();
  final _dropoffController = TextEditingController();
  final _noteController = TextEditingController();
  bool _submitting = false;
  List<DeliveryRequest> _requests = [];
  (double, double)? _pickupCoords;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadRequests());
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _dropoffController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadRequests() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    final requests = await apiClient.fetchDeliveryRequests();
    if (mounted) setState(() => _requests = requests);
  }

  Future<void> _cancel(String id) async {
    try {
      await apiClient.cancelDeliveryRequest(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.requestCancelled'))));
      await _loadRequests();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.couldNotCancel'))));
    }
  }

  /// There's no geocoding/maps integration in this app (no API key
  /// configured), so a typed address never has coordinates on its own -
  /// this is the one way to get a real pickup point for distance-based
  /// pricing. Dropoff stays address-text-only until a map picker exists.
  Future<void> _useMyLocation() async {
    final coords = await getCurrentLatLng();
    if (!mounted) return;
    if (coords == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.locationError'))));
      return;
    }
    setState(() => _pickupCoords = coords);
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(context.tr('delivery.locationSet'))));
  }

  Future<void> _submit() async {
    if (!context.read<AuthProvider>().isAuthenticated) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.loginToRequest'))));
      context.push('/auth/login');
      return;
    }
    if (_pickupController.text.trim().isEmpty || _dropoffController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.enterAddresses'))));
      return;
    }
    setState(() => _submitting = true);
    try {
      final request = await apiClient.createDeliveryRequest(
        pickupAddress: _pickupController.text.trim(),
        dropoffAddress: _dropoffController.text.trim(),
        packageNote: _noteController.text.trim(),
        pickupLat: _pickupCoords?.$1,
        pickupLng: _pickupCoords?.$2,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.tr(
              'delivery.requestCreated', {'amount': formatCfa(request.priceEstimate)}))));
      _pickupController.clear();
      _dropoffController.clear();
      _noteController.clear();
      setState(() => _pickupCoords = null);
      await _loadRequests();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.couldNotCreate'))));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(
          title: context.t('delivery.title'), showBack: false, showSearch: false, showCart: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(context.t('delivery.heading'),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextField(
                    controller: _pickupController,
                    decoration: InputDecoration(labelText: context.t('delivery.pickupAddress'))),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _useMyLocation,
                tooltip: context.t('delivery.useMyLocation'),
                icon: const Icon(Icons.my_location_rounded),
                style: IconButton.styleFrom(
                  backgroundColor: _pickupCoords != null ? AppColors.amber : AppColors.amber.withOpacity(0.2),
                  foregroundColor: _pickupCoords != null ? Colors.white : AppColors.amber,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
              controller: _dropoffController,
              decoration: InputDecoration(labelText: context.t('delivery.dropoffAddress'))),
          const SizedBox(height: 12),
          TextField(
              controller: _noteController,
              decoration: InputDecoration(labelText: context.t('delivery.packageNote'))),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style:
                  ElevatedButton.styleFrom(backgroundColor: AppColors.amber, foregroundColor: Colors.black87),
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting
                  ? context.t('delivery.requesting')
                  : context.t('delivery.getEstimate')),
            ),
          ),
          if (_requests.isNotEmpty) ...[
            const SizedBox(height: 28),
            Text(context.t('delivery.yourRequests'), style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            ..._requests.map((r) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(12)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                              child: Text('${r.pickupAddress} → ${r.dropoffAddress}',
                                  style: const TextStyle(fontWeight: FontWeight.w700))),
                          Chip(
                              label: Text(context.tOr('delivery.status.${r.status}', r.status)),
                              visualDensity: VisualDensity.compact),
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                              context.t('delivery.estimate', {'amount': formatCfa(r.priceEstimate)}),
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                          if (r.status == 'REQUESTED')
                            TextButton(
                              onPressed: () => _cancel(r.id),
                              style: TextButton.styleFrom(
                                foregroundColor: AppColors.red,
                                minimumSize: Size.zero,
                                padding: EdgeInsets.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(context.t('delivery.cancel'),
                                  style: const TextStyle(fontWeight: FontWeight.w700)),
                            ),
                        ],
                      ),
                    ],
                  ),
                )),
          ],
        ],
      ),
    );
  }
}
