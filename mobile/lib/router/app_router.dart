import 'package:go_router/go_router.dart';

import 'app_shell.dart';
import '../screens/home/home_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/verify_screen.dart';
import '../screens/ecommerce/discover_screen.dart';
import '../screens/ecommerce/category_screen.dart';
import '../screens/ecommerce/product_detail_screen.dart';
import '../screens/ecommerce/cart_screen.dart';
import '../screens/ecommerce/checkout_screen.dart';
import '../screens/ecommerce/orders_screen.dart';
import '../screens/ecommerce/wishlist_screen.dart';
import '../screens/delivery/delivery_screen.dart';
import '../screens/insurance/insurance_screen.dart';
import '../screens/restaurant/restaurant_list_screen.dart';
import '../screens/restaurant/restaurant_detail_screen.dart';
import '../screens/restaurant/restaurant_orders_screen.dart';
import '../screens/rideshare/ride_sharing_screen.dart';
import '../screens/topup/topup_screen.dart';
import '../screens/profile/profile_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    // Full-screen flows: no bottom tab bar, mirrors FULL_SCREEN_PREFIXES in
    // the web app's AppLayout.js.
    GoRoute(path: '/auth/login', builder: (context, state) => const LoginScreen()),
    GoRoute(
      path: '/auth/verify',
      builder: (context, state) =>
          VerifyScreen(phone: state.uri.queryParameters['phone'] ?? ''),
    ),
    GoRoute(
      path: '/ecommerce/product/:slug',
      builder: (context, state) =>
          ProductDetailScreen(slug: state.pathParameters['slug']!),
    ),
    GoRoute(path: '/ecommerce/cart', builder: (context, state) => const CartScreen()),
    GoRoute(path: '/ecommerce/checkout', builder: (context, state) => const CheckoutScreen()),

    // Everything else keeps the bottom tab bar.
    ShellRoute(
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
        GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
        GoRoute(path: '/delivery', builder: (context, state) => const DeliveryScreen()),
        GoRoute(path: '/insurance', builder: (context, state) => const InsuranceScreen()),
        GoRoute(path: '/ride-sharing', builder: (context, state) => const RideSharingScreen()),
        GoRoute(path: '/topup', builder: (context, state) => const TopupScreen()),

        // Static /ecommerce/* siblings must come before the dynamic
        // /ecommerce/:categorySlug catch-all below, or the catch-all would
        // shadow them (go_router matches routes in declaration order).
        GoRoute(path: '/ecommerce', builder: (context, state) => const DiscoverScreen()),
        GoRoute(path: '/ecommerce/orders', builder: (context, state) => const OrdersScreen()),
        GoRoute(path: '/ecommerce/wishlist', builder: (context, state) => const WishlistScreen()),
        GoRoute(
          path: '/ecommerce/:categorySlug',
          builder: (context, state) =>
              CategoryScreen(categorySlug: state.pathParameters['categorySlug']!),
        ),

        // Same ordering rule for /restaurant/*.
        GoRoute(path: '/restaurant', builder: (context, state) => const RestaurantListScreen()),
        GoRoute(path: '/restaurant/orders', builder: (context, state) => const RestaurantOrdersScreen()),
        GoRoute(
          path: '/restaurant/:slug',
          builder: (context, state) =>
              RestaurantDetailScreen(slug: state.pathParameters['slug']!),
        ),
      ],
    ),
  ],
);
