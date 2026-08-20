import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/mobile_fee_quote.dart';
import '../../models/mobile_forfait.dart';
import '../../models/mobile_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

final NumberFormat _groupFormat = NumberFormat.decimalPattern('en_US');

const _categoryColors = [
  Color(0xFFFFF3E0),
  Color(0xFFE3F2FD),
  Color(0xFFE8F5E9),
  Color(0xFFF3E5F5),
  Color(0xFFFCE4EC),
];

List<MapEntry<String, List<MobileForfait>>> _groupByCategory(List<MobileForfait> forfaits) {
  final order = <String>[];
  final byCategory = <String, List<MobileForfait>>{};
  for (final f in forfaits) {
    if (!byCategory.containsKey(f.category)) {
      order.add(f.category);
      byCategory[f.category] = [];
    }
    byCategory[f.category]!.add(f);
  }
  return order.map((c) => MapEntry(c, byCategory[c]!)).toList();
}

/// Step 2 of the Wave-style "Buy Airtime" flow: a recipient card (with the
/// operator auto-detected server-side, same as the old inline form did),
/// a mode toggle between a custom amount (entered via an on-screen numeric
/// keypad, mirroring the reference design) and the existing forfait
/// catalog, and a confirm sheet before either purchase actually fires.
class TopupAirtimeAmountScreen extends StatefulWidget {
  final String phoneNumber;
  final String? label;

  const TopupAirtimeAmountScreen({super.key, required this.phoneNumber, this.label});

  @override
  State<TopupAirtimeAmountScreen> createState() => _TopupAirtimeAmountScreenState();
}

