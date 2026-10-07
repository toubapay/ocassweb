import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/format.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';

/// What the shop sold, what the platform kept, and what reached the
/// vendor's wallet - the Flutter half of VendorEarningsCard.js, and it
/// sits in the same place the web puts it: the vendor dashboard.
///
/// All three figures come from the backend, which reads the paid-out
/// total back from the VENDOR_SALE wallet transactions rather than
/// recomputing it, so this card cannot tell a vendor a different number
/// from the one in their wallet - which a second client-side calculation
/// eventually would.
///
/// The commission is its own line rather than the gap between two
/// numbers: a marketplace that takes a cut should say so on the screen
/// where the vendor looks at their money, and the rate is labelled with
/// where it came from, because an admin can set one for this shop alone.
class VendorEarningsCard extends StatefulWidget {
  const VendorEarningsCard({super.key});

  @override
  State<VendorEarningsCard> createState() => _VendorEarningsCardState();
}

class _VendorEarningsCardState extends State<VendorEarningsCard> {
  Map<String, dynamic>? _earnings;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    try {
      final earnings = await apiClient.fetchVendorEarnings();
      if (!mounted) return;
      setState(() => _earnings = earnings);
    } catch (_) {
      // Draws nothing rather than an error: the dashboard's own job is
      // the shop and its links, and a failed figure must not stand
      // between the vendor and those.
    }
  }

  @override
  Widget build(BuildContext context) {
    final e = _earnings;
    if (e == null) return const SizedBox.shrink();

    final commission = e['commissionFcfa'] as num? ?? 0;
    final payoutCount = (e['payoutCount'] as num? ?? 0).toInt();
    final fromShop = e['sharePercentSource'] == 'store';

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.greenSoft,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFCFEFDD)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(context.t('vendor.earnings.title'),
              style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          _line(context.t('vendor.earnings.gross'), formatCfa(e['grossFcfa'] as num? ?? 0)),
          // The minus is drawn only when there is something to subtract;
          // a shop with no sales yet read "- CFA 0", which is not a
          // deduction.
          _line(
            context.t('vendor.earnings.commission'),
            commission > 0 ? '- ${formatCfa(commission)}' : formatCfa(0),
            muted: true,
          ),
          _line(context.t('vendor.earnings.net'), formatCfa(e['earnedFcfa'] as num? ?? 0),
              strong: true),
          const SizedBox(height: 6),
          Text(
            payoutCount > 0
                ? context.tPlural('vendor.earnings.payouts', payoutCount)
                : context.t('vendor.earnings.noSalesYet'),
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5),
          ),
          Text(
            context.t(
              fromShop ? 'vendor.earnings.rateForShop' : 'vendor.earnings.ratePlatform',
              {'percent': '${e['sharePercent']}'},
            ),
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5),
          ),
        ],
      ),
    );
  }

  Widget _line(String label, String value, {bool strong = false, bool muted = false}) => Padding(
        padding: const EdgeInsets.only(bottom: 2),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: TextStyle(
                  color: muted ? AppColors.textSecondary : AppColors.textPrimary,
                  fontWeight: strong ? FontWeight.w800 : FontWeight.w500,
                )),
            Text(value, style: TextStyle(fontWeight: strong ? FontWeight.w800 : FontWeight.w600)),
          ],
        ),
      );
}
