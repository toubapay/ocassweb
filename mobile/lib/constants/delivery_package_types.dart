import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Dart port of src/constants/deliveryPackageTypes.js - same 4 package
/// types, same icon/color/background pairing per type. "Restaurant" from
/// the reference design is intentionally left out, same reasoning as the
/// web version: Ocass already has a dedicated Restaurant module.
class DeliveryPackageTypeInfo {
  final String key;
  final IconData icon;
  final Color color;
  final Color bg;

  const DeliveryPackageTypeInfo({
    required this.key,
    required this.icon,
    required this.color,
    required this.bg,
  });
}

const List<DeliveryPackageTypeInfo> deliveryPackageTypes = [
  DeliveryPackageTypeInfo(
    key: 'PACKAGE',
    icon: Icons.inventory_2_rounded,
    color: AppColors.textPrimary,
    bg: Color(0xFFF2F2F2),
  ),
  DeliveryPackageTypeInfo(
    key: 'ELECTRONICS',
    icon: Icons.devices_other_rounded,
    color: AppColors.blue,
    bg: AppColors.blueSoft,
  ),
  DeliveryPackageTypeInfo(
    key: 'FOOD',
    icon: Icons.local_grocery_store_rounded,
    color: AppColors.amber,
    bg: AppColors.amberSoft,
  ),
  DeliveryPackageTypeInfo(
    key: 'DOCUMENT',
    icon: Icons.description_rounded,
    color: AppColors.green,
    bg: AppColors.greenSoft,
  ),
];

DeliveryPackageTypeInfo packageTypeConfig(String? key) =>
    deliveryPackageTypes.firstWhere((p) => p.key == key, orElse: () => deliveryPackageTypes.first);
