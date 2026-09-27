import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../models/payment_status.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

class _Destination {
  final String labelKey;
  final String href;
  final String confirmedTextKey;
  const _Destination({required this.labelKey, required this.href, required this.confirmedTextKey});
}

const _destinations = {
  'WALLET_TOPUP': _Destination(labelKey: 'payments.viewWallet', href: '/wallet', confirmedTextKey: 'payments.walletCredited'),
};
const _defaultDestination =
    _Destination(labelKey: 'payments.viewOrders', href: '/ecommerce/orders', confirmedTextKey: 'payments.orderConfirmed');

/// Reached via the ocass://payments/return deep link PayDunya's hosted
/// checkout sends the device back to (see app.dart's AppLinks listener and
/// paydunya.service.js's mobile return_url) - mirrors
/// pages/payments/return.js exactly: never trust the redirect alone, poll
/// the backend (which re-confirms with PayDunya) a few times before giving
/// up. Shared by every PayDunya-backed flow on mobile since PayDunya only
/// takes one return_url per invoice.
class PaymentReturnScreen extends StatefulWidget {
  final String? token;

  const PaymentReturnScreen({super.key, required this.token});

  @override
  State<PaymentReturnScreen> createState() => _PaymentReturnScreenState();
}

enum _Status { checking, completed, pending, failed }

class _PaymentReturnScreenState extends State<PaymentReturnScreen> {
  _Status _status = _Status.checking;
  int _attempts = 0;
  PaymentStatus? _payment;
  Timer? _retryTimer;

  @override
  void initState() {
    super.initState();
    if (widget.token == null || widget.token!.isEmpty) {
      _status = _Status.failed;
    } else {
      _poll();
    }
  }

  @override
  void dispose() {
    _retryTimer?.cancel();
    super.dispose();
  }

  Future<void> _poll() async {
    try {
      final result = await apiClient.fetchPaymentStatus(widget.token!);
      if (!mounted) return;
      setState(() => _payment = result);
      if (result.status == 'COMPLETED') {
        setState(() => _status = _Status.completed);
      } else if (result.status == 'CANCELLED' || result.status == 'FAILED') {
        setState(() => _status = _Status.failed);
      } else if (_attempts < 4) {
        // PayDunya's IPN can lag behind the customer's device redirect -
        // retry a few times before giving up and asking them to check later.
        _retryTimer = Timer(const Duration(seconds: 2), () {
          if (!mounted) return;
          setState(() => _attempts++);
          _poll();
        });
      } else {
        setState(() => _status = _Status.pending);
      }
    } catch (_) {
      if (mounted) setState(() => _status = _Status.failed);
    }
  }

  _Destination get _destination => _destinations[_payment?.purpose] ?? _defaultDestination;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(title: context.t('payments.title'), showCart: false, showSearch: false),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: _buildContent(context),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildContent(BuildContext context) {
    switch (_status) {
      case _Status.checking:
        return [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(context.t('payments.confirming'), style: const TextStyle(fontWeight: FontWeight.w700)),
        ];
      case _Status.completed:
        return [
          const Icon(Icons.check_circle_rounded, size: 56, color: AppColors.green),
          const SizedBox(height: 16),
          Text(context.t('payments.successful'),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          const SizedBox(height: 8),
          Text(context.t(_destination.confirmedTextKey),
              textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => context.go(_destination.href),
            child: Text(context.t(_destination.labelKey)),
          ),
        ];
      case _Status.pending:
        return [
          const Icon(Icons.hourglass_top_rounded, size: 56, color: AppColors.amber),
          const SizedBox(height: 16),
          Text(context.t('payments.stillProcessing'),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          const SizedBox(height: 8),
          Text(context.t('payments.notReceivedYet'),
              textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => context.go(_destination.href),
            child: Text(context.t(_destination.labelKey)),
          ),
        ];
      case _Status.failed:
        final backHref = _payment?.purpose == 'WALLET_TOPUP' ? '/wallet' : '/ecommerce/cart';
        final backLabelKey = _payment?.purpose == 'WALLET_TOPUP' ? 'payments.backToWallet' : 'payments.backToCart';
        return [
          const Icon(Icons.error_rounded, size: 56, color: AppColors.red),
          const SizedBox(height: 16),
          Text(context.t('payments.notCompleted'),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          const SizedBox(height: 8),
          Text(context.t('payments.notCompletedSubtitle'),
              textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => context.go(backHref),
            child: Text(context.t(backLabelKey)),
          ),
        ];
    }
  }
}
