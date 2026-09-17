import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'theme/app_theme.dart';
import 'router/app_router.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/wishlist_provider.dart';
import 'providers/module_order_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/notifications_provider.dart';
import 'providers/available_jobs_provider.dart';

class OcassApp extends StatefulWidget {
  const OcassApp({super.key});

  @override
  State<OcassApp> createState() => _OcassAppState();
}

class _OcassAppState extends State<OcassApp> {
  final AuthProvider _authProvider = AuthProvider();
  final CartProvider _cartProvider = CartProvider();
  final WishlistProvider _wishlistProvider = WishlistProvider();
  final ModuleOrderProvider _moduleOrderProvider = ModuleOrderProvider();
  final LocaleProvider _localeProvider = LocaleProvider();
  final NotificationsProvider _notificationsProvider = NotificationsProvider();
  final AvailableJobsProvider _availableJobsProvider = AvailableJobsProvider();

  @override
  void initState() {
    super.initState();
    _moduleOrderProvider.load();
    _localeProvider.load();
    _availableJobsProvider.loadMutePreference();
    // The available-jobs poll follows the role, not just the session: a
    // user becomes a DELIVERY_AGENT/RIDER from the profile page mid-session
    // (PATCH /auth/role), and logging out has to stop the polling. start()
    // is idempotent for an unchanged role and stops itself for any other
    // one, so this listener can simply hand it whatever the role is now.
    _authProvider.addListener(_syncAvailableJobs);
    _authProvider.bootstrap().then((_) {
      if (_authProvider.isAuthenticated) {
        _cartProvider.fetch();
        _wishlistProvider.fetch();
        _notificationsProvider.startPolling();
      }
      _syncAvailableJobs();
    });
  }

  void _syncAvailableJobs() => _availableJobsProvider.start(_authProvider.user?.role);

  @override
  void dispose() {
    _authProvider.removeListener(_syncAvailableJobs);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: _authProvider),
        ChangeNotifierProvider<CartProvider>.value(value: _cartProvider),
        ChangeNotifierProvider<WishlistProvider>.value(value: _wishlistProvider),
        ChangeNotifierProvider<ModuleOrderProvider>.value(value: _moduleOrderProvider),
        ChangeNotifierProvider<LocaleProvider>.value(value: _localeProvider),
        ChangeNotifierProvider<NotificationsProvider>.value(value: _notificationsProvider),
        ChangeNotifierProvider<AvailableJobsProvider>.value(value: _availableJobsProvider),
      ],
      child: MaterialApp.router(
        title: 'Ocass',
        debugShowCheckedModeBanner: false,
        theme: appTheme,
        routerConfig: appRouter,
      ),
    );
  }
}
