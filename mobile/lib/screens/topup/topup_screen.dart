import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:flutter_contacts/flutter_contacts.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/mobile_service.dart';
import '../../models/mobile_transaction.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

const _quickAirtimeAmounts = [500, 1000, 2000, 5000, 10000];
const _quickBillAmounts = [1000, 5000, 10000, 20000];

const Map<String, Color> _statusColors = {
  'SUCCESS': AppColors.green,
  'PENDING': AppColors.amber,
  'FAILED': AppColors.red,
};

/// Mirrors pages/topup/index.js: an Airtime tab (manual entry or device
/// contact picker, auto-detected operator, quick amounts) and a Bill
/// Payment tab (biller list, account number, amount), plus a shared
/// transaction history. Operators/billers are fetched from the backend
/// catalog, never hardcoded here.
class TopupScreen extends StatefulWidget {
  const TopupScreen({super.key, this.initialTab});

  /// 'airtime' or 'bill' - set when navigated to from the home screen's
  /// separate Airtime / Bills tiles so the right tab opens directly.
  final String? initialTab;

  @override
  State<TopupScreen> createState() => _TopupScreenState();
}

class _TopupScreenState extends State<TopupScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  final _phoneController = TextEditingController(text: '+221');
  final _airtimeAmountController = TextEditingController();
  String? _airtimeServiceId;
  double? _airtimeAmount;
  Timer? _detectDebounce;
  bool _detecting = false;

  String? _billServiceId;
  final _accountController = TextEditingController();
  final _billAmountController = TextEditingController();
  double? _billAmount;

  List<MobileTransaction> _transactions = [];
  bool _submittingAirtime = false;
  bool _submittingBill = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTab == 'bill' ? 1 : 0,
    );
    _phoneController.addListener(_onPhoneChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadTransactions());
  }

  @override
  void dispose() {
    _tabController.dispose();
    _phoneController.removeListener(_onPhoneChanged);
    _phoneController.dispose();
    _airtimeAmountController.dispose();
    _accountController.dispose();
    _billAmountController.dispose();
    _detectDebounce?.cancel();
    super.dispose();
  }

  Future<void> _loadTransactions() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    final transactions = await apiClient.fetchMyMobileTransactions();
    if (mounted) setState(() => _transactions = transactions);
  }

  void _onPhoneChanged() {
    _detectDebounce?.cancel();
    final digits = _phoneController.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length < 8) return;
    _detectDebounce = Timer(const Duration(milliseconds: 400), () async {
      setState(() => _detecting = true);
      try {
        final service = await apiClient.detectOperator(_phoneController.text);
        if (mounted && service != null) {
          setState(() => _airtimeServiceId = service.id);
        }
      } finally {
        if (mounted) setState(() => _detecting = false);
      }
    });
  }

  /// Opens the native contact picker. flutter_contacts' showPicker() does
  /// not require the broad READ_CONTACTS permission since it delegates to
  /// the system picker UI - if that assumption doesn't hold on your
  /// installed package version, this is the first place to check after
  /// `flutter analyze` (see mobile/README.md).
  Future<void> _pickContact() async {
    try {
      final contact = await FlutterContacts.native.showPicker(properties: {ContactProperty.phone});
      final phone = contact?.phones.isNotEmpty == true ? contact!.phones.first.number : null;
      if (phone != null && phone.isNotEmpty) {
        _phoneController.text = phone;
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.airtime.couldNotAccessContacts'))));
    }
  }

  void _requireLogin(VoidCallback action) {
    if (!context.read<AuthProvider>().isAuthenticated) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.loginToContinue'))));
      context.push('/auth/login');
      return;
    }
    action();
  }

  Future<void> _submitTopup() async {
    if (_airtimeServiceId == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.airtime.selectOperator'))));
      return;
    }
    final digits = _phoneController.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length < 8) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.airtime.invalidPhone'))));
      return;
    }
    if (_airtimeAmount == null || _airtimeAmount! <= 0) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.airtime.enterAmount'))));
      return;
    }
    _requireLogin(() async {
      setState(() => _submittingAirtime = true);
      try {
        final tx = await apiClient.createTopup(
          serviceId: _airtimeServiceId!,
          phoneNumber: _phoneController.text,
          amount: _airtimeAmount!,
        );
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(context.tr('topup.airtime.success', {'reference': tx.reference}))));
        setState(() => _airtimeAmount = null);
        _airtimeAmountController.clear();
        await _loadTransactions();
      } catch (_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(context.tr('topup.airtime.failed'))));
      } finally {
        if (mounted) setState(() => _submittingAirtime = false);
      }
    });
  }

  Future<void> _submitBillPayment() async {
    if (_billServiceId == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.bill.selectBiller'))));
      return;
    }
    if (_accountController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.bill.enterAccountNumber'))));
      return;
    }
    if (_billAmount == null || _billAmount! <= 0) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.bill.enterAmount'))));
      return;
    }
    _requireLogin(() async {
      setState(() => _submittingBill = true);
      try {
        final tx = await apiClient.createBillPayment(
          serviceId: _billServiceId!,
          accountNumber: _accountController.text.trim(),
          amount: _billAmount!,
        );
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(context.tr('topup.bill.success', {'reference': tx.reference}))));
        _billAmountController.clear();
        setState(() {
          _accountController.clear();
          _billAmount = null;
        });
        await _loadTransactions();
      } catch (_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(context.tr('topup.bill.failed'))));
      } finally {
        if (mounted) setState(() => _submittingBill = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(
          title: context.t('topup.title'), showBack: false, showSearch: false, showCart: false),
      body: Column(
        children: [
          TabBar(
            controller: _tabController,
            labelColor: AppColors.green,
            unselectedLabelColor: AppColors.textSecondary,
            indicatorColor: AppColors.green,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700),
            tabs: [Tab(text: context.t('topup.airtimeTab')), Tab(text: context.t('topup.billTab'))],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [_buildAirtimeTab(), _buildBillTab()],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAirtimeTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(context.t('topup.airtime.heading'),
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: context.t('topup.airtime.phoneNumber'),
                  suffixIcon: _detecting
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                        )
                      : null,
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _pickContact,
              tooltip: context.t('topup.airtime.chooseFromContacts'),
              icon: const Icon(Icons.contact_phone_rounded),
              style: IconButton.styleFrom(backgroundColor: AppColors.greenSoft, foregroundColor: AppColors.green),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(context.t('topup.airtime.operator'),
            style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w700, fontSize: 11)),
        const SizedBox(height: 8),
        FutureBuilder<List<MobileService>>(
          future: apiClient.fetchMobileServices(type: 'AIRTIME'),
          builder: (context, snapshot) {
            final operators = snapshot.data ?? const <MobileService>[];
            return Wrap(
              spacing: 8,
              runSpacing: 8,
              children: operators.map((op) {
                final selected = _airtimeServiceId == op.id;
                return ChoiceChip(
                  label: Text(op.name),
                  selected: selected,
                  onSelected: (_) => setState(() => _airtimeServiceId = op.id),
                  selectedColor: AppColors.green,
                  labelStyle: TextStyle(
                    color: selected ? Colors.white : AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                );
              }).toList(),
            );
          },
        ),
        const SizedBox(height: 20),
        Text(context.t('topup.airtime.amount'),
            style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w700, fontSize: 11)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _quickAirtimeAmounts.map((amt) {
            final selected = _airtimeAmount == amt.toDouble();
            return ChoiceChip(
              label: Text(formatCfa(amt)),
              selected: selected,
              onSelected: (_) => setState(() {
                _airtimeAmount = amt.toDouble();
                _airtimeAmountController.text = amt.toString();
              }),
              selectedColor: AppColors.green,
              labelStyle: TextStyle(
                color: selected ? Colors.white : AppColors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        TextField(
          keyboardType: TextInputType.number,
          decoration: InputDecoration(labelText: context.t('topup.airtime.amountLabel')),
          controller: _airtimeAmountController,
          onChanged: (value) => _airtimeAmount = double.tryParse(value),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _submittingAirtime ? null : _submitTopup,
          child: Text(_submittingAirtime
              ? context.t('topup.airtime.processing')
              : context.t('topup.airtime.topUp')),
        ),
        if (_transactions.isNotEmpty) _buildHistory(),
      ],
    );
  }

  Widget _buildBillTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(context.t('topup.bill.heading'),
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 16),
        Text(context.t('topup.bill.biller'),
            style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w700, fontSize: 11)),
        const SizedBox(height: 8),
        FutureBuilder<List<MobileService>>(
          future: apiClient.fetchMobileServices(type: 'BILL'),
          builder: (context, snapshot) {
            final billers = snapshot.data ?? const <MobileService>[];
            return Column(
              children: billers.map((biller) {
                final selected = _billServiceId == biller.id;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    onTap: () => setState(() => _billServiceId = biller.id),
                    tileColor: selected ? AppColors.greenSoft : null,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: selected ? AppColors.green : AppColors.divider),
                    ),
                    leading: CircleAvatar(
                      backgroundImage: biller.logoUrl != null ? NetworkImage(biller.logoUrl!) : null,
                    ),
                    title: Text(biller.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(biller.billCategory ?? ''),
                    trailing: selected ? const Icon(Icons.check_circle_rounded, color: AppColors.green) : null,
                  ),
                );
              }).toList(),
            );
          },
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _accountController,
          decoration: InputDecoration(labelText: context.t('topup.bill.accountNumber')),
        ),
        const SizedBox(height: 20),
        Text(context.t('topup.bill.amount'),
            style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w700, fontSize: 11)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _quickBillAmounts.map((amt) {
            final selected = _billAmount == amt.toDouble();
            return ChoiceChip(
              label: Text(formatCfa(amt)),
              selected: selected,
              onSelected: (_) => setState(() {
                _billAmount = amt.toDouble();
                _billAmountController.text = amt.toString();
              }),
              selectedColor: AppColors.green,
              labelStyle: TextStyle(
                color: selected ? Colors.white : AppColors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        TextField(
          keyboardType: TextInputType.number,
          decoration: InputDecoration(labelText: context.t('topup.bill.amountLabel')),
          controller: _billAmountController,
          onChanged: (value) => _billAmount = double.tryParse(value),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _submittingBill ? null : _submitBillPayment,
          child: Text(_submittingBill
              ? context.t('topup.bill.processing')
              : context.t('topup.bill.payBill')),
        ),
        if (_transactions.isNotEmpty) _buildHistory(),
      ],
    );
  }

  Widget _buildHistory() {
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(context.t('topup.recentTransactions'), style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          ..._transactions.map((tx) => Container(
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
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 14,
                              backgroundImage:
                                  tx.service.logoUrl != null ? NetworkImage(tx.service.logoUrl!) : null,
                            ),
                            const SizedBox(width: 8),
                            Text(tx.service.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                          ],
                        ),
                        Chip(
                          label: Text(context.tOr('topup.transactionStatus.${tx.status}', tx.status),
                              style: const TextStyle(fontSize: 11, color: Colors.white)),
                          backgroundColor: _statusColors[tx.status] ?? AppColors.textSecondary,
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    Text(
                      '${tx.phoneNumber ?? tx.accountNumber ?? ''} · ${formatCfa(tx.amount)} · ${tx.reference}',
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}
