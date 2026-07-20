import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class SidebarItem {
  final String slug;
  final String name;
  const SidebarItem({required this.slug, required this.name});
}

/// Vertical category rail matching src/components/ecommerce/CategorySidebar.js.
class CategorySidebar extends StatelessWidget {
  final List<SidebarItem> items;
  final String activeSlug;
  final ValueChanged<String> onSelect;

  const CategorySidebar({
    super.key,
    required this.items,
    required this.activeSlug,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 92,
      decoration: const BoxDecoration(border: Border(right: BorderSide(color: AppColors.divider))),
      child: Column(
        children: [
          const SizedBox(height: 20),
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.greenSoft),
            child: const Icon(Icons.storefront_rounded, color: AppColors.green, size: 20),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView(
              children: items.map((item) {
                final active = item.slug == activeSlug;
                return GestureDetector(
                  onTap: () => onSelect(item.slug),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: active ? AppColors.green : Colors.transparent,
                          width: 2.5,
                        ),
                      ),
                    ),
                    child: Text(
                      item.name,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: active ? FontWeight.w800 : FontWeight.w500,
                        color: active ? AppColors.green : AppColors.textPrimary,
                        fontSize: 12,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}
