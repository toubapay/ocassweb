import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../l10n/app_localizations.dart';
import '../../models/ride_posting.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';
import '../../widgets/live_tracking_map.dart';

const _pollInterval = Duration(seconds: 5);

/// Dart port of pages/anando/track/[id].js: polls GET /anando/postings/:id
/// every 5s and feeds origin/destination/driver coordinates into
/// LiveTrackingMap. Unlike delivery/ride-sharing, the driver is known from
/// the moment a seat is booked, so there's no "waiting for a match" state -
/// only "waiting for the driver to depart".
class AnandoTrackScreen extends StatefulWidget {
  final String postingId;
  const AnandoTrackScreen({super.key, required this.postingId});

  @override
  State<AnandoTrackScreen> createState() => _AnandoTrackScreenState();
}

class _AnandoTrackScreenState extends State<AnandoTrackScreen> {
  RidePosting? _posting;
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
      final posting = await apiClient.fetchPosting(widget.postingId);
      if (mounted) setState(() => _posting = posting);
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
        appBar: TopBar(title: context.t('anando.tracking.title'), showCart: false, showSearch: false),
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
        appBar: TopBar(title: context.t('anando.tracking.title'), showCart: false, showSearch: false),
        body: Center(child: Text(context.t('anando.tracking.notFound'))),
      );
    }

    if (_loading || _posting == null) {
      return Scaffold(
        appBar: TopBar(title: context.t('anando.tracking.title'), showCart: false, showSearch: false),
        body: Center(child: Text(context.t('common.loading'))),
      );
    }

    final posting = _posting!;
    final origin = posting.originLat != null ? (posting.originLat!, posting.originLng!) : null;
    final destination =
        posting.destinationLat != null ? (posting.destinationLat!, posting.destinationLng!) : null;
    final driver = posting.driverLat != null ? (posting.driverLat!, posting.driverLng!) : null;
    final distanceAwayKm = driver != null && destination != null
        ? haversineDistanceKm(driver.$1, driver.$2, destination.$1, destination.$2)
        : null;

    return Scaffold(
      appBar: TopBar(title: context.t('anando.tracking.title'), showCart: false, showSearch: false),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Chip(label: Text(context.tOr('anando.status.${posting.status}', posting.status))),
          ),
          const SizedBox(height: 12),
          LiveTrackingMap(pickup: origin, dropoff: destination, agent: driver, height: 240),
          const SizedBox(height: 16),
          if (posting.status != 'DEPARTED')
            Chip(label: Text(context.t('anando.tracking.waitingForDeparture')))
          else
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
                          context.t('anando.tracking.driverEnRoute',
                              {'name': posting.driver?.name ?? posting.driver?.phone ?? ''}),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        if (distanceAwayKm != null)
                          Text(
                            context.t('anando.tracking.distanceAway', {'km': distanceAwayKm.toStringAsFixed(1)}),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          ),
                      ],
                    ),
                  ),
                  if (posting.driver?.phone != null)
                    OutlinedButton.icon(
                      onPressed: () => launchUrl(Uri.parse('tel:${posting.driver!.phone}')),
                      icon: const Icon(Icons.phone_rounded, size: 16),
                      label: Text(context.t('anando.tracking.callDriver')),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('anando.origin'), style: const TextStyle(color: AppColors.textSecondary)),
              Flexible(
                child: Text(posting.originAddress,
                    textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('anando.destination'), style: const TextStyle(color: AppColors.textSecondary)),
              Flexible(
                child: Text(posting.destinationAddress,
                    textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          if (posting.pricePerSeat != null) ...[
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(context.t('anando.pricePerSeatOptional'),
                    style: const TextStyle(color: AppColors.textSecondary)),
                Text(formatCfa(posting.pricePerSeat), style: const TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
