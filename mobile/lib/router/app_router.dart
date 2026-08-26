import 'package:go_router/go_router.dart';

import 'app_shell.dart';
import '../models/ride_posting.dart';
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
import '../screens/delivery/delivery_agent_screen.dart';
import '../screens/delivery/delivery_track_screen.dart';
import '../screens/insurance/insurance_screen.dart';
import '../screens/insurance/insurance_auto_screen.dart';
import '../screens/insurance/insurance_auto_policies_screen.dart';
import '../screens/restaurant/restaurant_list_screen.dart';
import '../screens/restaurant/restaurant_detail_screen.dart';
import '../screens/restaurant/restaurant_orders_screen.dart';
import '../screens/restaurant/restaurant_manage_screen.dart';
import '../screens/restaurant/restaurant_manage_items_screen.dart';
import '../screens/restaurant/restaurant_manage_orders_screen.dart';
import '../screens/rideshare/ride_sharing_screen.dart';
import '../screens/rideshare/ride_sharing_driver_screen.dart';
import '../screens/topup/topup_screen.dart';
import '../screens/topup/topup_airtime_recipient_screen.dart';
import '../screens/topup/topup_airtime_amount_screen.dart';
import '../screens/wallet/wallet_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/anando/anando_screen.dart';
import '../screens/anando/anando_post_screen.dart';
import '../screens/anando/anando_book_screen.dart';
import '../screens/notifications/notifications_screen.dart';
import '../screens/vendor/vendor_dashboard_screen.dart';
import '../screens/vendor/vendor_products_screen.dart';
import '../screens/vendor/vendor_orders_screen.dart';

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
    GoRoute(
      path: '/delivery/track/:id',
      builder: (context, state) => DeliveryTrackScreen(requestId: state.pathParameters['id']!),
    ),
    GoRoute(path: '/ecommerce/cart', builder: (context, state) => const CartScreen()),
    GoRoute(path: '/ecommerce/checkout', builder: (context, state) => const CheckoutScreen()),
    GoRoute(path: '/anando/post', builder: (context, state) => const AnandoPostScreen()),
    GoRoute(
      path: '/anando/book',
      builder: (context, state) => AnandoBookScreen(posting: state.extra as RidePosting),
    ),
    GoRoute(
      path: '/topup/airtime/recipient',
      builder: (context, state) => const TopupAirtimeRecipientScreen(),
    ),
    GoRoute(
      path: '/topup/airtime/amount',
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? const {};
        return TopupAirtimeAmountScreen(
          phoneNumber: extra['phone'] as String? ?? '',
          label: extra['label'] as String?,
        );
      },
    ),

    // Everything else keeps the bottom tab bar.
    ShellRoute(
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
        GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
        GoRoute(path: '/delivery', builder: (context, state) => const DeliveryScreen()),
        GoRoute(
            path: '/delivery/agent',
            builder: (context, state) =>
                DeliveryAgentScreen(initialTab: state.uri.queryParameters['tab'])),
        GoRoute(path: '/insurance', builder: (context, state) => const InsuranceScreen()),
        GoRoute(path: '/insurance/auto', builder: (context, state) => const InsuranceAutoScreen()),
        GoRoute(
          path: '/insurance/auto/policies',
          builder: (context, state) => const InsuranceAutoPoliciesScreen(),
        ),
        GoRoute(path: '/ride-sharing', builder: (context, state) => const RideSharingScreen()),
        GoRoute(
            path: '/ride-sharing/driver',
            builder: (context, state) =>
                RideSharingDriverScreen(initialTab: state.uri.queryParameters['tab'])),
        GoRoute(
          path: '/topup',
          builder: (context, state) =>
              TopupScreen(initialTab: state.uri.queryParameters['tab']),
        ),
        GoRoute(path: '/wallet', builder: (context, state) => const WalletScreen()),
        GoRoute(path: '/anando', builder: (context, state) => const AnandoScreen()),
        GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
        GoRoute(path: '/vendor', builder: (context, state) => const VendorDashboardScreen()),
        GoRoute(path: '/vendor/products', builder: (context, state) => const VendorProductsScreen()),
        GoRoute(path: '/vendor/orders', builder: (context, state) => const VendorOrdersScreen()),

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
        GoRoute(path: '/restaurant/manage', builder: (context, state) => const RestaurantManageScreen()),
        GoRoute(
          path: '/restaurant/manage/items',
          builder: (context, state) => const RestaurantManageItemsScreen(),
        ),
        GoRoute(
          path: '/restaurant/manage/orders',
          builder: (context, state) => const RestaurantManageOrdersScreen(),
        ),
        GoRoute(
          path: '/restaurant/:slug',
          builder: (context, state) =>
              RestaurantDetailScreen(slug: state.pathParameters['slug']!),
        ),
      ],
    ),
  ],
);
