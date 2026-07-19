import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/format.dart';
import '../l10n/app_localizations.dart';
import '../models/product.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/wishlist_provider.dart';
import '../theme/app_theme.dart';

/// Matches the web app's ProductCard (src/components/ecommerce/ProductCard.js):
/// discount badge, wishlist heart, price row, ADD button that requires login.
class ProductCard extends StatefulWidget {
  final Product product;
  const ProductCard({super.key, required this.product});

  @override
  State<ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<ProductCard> {
  bool _adding = false;

  void _requireLogin(BuildContext context, VoidCallback action) {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('common.logInToContinue'))));
      context.push('/auth/login');
      return;
    }
    action();
  }

  Future<void> _addToCart(BuildContext context) async {
    setState(() => _adding = true);
    try {
      await context.read<CartProvider>().add(widget.product.id);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(context.tr(
                'ecommerce.productCard.addedToCart', {'name': widget.product.name}))));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(context.tr('ecommerce.productCard.couldNotAddToCart'))));
      }
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final wishlisted = context.watch<WishlistProvider>().isWishlisted(product.id);

    return GestureDetector(
      onTap: () => context.push('/ecommerce/product/${product.slug}'),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.divider),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: product.images.isNotEmpty
                      ? Image.network(
                          product.images.first,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stack) => Container(
                            color: AppColors.background,
                            child: const Icon(Icons.image_not_supported_outlined,
                                color: AppColors.textSecondary),
                          ),
                          loadingBuilder: (context, child, progress) =>
                              progress == null ? child : Container(color: AppColors.background),
                        )
                      : Container(color: AppColors.background),
                ),
                if (product.hasDiscount)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration:
                          BoxDecoration(color: AppColors.green, borderRadius: BorderRadius.circular(999)),
                      child: Text(
                          context.t('ecommerce.product.percentOff',
                              {'percent': '${product.discountPercent}'}),
                          style:
                              const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11)),
                    ),
                  ),
                Positioned(
                  top: 4,
                  right: 4,
                  child: GestureDetector(
                    onTap: () => _requireLogin(
                        context, () => context.read<WishlistProvider>().toggle(product.id)),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration:
                          BoxDecoration(color: Colors.white.withOpacity(0.85), shape: BoxShape.circle),
                      child: Icon(
                        wishlisted ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                        color: AppColors.green,
                        size: 18,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text(product.store?.name ?? '',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: AppColors.green, fontWeight: FontWeight.w600, fontSize: 11)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(formatCfa(product.displayPrice),
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      if (product.hasDiscount) ...[
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            formatCfa(product.price),
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: _adding ? null : () => _requireLogin(context, () => _addToCart(context)),
                      child: _adding
                          ? const SizedBox(
                              width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : Text(context.t('ecommerce.productCard.add')),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
