import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.read<AuthProvider>().isAuthenticated) {
        context.read<CartProvider>().fetch();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!isAuthenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('ecommerce.cart.title'), showCart: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('ecommerce.cart.loginToView')),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.push('/auth/login'),
                child: Text(context.t('common.logIn')),
              ),
            ],
          ),
        ),
      );
    }

    final cart = context.watch<CartProvider>();

    return Scaffold(
      appBar: TopBar(title: context.t('ecommerce.cart.title'), showCart: false, showSearch: false),
      body: cart.loading
          ? const Center(child: CircularProgressIndicator())
          : cart.items.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(context.t('ecommerce.cart.empty')),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => context.go('/ecommerce'),
                        child: Text(context.t('common.startShopping')),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: cart.items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final item = cart.items[index];
                    return Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            width: 64,
                            height: 64,
                            child: item.product.images.isNotEmpty
                                ? Image.network(item.product.images.first,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(color: AppColors.background))
                                : Container(color: AppColors.background),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.product.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.w700)),
                              const SizedBox(height: 2),
                              Text(formatCfa(item.product.displayPrice),
                                  style: const TextStyle(fontWeight: FontWeight.w800)),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Container(
                                    decoration: BoxDecoration(
                                      border: Border.all(color: AppColors.divider),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      children: [
                                        IconButton(
                                          iconSize: 16,
                                          icon: const Icon(Icons.remove_rounded),
                                          onPressed: () => context
                                              .read<CartProvider>()
                                              .updateQuantity(item.id, item.quantity > 1 ? item.quantity - 1 : 1),
                                        ),
                                        Text('${item.quantity}',
                                            style: const TextStyle(fontWeight: FontWeight.w700)),
                                        IconButton(
                                          iconSize: 16,
                                          icon: const Icon(Icons.add_rounded),
                                          onPressed: () => context
                                              .read<CartProvider>()
                                              .updateQuantity(item.id, item.quantity + 1),
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline_rounded, color: AppColors.red),
                                    onPressed: () => context.read<CartProvider>().remove(item.id),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),
      bottomNavigationBar: (!cart.loading && cart.items.isNotEmpty)
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(context.t('ecommerce.cart.subtotal'),
                            style: const TextStyle(color: AppColors.textSecondary)),
                        Text(formatCfa(cart.subtotal), style: const TextStyle(fontWeight: FontWeight.w800)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => context.push('/ecommerce/checkout'),
                        child: Text(context.t('ecommerce.cart.checkout')),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}
