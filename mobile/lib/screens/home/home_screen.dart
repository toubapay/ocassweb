import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:reorderable_grid_view/reorderable_grid_view.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../models/flash_sale.dart';
import '../../models/store.dart';
import '../../providers/auth_provider.dart';
import '../../providers/module_order_provider.dart';
import '../../providers/notifications_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/address_bar.dart';
import '../../widgets/flash_sale_countdown.dart';
import '../../widgets/header_wave.dart';
import '../../widgets/module_tile.dart';
import '../../widgets/product_card.dart';
import '../../widgets/shortcut_card.dart';

const Map<String, (IconData, Color, Color)> _categoryIcons = {
  'footwear': (Icons.checkroom_rounded, AppColors.green, AppColors.greenSoft),
  'electronics': (Icons.devices_other_rounded, AppColors.blue, AppColors.blueSoft),
  'groceries': (Icons.local_grocery_store_rounded, AppColors.amber, AppColors.amberSoft),
  'beauty': (Icons.spa_rounded, AppColors.red, AppColors.redSoft),
};
const (IconData, Color, Color) _defaultCategoryIcon =
    (Icons.storefront_rounded, AppColors.purple, AppColors.purpleSoft);

/// Mirrors the web app's home page: Glovo-style header (address pill +
/// draggable module grid + curved bottom edge), a personalized greeting,
/// category shortcuts, a "popular right now" product rail, and a promo
/// banner (pages/index.js in the web app).
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final Future<List<Category>> _categoriesFuture;
  late final Future<ProductListResult> _productsFuture;
  late final Future<FlashSale?> _flashSaleFuture;
  late final Future<List<Store>> _featuredStoresFuture;

  @override
  void initState() {
    super.initState();
    _categoriesFuture = apiClient.fetchCategories();
    _productsFuture = apiClient.fetchProducts(pageSize: 6);
    _flashSaleFuture = apiClient.fetchActiveFlashSale('home');
    _featuredStoresFuture = apiClient.fetchStores(featured: true);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final modules = context.watch<ModuleOrderProvider>().modules;
    final firstName = user?.name?.split(' ').first;
    final unreadCount =
        auth.isAuthenticated ? context.watch<NotificationsProvider>().unreadCount : 0;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 44),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [AppColors.green, AppColors.greenDark],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(child: AddressBar(address: 'Plateau, Dakar')),
                        if (auth.isAuthenticated)
                          IconButton(
                            onPressed: () => context.push('/notifications'),
                            style: IconButton.styleFrom(backgroundColor: Colors.white.withOpacity(0.18)),
                            icon: Badge(
                              label: Text('$unreadCount'),
                              isLabelVisible: unreadCount > 0,
                              child: const Icon(Icons.notifications_rounded, color: Colors.white),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 28),
                    ReorderableGridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 3,
                      mainAxisSpacing: 24,
                      crossAxisSpacing: 8,
                      childAspectRatio: 0.85,
                      onReorder: (oldIndex, newIndex) {
                        context.read<ModuleOrderProvider>().reorder(oldIndex, newIndex);
                      },
                      children: [
                        for (final module in modules)
                          Center(key: ValueKey(module.id), child: ModuleTile(module: module)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Center(
                      child: Text(
                        context.t('home.dragHint'),
                        style: const TextStyle(color: Colors.white70, fontSize: 11.6, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: HeaderWave(fill: AppColors.background),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    firstName != null
                        ? context.t('home.greeting', {'name': firstName})
                        : context.t('home.exploreOcass'),
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 21),
                  ),
                ),
                const Icon(Icons.info_outline_rounded, color: AppColors.textSecondary, size: 21),
              ],
            ),
          ),
          SizedBox(
            height: 118,
            child: FutureBuilder<List<Category>>(
              future: _categoriesFuture,
              builder: (context, snapshot) {
                final categories = snapshot.data ?? const <Category>[];
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                return ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  scrollDirection: Axis.horizontal,
                  itemCount: categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final cat = categories[index];
                    final conf = _categoryIcons[cat.slug] ?? _defaultCategoryIcon;
                    return ShortcutCard(
                      icon: conf.$1,
                      color: conf.$2,
                      bg: conf.$3,
                      imageUrl: cat.imageUrl,
                      label: context.tOr('categories.${cat.slug}', cat.name),
                      route: '/ecommerce/${cat.slug}',
                    );
                  },
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Text(context.t('home.popularRightNow'),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
          ),
          SizedBox(
            height: 250,
            child: FutureBuilder<ProductListResult>(
              future: _productsFuture,
              builder: (context, snapshot) {
                final items = snapshot.data?.items ?? const <Product>[];
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                return ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  scrollDirection: Axis.horizontal,
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) =>
                      SizedBox(width: 150, child: ProductCard(product: items[index])),
                );
              },
            ),
          ),
          // Flash sale - only rendered while an admin-configured FlashSale
          // campaign (see AdminFlashSalesTab on web) targeting the main
          // Home Screen is inside its recurring schedule window.
          FutureBuilder<FlashSale?>(
            future: _flashSaleFuture,
            builder: (context, snapshot) {
              final flashSale = snapshot.data;
              if (flashSale == null) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        color: const Color(0xFF1A1A1A),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
                          padding: const EdgeInsets.fromLTRB(0, 12, 0, 4),
                          scrollDirection: Axis.horizontal,
                          itemCount: flashSale.products.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 12),
                          itemBuilder: (context, index) =>
                              SizedBox(width: 150, child: ProductCard(product: flashSale.products[index])),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          // Admin-curated stores (see the "Featured" toggle in
          // AdminVendorsTab.js on web) - hidden entirely when none are set.
          FutureBuilder<List<Store>>(
            future: _featuredStoresFuture,
            builder: (context, snapshot) {
              final stores = snapshot.data ?? const <Store>[];
              if (stores.isEmpty) return const SizedBox.shrink();
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                    child: Text(context.t('home.featuredShops'),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                  ),
                  SizedBox(
                    height: 118,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      scrollDirection: Axis.horizontal,
                      itemCount: stores.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, index) {
                        final store = stores[index];
                        return GestureDetector(
                          onTap: () => context.push('/store/${store.slug}'),
                          child: SizedBox(
                            width: 88,
                            child: Column(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(14),
                                  child: store.logoUrl != null && store.logoUrl!.isNotEmpty
                                      ? Image.network(store.logoUrl!,
                                          width: 88, height: 88, fit: BoxFit.cover)
                                      : Container(
                                          width: 88,
                                          height: 88,
                                          color: AppColors.purpleSoft,
                                          child: const Icon(Icons.storefront_rounded,
                                              color: AppColors.purple, size: 34),
                                        ),
                                ),
                                const SizedBox(height: 4),
                                Text(store.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.star_rounded, color: Color(0xFFFFB020), size: 14),
                                    const SizedBox(width: 2),
                                    Text(store.rating.toStringAsFixed(1),
                                        style: const TextStyle(
                                            color: AppColors.textSecondary, fontSize: 11)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              );
            },
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.greenSoft, AppColors.amberSoft]),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(context.t('home.freeDeliveryTitle'),
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.8)),
                        const SizedBox(height: 4),
                        Text(context.t('home.freeDeliverySubtitle'),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.6)),
                      ],
                    ),
                  ),
                  Container(
                    width: 59,
                    height: 59,
                    decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.green),
                    child: const Icon(Icons.card_giftcard_rounded, color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
