import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

const _links = [
  ('My orders', Icons.receipt_long_rounded, '/ecommerce/orders'),
  ('My food orders', Icons.restaurant_rounded, '/restaurant/orders'),
  ('My wishlist', Icons.favorite_rounded, '/ecommerce/wishlist'),
  ('Delivery requests', Icons.local_shipping_rounded, '/delivery'),
  ('My rides', Icons.two_wheeler_rounded, '/ride-sharing'),
  ('My insurance policies', Icons.health_and_safety_rounded, '/insurance'),
  ('Top-ups & bills', Icons.sim_card_rounded, '/topup'),
];

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: const TopBar(title: 'Profile', showBack: false, showSearch: false, showCart: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text("You're not signed in", style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
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

    final user = auth.user!;

    return Scaffold(
      appBar: const TopBar(title: 'Profile', showBack: false, showSearch: false, showCart: false),
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
                    Text(user.name ?? 'Ocass user', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    Text(user.phone, style: const TextStyle(color: AppColors.textSecondary)),
                  ],
                ),
              ],
            ),
          ),
          ..._links.map((link) => ListTile(
                leading: Icon(link.$2, color: AppColors.green),
                title: Text(link.$1, style: const TextStyle(fontWeight: FontWeight.w600)),
                onTap: () => context.push(link.$3),
              )),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: AppColors.red),
            title: const Text('Log out', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.red)),
            onTap: () async {
              await context.read<AuthProvider>().logout();
              if (context.mounted) {
                context.read<CartProvider>().clear();
                context.read<WishlistProvider>().clear();
                context.go('/');
              }
            },
          ),
        ],
      ),
    );
  }
}
