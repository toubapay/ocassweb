import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
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
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('insurance.loginToSubscribe'))));
      context.push('/auth/login');
      return;
    }
    try {
      await apiClient.subscribeInsurancePlan(plan.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('insurance.subscribed'))));
      await _loadPolicies();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('insurance.couldNotSubscribe'))));
    }
  }

  Future<void> _cancelPolicy(InsurancePolicy policy) async {
    try {
      await apiClient.cancelInsurancePolicy(policy.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('insurance.policyCancelled'))));
      await _loadPolicies();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('insurance.couldNotCancel'))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(
          title: context.t('insurance.title'), showBack: false, showSearch: false, showCart: false),
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
                .map((c) => Tab(text: context.t('insurance.categories.$c')))
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
                      return Text(context.t('insurance.noPlans'),
                          style: const TextStyle(color: AppColors.textSecondary));
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
                                            Text(
                                                context.t('insurance.perMonth',
                                                    {'amount': formatCfa(plan.premiumMonthly)}),
                                                style: const TextStyle(fontWeight: FontWeight.w800)),
                                            Text(
                                                context.t('insurance.coverageUpTo',
                                                    {'amount': formatCfa(plan.coverageAmount)}),
                                                style:
                                                    const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                                          ],
                                        ),
                                        OutlinedButton(
                                          onPressed: () => _subscribe(plan),
                                          child: Text(context.t('insurance.subscribe')),
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
                  Text(context.t('insurance.myPolicies'), style: const TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),
                  ..._policies.map((policy) => Container(
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
                                Text(policy.plan.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                Chip(
                                    label: Text(
                                        context.tOr('insurance.policyStatus.${policy.status}', policy.status)),
                                    visualDensity: VisualDensity.compact),
                              ],
                            ),
                            if (policy.status == 'PENDING' || policy.status == 'ACTIVE')
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: () => _cancelPolicy(policy),
                                  style: TextButton.styleFrom(
                                    foregroundColor: AppColors.red,
                                    minimumSize: Size.zero,
                                    padding: EdgeInsets.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: Text(context.t('insurance.cancel'),
                                      style: const TextStyle(fontWeight: FontWeight.w700)),
                                ),
                              ),
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
