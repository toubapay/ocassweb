import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Reached via the ocass://payments/cancel deep link when the customer
/// backs out of PayDunya's hosted checkout instead of completing it -
/// mirrors pages/payments/cancel.js.
class PaymentCancelledScreen extends StatelessWidget {
  const PaymentCancelledScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(title: context.t('payments.title'), showCart: false, showSearch: false),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cancel_rounded, size: 56, color: AppColors.textSecondary),
              const SizedBox(height: 16),
              Text(context.t('payments.cancelled'),
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 8),
              Text(context.t('payments.cancelledSubtitle'),
                  textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go('/ecommerce/cart'),
                child: Text(context.t('payments.backToCart')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
