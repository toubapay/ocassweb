import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/restaurant.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/restaurant/manage/items.js: menu item list with a FAB
/// that opens a create/edit form (name, description, price, free-text
/// category like "Starters"/"Mains" - not linked to the shared ecommerce
/// Category tree, MenuItem.category is its own plain string field).
class RestaurantManageItemsScreen extends StatefulWidget {
  const RestaurantManageItemsScreen({super.key});

  @override
  State<RestaurantManageItemsScreen> createState() => _RestaurantManageItemsScreenState();
}

class _RestaurantManageItemsScreenState extends State<RestaurantManageItemsScreen> {
  List<MenuItem> _items = [];
  bool _loading = true;
  final Set<String> _busyIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted || context.read<AuthProvider>().user?.restaurant == null) return;
    setState(() => _loading = true);
    try {
      final items = await apiClient.fetchMyMenuItems();
      if (!mounted) return;
      setState(() => _items = items);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deactivate(String id) async {
    setState(() => _busyIds.add(id));
    try {
      await apiClient.deactivateMenuItem(id);
      await _load();
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  void _openItemSheet({MenuItem? item}) {
    final editing = item != null;
    final nameController = TextEditingController(text: item?.name ?? '');
    final descriptionController = TextEditingController(text: item?.description ?? '');
    final priceController = TextEditingController(text: item != null ? '${item.price}' : '');
    final categoryController = TextEditingController(text: item?.category ?? '');
    final imageUrlController = TextEditingController(text: item?.imageUrl ?? '');
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
                Text(
                  editing ? sheetContext.t('restaurant.manage.editItem') : sheetContext.t('restaurant.manage.newItem'),
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                ),
                const SizedBox(height: 16),
                TextField(
                    controller: nameController,
                    decoration: InputDecoration(labelText: sheetContext.t('restaurant.manage.itemName'))),
                const SizedBox(height: 12),
                TextField(
                    controller: descriptionController,
                    maxLines: 2,
                    decoration:
                        InputDecoration(labelText: sheetContext.t('restaurant.manage.itemDescription'))),
                const SizedBox(height: 12),
                TextField(
                  controller: priceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: sheetContext.t('vendor.price')),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: categoryController,
                  decoration: InputDecoration(
                    labelText: sheetContext.t('restaurant.manage.itemCategory'),
                    hintText: sheetContext.t('restaurant.manage.itemCategoryPlaceholder'),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                    controller: imageUrlController,
                    decoration:
                        InputDecoration(labelText: sheetContext.t('restaurant.manage.itemImageUrl'))),
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
                                  content: Text(sheetContext.tr('restaurant.manage.fillRequiredFields'))));
                              return;
                            }
                            setSheetState(() => saving = true);
                            try {
                              if (editing) {
                                await apiClient.updateMenuItem(
                                  item!.id,
                                  name: nameController.text.trim(),
                                  description: descriptionController.text.trim(),
                                  price: price,
                                  category: categoryController.text.trim(),
                                  imageUrl: imageUrlController.text.trim(),
                                );
                              } else {
                                await apiClient.createMenuItem(
                                  name: nameController.text.trim(),
                                  description: descriptionController.text.trim(),
                                  price: price,
                                  category: categoryController.text.trim(),
                                  imageUrl: imageUrlController.text.trim(),
                                );
                              }
                              if (!mounted) return;
                              Navigator.of(sheetContext).pop();
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                  content: Text(context.tr(editing
                                      ? 'restaurant.manage.itemUpdated'
                                      : 'restaurant.manage.itemCreated'))));
                              await _load();
                            } catch (_) {
                              setSheetState(() => saving = false);
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                  content: Text(context.tr('restaurant.manage.couldNotSaveItem'))));
                            }
                          },
                    child: Text(saving
                        ? sheetContext.t('common.loading')
                        : editing
                            ? sheetContext.t('vendor.saveChanges')
                            : sheetContext.t('restaurant.manage.newItem')),
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
      appBar:
          TopBar(title: context.t('restaurant.manage.menuItems'), showCart: false, showSearch: false),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openItemSheet(),
        child: const Icon(Icons.add_rounded),
      ),
      body: _loading
          ? Center(child: Text(context.t('common.loading')))
          : _items.isEmpty
              ? Center(child: Text(context.t('restaurant.manage.noItems')))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: _items.map((item) {
                      final busy = _busyIds.contains(item.id);
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
                              backgroundImage: item.imageUrl != null ? NetworkImage(item.imageUrl!) : null,
                              child: item.imageUrl == null
                                  ? const Icon(Icons.restaurant_menu_rounded, color: AppColors.green)
                                  : null,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(
                                          child: Text(item.name,
                                              style: const TextStyle(fontWeight: FontWeight.w700))),
                                      if (!item.isActive) ...[
                                        const SizedBox(width: 6),
                                        Chip(
                                          label: Text(context.t('vendor.inactive'),
                                              style: const TextStyle(fontSize: 10)),
                                          visualDensity: VisualDensity.compact,
                                        ),
                                      ],
                                    ],
                                  ),
                                  Text(formatCfa(item.price),
                                      style: const TextStyle(color: AppColors.textSecondary)),
                                  if (item.category != null)
                                    Text(item.category!,
                                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: busy ? null : () => _openItemSheet(item: item),
                              icon: const Icon(Icons.edit_rounded),
                            ),
                            if (item.isActive)
                              IconButton(
                                onPressed: busy ? null : () => _deactivate(item.id),
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
