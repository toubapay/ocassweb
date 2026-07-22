import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/vendor/products.js: a product list with a FAB that opens
/// a create-product bottom sheet (category picker, price/discount/stock).
/// No image upload in this app (no storage backend configured), same as
/// the store logo field - images stay a plain URL list, empty by default.
class VendorProductsScreen extends StatefulWidget {
  const VendorProductsScreen({super.key});

  @override
  State<VendorProductsScreen> createState() => _VendorProductsScreenState();
}

class _VendorProductsScreenState extends State<VendorProductsScreen> {
  List<Product> _products = [];
  List<Category> _categories = [];
  bool _loading = true;
  final Set<String> _busyIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  List<Category> get _flatCategories {
    final out = <Category>[];
    for (final cat in _categories) {
      out.add(cat);
      out.addAll(cat.children);
    }
    return out;
  }

  Future<void> _load() async {
    if (!mounted || context.read<AuthProvider>().user?.role != 'VENDOR') return;
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        apiClient.fetchMyVendorProducts(),
        apiClient.fetchCategories(),
      ]);
      if (!mounted) return;
      setState(() {
        _products = results[0] as List<Product>;
        _categories = results[1] as List<Category>;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deactivate(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.deactivateVendorProduct(id);
      await _load();
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  void _openCreateSheet() {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    final priceController = TextEditingController();
    final discountController = TextEditingController();
    final stockController = TextEditingController();
    String? categoryId = _flatCategories.isNotEmpty ? _flatCategories.first.id : null;
    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
        ),
        child: StatefulBuilder(
          builder: (sheetContext, setSheetState) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(sheetContext.t('vendor.addProduct'),
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: categoryId,
                  decoration: InputDecoration(labelText: sheetContext.t('vendor.category')),
                  items: _flatCategories
                      .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                      .toList(),
                  onChanged: (v) => setSheetState(() => categoryId = v),
                ),
                const SizedBox(height: 12),
                TextField(
                    controller: nameController,
                    decoration: InputDecoration(labelText: sheetContext.t('vendor.productName'))),
                const SizedBox(height: 12),
                TextField(
                    controller: descriptionController,
                    maxLines: 2,
                    decoration: InputDecoration(labelText: sheetContext.t('vendor.description'))),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: priceController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(labelText: sheetContext.t('vendor.price')),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: discountController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(labelText: sheetContext.t('vendor.discountPrice')),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: stockController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: sheetContext.t('vendor.stock')),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: saving || categoryId == null
                        ? null
                        : () async {
                            final price = double.tryParse(priceController.text.trim());
                            if (nameController.text.trim().isEmpty || price == null || price <= 0) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                  content: Text(sheetContext.tr('vendor.fillRequiredFields'))));
                              return;
                            }
                            setSheetState(() => saving = true);
                            try {
                              await apiClient.createVendorProduct(
                                categoryId: categoryId!,
                                name: nameController.text.trim(),
                                description: descriptionController.text.trim(),
                                price: price,
                                discountPrice: double.tryParse(discountController.text.trim()),
                                stock: int.tryParse(stockController.text.trim()) ?? 0,
                              );
                              if (!mounted) return;
                              Navigator.of(sheetContext).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(context.tr('vendor.productAdded'))));
                              await _load();
                            } catch (_) {
                              setSheetState(() => saving = false);
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(context.tr('vendor.couldNotSaveProduct'))));
                            }
                          },
                    child: Text(
                        saving ? sheetContext.t('common.loading') : sheetContext.t('vendor.addProduct')),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(title: context.t('vendor.manageProducts'), showCart: false, showSearch: false),
      floatingActionButton: FloatingActionButton(
        onPressed: _openCreateSheet,
        child: const Icon(Icons.add_rounded),
      ),
      body: _loading
          ? Center(child: Text(context.t('common.loading')))
          : _products.isEmpty
              ? Center(child: Text(context.t('vendor.noProducts')))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: _products.map((p) {
                      final busy = _busyIds.contains(p.id);
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                            border: Border.all(color: AppColors.divider),
                            borderRadius: BorderRadius.circular(12)),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(p.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                  Text(formatCfa(p.displayPrice),
                                      style: const TextStyle(color: AppColors.textSecondary)),
                                  Text(context.t('vendor.stockCount', {'n': '${p.stock}'}),
                                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: busy ? null : () => _deactivate(p.id),
                              icon: const Icon(Icons.delete_outline_rounded, color: AppColors.red),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
    );
  }
}
