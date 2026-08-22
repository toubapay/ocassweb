import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../constants/delivery_package_types.dart';
import '../../core/api_client.dart';
import '../../core/geo.dart';
import '../../l10n/app_localizations.dart';
import '../../models/delivery_package_type.dart';
import '../../models/delivery_request.dart';
import '../../providers/auth_provider.dart';
import '../../providers/locale_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/delivery_distance_price_card.dart';
import '../../widgets/live_tracking_map.dart';
import '../../widgets/top_bar.dart';

const _steps = ['REQUESTED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'];
const _pollInterval = Duration(seconds: 5);

/// Dart port of pages/delivery/track/[id].js: polls GET
/// /delivery/requests/:id every 5s and feeds pickup/dropoff/agent
/// coordinates into LiveTrackingMap, same as the web version's
/// refetchInterval-based polling.
class DeliveryTrackScreen extends StatefulWidget {
  final String requestId;
  const DeliveryTrackScreen({super.key, required this.requestId});

  @override
  State<DeliveryTrackScreen> createState() => _DeliveryTrackScreenState();
}

class _DeliveryTrackScreenState extends State<DeliveryTrackScreen> {
  DeliveryRequest? _request;
  bool _loading = true;
  bool _notFound = false;
  Timer? _pollTimer;
  List<DeliveryPackageType> _packageTypes = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load();
      _pollTimer = Timer.periodic(_pollInterval, (_) => _load());
      _loadPackageTypes();
    });
  }

  // Includes deactivated types too, so a request whose type was later
  // retired by an admin still resolves a real label/icon here.
  Future<void> _loadPackageTypes() async {
    try {
      final packageTypes = await apiClient.fetchDeliveryPackageTypes();
      if (mounted) setState(() => _packageTypes = packageTypes);
    } catch (_) {
      // Badge just stays hidden if this never loads.
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    try {
      final request = await apiClient.fetchDeliveryRequest(widget.requestId);
      if (mounted) setState(() => _request = request);
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
        appBar: TopBar(title: context.t('delivery.tracking.title'), showCart: false, showSearch: false),
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
        appBar: TopBar(title: context.t('delivery.tracking.title'), showCart: false, showSearch: false),
        body: Center(child: Text(context.t('delivery.tracking.notFound'))),
      );
    }

    if (_loading || _request == null) {
      return Scaffold(
        appBar: TopBar(title: context.t('delivery.tracking.title'), showCart: false, showSearch: false),
        body: Center(child: Text(context.t('common.loading'))),
      );
    }

    final request = _request!;
    final pickup = request.pickupLat != null ? (request.pickupLat!, request.pickupLng!) : null;
    final dropoff = request.dropoffLat != null ? (request.dropoffLat!, request.dropoffLng!) : null;
    final agent = request.agentLat != null ? (request.agentLat!, request.agentLng!) : null;
    final distanceAwayKm =
        agent != null && dropoff != null ? haversineDistanceKm(agent.$1, agent.$2, dropoff.$1, dropoff.$2) : null;
    final stepIndex = request.status == 'CANCELLED' ? -1 : _steps.indexOf(request.status);
    final language = context.watch<LocaleProvider>().language;
    DeliveryPackageType? packageType;
    for (final p in _packageTypes) {
      if (p.key == request.packageType) {
        packageType = p;
        break;
      }
    }

    return Scaffold(
      appBar: TopBar(title: context.t('delivery.tracking.title'), showCart: false, showSearch: false),
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
                    color: i <= stepIndex ? AppColors.green : Colors.grey.shade300,
                  ),
                ),
                if (i < _steps.length - 1)
                  Expanded(
                    child: Container(height: 2, color: i < stepIndex ? AppColors.green : Colors.grey.shade300),
                  ),
              ],
              const SizedBox(width: 8),
              Text(context.tOr('delivery.status.${request.status}', request.status),
                  style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
          ),
          if (packageType != null) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: Builder(builder: (context) {
                final colors = packageTypeColor(packageType!.colorKey);
                return Chip(
                  avatar: Icon(packageTypeIcon(packageType.icon), size: 16, color: colors.color),
                  label: Text(packageType.label(language),
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                  visualDensity: VisualDensity.compact,
                  backgroundColor: Colors.white,
                  shape: StadiumBorder(side: BorderSide(color: Colors.grey.shade400, style: BorderStyle.solid)),
                );
              }),
            ),
          ],
          const SizedBox(height: 12),
          LiveTrackingMap(pickup: pickup, dropoff: dropoff, agent: agent, height: 240),
          const SizedBox(height: 16),
          if (request.assignedAgent == null && request.status == 'REQUESTED')
            Chip(label: Text(context.t('delivery.tracking.waitingForAgent')))
          else if (request.assignedAgent != null)
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
                          context.t('delivery.tracking.agentAssigned',
                              {'name': request.assignedAgent!.name ?? request.assignedAgent!.phone ?? ''}),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        if (distanceAwayKm != null)
                          Text(
                            context.t('delivery.tracking.distanceAway', {'km': distanceAwayKm.toStringAsFixed(1)}),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          ),
                      ],
                    ),
                  ),
                  if (request.assignedAgent!.phone != null)
                    OutlinedButton.icon(
                      onPressed: () => launchUrl(Uri.parse('tel:${request.assignedAgent!.phone}')),
                      icon: const Icon(Icons.phone_rounded, size: 16),
                      label: Text(context.t('delivery.tracking.callAgent')),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('delivery.pickupAddress'), style: const TextStyle(color: AppColors.textSecondary)),
              Flexible(
                child: Text(request.pickupAddress,
                    textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('delivery.dropoffAddress'), style: const TextStyle(color: AppColors.textSecondary)),
              Flexible(
                child: Text(request.dropoffAddress,
                    textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          if (request.receiverName != null) ...[
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(context.t('delivery.tracking.receiver'), style: const TextStyle(color: AppColors.textSecondary)),
                Text('${request.receiverName} · ${request.receiverPhone ?? ''}',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
          ],
          const SizedBox(height: 12),
          DeliveryDistancePriceCard(distanceKm: request.distanceKm, priceEstimate: request.priceEstimate),
        ],
      ),
    );
  }
}
