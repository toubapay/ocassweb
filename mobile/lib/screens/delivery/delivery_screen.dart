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
import '../../widgets/address_autocomplete_field.dart';
import '../../widgets/live_tracking_map.dart';
import '../../widgets/top_bar.dart';

const _trackableStatuses = {'ACCEPTED', 'PICKED_UP'};

class DeliveryScreen extends StatefulWidget {
  const DeliveryScreen({super.key});

  @override
  State<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends State<DeliveryScreen> {
  final _senderNameController = TextEditingController();
  final _senderPhoneController = TextEditingController();
  final _pickupController = TextEditingController();
  final _receiverNameController = TextEditingController();
  final _receiverPhoneController = TextEditingController();
  final _dropoffController = TextEditingController();
  final _noteController = TextEditingController();
  bool _submitting = false;
  List<DeliveryRequest> _requests = [];
  (double, double)? _pickupCoords;
  (double, double)? _dropoffCoords;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadRequests());
  }

  @override
  void dispose() {
    _senderNameController.dispose();
    _senderPhoneController.dispose();
    _pickupController.dispose();
    _receiverNameController.dispose();
    _receiverPhoneController.dispose();
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

  /// Alternative to picking a real Places suggestion in the pickup field
  /// below (AddressAutocompleteField) - the device's actual GPS position
  /// also produces real coordinates for distance-based pricing.
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
    if (_receiverNameController.text.trim().length < 2 ||
        _receiverPhoneController.text.trim().length < 6) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.enterReceiver'))));
      return;
    }
    setState(() => _submitting = true);
    try {
      final request = await apiClient.createDeliveryRequest(
        pickupAddress: _pickupController.text.trim(),
        dropoffAddress: _dropoffController.text.trim(),
        receiverName: _receiverNameController.text.trim(),
        receiverPhone: _receiverPhoneController.text.trim(),
        senderName: _senderNameController.text.trim(),
        senderPhone: _senderPhoneController.text.trim(),
        packageNote: _noteController.text.trim(),
        pickupLat: _pickupCoords?.$1,
        pickupLng: _pickupCoords?.$2,
        dropoffLat: _dropoffCoords?.$1,
        dropoffLng: _dropoffCoords?.$2,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.tr(
              'delivery.requestCreated', {'amount': formatCfa(request.priceEstimate)}))));
      _senderNameController.clear();
      _senderPhoneController.clear();
      _pickupController.clear();
      _receiverNameController.clear();
      _receiverPhoneController.clear();
      _dropoffController.clear();
      _noteController.clear();
      setState(() {
        _pickupCoords = null;
        _dropoffCoords = null;
      });
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
          Text(context.t('delivery.senderSectionTitle'),
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
          const SizedBox(height: 8),
          TextField(
              controller: _senderNameController,
              decoration: InputDecoration(labelText: context.t('delivery.senderName'))),
          const SizedBox(height: 12),
          TextField(
              controller: _senderPhoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: context.t('delivery.senderPhone'))),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AddressAutocompleteField(
                  controller: _pickupController,
                  label: context.t('delivery.pickupAddress'),
                  onManualEdit: () => setState(() => _pickupCoords = null),
                  onPlaceSelected: ({required address, required lat, required lng}) =>
                      setState(() => _pickupCoords = (lat, lng)),
                ),
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
          const SizedBox(height: 20),
          Text(context.t('delivery.receiverSectionTitle'),
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
          const SizedBox(height: 8),
          TextField(
              controller: _receiverNameController,
              decoration: InputDecoration(labelText: context.t('delivery.receiverName'))),
          const SizedBox(height: 12),
          TextField(
              controller: _receiverPhoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: context.t('delivery.receiverPhone'))),
          const SizedBox(height: 12),
          AddressAutocompleteField(
            controller: _dropoffController,
            label: context.t('delivery.dropoffAddress'),
            onManualEdit: () => setState(() => _dropoffCoords = null),
            onPlaceSelected: ({required address, required lat, required lng}) =>
                setState(() => _dropoffCoords = (lat, lng)),
          ),
          const SizedBox(height: 12),
          TextField(
              controller: _noteController,
              decoration: InputDecoration(labelText: context.t('delivery.packageNote'))),
          if (_pickupCoords != null && _dropoffCoords != null) ...[
            const SizedBox(height: 16),
            LiveTrackingMap(pickup: _pickupCoords, dropoff: _dropoffCoords, height: 180),
          ],
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
                          Row(
                            children: [
                              if (_trackableStatuses.contains(r.status))
                                TextButton(
                                  onPressed: () => context.push('/delivery/track/${r.id}'),
                                  style: TextButton.styleFrom(
                                    minimumSize: Size.zero,
                                    padding: const EdgeInsets.only(right: 8),
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: Text(context.t('delivery.track'),
                                      style: const TextStyle(fontWeight: FontWeight.w700)),
                                ),
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
                    ],
                  ),
                )),
          ],
        ],
      ),
    );
  }
}
