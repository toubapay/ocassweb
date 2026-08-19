import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/aas_insurance.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

const Map<String, Color> _statusColors = {
  'ACTIVE': AppColors.green,
  'ISSUING': AppColors.amber,
  'FAILED': AppColors.red,
  'CANCELLED': AppColors.textSecondary,
  'PENDING': AppColors.amber,
};

/// Mirrors pages/insurance/auto/policies.js: list of the user's AAS auto
/// policies with retry (only while FAILED and never issued an attestation)
/// and cancel (only while ACTIVE) actions.
class InsuranceAutoPoliciesScreen extends StatefulWidget {
  const InsuranceAutoPoliciesScreen({super.key});

  @override
  State<InsuranceAutoPoliciesScreen> createState() => _InsuranceAutoPoliciesScreenState();
}

class _InsuranceAutoPoliciesScreenState extends State<InsuranceAutoPoliciesScreen> {
  List<AasAutoPolicy> _policies = [];
  bool _loading = true;
  final Set<String> _busyIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    setState(() => _loading = true);
    try {
      final policies = await apiClient.fetchAasPolicies();
      if (!mounted) return;
      setState(() => _policies = policies);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _retry(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.retryAasPolicy(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('insurance.auto.retrySucceeded'))));
    } on DioException catch (e) {
      if (!mounted) return;
      final message = (e.response?.data as Map<String, dynamic>?)?['message'] as String?;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message ?? context.tr('insurance.auto.couldNotPurchase'))));
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
      await _load();
    }
  }

  Future<void> _cancel(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.cancelAasPolicy(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('insurance.auto.policyCancelled'))));
      await _load();
    } on DioException catch (e) {
      if (!mounted) return;
      final message = (e.response?.data as Map<String, dynamic>?)?['message'] as String?;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message ?? context.tr('insurance.auto.couldNotCancel'))));
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final authenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!authenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('insurance.auto.myPolicies'), showCart: false, showSearch: false),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(context.t('common.logInToContinue'), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.push('/auth/login'),
                  child: Text(context.t('common.logIn')),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: TopBar(title: context.t('insurance.auto.myPolicies'), showCart: false, showSearch: false),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            OutlinedButton(
              onPressed: () => context.push('/insurance/auto'),
              child: Text(context.t('insurance.auto.getNewQuote')),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: _loading
                  ? Center(child: Text(context.t('common.loading')))
                  : _policies.isEmpty
                      ? Center(child: Text(context.t('insurance.auto.noPolicies')))
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView(
                            children: _policies.map((p) {
                              final busy = _busyIds.contains(p.id);
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                    border: Border.all(color: AppColors.divider),
                                    borderRadius: BorderRadius.circular(14)),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text('${p.genre} - ${p.immatriculation}',
                                                  style: const TextStyle(fontWeight: FontWeight.w800)),
                                              Text(context.tOr('insurance.auto.tiers.${p.tier}', p.tier),
                                                  style: const TextStyle(
                                                      color: AppColors.textSecondary, fontSize: 12)),
                                            ],
                                          ),
                                        ),
                                        Chip(
                                          label: Text(
                                              context.tOr('insurance.auto.policyStatus.${p.status}', p.status),
                                              style: const TextStyle(color: Colors.white, fontSize: 11)),
                                          backgroundColor: _statusColors[p.status] ?? AppColors.textSecondary,
                                          visualDensity: VisualDensity.compact,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(formatCfa(p.premiumCharged ?? p.premiumEstimate),
                                        style: const TextStyle(color: AppColors.textSecondary)),
                                    if (p.linkAttestation != null) ...[
                                      const SizedBox(height: 6),
                                      GestureDetector(
                                        onTap: () => launchUrl(Uri.parse(p.linkAttestation!),
                                            mode: LaunchMode.externalApplication),
                                        child: Text(context.t('insurance.auto.viewAttestation'),
                                            style: const TextStyle(
                                                color: AppColors.green, fontWeight: FontWeight.w700)),
                                      ),
                                    ],
                                    if (p.fulfillmentError != null) ...[
                                      const SizedBox(height: 6),
                                      Text(p.fulfillmentError!,
                                          style: const TextStyle(color: AppColors.red, fontSize: 12)),
                                    ],
                                    if ((p.status == 'FAILED' && p.linkAttestation == null) ||
                                        p.status == 'ACTIVE') ...[
                                      const SizedBox(height: 8),
                                      Align(
                                        alignment: Alignment.centerRight,
                                        child: p.status == 'ACTIVE'
                                            ? TextButton(
                                                onPressed: busy ? null : () => _cancel(p.id),
                                                style: TextButton.styleFrom(foregroundColor: AppColors.red),
                                                child: Text(context.t('insurance.auto.cancelPolicy')),
                                              )
                                            : OutlinedButton(
                                                onPressed: busy ? null : () => _retry(p.id),
                                                child: Text(busy
                                                    ? context.t('common.loading')
                                                    : context.t('insurance.auto.retry')),
                                              ),
                                      ),
                                    ],
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
