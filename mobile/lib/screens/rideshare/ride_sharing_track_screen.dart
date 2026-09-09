import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/geo.dart';
import '../../l10n/app_localizations.dart';
import '../../models/ride_request.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';
import '../../widgets/live_tracking_map.dart';

const _steps = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
const _pollInterval = Duration(seconds: 5);

/// Dart port of pages/ride-sharing/track/[id].js: polls GET
/// /rideshare/rides/:id every 5s and feeds pickup/dropoff/rider
/// coordinates into LiveTrackingMap, mirroring DeliveryTrackScreen's
/// pattern but scoped down (RideRequest has no package type or receiver).
class RideSharingTrackScreen extends StatefulWidget {
  final String rideId;
  const RideSharingTrackScreen({super.key, required this.rideId});

  @override
  State<RideSharingTrackScreen> createState() => _RideSharingTrackScreenState();
}

class _RideSharingTrackScreenState extends State<RideSharingTrackScreen> {
  RideRequest? _ride;
  bool _loading = true;
  bool _notFound = false;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load();
      _pollTimer = Timer.periodic(_pollInterval, (_) => _load());
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    try {
      final ride = await apiClient.fetchRide(widget.rideId);
      if (mounted) setState(() => _ride = ride);
    } catch (_) {
      if (mounted) setState(() => _notFound = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!isAuthenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('rideSharing.tracking.title'), showCart: false, showSearch: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('common.logInToContinue')),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => context.push('/auth/login'), child: Text(context.t('common.logIn'))),
            ],
          ),
        ),
      );
    }

    if (_notFound) {
      return Scaffold(
        appBar: TopBar(title: context.t('rideSharing.tracking.title'), showCart: false, showSearch: false),
        body: Center(child: Text(context.t('rideSharing.tracking.notFound'))),
      );
    }

    if (_loading || _ride == null) {
      return Scaffold(
        appBar: TopBar(title: context.t('rideSharing.tracking.title'), showCart: false, showSearch: false),
        body: Center(child: Text(context.t('common.loading'))),
      );
    }

    final ride = _ride!;
    final pickup = ride.pickupLat != null ? (ride.pickupLat!, ride.pickupLng!) : null;
    final dropoff = ride.dropoffLat != null ? (ride.dropoffLat!, ride.dropoffLng!) : null;
    final rider = ride.riderLat != null ? (ride.riderLat!, ride.riderLng!) : null;
    final distanceAwayKm =
        rider != null && dropoff != null ? haversineDistanceKm(rider.$1, rider.$2, dropoff.$1, dropoff.$2) : null;
    final stepIndex = ride.status == 'CANCELLED' ? -1 : _steps.indexOf(ride.status);

    return Scaffold(
      appBar: TopBar(title: context.t('rideSharing.tracking.title'), showCart: false, showSearch: false),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              for (var i = 0; i < _steps.length; i++) ...[
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: i <= stepIndex ? AppColors.blue : Colors.grey.shade300,
                  ),
                ),
                if (i < _steps.length - 1)
                  Expanded(
                    child: Container(height: 2, color: i < stepIndex ? AppColors.blue : Colors.grey.shade300),
                  ),
              ],
              const SizedBox(width: 8),
              Text(context.tOr('rideSharing.status.${ride.status}', ride.status),
                  style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 12),
          LiveTrackingMap(pickup: pickup, dropoff: dropoff, agent: rider, height: 240),
          const SizedBox(height: 16),
          if (ride.assignedRider == null && ride.status == 'REQUESTED')
            Chip(label: Text(context.t('rideSharing.tracking.waitingForRider')))
          else if (ride.assignedRider != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(12)),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.t('rideSharing.tracking.riderAssigned',
                              {'name': ride.assignedRider!.name ?? ride.assignedRider!.phone ?? ''}),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        if (distanceAwayKm != null)
                          Text(
                            context.t('rideSharing.tracking.distanceAway', {'km': distanceAwayKm.toStringAsFixed(1)}),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          ),
                      ],
                    ),
                  ),
                  if (ride.assignedRider!.phone != null)
                    OutlinedButton.icon(
                      onPressed: () => launchUrl(Uri.parse('tel:${ride.assignedRider!.phone}')),
                      icon: const Icon(Icons.phone_rounded, size: 16),
                      label: Text(context.t('rideSharing.tracking.callRider')),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('rideSharing.pickupLocation'), style: const TextStyle(color: AppColors.textSecondary)),
              Flexible(
                child: Text(ride.pickupAddress,
                    textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('rideSharing.dropoffLocation'), style: const TextStyle(color: AppColors.textSecondary)),
              Flexible(
                child: Text(ride.dropoffAddress,
                    textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
