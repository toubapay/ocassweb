import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/notifications_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/language_switcher.dart';
import '../../widgets/top_bar.dart';

const _links = [
  ('profile.links.wallet', Icons.account_balance_wallet_rounded, '/wallet'),
  ('profile.links.myOrders', Icons.receipt_long_rounded, '/ecommerce/orders'),
  ('profile.links.myFoodOrders', Icons.restaurant_rounded, '/restaurant/orders'),
  ('profile.links.myWishlist', Icons.favorite_rounded, '/ecommerce/wishlist'),
  ('profile.links.deliveryRequests', Icons.local_shipping_rounded, '/delivery'),
  ('profile.links.myRides', Icons.two_wheeler_rounded, '/ride-sharing'),
  ('profile.links.myInsurancePolicies', Icons.health_and_safety_rounded, '/insurance'),
  ('profile.links.topupsAndBills', Icons.sim_card_rounded, '/topup'),
];

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _updatingRole = false;

  Future<void> _changeRole(String role) async {
    setState(() => _updatingRole = true);
    try {
      await context.read<AuthProvider>().updateRole(role);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('profile.roleUpdated'))));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('profile.couldNotUpdateRole'))));
    } finally {
      if (mounted) setState(() => _updatingRole = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: TopBar(
            title: context.t('nav.profile'), showBack: false, showSearch: false, showCart: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('profile.notSignedIn'),
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.push('/auth/login'),
                child: Text(context.t('common.logIn')),
              ),
              const SizedBox(height: 16),
              const LanguageSwitcher(),
            ],
          ),
        ),
      );
    }

    final user = auth.user!;

    return Scaffold(
      appBar: TopBar(
          title: context.t('nav.profile'), showBack: false, showSearch: false, showCart: false),
      body: ListView(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.green,
                  child: Text(
                    (user.name?.isNotEmpty == true ? user.name! : user.phone)
                        .substring(0, 1)
                        .toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20),
                  ),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user.name ?? context.t('profile.defaultName'),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    Text(user.phone, style: const TextStyle(color: AppColors.textSecondary)),
                  ],
                ),
              ],
            ),
          ),
          ..._links.map((link) => ListTile(
                leading: Icon(link.$2, color: AppColors.green),
                title: Text(context.t(link.$1), style: const TextStyle(fontWeight: FontWeight.w600)),
                onTap: () => context.push(link.$3),
              )),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(context.t('profile.workSectionTitle'),
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, color: AppColors.textSecondary, fontSize: 13)),
                const SizedBox(height: 8),
                if (user.role == 'CUSTOMER')
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      OutlinedButton(
                        onPressed: _updatingRole ? null : () => _changeRole('DELIVERY_AGENT'),
                        child: Text(context.t('profile.becomeAgent')),
                      ),
                      OutlinedButton(
                        onPressed: _updatingRole ? null : () => _changeRole('RIDER'),
                        child: Text(context.t('profile.becomeRider')),
                      ),
                      OutlinedButton(
                        onPressed: _updatingRole ? null : () => _changeRole('VENDOR'),
                        child: Text(context.t('profile.becomeVendor')),
                      ),
                    ],
                  ),
                if (user.role == 'DELIVERY_AGENT')
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ElevatedButton(
                        onPressed: () => context.push('/delivery/agent'),
                        child: Text(context.t('profile.agentDashboard')),
                      ),
                      TextButton(
                        onPressed: _updatingRole ? null : () => _changeRole('CUSTOMER'),
                        child: Text(context.t('profile.stopGigWork')),
                      ),
                    ],
                  ),
                if (user.role == 'RIDER')
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ElevatedButton(
                        onPressed: () => context.push('/ride-sharing/driver'),
                        child: Text(context.t('profile.driverDashboard')),
                      ),
                      TextButton(
                        onPressed: _updatingRole ? null : () => _changeRole('CUSTOMER'),
                        child: Text(context.t('profile.stopGigWork')),
                      ),
                    ],
                  ),
                if (user.role == 'VENDOR')
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ElevatedButton(
                        onPressed: () => context.push('/vendor'),
                        child: Text(context.t('profile.vendorDashboard')),
                      ),
                      TextButton(
                        onPressed: _updatingRole ? null : () => _changeRole('CUSTOMER'),
                        child: Text(context.t('profile.stopGigWork')),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: AppColors.red),
            title: Text(context.t('profile.logOut'),
                style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.red)),
            onTap: () async {
              await context.read<AuthProvider>().logout();
              if (context.mounted) {
                context.read<CartProvider>().clear();
                context.read<WishlistProvider>().clear();
                context.read<NotificationsProvider>().clear();
                context.go('/');
              }
            },
          ),
          const LanguageSwitcher(),
        ],
      ),
    );
  }
}
