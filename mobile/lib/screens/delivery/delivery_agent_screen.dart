import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/delivery_request.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/delivery/agent.js: Available/My-jobs tabs, race-safe
/// accept (a 409 here just means another agent got there first), then
/// walking an accepted job through picked up -> delivered.
class DeliveryAgentScreen extends StatefulWidget {
  const DeliveryAgentScreen({super.key});

  @override
  State<DeliveryAgentScreen> createState() => _DeliveryAgentScreenState();
}

class _DeliveryAgentScreenState extends State<DeliveryAgentScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  List<DeliveryRequest> _available = [];
  List<DeliveryRequest> _mine = [];
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
    if (!mounted || context.read<AuthProvider>().user?.role != 'DELIVERY_AGENT') return;
    setState(() {
      _loadingAvailable = true;
      _loadingMine = true;
    });
    final results = await Future.wait([
      apiClient.fetchAvailableDeliveryJobs(),
      apiClient.fetchMyDeliveryJobs(),
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
      await apiClient.acceptDeliveryJob(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.agent.accepted'))));
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.agent.alreadyTaken'))));
      await _loadAll();
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  Future<void> _markPickedUp(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.markDeliveryPickedUp(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.agent.pickedUpToast'))));
      await _loadAll();
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  Future<void> _markDelivered(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.markDeliveryDelivered(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.agent.deliveredToast'))));
      await _loadAll();
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;
    final isAgent = isAuthenticated && context.watch<AuthProvider>().user?.role == 'DELIVERY_AGENT';

    if (!isAuthenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('delivery.agent.title'), showCart: false, showSearch: false),
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

    if (!isAgent) {
      return Scaffold(
        appBar: TopBar(title: context.t('delivery.agent.title'), showCart: false, showSearch: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('profile.becomeAgent')),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => context.push('/profile'), child: Text(context.t('nav.profile'))),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: TopBar(title: context.t('delivery.agent.title'), showCart: false, showSearch: false),
      body: Column(
        children: [
          TabBar(
            controller: _tabController,
            labelColor: AppColors.green,
            unselectedLabelColor: AppColors.textSecondary,
            indicatorColor: AppColors.green,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700),
            tabs: [
              Tab(text: context.t('delivery.agent.availableTab')),
              Tab(text: context.t('delivery.agent.myJobsTab')),
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
      return Center(child: Text(context.t('delivery.agent.noAvailable')));
    }
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _available.map((job) {
          final busy = _busyIds.contains(job.id);
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${job.pickupAddress} → ${job.dropoffAddress}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                        context.t('delivery.estimate', {'amount': formatCfa(job.priceEstimate)}),
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    ElevatedButton(
                      onPressed: busy ? null : () => _accept(job.id),
                      child: Text(context.t('delivery.agent.accept')),
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
      return Center(child: Text(context.t('delivery.agent.noMyJobs')));
    }
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _mine.map((job) {
          final busy = _busyIds.contains(job.id);
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
                        child: Text('${job.pickupAddress} → ${job.dropoffAddress}',
                            style: const TextStyle(fontWeight: FontWeight.w700))),
                    Chip(
                        label: Text(context.tOr('delivery.status.${job.status}', job.status)),
                        visualDensity: VisualDensity.compact),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                        context.t('delivery.estimate', {'amount': formatCfa(job.priceEstimate)}),
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    if (job.status == 'ACCEPTED')
                      ElevatedButton(
                        onPressed: busy ? null : () => _markPickedUp(job.id),
                        child: Text(context.t('delivery.agent.markPickedUp')),
                      ),
                    if (job.status == 'PICKED_UP')
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.green),
                        onPressed: busy ? null : () => _markDelivered(job.id),
                        child: Text(context.t('delivery.agent.markDelivered')),
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
