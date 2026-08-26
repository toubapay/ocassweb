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

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _Badge {
  final String label;
  final Color background;
  final Color foreground;

  _Badge({required this.label, required this.background, required this.foreground});
}

class _ProfileLink {
  final String label;
  final IconData icon;
  final String href;

  _ProfileLink({required this.label, required this.icon, required this.href});
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
    // Store/restaurant ownership is independent of the self-serve `role`
    // toggle below (see server/src/middleware/auth.js requireStoreOwner) -
    // someone who owns a store keeps their "Commerçant" badge and "My
    // boutique" link even after switching their active role to e.g.
    // DELIVERY_AGENT, since the two are no longer the same flag. This is
    // what makes "client + vendor + livreur" all show at once instead of
    // forcing a single mutually-exclusive hat.
    final hasStore = user.store != null;
    final hasRestaurant = user.restaurant != null;
    final isAgent = user.role == 'DELIVERY_AGENT';
    final isRider = user.role == 'RIDER';
    final isAdmin = user.role == 'ADMIN';

    final badges = <_Badge>[
      _Badge(label: context.t('profile.badges.client'), background: AppColors.divider, foreground: AppColors.textSecondary),
      if (hasStore)
        _Badge(label: context.t('profile.badges.vendor'), background: AppColors.greenSoft, foreground: AppColors.greenDark),
      if (hasRestaurant)
        _Badge(label: context.t('profile.badges.restaurant'), background: AppColors.amberSoft, foreground: AppColors.amber),
      if (isAgent)
        _Badge(label: context.t('profile.badges.agent'), background: AppColors.blueSoft, foreground: AppColors.blue),
      if (isRider)
        _Badge(label: context.t('profile.badges.rider'), background: AppColors.purpleSoft, foreground: AppColors.purple),
      if (isAdmin)
        _Badge(label: context.t('profile.badges.admin'), background: AppColors.redSoft, foreground: AppColors.red),
    ];

    final links = <_ProfileLink>[
      _ProfileLink(label: context.t('profile.links.wallet'), icon: Icons.account_balance_wallet_rounded, href: '/wallet'),
      if (hasStore)
        _ProfileLink(label: context.t('profile.links.myBoutique'), icon: Icons.storefront_rounded, href: '/vendor'),
      if (hasRestaurant)
        _ProfileLink(
            label: context.t('profile.links.myRestaurant'), icon: Icons.restaurant_menu_rounded, href: '/restaurant/manage'),
      if (isAgent) ...[
        _ProfileLink(label: context.t('profile.agentDashboard'), icon: Icons.local_shipping_rounded, href: '/delivery/agent'),
        _ProfileLink(
            label: context.t('profile.links.myDeliveryJobs'),
            icon: Icons.history_rounded,
            href: '/delivery/agent?tab=mine'),
      ],
      if (isRider) ...[
        _ProfileLink(
            label: context.t('profile.driverDashboard'), icon: Icons.directions_car_filled_rounded, href: '/ride-sharing/driver'),
        _ProfileLink(
            label: context.t('profile.links.myDriverTrips'),
            icon: Icons.history_rounded,
            href: '/ride-sharing/driver?tab=mine'),
      ],
      _ProfileLink(label: context.t('profile.links.myOrders'), icon: Icons.receipt_long_rounded, href: '/ecommerce/orders'),
      _ProfileLink(label: context.t('profile.links.myFoodOrders'), icon: Icons.restaurant_rounded, href: '/restaurant/orders'),
      _ProfileLink(label: context.t('profile.links.myWishlist'), icon: Icons.favorite_rounded, href: '/ecommerce/wishlist'),
      _ProfileLink(label: context.t('profile.links.deliveryRequests'), icon: Icons.local_shipping_rounded, href: '/delivery'),
      _ProfileLink(label: context.t('profile.links.myRides'), icon: Icons.two_wheeler_rounded, href: '/ride-sharing'),
      _ProfileLink(
          label: context.t('profile.links.myInsurancePolicies'), icon: Icons.health_and_safety_rounded, href: '/insurance'),
      _ProfileLink(label: context.t('profile.links.topupsAndBills'), icon: Icons.sim_card_rounded, href: '/topup'),
    ];

    return Scaffold(
      appBar: TopBar(
          title: context.t('nav.profile'), showBack: false, showSearch: false, showCart: false),
      body: ListView(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
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
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.name ?? context.t('profile.defaultName'),
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      Text(user.phone, style: const TextStyle(color: AppColors.textSecondary)),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: badges
                            .map((badge) => Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: badge.background,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    badge.label,
                                    style: TextStyle(
                                        color: badge.foreground, fontWeight: FontWeight.w700, fontSize: 12),
                                  ),
                                ))
                            .toList(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          ...links.map((link) => ListTile(
                leading: Icon(link.icon, color: AppColors.green),
                title: Text(link.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                onTap: () => context.push(link.href),
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
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (!hasStore)
                      OutlinedButton(
                        onPressed: () => context.push('/vendor/register'),
                        child: Text(context.t('profile.becomeVendor')),
                      ),
                    if (!hasRestaurant)
                      OutlinedButton(
                        onPressed: () => context.push('/restaurant/register'),
                        child: Text(context.t('profile.becomeRestaurantOwner')),
                      ),
                    if (!isAgent)
                      OutlinedButton(
                        onPressed: _updatingRole ? null : () => _changeRole('DELIVERY_AGENT'),
                        child: Text(context.t('profile.becomeAgent')),
                      ),
                    if (!isRider)
                      OutlinedButton(
                        onPressed: _updatingRole ? null : () => _changeRole('RIDER'),
                        child: Text(context.t('profile.becomeRider')),
                      ),
                    if (isAgent || isRider)
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
