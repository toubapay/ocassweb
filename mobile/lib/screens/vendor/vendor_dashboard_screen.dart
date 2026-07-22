import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../models/store.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/vendor/index.js: create-or-edit-store form, then once a
/// store exists, a summary card + links to product management and orders.
class VendorDashboardScreen extends StatefulWidget {
  const VendorDashboardScreen({super.key});

  @override
  State<VendorDashboardScreen> createState() => _VendorDashboardScreenState();
}

class _VendorDashboardScreenState extends State<VendorDashboardScreen> {
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _logoUrlController = TextEditingController();
  Store? _store;
  bool _loading = true;
  bool _editing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _logoUrlController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted || context.read<AuthProvider>().user?.role != 'VENDOR') return;
    setState(() => _loading = true);
    try {
      final store = await apiClient.fetchMyStore();
      if (!mounted) return;
      setState(() {
        _store = store;
        _nameController.text = store?.name ?? '';
        _addressController.text = store?.address ?? '';
        _logoUrlController.text = store?.logoUrl ?? '';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_nameController.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      final store = await apiClient.createVendorStore(
        name: _nameController.text.trim(),
        address: _addressController.text.trim(),
        logoUrl: _logoUrlController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _store = store;
        _editing = false;
      });
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('vendor.storeSaved'))));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('vendor.couldNotSaveStore'))));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;
    final isVendor = isAuthenticated && context.watch<AuthProvider>().user?.role == 'VENDOR';

    if (!isAuthenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('vendor.title'), showCart: false, showSearch: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('common.logInToContinue')),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => context.push('/auth/login'), child: Text(context.t('common.logIn'))),
            ],
          ),
        ),
      );
    }

    if (!isVendor) {
      return Scaffold(
        appBar: TopBar(title: context.t('vendor.title'), showCart: false, showSearch: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('profile.becomeVendor')),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => context.push('/profile'), child: Text(context.t('nav.profile'))),
            ],
          ),
        ),
      );
    }

    if (_loading) {
      return Scaffold(
        appBar: TopBar(title: context.t('vendor.title'), showCart: false, showSearch: false),
        body: Center(child: Text(context.t('common.loading'))),
      );
    }

    final showForm = _store == null || _editing;

    return Scaffold(
      appBar: TopBar(title: context.t('vendor.title'), showCart: false, showSearch: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (!showForm) ...[
            Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: AppColors.greenSoft,
                  backgroundImage: _store!.logoUrl != null ? NetworkImage(_store!.logoUrl!) : null,
                  child: _store!.logoUrl == null
                      ? const Icon(Icons.storefront_rounded, color: AppColors.green)
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_store!.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      if (_store!.address != null)
                        Text(_store!.address!, style: const TextStyle(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => _editing = true),
                  child: Text(context.t('vendor.editStore')),
                ),
              ],
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () => context.push('/vendor/products'),
              icon: const Icon(Icons.inventory_2_rounded),
              label: Align(
                  alignment: Alignment.centerLeft, child: Text(context.t('vendor.manageProducts'))),
              style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                  alignment: Alignment.centerLeft),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => context.push('/vendor/orders'),
              icon: const Icon(Icons.receipt_long_rounded),
              label:
                  Align(alignment: Alignment.centerLeft, child: Text(context.t('vendor.viewOrders'))),
              style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                  alignment: Alignment.centerLeft),
            ),
          ] else ...[
            Text(_store != null ? context.t('vendor.editStore') : context.t('vendor.createStoreTitle'),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            if (_store == null) ...[
              const SizedBox(height: 4),
              Text(context.t('vendor.createStoreSubtitle'),
                  style: const TextStyle(color: AppColors.textSecondary)),
            ],
            const SizedBox(height: 16),
            TextField(
                controller: _nameController,
                decoration: InputDecoration(labelText: context.t('vendor.storeName'))),
            const SizedBox(height: 12),
            TextField(
                controller: _addressController,
                decoration: InputDecoration(labelText: context.t('vendor.storeAddress'))),
            const SizedBox(height: 12),
            TextField(
                controller: _logoUrlController,
                decoration: InputDecoration(labelText: context.t('vendor.storeLogoUrl'))),
            const SizedBox(height: 20),
            Row(
              children: [
                if (_store != null)
                  TextButton(
                    onPressed: () => setState(() {
                      _editing = false;
                      _nameController.text = _store!.name;
                      _addressController.text = _store!.address ?? '';
                      _logoUrlController.text = _store!.logoUrl ?? '';
                    }),
                    child: Text(context.t('vendor.cancel')),
                  ),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    child: Text(_store != null ? context.t('vendor.saveChanges') : context.t('vendor.createStore')),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
