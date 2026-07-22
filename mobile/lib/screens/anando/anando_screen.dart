import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/ride_posting.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/anando/index.js: Available / My rides / My bookings tabs
/// for the peer-to-peer carpooling module.
class AnandoScreen extends StatefulWidget {
  const AnandoScreen({super.key});

  @override
  State<AnandoScreen> createState() => _AnandoScreenState();
}

class _AnandoScreenState extends State<AnandoScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  List<RidePosting> _available = [];
  List<RidePosting> _mine = [];
  List<RideBooking> _bookings = [];
  bool _loading = true;
  final Set<String> _busyIds = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAll());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    setState(() => _loading = true);
    final results = await Future.wait([
      apiClient.fetchAvailablePostings(),
      apiClient.fetchMyPostings(),
      apiClient.fetchMyBookings(),
    ]);
    if (!mounted) return;
    setState(() {
      _available = results[0] as List<RidePosting>;
      _mine = results[1] as List<RidePosting>;
      _bookings = results[2] as List<RideBooking>;
      _loading = false;
    });
  }

  Future<void> _cancelPosting(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.cancelPosting(id);
      await _loadAll();
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  Future<void> _cancelBooking(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.cancelBooking(id);
      await _loadAll();
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!isAuthenticated) {
      return Scaffold(
        appBar: TopBar(title: 'Anando', showBack: false, showSearch: false, showCart: false),
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

    return Scaffold(
      appBar: TopBar(title: 'Anando', showBack: false, showSearch: false, showCart: false),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.pink,
        onPressed: () => context.push('/anando/post').then((_) => _loadAll()),
        icon: const Icon(Icons.add_rounded),
        label: Text(context.t('anando.postRide')),
      ),
      body: Column(
        children: [
          TabBar(
            controller: _tabController,
            labelColor: AppColors.pink,
            unselectedLabelColor: AppColors.textSecondary,
            indicatorColor: AppColors.pink,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700),
            tabs: [
              Tab(text: context.t('anando.tabs.available')),
              Tab(text: context.t('anando.tabs.mine')),
              Tab(text: context.t('anando.tabs.bookings')),
            ],
          ),
          Expanded(
            child: _loading
                ? Center(child: Text(context.t('common.loading')))
                : TabBarView(
                    controller: _tabController,
                    children: [_buildAvailable(), _buildMine(), _buildBookings()],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _card({required Widget child}) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(12)),
        child: child,
      );

  Widget _buildAvailable() {
    if (_available.isEmpty) {
      return Center(child: Text(context.t('anando.noPostings')));
    }
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _available.map((p) {
          final seatsLabel = context.tPlural('anando.seatsLeft', p.seatsAvailable);
          return _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${p.originAddress} → ${p.destinationAddress}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(
                  p.driver?.name ?? p.driver?.phone ?? '',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                ),
                Text(
                  p.isInstant
                      ? context.t('anando.leavingNow')
                      : '${p.departureAt.toLocal()}'.split('.').first,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(seatsLabel, style: const TextStyle(fontSize: 12, color: AppColors.pink)),
                        if (p.pricePerSeat != null)
                          Text(context.t('anando.perSeat', {'amount': formatCfa(p.pricePerSeat)}),
                              style: const TextStyle(fontWeight: FontWeight.w700)),
                      ],
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.pink),
                      onPressed: () =>
                          context.push('/anando/book', extra: p).then((_) => _loadAll()),
                      child: Text(context.t('anando.book')),
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
    if (_mine.isEmpty) {
      return Center(child: Text(context.t('anando.noMyPostings')));
    }
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _mine.map((p) {
          final busy = _busyIds.contains(p.id);
          return _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                        child: Text('${p.originAddress} → ${p.destinationAddress}',
                            style: const TextStyle(fontWeight: FontWeight.w700))),
                    Chip(
                        label: Text(context.tOr('anando.status.${p.status}', p.status)),
                        visualDensity: VisualDensity.compact),
                  ],
                ),
                Text('${p.seatsAvailable}/${p.seatsTotal} ${context.t('anando.seatsWord')}',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                if (p.status == 'OPEN')
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: busy ? null : () => _cancelPosting(p.id),
                      style: TextButton.styleFrom(foregroundColor: AppColors.red),
                      child: Text(context.t('anando.cancel')),
                    ),
                  ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildBookings() {
    if (_bookings.isEmpty) {
      return Center(child: Text(context.t('anando.noBookings')));
    }
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _bookings.map((b) {
          final busy = _busyIds.contains(b.id);
          final route = b.posting != null
              ? '${b.posting!.originAddress} → ${b.posting!.destinationAddress}'
              : '—';
          return _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(route, style: const TextStyle(fontWeight: FontWeight.w700))),
                    Chip(
                        label: Text(b.status == 'CONFIRMED'
                            ? context.t('common.confirmed')
                            : context.t('common.cancelled')),
                        visualDensity: VisualDensity.compact),
                  ],
                ),
                Text('${b.seatsBooked} × ${context.t('anando.pay.${b.paymentMethod}')}',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                if (b.status == 'CONFIRMED')
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: busy ? null : () => _cancelBooking(b.id),
                      style: TextButton.styleFrom(foregroundColor: AppColors.red),
                      child: Text(context.t('anando.cancel')),
                    ),
                  ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
