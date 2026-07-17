import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../models/ride_request.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

const _vehicles = [
  ('MOTO', 'Moto'),
  ('ECONOMY', 'Economy'),
  ('COMFORT', 'Comfort'),
];

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
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ride cancelled')));
      await _loadRides();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not cancel ride')));
    }
  }

  Future<void> _submit() async {
    if (!context.read<AuthProvider>().isAuthenticated) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Log in to book a ride')));
      context.push('/auth/login');
      return;
    }
    if (_pickupController.text.trim().isEmpty || _dropoffController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Enter pickup and dropoff addresses')));
      return;
    }
    setState(() => _submitting = true);
    try {
      final ride = await apiClient.createRideRequest(
        pickupAddress: _pickupController.text.trim(),
        dropoffAddress: _dropoffController.text.trim(),
        vehicleType: _vehicleType,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Ride requested · estimate ${formatCfa(ride.priceEstimate)}')),
      );
      _pickupController.clear();
      _dropoffController.clear();
      await _loadRides();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Could not request ride')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const TopBar(title: 'Ride Sharing', showBack: false, showSearch: false, showCart: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text('Where are you headed?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 16),
          TextField(
              controller: _pickupController,
              decoration: const InputDecoration(labelText: 'Pickup location')),
          const SizedBox(height: 12),
          TextField(
              controller: _dropoffController,
              decoration: const InputDecoration(labelText: 'Dropoff location')),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            children: _vehicles.map((v) {
              final selected = _vehicleType == v.$1;
              return ChoiceChip(
                label: Text(v.$2),
                selected: selected,
                onSelected: (_) => setState(() => _vehicleType = v.$1),
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
              child: Text(_submitting ? 'Requesting...' : 'Request ride'),
            ),
          ),
          if (_rides.isNotEmpty) ...[
            const SizedBox(height: 28),
            const Text('Your rides', style: TextStyle(fontWeight: FontWeight.w800)),
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
                          Chip(label: Text(r.status), visualDensity: VisualDensity.compact),
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${r.vehicleType} · ${formatCfa(r.priceEstimate)}',
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
                              child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700)),
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
