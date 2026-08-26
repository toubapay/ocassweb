import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../models/restaurant.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/restaurant/manage/index.js: create-or-edit-restaurant
/// form, then once a restaurant exists, a summary card + links to menu
/// and order management. No pitch/onboarding page like the web app's
/// register.js - "Add your restaurant" in profile.js sets the role, then
/// this screen shows the create form directly, same simplification
/// vendor onboarding already uses in this app.
class RestaurantManageScreen extends StatefulWidget {
  const RestaurantManageScreen({super.key});

  @override
  State<RestaurantManageScreen> createState() => _RestaurantManageScreenState();
}

class _RestaurantManageScreenState extends State<RestaurantManageScreen> {
  final _nameController = TextEditingController();
  final _cuisineController = TextEditingController();
  final _addressController = TextEditingController();
  final _logoUrlController = TextEditingController();
  Restaurant? _restaurant;
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
    _cuisineController.dispose();
    _addressController.dispose();
    _logoUrlController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted || context.read<AuthProvider>().user?.restaurant == null) return;
    setState(() => _loading = true);
    try {
      final restaurant = await apiClient.fetchMyRestaurant();
      if (!mounted) return;
      setState(() {
        _restaurant = restaurant;
        _nameController.text = restaurant?.name ?? '';
        _cuisineController.text = restaurant?.cuisine ?? '';
        _addressController.text = restaurant?.address ?? '';
        _logoUrlController.text = restaurant?.logoUrl ?? '';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_nameController.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      final restaurant = _restaurant == null
          ? await apiClient.createMyRestaurant(
              name: _nameController.text.trim(),
              cuisine: _cuisineController.text.trim(),
              address: _addressController.text.trim(),
              logoUrl: _logoUrlController.text.trim(),
            )
          : await apiClient.updateMyRestaurant(
              name: _nameController.text.trim(),
              cuisine: _cuisineController.text.trim(),
              address: _addressController.text.trim(),
              logoUrl: _logoUrlController.text.trim(),
            );
      if (!mounted) return;
      setState(() {
        _restaurant = restaurant;
        _editing = false;
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('restaurant.couldNotSaveRestaurant'))));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;
    // Restaurant ownership, not the self-serve `role` toggle, is what
    // actually gates access server-side (see requireRestaurantOwner) - an
    // owner who later also becomes e.g. a rider keeps their dashboard.
    final isOwner = isAuthenticated && context.watch<AuthProvider>().user?.restaurant != null;

    if (!isAuthenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('restaurant.manage.title'), showCart: false, showSearch: false),
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

    if (!isOwner) {
      return Scaffold(
        appBar: TopBar(title: context.t('restaurant.manage.title'), showCart: false, showSearch: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('profile.becomeRestaurantOwner')),
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
        appBar: TopBar(title: context.t('restaurant.manage.title'), showCart: false, showSearch: false),
        body: Center(child: Text(context.t('common.loading'))),
      );
    }

    final showForm = _restaurant == null || _editing;

    return Scaffold(
      appBar: TopBar(title: context.t('restaurant.manage.title'), showCart: false, showSearch: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (!showForm) ...[
            Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: AppColors.greenSoft,
                  backgroundImage:
                      _restaurant!.logoUrl != null ? NetworkImage(_restaurant!.logoUrl!) : null,
                  child: _restaurant!.logoUrl == null
                      ? const Icon(Icons.restaurant_rounded, color: AppColors.green)
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_restaurant!.name,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      if (_restaurant!.address != null)
                        Text(_restaurant!.address!, style: const TextStyle(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => _editing = true),
                  child: Text(context.t('restaurant.manage.editRestaurant')),
                ),
              ],
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () => context.push('/restaurant/manage/items'),
              icon: const Icon(Icons.restaurant_menu_rounded),
              label:
                  Align(alignment: Alignment.centerLeft, child: Text(context.t('restaurant.manage.manageMenu'))),
              style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                  alignment: Alignment.centerLeft),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => context.push('/restaurant/manage/orders'),
              icon: const Icon(Icons.receipt_long_rounded),
              label:
                  Align(alignment: Alignment.centerLeft, child: Text(context.t('restaurant.manage.viewOrders'))),
              style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                  alignment: Alignment.centerLeft),
            ),
          ] else ...[
            Text(
              _restaurant != null
                  ? context.t('restaurant.manage.editRestaurant')
                  : context.t('restaurant.manage.createTitle'),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
            if (_restaurant == null) ...[
              const SizedBox(height: 4),
              Text(context.t('restaurant.manage.createSubtitle'),
                  style: const TextStyle(color: AppColors.textSecondary)),
            ],
            const SizedBox(height: 16),
            TextField(
                controller: _nameController,
                decoration: InputDecoration(labelText: context.t('vendor.storeName'))),
            const SizedBox(height: 12),
            TextField(
                controller: _cuisineController,
                decoration: InputDecoration(labelText: context.t('restaurant.cuisine'))),
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
                if (_restaurant != null)
                  TextButton(
                    onPressed: () => setState(() {
                      _editing = false;
                      _nameController.text = _restaurant!.name;
                      _cuisineController.text = _restaurant!.cuisine ?? '';
                      _addressController.text = _restaurant!.address ?? '';
                      _logoUrlController.text = _restaurant!.logoUrl ?? '';
                    }),
                    child: Text(context.t('vendor.cancel')),
                  ),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    child: Text(_restaurant != null
                        ? context.t('vendor.saveChanges')
                        : context.t('restaurant.manage.createRestaurant')),
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
