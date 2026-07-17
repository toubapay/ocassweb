import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../models/store.dart';
import '../../theme/app_theme.dart';
import '../../widgets/category_sidebar.dart';
import '../../widgets/product_card.dart';
import '../../widgets/top_bar.dart';

/// Sidebar + product grid + Article/Magasins tabs, matching
/// pages/ecommerce/[categorySlug].js in the web app.
class CategoryScreen extends StatefulWidget {
  final String categorySlug;
  const CategoryScreen({super.key, required this.categorySlug});

  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  String _activeSlug = 'all';
  Category? _current;
  late Future<ProductListResult> _productsFuture;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _productsFuture = apiClient.fetchProducts(category: widget.categorySlug, pageSize: 40);
    _loadCategory();
  }

  @override
  void didUpdateWidget(covariant CategoryScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.categorySlug != widget.categorySlug) {
      setState(() => _activeSlug = 'all');
      _loadCategory();
      _loadProducts();
    }
  }

  Future<void> _loadCategory() async {
    final categories = await apiClient.fetchCategories();
    Category? found;
    for (final c in categories) {
      if (c.slug == widget.categorySlug) {
        found = c;
        break;
      }
    }
    if (mounted) setState(() => _current = found);
  }

  void _loadProducts() {
    final filterSlug = _activeSlug == 'all' ? widget.categorySlug : _activeSlug;
    setState(() {
      _productsFuture = apiClient.fetchProducts(category: filterSlug, pageSize: 40);
    });
  }

  void _selectSidebar(String slug) {
    setState(() => _activeSlug = slug);
    _loadProducts();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final children = _current?.children ?? const <Category>[];
    final sidebarSource = children.isNotEmpty
        ? children
        : (_current != null ? [_current!] : const <Category>[]);
    final sidebarItems = [
      const SidebarItem(slug: 'all', name: 'Tous'),
      ...sidebarSource.map((c) => SidebarItem(slug: c.slug, name: c.name)),
    ];

    return Scaffold(
      appBar: TopBar(title: _current?.name ?? 'Shop'),
      body: Column(
        children: [
          TabBar(
            controller: _tabController,
            labelColor: AppColors.green,
            unselectedLabelColor: AppColors.textSecondary,
            indicatorColor: AppColors.green,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700),
            tabs: const [Tab(text: 'Article'), Tab(text: 'Magasins')],
          ),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CategorySidebar(items: sidebarItems, activeSlug: _activeSlug, onSelect: _selectSidebar),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [_buildProductsGrid(), _buildStoresList()],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductsGrid() {
    return FutureBuilder<ProductListResult>(
      future: _productsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final items = snapshot.data?.items ?? const <Product>[];
        if (items.isEmpty) {
          return const Center(child: Text('No products in this category yet.'));
        }
        return GridView.builder(
          padding: const EdgeInsets.all(12),
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
    );
  }

  Widget _buildStoresList() {
    return FutureBuilder<ProductListResult>(
      future: _productsFuture,
      builder: (context, snapshot) {
        final items = snapshot.data?.items ?? const <Product>[];
        final stores = <String, Store>{};
        for (final p in items) {
          final store = p.store;
          if (store != null) stores[store.id] = store;
        }
        if (stores.isEmpty) {
          return const Center(child: Text('No stores found for this category.'));
        }
        return ListView(
          padding: const EdgeInsets.all(16),
          children: stores.values.map((store) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.divider),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundImage: store.logoUrl != null ? NetworkImage(store.logoUrl!) : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(store.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text('${store.rating.toStringAsFixed(1)} ★',
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        );
      },
    );
  }
}
