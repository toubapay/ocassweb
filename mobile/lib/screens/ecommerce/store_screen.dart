import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../models/product.dart';
import '../../models/store.dart';
import '../../theme/app_theme.dart';
import '../../widgets/product_card.dart';
import '../../widgets/top_bar.dart';

/// Shopper-facing storefront for one vendor - filters the same product
/// listing endpoint the category browse page uses
/// (GET /ecommerce/products?store=<slug>), just scoped to one store instead
/// of one category. Matches pages/store/[slug].js in the web app.
class StoreScreen extends StatefulWidget {
  final String slug;
  const StoreScreen({super.key, required this.slug});

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> {
  late final Future<Store?> _storeFuture;
  late final Future<ProductListResult> _productsFuture;

  @override
  void initState() {
    super.initState();
    _storeFuture = apiClient.fetchStoreBySlug(widget.slug);
    _productsFuture = apiClient.fetchProducts(store: widget.slug, pageSize: 40);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Store?>(
      future: _storeFuture,
      builder: (context, storeSnapshot) {
        if (storeSnapshot.connectionState == ConnectionState.waiting) {
          return Scaffold(
            appBar: TopBar(title: context.t('store.title')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }
        final store = storeSnapshot.data;
        if (store == null) {
          return Scaffold(
            appBar: TopBar(title: context.t('store.title')),
            body: Center(
              child: Text(context.t('store.notFound'),
                  style: const TextStyle(color: AppColors.textSecondary)),
            ),
          );
        }
        if (!store.isActive) {
          return Scaffold(
            appBar: TopBar(title: store.name),
            body: Center(
              child: Text(context.t('store.unavailable'),
                  style: const TextStyle(color: AppColors.textSecondary)),
            ),
          );
        }
        return Scaffold(
          appBar: TopBar(title: store.name),
          body: ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(28),
                      child: store.logoUrl != null && store.logoUrl!.isNotEmpty
                          ? Image.network(store.logoUrl!, width: 56, height: 56, fit: BoxFit.cover)
                          : Container(
                              width: 56,
                              height: 56,
                              color: AppColors.purpleSoft,
                              child: const Icon(Icons.storefront_rounded, color: AppColors.purple),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(store.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded, color: Color(0xFFFFB020), size: 16),
                              const SizedBox(width: 2),
                              Text(store.rating.toStringAsFixed(1),
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                            ],
                          ),
                          if (store.address != null && store.address!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Row(
                                children: [
                                  const Icon(Icons.location_on_rounded,
                                      size: 15, color: AppColors.textSecondary),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(store.address!,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                            color: AppColors.textSecondary, fontSize: 12.6)),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              FutureBuilder<ProductListResult>(
                future: _productsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  final items = snapshot.data?.items ?? const <Product>[];
                  if (items.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.all(32),
                      child: Center(
                        child: Text(context.t('store.noProducts'),
                            style: const TextStyle(color: AppColors.textSecondary)),
                      ),
                    );
                  }
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 0.62,
                    ),
                    itemCount: items.length,
                    itemBuilder: (context, index) => ProductCard(product: items[index]),
                  );
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}
