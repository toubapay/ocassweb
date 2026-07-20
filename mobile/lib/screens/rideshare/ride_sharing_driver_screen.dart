import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/ride_request.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/ride-sharing/driver.js: Available/My-rides tabs, race-safe
/// accept, then walking an accepted ride through start -> complete.
class RideSharingDriverScreen extends StatefulWidget {
  const RideSharingDriverScreen({super.key});

  @override
  State<RideSharingDriverScreen> createState() => _RideSharingDriverScreenState();
}

class _RideSharingDriverScreenState extends State<RideSharingDriverScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  List<RideRequest> _available = [];
  List<RideRequest> _mine = [];
  bool _loadingAvailable = true;
  bool _loadingMine = true;
  final Set<String> _busyIds = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAll());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    if (!mounted || context.read<AuthProvider>().user?.role != 'RIDER') return;
    setState(() {
      _loadingAvailable = true;
      _loadingMine = true;
    });
    final results = await Future.wait([
      apiClient.fetchAvailableRideJobs(),
      apiClient.fetchMyRideJobs(),
    ]);
    if (!mounted) return;
    setState(() {
      _available = results[0];
      _mine = results[1];
      _loadingAvailable = false;
      _loadingMine = false;
    });
  }

  Future<void> _accept(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.acceptRideJob(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.driver.accepted'))));
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.driver.alreadyTaken'))));
      await _loadAll();
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  Future<void> _start(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.startRideJob(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.driver.startedToast'))));
      await _loadAll();
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  Future<void> _complete(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.completeRideJob(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('rideSharing.driver.completedToast'))));
      await _loadAll();
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;
    final isRider = isAuthenticated && context.watch<AuthProvider>().user?.role == 'RIDER';

    if (!isAuthenticated) {
      return Scaffold(
        appBar:
            TopBar(title: context.t('rideSharing.driver.title'), showCart: false, showSearch: false),
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

    if (!isRider) {
      return Scaffold(
        appBar:
            TopBar(title: context.t('rideSharing.driver.title'), showCart: false, showSearch: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('profile.becomeRider')),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => context.push('/profile'), child: Text(context.t('nav.profile'))),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: TopBar(title: context.t('rideSharing.driver.title'), showCart: false, showSearch: false),
      body: Column(
        children: [
          TabBar(
            controller: _tabController,
            labelColor: AppColors.blue,
            unselectedLabelColor: AppColors.textSecondary,
            indicatorColor: AppColors.blue,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700),
            tabs: [
              Tab(text: context.t('rideSharing.driver.availableTab')),
              Tab(text: context.t('rideSharing.driver.myJobsTab')),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [_buildAvailable(), _buildMine()],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvailable() {
    if (_loadingAvailable) {
      return Center(child: Text(context.t('common.loading')));
    }
    if (_available.isEmpty) {
      return Center(child: Text(context.t('rideSharing.driver.noAvailable')));
    }
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _available.map((ride) {
          final busy = _busyIds.contains(ride.id);
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${ride.pickupAddress} → ${ride.dropoffAddress}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                        '${context.tOr('rideSharing.vehicles.${ride.vehicleType}', ride.vehicleType)} · ${formatCfa(ride.priceEstimate)}',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.blue),
                      onPressed: busy ? null : () => _accept(ride.id),
                      child: Text(context.t('rideSharing.driver.accept')),
                    ),
                  ],
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildMine() {
    if (_loadingMine) {
      return Center(child: Text(context.t('common.loading')));
    }
    if (_mine.isEmpty) {
      return Center(child: Text(context.t('rideSharing.driver.noMyJobs')));
    }
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _mine.map((ride) {
          final busy = _busyIds.contains(ride.id);
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                        child: Text('${ride.pickupAddress} → ${ride.dropoffAddress}',
                            style: const TextStyle(fontWeight: FontWeight.w700))),
                    Chip(
                        label: Text(context.tOr('rideSharing.status.${ride.status}', ride.status)),
                        visualDensity: VisualDensity.compact),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                        '${context.tOr('rideSharing.vehicles.${ride.vehicleType}', ride.vehicleType)} · ${formatCfa(ride.priceEstimate)}',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    if (ride.status == 'ACCEPTED')
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.blue),
                        onPressed: busy ? null : () => _start(ride.id),
                        child: Text(context.t('rideSharing.driver.start')),
                      ),
                    if (ride.status == 'IN_PROGRESS')
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.green),
                        onPressed: busy ? null : () => _complete(ride.id),
                        child: Text(context.t('rideSharing.driver.complete')),
                      ),
                  ],
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
