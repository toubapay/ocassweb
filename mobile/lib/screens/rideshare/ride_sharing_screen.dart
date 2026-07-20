import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../l10n/app_localizations.dart';
import '../../models/ride_request.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

const _vehicleCodes = ['MOTO', 'ECONOMY', 'COMFORT'];

class RideSharingScreen extends StatefulWidget {
  const RideSharingScreen({super.key});

  @override
  State<RideSharingScreen> createState() => _RideSharingScreenState();
}

class _RideSharingScreenState extends State<RideSharingScreen> {
  final _pickupController = TextEditingController();
  final _dropoffController = TextEditingController();
  String _vehicleType = 'ECONOMY';
  bool _submitting = false;
  List<RideRequest> _rides = [];
  (double, double)? _pickupCoords;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadRides());
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _dropoffController.dispose();
    super.dispose();
  }

  Future<void> _loadRides() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    final rides = await apiClient.fetchMyRides();
    if (mounted) setState(() => _rides = rides);
  }

  Future<void> _cancel(String id) async {
    try {
      await apiClient.cancelRide(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.rideCancelled'))));
      await _loadRides();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.couldNotCancel'))));
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
          .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.locationError'))));
      return;
    }
    setState(() => _pickupCoords = coords);
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.locationSet'))));
  }

  Future<void> _submit() async {
    if (!context.read<AuthProvider>().isAuthenticated) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.loginToBook'))));
      context.push('/auth/login');
      return;
    }
    if (_pickupController.text.trim().isEmpty || _dropoffController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.enterAddresses'))));
      return;
    }
    setState(() => _submitting = true);
    try {
      final ride = await apiClient.createRideRequest(
        pickupAddress: _pickupController.text.trim(),
        dropoffAddress: _dropoffController.text.trim(),
        vehicleType: _vehicleType,
        pickupLat: _pickupCoords?.$1,
        pickupLng: _pickupCoords?.$2,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.tr(
              'rideSharing.rideRequested', {'amount': formatCfa(ride.priceEstimate)}))));
      _pickupController.clear();
      _dropoffController.clear();
      setState(() => _pickupCoords = null);
      await _loadRides();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.couldNotRequest'))));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(
          title: context.t('rideSharing.title'), showBack: false, showSearch: false, showCart: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(context.t('rideSharing.heading'),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextField(
                    controller: _pickupController,
                    decoration: InputDecoration(labelText: context.t('rideSharing.pickupLocation'))),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _useMyLocation,
                tooltip: context.t('rideSharing.useMyLocation'),
                icon: const Icon(Icons.my_location_rounded),
                style: IconButton.styleFrom(
                  backgroundColor: _pickupCoords != null ? AppColors.blue : AppColors.blue.withOpacity(0.15),
                  foregroundColor: _pickupCoords != null ? Colors.white : AppColors.blue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
              controller: _dropoffController,
              decoration: InputDecoration(labelText: context.t('rideSharing.dropoffLocation'))),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            children: _vehicleCodes.map((code) {
              final selected = _vehicleType == code;
              return ChoiceChip(
                label: Text(context.t('rideSharing.vehicles.$code')),
                selected: selected,
                onSelected: (_) => setState(() => _vehicleType = code),
                selectedColor: AppColors.blue,
                labelStyle: TextStyle(
                  color: selected ? Colors.white : AppColors.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.blue),
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting
                  ? context.t('rideSharing.requesting')
                  : context.t('rideSharing.requestRide')),
            ),
          ),
          if (_rides.isNotEmpty) ...[
            const SizedBox(height: 28),
            Text(context.t('rideSharing.yourRides'), style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            ..._rides.map((r) => Container(
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
                              label: Text(context.tOr('rideSharing.status.${r.status}', r.status)),
                              visualDensity: VisualDensity.compact),
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                              '${context.tOr('rideSharing.vehicles.${r.vehicleType}', r.vehicleType)} · ${formatCfa(r.priceEstimate)}',
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
                              child: Text(context.t('rideSharing.cancel'),
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
