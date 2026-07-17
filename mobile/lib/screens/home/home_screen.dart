import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:reorderable_grid_view/reorderable_grid_view.dart';

import '../../core/api_client.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../providers/auth_provider.dart';
import '../../providers/module_order_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/address_bar.dart';
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

  @override
  void initState() {
    super.initState();
    _categoriesFuture = apiClient.fetchCategories();
    _productsFuture = apiClient.fetchProducts(pageSize: 6);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final modules = context.watch<ModuleOrderProvider>().modules;
    final firstName = user?.name?.split(' ').first;

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
                    const AddressBar(address: 'Plateau, Abidjan'),
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
                    const Center(
                      child: Text(
                        'Hold and drag an icon to rearrange',
                        style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
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
                    firstName != null ? '$firstName, these are for you' : 'Explore Ocass',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
                  ),
                ),
                const Icon(Icons.info_outline_rounded, color: AppColors.textSecondary, size: 20),
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
                      label: cat.name,
                      route: '/ecommerce/${cat.slug}',
                    );
                  },
                );
              },
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Text('Popular right now', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
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
                        const Text('Free delivery on your first order',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        const SizedBox(height: 4),
                        const Text('Offer applied automatically at checkout.',
                            style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      ],
                    ),
                  ),
                  Container(
                    width: 56,
                    height: 56,
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
