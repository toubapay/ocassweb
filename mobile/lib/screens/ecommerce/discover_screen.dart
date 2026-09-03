import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../models/category.dart';
import '../../models/flash_sale.dart';
import '../../models/product.dart';
import '../../models/showcase_slide.dart';
import '../../theme/app_theme.dart';
import '../../widgets/flash_sale_countdown.dart';
import '../../widgets/product_card.dart';
import '../../widgets/product_showcase_carousel.dart';
import '../../widgets/top_bar.dart';

const _bgColors = [
  AppColors.greenSoft,
  AppColors.blueSoft,
  AppColors.amberSoft,
  AppColors.redSoft,
  AppColors.purpleSoft,
];

/// Boutique home page - showcase carousel, featured/latest product rows,
/// flash sale and a category landing grid, matching
/// pages/ecommerce/index.js in the web app.
class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  late final Future<List<Category>> _future;
  late final Future<FlashSale?> _flashSaleFuture;
  late final Future<List<ShowcaseSlide>> _showcaseFuture;
  late final Future<ProductListResult> _featuredFuture;
  late final Future<ProductListResult> _latestFuture;

  @override
  void initState() {
    super.initState();
    _future = apiClient.fetchCategories();
    _flashSaleFuture = apiClient.fetchActiveFlashSale('ecommerce');
    _showcaseFuture = apiClient.fetchShowcaseSlides();
    _featuredFuture = apiClient.fetchProducts(featured: true, pageSize: 10);
    // Newest listings across every vendor - the default (no sort/featured
    // filter) product query already orders by createdAt desc.
    _latestFuture = apiClient.fetchProducts(pageSize: 10);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(title: context.t('ecommerce.discover.title'), showBack: false),
      body: CustomScrollView(
        slivers: [
          // Admin-managed rotating banner (see AdminShowcaseTab.js on web).
          SliverToBoxAdapter(
            child: FutureBuilder<List<ShowcaseSlide>>(
              future: _showcaseFuture,
              builder: (context, snapshot) =>
                  ProductShowcaseCarousel(slides: snapshot.data ?? const <ShowcaseSlide>[]),
            ),
          ),
          // Admin-curated pick (see AdminShowcaseTab.js's featured-products
          // manager) - independent of the flash sale / discount sorting.
          SliverToBoxAdapter(
            child: _ProductSection(
              title: context.t('ecommerce.home.featuredProducts'),
              future: _featuredFuture,
            ),
          ),
          // Flash sale - only rendered while an admin-configured FlashSale
          // campaign (see AdminFlashSalesTab on web) targeting this
          // discover page is inside its recurring schedule window.
          SliverToBoxAdapter(
            child: FutureBuilder<FlashSale?>(
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
          ),
          // Newest listings across every vendor - the default (no sort/
          // featured filter) product query already orders by createdAt
          // desc, so this is just that query with no extra backend work.
          SliverToBoxAdapter(
            child: _ProductSection(
              title: context.t('ecommerce.home.latestProducts'),
              future: _latestFuture,
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: FutureBuilder<List<Category>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const SliverToBoxAdapter(
                    child: Center(child: Padding(
                      padding: EdgeInsets.all(32),
                      child: CircularProgressIndicator(),
                    )),
                  );
                }
                final categories = snapshot.data ?? const <Category>[];
                return SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.6,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
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
                    childCount: categories.length,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Shared by the "Featured products" and "Latest products" sections above -
/// a plain titled horizontal row of products, hidden while empty.
class _ProductSection extends StatelessWidget {
  final String title;
  final Future<ProductListResult> future;

  const _ProductSection({required this.title, required this.future});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<ProductListResult>(
      future: future,
      builder: (context, snapshot) {
        final items = snapshot.data?.items ?? const <Product>[];
        final isLoading = snapshot.connectionState == ConnectionState.waiting;
        if (!isLoading && items.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            ),
            SizedBox(
              height: 250,
              child: isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      scrollDirection: Axis.horizontal,
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, index) =>
                          SizedBox(width: 150, child: ProductCard(product: items[index])),
                    ),
            ),
          ],
        );
      },
    );
  }
}
