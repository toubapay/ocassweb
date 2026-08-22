import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// The package types themselves are admin-managed data now (see
/// DeliveryPackageType model, fetched via ApiClient.fetchDeliveryPackageTypes)
/// rather than a fixed list - this file is just the rendering registry: the
/// fixed icon-name/colorKey choices an admin can pick from (mirrored in the
/// web admin tab's selects), and the lookup that turns a row's symbolic
/// `icon`/`colorKey` strings into an actual IconData/Color pair. MUST stay
/// in sync with DELIVERY_PACKAGE_TYPE_ICONS/_COLOR_KEYS in
/// server/src/modules/admin/admin.controller.js and
/// src/constants/deliveryPackageTypeOptions.js on web.
const Map<String, IconData> deliveryPackageTypeIcons = {
  'Inventory2Rounded': Icons.inventory_2_rounded,
  'DevicesOtherRounded': Icons.devices_other_rounded,
  'LocalGroceryStoreRounded': Icons.local_grocery_store_rounded,
  'DescriptionRounded': Icons.description_rounded,
  'CardGiftcardRounded': Icons.card_giftcard_rounded,
  'LocalFloristRounded': Icons.local_florist_rounded,
  'CheckroomRounded': Icons.checkroom_rounded,
  'MedicalServicesRounded': Icons.medical_services_rounded,
  'LuggageRounded': Icons.luggage_rounded,
  'BuildRounded': Icons.build_rounded,
};

const Map<String, ({Color color, Color bg})> deliveryPackageTypeColors = {
  'slate': (color: AppColors.textPrimary, bg: Color(0xFFF2F2F2)),
  'blue': (color: AppColors.blue, bg: AppColors.blueSoft),
  'amber': (color: AppColors.amber, bg: AppColors.amberSoft),
  'green': (color: AppColors.green, bg: AppColors.greenSoft),
  'red': (color: AppColors.red, bg: AppColors.redSoft),
  'purple': (color: AppColors.purple, bg: AppColors.purpleSoft),
  'teal': (color: AppColors.teal, bg: AppColors.tealSoft),
  'orange': (color: AppColors.orange, bg: AppColors.orangeSoft),
  'pink': (color: AppColors.pink, bg: AppColors.pinkSoft),
};

IconData packageTypeIcon(String iconName) =>
    deliveryPackageTypeIcons[iconName] ?? deliveryPackageTypeIcons['Inventory2Rounded']!;

({Color color, Color bg}) packageTypeColor(String colorKey) =>
    deliveryPackageTypeColors[colorKey] ?? deliveryPackageTypeColors['slate']!;
