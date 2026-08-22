import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../constants/delivery_package_types.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../l10n/app_localizations.dart';
import '../../models/delivery_package_type.dart';
import '../../models/delivery_request.dart';
import '../../providers/auth_provider.dart';
import '../../providers/locale_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/address_autocomplete_field.dart';
import '../../widgets/delivery_distance_price_card.dart';
import '../../widgets/live_tracking_map.dart';
import '../../widgets/map_address_picker_screen.dart';
import '../../widgets/top_bar.dart';

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
  final _weightController = TextEditingController();
  bool _submitting = false;
  String _packageType = 'PACKAGE';
  List<DeliveryRequest> _requests = [];
  List<DeliveryPackageType> _packageTypes = [];
  (double, double)? _pickupCoords;
  (double, double)? _dropoffCoords;
  ({double distanceKm, double priceEstimate})? _feeQuote;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadRequests();
      _loadPackageTypes();
    });
  }

  Future<void> _loadPackageTypes() async {
    try {
      final packageTypes = await apiClient.fetchDeliveryPackageTypes();
      if (mounted) setState(() => _packageTypes = packageTypes);
    } catch (_) {
      // Picker just stays empty - createDeliveryRequest still defaults to
      // 'PACKAGE' server-side if this never loads.
    }
  }

  DeliveryPackageType? _packageTypeByKey(String key) {
    for (final p in _packageTypes) {
      if (p.key == key) return p;
    }
    return null;
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
    _weightController.dispose();
    super.dispose();
  }

  Future<void> _loadRequests() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    final requests = await apiClient.fetchDeliveryRequests();
    if (mounted) setState(() => _requests = requests);
  }

  /// Refetches the live distance + price preview whenever pickup/dropoff
  /// coordinates change, mirroring the web's delivery-fee-quote query -
  /// lets the customer see cost before submitting.
  Future<void> _refreshQuote() async {
    final pickup = _pickupCoords;
    final dropoff = _dropoffCoords;
    if (pickup == null || dropoff == null) {
      if (mounted) setState(() => _feeQuote = null);
      return;
    }
    try {
      final quote = await apiClient.fetchDeliveryFeeQuote(
        pickupLat: pickup.$1,
        pickupLng: pickup.$2,
        dropoffLat: dropoff.$1,
        dropoffLng: dropoff.$2,
      );
      if (mounted) setState(() => _feeQuote = quote);
    } catch (_) {
      // Silently ignored, same as elsewhere - the map preview and the
      // final priceEstimate from creating the request still work either way.
    }
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
    _refreshQuote();
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(context.tr('delivery.locationSet'))));
  }

  /// Alternative to both the address autocomplete field and "use my
  /// location" - pans a map under a fixed pin instead of typing or using
  /// the device's own position, for pickup and dropoff alike.
  Future<void> _pickOnMap({required bool isPickup}) async {
    final current = isPickup ? _pickupCoords : _dropoffCoords;
    final result = await showMapAddressPicker(context, initialCenter: current);
    if (result == null || !mounted) return;
    setState(() {
      if (isPickup) {
        _pickupController.text = result.address;
        _pickupCoords = (result.lat, result.lng);
      } else {
        _dropoffController.text = result.address;
        _dropoffCoords = (result.lat, result.lng);
      }
    });
    _refreshQuote();
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
      final weightText = _weightController.text.trim();
      final request = await apiClient.createDeliveryRequest(
        packageType: _packageType,
        packageWeightKg: weightText.isEmpty ? null : double.tryParse(weightText),
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
      _weightController.clear();
      setState(() {
        _pickupCoords = null;
        _dropoffCoords = null;
        _feeQuote = null;
        _packageType = 'PACKAGE';
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
    final language = context.watch<LocaleProvider>().language;
    final activePackageTypes = _packageTypes.where((p) => p.isActive).toList();
    return Scaffold(
      appBar: TopBar(
          title: context.t('delivery.title'), showBack: false, showSearch: false, showCart: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(context.t('delivery.heading'),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 16),
          Text(context.t('delivery.packageType.heading'),
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
          const SizedBox(height: 8),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 2.6,
            children: activePackageTypes.map((p) {
              final selected = _packageType == p.key;
              final colors = packageTypeColor(p.colorKey);
              final hint = p.hint(language);
              return InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => setState(() => _packageType = p.key),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: Colors.white,
                    border: Border.all(
                      color: selected ? Theme.of(context).colorScheme.primary : AppColors.divider,
                      width: selected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(color: colors.bg, borderRadius: BorderRadius.circular(8)),
                        child: Icon(packageTypeIcon(p.icon), color: colors.color, size: 18),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(p.label(language),
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                                overflow: TextOverflow.ellipsis),
                            if (hint != null && hint.isNotEmpty)
                              Text(hint,
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _weightController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(labelText: context.t('delivery.estimatedWeightKg')),
          ),
          const SizedBox(height: 20),
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
                  onManualEdit: () {
                    setState(() => _pickupCoords = null);
                    _refreshQuote();
                  },
                  onPlaceSelected: ({required address, required lat, required lng}) {
                    setState(() => _pickupCoords = (lat, lng));
                    _refreshQuote();
                  },
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
              IconButton(
                onPressed: () => _pickOnMap(isPickup: true),
                tooltip: context.t('delivery.pickOnMap'),
                icon: const Icon(Icons.map_rounded),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: AppColors.divider),
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
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AddressAutocompleteField(
                  controller: _dropoffController,
                  label: context.t('delivery.dropoffAddress'),
                  onManualEdit: () {
                    setState(() => _dropoffCoords = null);
                    _refreshQuote();
                  },
                  onPlaceSelected: ({required address, required lat, required lng}) {
                    setState(() => _dropoffCoords = (lat, lng));
                    _refreshQuote();
                  },
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: () => _pickOnMap(isPickup: false),
                tooltip: context.t('delivery.pickOnMap'),
                icon: const Icon(Icons.map_rounded),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: AppColors.divider),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
              controller: _noteController,
              decoration: InputDecoration(labelText: context.t('delivery.packageNote'))),
          if (_pickupCoords != null && _dropoffCoords != null) ...[
            const SizedBox(height: 16),
            LiveTrackingMap(pickup: _pickupCoords, dropoff: _dropoffCoords, height: 180),
            if (_feeQuote != null) ...[
              const SizedBox(height: 8),
              DeliveryDistancePriceCard(
                distanceKm: _feeQuote!.distanceKm,
                priceEstimate: _feeQuote!.priceEstimate,
              ),
            ],
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
            ..._requests.map((r) => InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => context.push('/delivery/track/${r.id}'),
                  child: Container(
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
                      if (_packageTypeByKey(r.packageType) != null) ...[
                        const SizedBox(height: 4),
                        Builder(builder: (context) {
                          final pt = _packageTypeByKey(r.packageType)!;
                          final colors = packageTypeColor(pt.colorKey);
                          return Chip(
                            avatar: Icon(packageTypeIcon(pt.icon), size: 16, color: colors.color),
                            label: Text(pt.label(language),
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                            visualDensity: VisualDensity.compact,
                            backgroundColor: Colors.white,
                            side: const BorderSide(color: AppColors.divider),
                          );
                        }),
                      ],
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                              r.distanceKm != null
                                  ? context.t('delivery.estimateWithDistance', {
                                      'km': r.distanceKm!.toStringAsFixed(1),
                                      'amount': formatCfa(r.priceEstimate),
                                    })
                                  : context.t('delivery.estimate', {'amount': formatCfa(r.priceEstimate)}),
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                          Row(
                            children: [
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
                  ),
                )),
          ],
        ],
      ),
    );
  }
}
