import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../models/wallet.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

const _quickAmounts = [1000, 5000, 10000, 25000];

const Map<String, String> _typeLabels = {
  'TOPUP': 'Top-up',
  'PAYMENT': 'Payment',
  'REFUND': 'Refund',
  'ADJUSTMENT': 'Adjustment',
};

/// Mirrors pages/wallet/index.js: balance card, a top-up dialog that starts
/// a PayDunya invoice and opens it in the device browser (same reasoning as
/// checkout_screen.dart - no in-app return path for PayDunya's hosted
/// checkout), and the transaction ledger.
class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  Wallet? _wallet;
  List<WalletTransaction> _transactions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    // _load()'s first line calls setState - deferring to a post-frame
    // callback avoids Flutter's "setState() called during build" assertion
    // that would fire from calling it synchronously within initState.
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        apiClient.fetchWallet(),
        apiClient.fetchWalletTransactions(),
      ]);
      if (!mounted) return;
      setState(() {
        _wallet = results[0] as Wallet;
        _transactions = results[1] as List<WalletTransaction>;
      });
    } catch (_) {
      // Leave prior state in place - the balance card just shows "..." if
      // this is the first load and it failed.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// showModalBottomSheet's content lives in the Navigator's overlay, not
  /// in _WalletScreenState's own widget subtree, so setState() on this
  /// State object would not rebuild it. The "starting..." button state is
  /// therefore tracked entirely inside _showTopUpSheet's own closure and
  /// driven via the sheet's StatefulBuilder setSheetState.
  Future<void> _startTopUp(double amount) async {
    try {
      final paymentUrl = await apiClient.topUpWallet(amount);
      if (!mounted) return;
      Navigator.of(context).pop();
      if (paymentUrl != null) {
        await launchUrl(Uri.parse(paymentUrl), mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Could not start top-up')));
      rethrow;
    }
  }

  void _showTopUpSheet() {
    final controller = TextEditingController();
    // Declared here (not inside StatefulBuilder's builder) so it survives
    // across the sheet's rebuilds instead of resetting to false on every
    // setSheetState call.
    bool starting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
        ),
        child: StatefulBuilder(
          builder: (sheetContext, setSheetState) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Top up wallet', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _quickAmounts
                    .map((amt) => ChoiceChip(
                          label: Text(formatCfa(amt)),
                          selected: controller.text == amt.toString(),
                          onSelected: (_) => setSheetState(() => controller.text = amt.toString()),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount (CFA)', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: starting
                      ? null
                      : () async {
                          final value = double.tryParse(controller.text);
                          if (value == null || value <= 0) {
                            ScaffoldMessenger.of(context)
                                .showSnackBar(const SnackBar(content: Text('Enter a valid amount')));
                            return;
                          }
                          setSheetState(() => starting = true);
                          try {
                            await _startTopUp(value);
                          } catch (_) {
                            setSheetState(() => starting = false);
                          }
                        },
                  child: Text(starting ? 'Starting...' : 'Continue to payment'),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!isAuthenticated) {
      return Scaffold(
        appBar: const TopBar(title: 'Wallet', showCart: false, showSearch: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Log in to see your wallet.'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.push('/auth/login'),
                child: const Text('Log in'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: const TopBar(title: 'Wallet', showCart: false, showSearch: false),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.green, AppColors.greenDark],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.account_balance_wallet_rounded, color: Colors.white),
                      SizedBox(width: 8),
                      Text('Wallet balance', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _loading && _wallet == null ? '...' : formatCfa(_wallet?.balance ?? 0),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 30),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.green,
                    ),
                    onPressed: _showTopUpSheet,
                    child: const Text('Top up wallet', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Transaction history', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 12),
            if (!_loading && _transactions.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('No transactions yet.', style: TextStyle(color: AppColors.textSecondary)),
              ),
            ..._transactions.map((tx) {
              final isCredit = tx.isCredit;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.divider),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: isCredit ? AppColors.greenSoft : AppColors.redSoft,
                      child: Icon(
                        isCredit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                        color: isCredit ? AppColors.green : AppColors.red,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tx.description?.isNotEmpty == true
                                ? tx.description!
                                : (_typeLabels[tx.type] ?? tx.type),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          Text(
                            '${tx.createdAt.toLocal()}'.split('.').first,
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${isCredit ? '+' : '-'}${formatCfa(tx.amount)}',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: isCredit ? AppColors.green : AppColors.red,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
