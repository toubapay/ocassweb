import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/notifications_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/otp_input.dart';

class VerifyScreen extends StatefulWidget {
  final String phone;
  const VerifyScreen({super.key, required this.phone});

  @override
  State<VerifyScreen> createState() => _VerifyScreenState();
}

class _VerifyScreenState extends State<VerifyScreen> {
  String _code = '';
  final _nameController = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (_code.length != 6) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('auth.verify.enterCode'))));
      return;
    }
    setState(() => _loading = true);
    try {
      final name = _nameController.text.trim();
      final user = await context
          .read<AuthProvider>()
          .verifyOtp(widget.phone, _code, name: name.isEmpty ? null : name);

      if (!mounted) return;
      // Cart/wishlist are server-side per user; refresh now that we're signed in.
      await Future.wait([
        context.read<CartProvider>().fetch(),
        context.read<WishlistProvider>().fetch(),
      ]);
      context.read<NotificationsProvider>().startPolling();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.tr('auth.verify.welcome',
              {'name': user.name != null ? ', ${user.name}' : ''}))));
      context.go('/');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('auth.verify.invalidCode'))));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    try {
      final devCode = await context.read<AuthProvider>().requestOtp(widget.phone);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(devCode != null
              ? context.tr('auth.verify.devOtp', {'code': devCode})
              : context.tr('auth.verify.codeResent'))));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('auth.verify.couldNotResend'))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.t('auth.verify.title'),
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(context.t('auth.verify.subtitle', {'phone': widget.phone}),
                  style: const TextStyle(color: Colors.grey)),
              const SizedBox(height: 32),
              OtpInput(onChanged: (value) => _code = value),
              const SizedBox(height: 24),
              TextField(
                controller: _nameController,
                decoration: InputDecoration(labelText: context.t('auth.verify.nameLabel')),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _verify,
                  child: Text(_loading
                      ? context.t('auth.verify.verifying')
                      : context.t('auth.verify.verify')),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                    onPressed: _resend, child: Text(context.t('auth.verify.resendCode'))),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