class _TopupAirtimeAmountScreenState extends State<TopupAirtimeAmountScreen> {
  MobileService? _service;
  bool _detecting = true;
  String _mode = 'amount'; // 'amount' | 'packages'
  String _digits = '';
  bool _submitting = false;
  String? _buyingForfaitId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _detectOperator());
  }

  Future<void> _detectOperator() async {
    try {
      final service = await apiClient.detectOperator(widget.phoneNumber);
      if (mounted) setState(() => _service = service);
    } finally {
      if (mounted) setState(() => _detecting = false);
    }
  }

  double get _amount => _digits.isEmpty ? 0 : double.parse(_digits);

  void _tapDigit(String digit) {
    if (_digits.length >= 9) return;
    setState(() => _digits += digit);
  }

  void _backspace() {
    if (_digits.isEmpty) return;
    setState(() => _digits = _digits.substring(0, _digits.length - 1));
  }

  Future<void> _confirmAndBuyAmount() async {
    if (_amount <= 0) return;
    final service = _service;
    if (service == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.airtime.selectOperator'))));
      return;
    }
    final confirmed = await _showConfirmSheet(serviceId: service.id, amount: _amount);
    if (confirmed != true || !mounted) return;
    setState(() => _submitting = true);
    try {
      final tx = await apiClient.createTopup(
        serviceId: service.id,
        phoneNumber: widget.phoneNumber,
        amount: _amount,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.tr('topup.airtime.success', {'reference': tx.reference}))));
      context.go('/topup');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.airtime.failed'))));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _confirmAndBuyForfait(MobileForfait forfait) async {
    final confirmed = await _showConfirmSheet(forfaitId: forfait.id);
    if (confirmed != true || !mounted) return;
    setState(() => _buyingForfaitId = forfait.id);
    try {
      final tx = await apiClient.createForfaitTopup(
        forfaitId: forfait.id,
        phoneNumber: widget.phoneNumber,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.tr('topup.airtime.success', {'reference': tx.reference}))));
      context.go('/topup');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.airtime.failed'))));
    } finally {
      if (mounted) setState(() => _buyingForfaitId = null);
    }
  }

  /// Fetches the real fee/TVA-inclusive quote before showing the total, so
  /// this sheet never displays a number different from what actually gets
  /// charged - mirrors pages/topup/airtime/amount.js's confirm dialog.
  Future<bool?> _showConfirmSheet({String? serviceId, String? forfaitId, double? amount}) {
    return showModalBottomSheet<bool>(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) => FutureBuilder<MobileFeeQuote>(
        future: apiClient.fetchMobileFeeQuote(
          serviceId: serviceId,
          forfaitId: forfaitId,
          amount: amount,
        ),
        builder: (context, snapshot) {
          final quote = snapshot.data;
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(sheetContext.t('topup.airtime.confirmTitle'),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                    IconButton(
                      onPressed: () => Navigator.of(sheetContext).pop(false),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(sheetContext.t('topup.airtime.phoneNumber'),
                        style: const TextStyle(color: AppColors.textSecondary)),
                    Text(widget.phoneNumber, style: const TextStyle(fontWeight: FontWeight.w700)),
                  ],
                ),
                if (quote != null && (quote.feeAmount > 0 || quote.taxAmount > 0)) ...[
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(sheetContext.t('topup.airtime.subtotal'),
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                      Text(formatCfa(quote.subtotal), style: const TextStyle(fontSize: 13)),
                    ],
                  ),
                  if (quote.feeAmount > 0) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(sheetContext.t('topup.airtime.fee'),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                        Text(formatCfa(quote.feeAmount), style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  ],
                  if (quote.taxAmount > 0) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(sheetContext.t('topup.airtime.tva'),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                        Text(formatCfa(quote.taxAmount), style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  ],
                ],
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(sheetContext.t('topup.airtime.total'),
                        style: const TextStyle(color: AppColors.textSecondary)),
                    Text(
                      quote == null ? sheetContext.t('common.loading') : formatCfa(quote.total),
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: quote == null ? null : () => Navigator.of(sheetContext).pop(true),
                    child: Text(sheetContext.t('topup.airtime.confirm')),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(title: context.t('topup.airtime.buyTitle'), showCart: false, showSearch: false),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: AppColors.greenSoft,
                  backgroundImage:
                      _service?.logoUrl != null ? NetworkImage(_service!.logoUrl!) : null,
                  child: _service?.logoUrl == null
                      ? const Icon(Icons.sim_card_rounded, color: AppColors.green)
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.label ?? widget.phoneNumber,
                          style: const TextStyle(fontWeight: FontWeight.w800)),
                      Text(
                        _detecting
                            ? context.t('common.loading')
                            : (_service?.name ?? widget.phoneNumber),
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: Text(context.t('topup.airtime.customTab')),
                  selected: _mode == 'amount',
                  onSelected: (_) => setState(() => _mode = 'amount'),
                  selectedColor: AppColors.green,
                  labelStyle: TextStyle(
                    color: _mode == 'amount' ? Colors.white : AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                ChoiceChip(
                  label: Text(context.t('topup.airtime.forfaitsTab')),
                  selected: _mode == 'packages',
                  onSelected: (_) => setState(() => _mode = 'packages'),
                  selectedColor: AppColors.green,
                  labelStyle: TextStyle(
                    color: _mode == 'packages' ? Colors.white : AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _mode == 'amount' ? _buildAmountMode(context) : _buildPackagesMode(context),
          ),
        ],
      ),
    );
  }

  Widget _buildAmountMode(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(context.t('topup.airtime.amountLabel'),
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                const SizedBox(height: 8),
                Text(
                  _digits.isEmpty ? '0' : _groupFormat.format(int.parse(_digits)),
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 40),
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _amount > 0 && !_submitting ? _confirmAndBuyAmount : null,
              child: Text(_submitting
                  ? context.t('topup.airtime.processing')
                  : context.t('topup.airtime.topUp')),
            ),
          ),
        ),
        const SizedBox(height: 12),
        _buildKeypad(),
      ],
    );
  }

  Widget _buildKeypad() {
    final rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'back'],
    ];
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        children: rows
            .map((row) => Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: row.map((key) {
                    if (key.isEmpty) return const SizedBox(width: 72, height: 56);
                    if (key == 'back') {
                      return SizedBox(
                        width: 72,
                        height: 56,
                        child: IconButton(
                          onPressed: _backspace,
                          icon: const Icon(Icons.backspace_outlined),
                        ),
                      );
                    }
                    return SizedBox(
                      width: 72,
                      height: 56,
                      child: TextButton(
                        onPressed: () => _tapDigit(key),
                        child: Text(key, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600)),
                      ),
                    );
                  }).toList(),
                ))
            .toList(),
      ),
    );
  }

  Widget _buildPackagesMode(BuildContext context) {
    if (_detecting) {
      return Center(
          child: Text(context.t('common.loading'), style: const TextStyle(color: AppColors.textSecondary)));
    }
    final service = _service;
    if (service == null) {
      return Center(
          child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(context.t('topup.airtime.forfaits.selectOperatorFirst'),
            textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
      ));
    }
    return FutureBuilder<List<MobileForfait>>(
      key: ValueKey(service.id),
      future: apiClient.fetchMobileForfaits(service.id),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(
              child: Text(context.t('topup.airtime.forfaits.loading'),
                  style: const TextStyle(color: AppColors.textSecondary)));
        }
        final forfaits = snapshot.data ?? const <MobileForfait>[];
        if (forfaits.isEmpty) {
          return Center(
              child: Text(context.t('topup.airtime.forfaits.empty'),
                  style: const TextStyle(color: AppColors.textSecondary)));
        }
        final groups = _groupByCategory(forfaits);
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            for (var i = 0; i < groups.length; i++) ...[
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: _categoryColors[i % _categoryColors.length],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(groups[i].key, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
              ),
              ...groups[i].value.map(_buildForfaitCard),
              const SizedBox(height: 12),
            ],
          ],
        );
      },
    );
  }

  Widget _buildForfaitCard(MobileForfait forfait) {
    final buying = _buyingForfaitId == forfait.id;
    final details = [
      if (forfait.callMinutesLabel != null)
        '${context.t('topup.airtime.forfaits.calls')}: ${forfait.callMinutesLabel}',
      if (forfait.internetLabel != null)
        '${context.t('topup.airtime.forfaits.internet')}: ${forfait.internetLabel}',
    ].join(' · ');
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration:
          BoxDecoration(border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${forfait.name} · ${formatCfa(forfait.price)}',
                    style: const TextStyle(fontWeight: FontWeight.w800)),
                if (details.isNotEmpty)
                  Text(details, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                Text('${context.t('topup.airtime.forfaits.validity')}: ${forfait.validityLabel}',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: buying ? null : () => _confirmAndBuyForfait(forfait),
            child: Text(buying
                ? context.t('topup.airtime.forfaits.buying')
                : context.t('topup.airtime.forfaits.buy')),
          ),
        ],
      ),
    );
  }
}
