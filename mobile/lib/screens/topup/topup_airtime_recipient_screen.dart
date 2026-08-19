import 'package:flutter/material.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// A recently-topped-up number, shown in the "Favorites" section - just the
/// distinct phone numbers pulled from the user's own AIRTIME transaction
/// history (there's no separate "favorites" concept server-side), most
/// recent first.
class _FavoriteRecipient {
  final String phoneNumber;
  const _FavoriteRecipient(this.phoneNumber);
}

/// Step 1 of the Wave-style "Buy Airtime" flow: pick who you're topping up -
/// type a number directly, reuse a recent recipient, or pick a device
/// contact. Selecting any of these pushes topup_airtime_amount_screen with
/// the chosen phone number; the amount screen does its own operator
/// detection, so this screen never needs to know which network a number
/// belongs to.
class TopupAirtimeRecipientScreen extends StatefulWidget {
  const TopupAirtimeRecipientScreen({super.key});

  @override
  State<TopupAirtimeRecipientScreen> createState() => _TopupAirtimeRecipientScreenState();
}

class _TopupAirtimeRecipientScreenState extends State<TopupAirtimeRecipientScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  List<_FavoriteRecipient> _favorites = [];
  bool _loadingFavorites = true;

  List<Contact> _contacts = [];
  bool _loadingContacts = true;
  bool _contactsPermissionDenied = false;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() => _query = _searchController.text.trim()));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadFavorites();
      _loadContacts();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadFavorites() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) {
      setState(() => _loadingFavorites = false);
      return;
    }
    try {
      final transactions = await apiClient.fetchMyMobileTransactions();
      if (!mounted) return;
      final seen = <String>{};
      final favorites = <_FavoriteRecipient>[];
      for (final tx in transactions) {
        if (tx.type != 'AIRTIME') continue;
        final phone = tx.phoneNumber;
        if (phone == null || phone.isEmpty || !seen.add(phone)) continue;
        favorites.add(_FavoriteRecipient(phone));
        if (favorites.length >= 8) break;
      }
      setState(() => _favorites = favorites);
    } finally {
      if (mounted) setState(() => _loadingFavorites = false);
    }
  }

  Future<void> _loadContacts() async {
    try {
      final granted = await FlutterContacts.requestPermission();
      if (!mounted) return;
      if (!granted) {
        setState(() {
          _contactsPermissionDenied = true;
          _loadingContacts = false;
        });
        return;
      }
      final contacts = await FlutterContacts.getContacts(withProperties: true);
      if (!mounted) return;
      setState(() => _contacts = contacts.where((c) => c.phones.isNotEmpty).toList());
    } catch (_) {
      if (mounted) setState(() => _contactsPermissionDenied = true);
    } finally {
      if (mounted) setState(() => _loadingContacts = false);
    }
  }

  List<Contact> get _filteredContacts {
    if (_query.isEmpty) return _contacts;
    final q = _query.toLowerCase();
    final digits = _query.replaceAll(RegExp(r'[^0-9]'), '');
    return _contacts.where((c) {
      if (c.displayName.toLowerCase().contains(q)) return true;
      if (digits.isEmpty) return false;
      return c.phones.any((p) => p.number.replaceAll(RegExp(r'[^0-9]'), '').contains(digits));
    }).toList();
  }

  List<_FavoriteRecipient> get _filteredFavorites {
    if (_query.isEmpty) return _favorites;
    final digits = _query.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.isEmpty) return const [];
    return _favorites
        .where((f) => f.phoneNumber.replaceAll(RegExp(r'[^0-9]'), '').contains(digits))
        .toList();
  }

  void _selectPhone(String phone, {String? label}) {
    if (phone.trim().isEmpty) return;
    context.push('/topup/airtime/amount', extra: {'phone': phone.trim(), 'label': label});
  }

  void _buyForNewNumber() {
    final digits = _query.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length < 8) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('topup.airtime.invalidPhone'))));
      return;
    }
    _selectPhone(_query);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(title: context.t('topup.airtime.buyTitle'), showCart: false, showSearch: false),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _searchController,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              labelText: context.t('topup.airtime.toLabel'),
              prefixIcon: const Icon(Icons.search_rounded),
            ),
            onSubmitted: (_) => _buyForNewNumber(),
          ),
          const SizedBox(height: 16),
          InkWell(
            onTap: _buyForNewNumber,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 18,
                    backgroundColor: AppColors.green,
                    child: Icon(Icons.add_rounded, color: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  Text(context.t('topup.airtime.buyForNewNumber'),
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
          if (_filteredFavorites.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(context.t('topup.airtime.favorites'),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
            const SizedBox(height: 8),
            ..._filteredFavorites.map((f) => _RecipientRow(
                  label: f.phoneNumber,
                  subtitle: f.phoneNumber,
                  icon: Icons.history_rounded,
                  onTap: () => _selectPhone(f.phoneNumber),
                )),
          ] else if (!_loadingFavorites && _query.isEmpty) ...[
            const SizedBox(height: 20),
            Text(context.t('topup.airtime.favorites'),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
            const SizedBox(height: 8),
            Text(context.t('topup.airtime.noFavorites'),
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ],
          const SizedBox(height: 20),
          Text(context.t('topup.airtime.contacts'),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
          const SizedBox(height: 8),
          if (_loadingContacts)
            Text(context.t('common.loading'), style: const TextStyle(color: AppColors.textSecondary))
          else if (_contactsPermissionDenied)
            Text(context.t('topup.airtime.contactsPermissionDenied'),
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12))
          else if (_filteredContacts.isEmpty)
            Text(context.t('topup.airtime.noContactsFound'),
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12))
          else
            ..._filteredContacts.map((c) => _RecipientRow(
                  label: c.displayName,
                  subtitle: c.phones.first.number,
                  icon: Icons.person_rounded,
                  onTap: () => _selectPhone(c.phones.first.number, label: c.displayName),
                )),
        ],
      ),
    );
  }
}

class _RecipientRow extends StatelessWidget {
  final String label;
  final String subtitle;
  final IconData? icon;
  final VoidCallback onTap;

  const _RecipientRow({
    required this.label,
    required this.subtitle,
    this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.greenSoft,
              child: Icon(icon ?? Icons.person_rounded, color: AppColors.green, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
