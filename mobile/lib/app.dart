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

  @override
  void initState() {
    super.initState();
    _moduleOrderProvider.load();
    _localeProvider.load();
    _authProvider.bootstrap().then((_) {
      if (_authProvider.isAuthenticated) {
        _cartProvider.fetch();
        _wishlistProvider.fetch();
        _notificationsProvider.startPolling();
      }
    });
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
