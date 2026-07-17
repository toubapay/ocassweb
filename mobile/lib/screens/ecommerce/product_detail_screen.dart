import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../models/product.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

class ProductDetailScreen extends StatefulWidget {
  final String slug;
  const ProductDetailScreen({super.key, required this.slug});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late final Future<Product> _future;
  int _quantity = 1;
  int _activeImage = 0;
  bool _adding = false;

  @override
  void initState() {
    super.initState();
    _future = apiClient.fetchProduct(widget.slug);
  }

  Future<void> _addToCart(Product product) async {
    if (!context.read<AuthProvider>().isAuthenticated) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Log in to continue')));
      context.push('/auth/login');
      return;
    }
    setState(() => _adding = true);
    try {
      await context.read<CartProvider>().add(product.id, quantity: _quantity);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to cart')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Could not add to cart')));
      }
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const TopBar(title: 'Product'),
      body: FutureBuilder<Product>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!snapshot.hasData) {
            return const Center(child: Text('Could not load this product.'));
          }
          final product = snapshot.data!;
          return Stack(
            children: [
              SingleChildScrollView(
                padding: const EdgeInsets.only(bottom: 90),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AspectRatio(
                      aspectRatio: 1,
                      child: product.images.isNotEmpty
                          ? Image.network(
                              product.images[_activeImage],
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(color: AppColors.background),
                            )
                          : Container(color: AppColors.background),
                    ),
                    if (product.images.length > 1)
                      SizedBox(
                        height: 64,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(12),
                          scrollDirection: Axis.horizontal,
                          itemCount: product.images.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (context, index) => GestureDetector(
                            onTap: () => setState(() => _activeImage = index),
                            child: Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: index == _activeImage ? AppColors.green : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(6),
                                child: Image.network(product.images[index], fit: BoxFit.cover),
                              ),
                            ),
                          ),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(product.store?.name ?? '',
                              style: const TextStyle(color: AppColors.green, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text(product.name,
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(Icons.star_rounded, color: Colors.amber[700], size: 18),
                              const SizedBox(width: 4),
                              Text(product.rating.toStringAsFixed(1),
                                  style: const TextStyle(color: AppColors.textSecondary)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(formatCfa(product.displayPrice),
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                              if (product.hasDiscount) ...[
                                const SizedBox(width: 8),
                                Text(formatCfa(product.price),
                                    style: const TextStyle(
                                        color: AppColors.textSecondary,
                                        decoration: TextDecoration.lineThrough)),
                                const SizedBox(width: 8),
                                Chip(
                                  label: Text('${product.discountPercent}% OFF',
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                                  backgroundColor: AppColors.green,
                                  visualDensity: VisualDensity.compact,
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            product.stock > 0 ? '${product.stock} in stock' : 'Out of stock',
                            style: const TextStyle(color: AppColors.textSecondary),
                          ),
                          const Divider(height: 32),
                          const Text('Description', style: TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          Text(product.description ?? 'No description available.',
                              style: const TextStyle(color: AppColors.textSecondary)),
                          const Divider(height: 32),
                          Text('Reviews (${product.reviews.length})',
                              style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          if (product.reviews.isEmpty)
                            const Text('No reviews yet.', style: TextStyle(color: AppColors.textSecondary)),
                          ...product.reviews.map((review) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(review.userName ?? 'Anonymous',
                                            style: const TextStyle(fontWeight: FontWeight.w700)),
                                        const SizedBox(width: 8),
                                        Icon(Icons.star_rounded, color: Colors.amber[700], size: 16),
                                        Text('${review.rating}'),
                                      ],
                                    ),
                                    if (review.comment != null)
                                      Text(review.comment!,
                                          style: const TextStyle(color: AppColors.textSecondary)),
                                  ],
                                ),
                              )),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: AppColors.divider)),
                  ),
                  child: SafeArea(
                    top: false,
                    child: Row(
                      children: [
                        Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.divider),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_rounded, size: 18),
                                onPressed: () => setState(() => _quantity = _quantity > 1 ? _quantity - 1 : 1),
                              ),
                              Text('$_quantity', style: const TextStyle(fontWeight: FontWeight.w700)),
                              IconButton(
                                icon: const Icon(Icons.add_rounded, size: 18),
                                onPressed: () => setState(() => _quantity++),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed:
                                (_adding || product.stock == 0) ? null : () => _addToCart(product),
                            child: const Text('Add to cart'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
