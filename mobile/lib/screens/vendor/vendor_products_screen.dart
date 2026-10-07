import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/image_upload.dart';
import '../../l10n/app_localizations.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/vendor/products.js: a product list with a FAB that opens
/// a create-product form, an image list a vendor builds by pasting URLs
/// and/or uploading photos from their gallery (compressed client-side to
/// a data URI - see core/image_upload.dart; there's no upload backend or
/// object storage anywhere in this app, so that data URI is stored
/// directly in the same images field a pasted URL would use). Category is
/// a read-only picker into the admin-curated shared category tree (see
/// AdminCategoriesTab.js on web) - vendors browse it, they don't add to it.
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
  final ImagePicker _picker = ImagePicker();

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
    if (!mounted || context.read<AuthProvider>().user?.store == null) return;
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

  void _openCreateSheet() => _openProductSheet();

  void _openEditSheet(Product product) => _openProductSheet(product: product);

  /// Shared by create and edit: `product == null` means create. Kept as
  /// one method (rather than two near-duplicates) since every field and
  /// validation rule is identical between the two - only the submit call
  /// and initial field values differ.
  void _openProductSheet({Product? product}) {
    final editing = product != null;
    final nameController = TextEditingController(text: product?.name ?? '');
    final descriptionController = TextEditingController(text: product?.description ?? '');
    final priceController = TextEditingController(text: product != null ? '${product.price}' : '');
    final discountController =
        TextEditingController(text: product?.discountPrice != null ? '${product!.discountPrice}' : '');
    final stockController = TextEditingController(text: product != null ? '${product.stock}' : '');
    final newImageUrlController = TextEditingController();
    List<String> images = List<String>.from(product?.images ?? []);
    // Null on a new product on purpose: the backend files an
    // uncategorised one under a catch-all rather than refusing it, so the
    // vendor is not made to choose a taxonomy branch before they can sell.
    String? categoryId = product?.categoryId;
    bool saving = false;
    bool uploadingImage = false;
    // Opened already expanded when editing something that has extra
    // details, so a description written earlier does not look dropped.
    bool showMore = product != null &&
        ((product.description ?? '').isNotEmpty ||
            product.discountPrice != null ||
            product.images.length > 1);

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
                Text(
                  editing ? sheetContext.t('vendor.editProduct') : sheetContext.t('vendor.addProduct'),
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                ),
                const SizedBox(height: 16),
                // Putting something up for sale asks four things: a photo,
                // a name, a price and how many. The photo comes first
                // because that is what a vendor standing in their shop
                // with a phone does first.
                GestureDetector(
                  onTap: uploadingImage
                      ? null
                      : () async {
                          setSheetState(() => uploadingImage = true);
                          final dataUri = await pickAndEncodeImage(_picker);
                          setSheetState(() {
                            uploadingImage = false;
                            if (dataUri != null) images.insert(0, dataUri);
                          });
                        },
                  child: Container(
                    height: 132,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: images.isEmpty ? const Color(0xFFFAFAFA) : null,
                      borderRadius: BorderRadius.circular(14),
                      border: images.isEmpty
                          ? Border.all(color: AppColors.divider, style: BorderStyle.solid)
                          : null,
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: images.isNotEmpty
                        ? Image.network(images.first, fit: BoxFit.cover, errorBuilder: (_, __, ___) {
                            return const Center(child: Icon(Icons.category_rounded, size: 30));
                          })
                        : Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.photo_camera_rounded,
                                    size: 30, color: AppColors.textSecondary),
                                const SizedBox(height: 4),
                                Text(
                                  uploadingImage
                                      ? sheetContext.t('common.loading')
                                      : sheetContext.t('vendor.addPhoto'),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                      color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                  ),
                ),
                if (images.length > 1) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: List.generate(images.length, (i) {
                      return Stack(
                        clipBehavior: Clip.none,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.network(
                              images[i],
                              width: 48,
                              height: 48,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                width: 48,
                                height: 48,
                                color: AppColors.greenSoft,
                                child: const Icon(Icons.category_rounded,
                                    color: AppColors.textSecondary),
                              ),
                            ),
                          ),
                          Positioned(
                            top: -8,
                            right: -8,
                            child: GestureDetector(
                              onTap: () => setSheetState(() => images.removeAt(i)),
                              child: Container(
                                width: 20,
                                height: 20,
                                decoration: const BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 2)],
                                ),
                                child: const Icon(Icons.close_rounded, size: 14),
                              ),
                            ),
                          ),
                        ],
                      );
                    }),
                  ),
                ],
                const SizedBox(height: 12),
                TextField(
                    controller: nameController,
                    autofocus: true,
                    decoration: InputDecoration(labelText: sheetContext.t('vendor.productName'))),
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
                        controller: stockController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(labelText: sheetContext.t('vendor.quantity')),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                TextButton(
                  onPressed: () => setSheetState(() => showMore = !showMore),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(sheetContext.t('vendor.moreDetails'),
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      Icon(showMore ? Icons.expand_less_rounded : Icons.expand_more_rounded, size: 20),
                    ],
                  ),
                ),
                if (showMore) ...[
                  DropdownButtonFormField<String>(
                    initialValue: categoryId,
                    decoration: InputDecoration(labelText: sheetContext.t('vendor.category')),
                    items: [
                      DropdownMenuItem<String>(
                        value: null,
                        child: Text(sheetContext.t('vendor.categoryAuto')),
                      ),
                      ..._flatCategories
                          .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))),
                    ],
                    onChanged: (v) => setSheetState(() => categoryId = v),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                      controller: descriptionController,
                      maxLines: 2,
                      decoration: InputDecoration(labelText: sheetContext.t('vendor.description'))),
                  const SizedBox(height: 12),
                  TextField(
                    controller: discountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: sheetContext.t('vendor.discountPrice')),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: newImageUrlController,
                          decoration: InputDecoration(
                            isDense: true,
                            hintText: sheetContext.t('vendor.imageUrlPlaceholder'),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () {
                          final url = newImageUrlController.text.trim();
                          if (url.isEmpty) return;
                          setSheetState(() {
                            images.add(url);
                            newImageUrlController.clear();
                          });
                        },
                        child: Text(sheetContext.t('vendor.addImageUrl')),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: saving
                        ? null
                        : () async {
                            final price = double.tryParse(priceController.text.trim());
                            if (nameController.text.trim().isEmpty || price == null || price <= 0) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                  content: Text(sheetContext.tr('vendor.fillRequiredFields'))));
                              return;
                            }
                            setSheetState(() => saving = true);
                            final discountText = discountController.text.trim();
                            final discountPrice = discountText.isEmpty ? null : double.tryParse(discountText);
                            try {
                              if (editing) {
                                await apiClient.updateVendorProduct(
                                  product.id,
                                  categoryId: categoryId,
                                  name: nameController.text.trim(),
                                  description: descriptionController.text.trim(),
                                  images: images,
                                  price: price,
                                  discountPrice: discountPrice,
                                  clearDiscount: discountPrice == null,
                                  stock: int.tryParse(stockController.text.trim()) ?? 0,
                                );
                              } else {
                                await apiClient.createVendorProduct(
                                  categoryId: categoryId,
                                  name: nameController.text.trim(),
                                  description: descriptionController.text.trim(),
                                  images: images,
                                  price: price,
                                  discountPrice: discountPrice,
                                  stock: int.tryParse(stockController.text.trim()) ?? 0,
                                );
                              }
                              if (!sheetContext.mounted) return;
                              final message = sheetContext.tr(
                                  editing ? 'vendor.productUpdated' : 'vendor.productAdded');
                              Navigator.of(sheetContext).pop();
                              if (!mounted) return;
                              ScaffoldMessenger.of(context)
                                  .showSnackBar(SnackBar(content: Text(message)));
                              await _load();
                            } catch (_) {
                              setSheetState(() => saving = false);
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(context.tr('vendor.couldNotSaveProduct'))));
                            }
                          },
                    child: Text(saving
                        ? sheetContext.t('common.loading')
                        : editing
                            ? sheetContext.t('vendor.saveChanges')
                            : sheetContext.t('vendor.addProduct')),
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
                            CircleAvatar(
                              radius: 22,
                              backgroundColor: AppColors.greenSoft,
                              backgroundImage: p.images.isNotEmpty ? NetworkImage(p.images.first) : null,
                              child: p.images.isEmpty
                                  ? const Icon(Icons.category_rounded, color: AppColors.green)
                                  : null,
                            ),
                            const SizedBox(width: 12),
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
                              onPressed: busy ? null : () => _openEditSheet(p),
                              icon: const Icon(Icons.edit_rounded),
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
