import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Backend base URL. Android emulators reach the host machine's localhost
/// via 10.0.2.2; iOS simulators can use localhost directly. Override with
/// `--dart-define=API_BASE_URL=https://your-backend-url/api` for a real
/// device or a deployed backend (see /DEPLOY_GCP.md at the repo root).
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:5000/api',
);

class AppModule {
  final String id;
  final String label;
  final String fullLabel;
  final String route;
  final IconData icon;
  final Color color;
  final Color bg;

  const AppModule({
    required this.id,
    required this.label,
    required this.fullLabel,
    required this.route,
    required this.icon,
    required this.color,
    required this.bg,
  });
}

/// Central module registry, mirroring src/constants/modules.js in the web app.
const List<AppModule> kModules = [
  AppModule(
    id: 'ecommerce',
    label: 'Shop',
    fullLabel: 'Ecommerce',
    route: '/ecommerce',
    icon: Icons.shopping_bag_rounded,
    color: AppColors.green,
    bg: AppColors.greenSoft,
  ),
  AppModule(
    id: 'restaurant',
    label: 'Food',
    fullLabel: 'Restaurant',
    route: '/restaurant',
    icon: Icons.restaurant_rounded,
    color: AppColors.red,
    bg: AppColors.redSoft,
  ),
  AppModule(
    id: 'delivery',
    label: 'Delivery',
    fullLabel: 'Package Delivery',
    route: '/delivery',
    icon: Icons.local_shipping_rounded,
    color: AppColors.amber,
    bg: AppColors.amberSoft,
  ),
  AppModule(
    id: 'ride-sharing',
    label: 'Rides',
    fullLabel: 'Ride Sharing',
    route: '/ride-sharing',
    icon: Icons.two_wheeler_rounded,
    color: AppColors.blue,
    bg: AppColors.blueSoft,
  ),
  AppModule(
    id: 'insurance',
    label: 'Insurance',
    fullLabel: 'Insurance',
    route: '/insurance',
    icon: Icons.health_and_safety_rounded,
    color: AppColors.purple,
    bg: AppColors.purpleSoft,
  ),
  AppModule(
    id: 'airtime',
    label: 'Airtime',
    fullLabel: 'Airtime Top-up',
    route: '/topup?tab=airtime',
    icon: Icons.phone_android_rounded,
    color: AppColors.teal,
    bg: AppColors.tealSoft,
  ),
  AppModule(
    id: 'bill-payment',
    label: 'Bills',
    fullLabel: 'Bill Payment',
    route: '/topup?tab=bill',
    icon: Icons.receipt_long_rounded,
    color: AppColors.orange,
    bg: AppColors.orangeSoft,
  ),
  AppModule(
    id: 'anando',
    label: 'Anando',
    fullLabel: 'Anando',
    route: '/anando',
    icon: Icons.directions_car_filled_rounded,
    color: AppColors.pink,
    bg: AppColors.pinkSoft,
  ),
];

AppModule moduleById(String id) => kModules.firstWhere((m) => m.id == id);

/// Rebuilds kModules in a user-customized order (persisted list of ids),
/// mirroring getOrderedModules() in the web app's constants/modules.js.
List<AppModule> orderedModules(List<String>? order) {
  if (order == null || order.isEmpty) return kModules;
  final byId = {for (final m in kModules) m.id: m};
  final ordered = order.map((id) => byId[id]).whereType<AppModule>().toList();
  final missing = kModules.where((m) => !order.contains(m.id));
  return [...ordered, ...missing];
}
