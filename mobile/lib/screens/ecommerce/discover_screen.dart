import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../models/category.dart';
import '../../models/flash_sale.dart';
import '../../theme/app_theme.dart';
import '../../widgets/flash_sale_countdown.dart';
import '../../widgets/product_card.dart';
import '../../widgets/top_bar.dart';

const _bgColors = [
  AppColors.greenSoft,
  AppColors.blueSoft,
  AppColors.amberSoft,
  AppColors.redSoft,
  AppColors.purpleSoft,
];

/// Category landing grid, matching pages/ecommerce/index.js in the web app.
class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  late final Future<List<Category>> _future;
  late final Future<FlashSale?> _flashSaleFuture;

  @override
  void initState() {
    super.initState();
    _future = apiClient.fetchCategories();
    _flashSaleFuture = apiClient.fetchActiveFlashSale('ecommerce');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(title: context.t('ecommerce.discover.title'), showBack: false),
      body: Column(
        children: [
          // Flash sale - only rendered while an admin-configured FlashSale
          // campaign (see AdminFlashSalesTab on web) targeting this
          // discover page is inside its recurring schedule window.
          FutureBuilder<FlashSale?>(
            future: _flashSaleFuture,
            builder: (context, snapshot) {
              final flashSale = snapshot.data;
              if (flashSale == null) return const SizedBox.shrink();
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    color: const Color(0xFF1A1A1A),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.bolt_rounded, color: Color(0xFFFACC15), size: 18),
                            const SizedBox(width: 4),
                            Text(flashSale.title,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w800, color: Colors.white, fontSize: 15)),
                          ],
                        ),
                        Row(
                          children: [
                            Text(context.t('ecommerce.home.endsIn'),
                                style: const TextStyle(color: Colors.white70, fontSize: 12)),
                            const SizedBox(width: 6),
                            FlashSaleCountdown(endsAt: flashSale.endsAt),
                          ],
                        ),
                      ],
                    ),
                  ),
                  SizedBox(
                    height: 250,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                      scrollDirection: Axis.horizontal,
                      itemCount: flashSale.products.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, index) =>
                          SizedBox(width: 150, child: ProductCard(product: flashSale.products[index])),
                    ),
                  ),
                ],
              );
            },
          ),
          Expanded(
            child: FutureBuilder<List<Category>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final categories = snapshot.data ?? const <Category>[];
                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.6,
                  ),
                  itemCount: categories.length,
                  itemBuilder: (context, index) {
                    final cat = categories[index];
                    return GestureDetector(
                      onTap: () => context.push('/ecommerce/${cat.slug}'),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: _bgColors[index % _bgColors.length],
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Stack(
                          children: [
                            if (cat.imageUrl != null && cat.imageUrl!.isNotEmpty)
                              Positioned(
                                top: 0,
                                right: 0,
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.network(
                                    cat.imageUrl!,
                                    width: 40,
                                    height: 40,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) =>
                                        const SizedBox.shrink(),
                                  ),
                                ),
                              ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Text(context.tOr('categories.${cat.slug}', cat.name),
                                    style: const TextStyle(fontWeight: FontWeight.w800)),
                                const SizedBox(height: 4),
                                Text(
                                  cat.children.isNotEmpty
                                      ? context.tPlural('ecommerce.discover.subcategoriesCount',
                                          cat.children.length)
                                      : context.t('ecommerce.discover.shopNow'),
                                  style:
                                      const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
