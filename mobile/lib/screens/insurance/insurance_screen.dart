import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../models/insurance.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

const _categories = ['HEALTH', 'AUTO', 'HOME', 'TRAVEL', 'LIFE'];

class InsuranceScreen extends StatefulWidget {
  const InsuranceScreen({super.key});

  @override
  State<InsuranceScreen> createState() => _InsuranceScreenState();
}

class _InsuranceScreenState extends State<InsuranceScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  late Future<List<InsurancePlan>> _plansFuture;
  List<InsurancePolicy> _policies = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _categories.length, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() => _plansFuture = apiClient.fetchInsurancePlans(category: _categories[_tabController.index]));
      }
    });
    _plansFuture = apiClient.fetchInsurancePlans(category: _categories.first);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadPolicies());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadPolicies() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    final policies = await apiClient.fetchInsurancePolicies();
    if (mounted) setState(() => _policies = policies);
  }

  Future<void> _subscribe(InsurancePlan plan) async {
    if (!context.read<AuthProvider>().isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Log in to subscribe')));
      context.push('/auth/login');
      return;
    }
    try {
      await apiClient.subscribeInsurancePlan(plan.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Subscribed! Your policy is pending activation.')));
      await _loadPolicies();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not subscribe')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const TopBar(title: 'Insurance', showBack: false, showSearch: false, showCart: false),
      body: Column(
        children: [
          TabBar(
            controller: _tabController,
            isScrollable: true,
            labelColor: AppColors.green,
            unselectedLabelColor: AppColors.textSecondary,
            indicatorColor: AppColors.green,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700),
            tabs: _categories
                .map((c) => Tab(text: c[0] + c.substring(1).toLowerCase()))
                .toList(),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                FutureBuilder<List<InsurancePlan>>(
                  future: _plansFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    final plans = snapshot.data ?? const <InsurancePlan>[];
                    if (plans.isEmpty) {
                      return const Text('No plans in this category yet.',
                          style: TextStyle(color: AppColors.textSecondary));
                    }
                    return Column(
                      children: plans
                          .map((plan) => Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  border: Border.all(color: AppColors.divider),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(plan.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                                    Text(plan.provider,
                                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                                    if (plan.description != null) ...[
                                      const SizedBox(height: 8),
                                      Text(plan.description!,
                                          style: const TextStyle(color: AppColors.textSecondary)),
                                    ],
                                    const SizedBox(height: 12),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text('${formatCfa(plan.premiumMonthly)}/mo',
                                                style: const TextStyle(fontWeight: FontWeight.w800)),
                                            Text('Coverage up to ${formatCfa(plan.coverageAmount)}',
                                                style:
                                                    const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                                          ],
                                        ),
                                        OutlinedButton(
                                          onPressed: () => _subscribe(plan),
                                          child: const Text('Subscribe'),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ))
                          .toList(),
                    );
                  },
                ),
                if (_policies.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text('My policies', style: TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),
                  ..._policies.map((policy) => Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                            border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(12)),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(policy.plan.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                            Chip(label: Text(policy.status), visualDensity: VisualDensity.compact),
                          ],
                        ),
                      )),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
