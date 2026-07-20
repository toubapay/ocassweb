import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';

class TopBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final bool showBack;
  final bool showSearch;
  final bool showCart;
  final VoidCallback? onSearchTap;

  const TopBar({
    super.key,
    required this.title,
    this.showBack = true,
    this.showSearch = true,
    this.showCart = true,
    this.onSearchTap,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final cartCount = showCart ? context.watch<CartProvider>().itemCount : 0;

    return AppBar(
      automaticallyImplyLeading: false,
      leading: showBack
          ? IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
              onPressed: () => context.canPop() ? context.pop() : context.go('/'),
            )
          : null,
      title: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      actions: [
        if (showSearch)
          IconButton(icon: const Icon(Icons.search_rounded), onPressed: onSearchTap ?? () {}),
        if (showCart)
          IconButton(
            icon: Badge(
              label: Text('$cartCount'),
              isLabelVisible: cartCount > 0,
              child: const Icon(Icons.shopping_cart_rounded, color: AppColors.green),
            ),
            onPressed: () => context.push('/ecommerce/cart'),
          ),
      ],
      bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1)),
    );
  }
}
