import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/api_client.dart';
import 'theme/app_theme.dart';
import 'router/app_router.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/wishlist_provider.dart';
import 'providers/module_order_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/location_provider.dart';
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
  final LocationProvider _locationProvider = LocationProvider();
  final NotificationsProvider _notificationsProvider = NotificationsProvider();
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    // Lets ApiClient (a plain, context-free singleton) correct
    // AuthProvider's in-memory state when a 401 reveals the stored token
    // was actually invalid/expired - see api_client.dart's onError.
    apiClient.onUnauthorized = _authProvider.logout;
    _moduleOrderProvider.load();
    _localeProvider.load();
    _locationProvider.load();
    _authProvider.bootstrap().then((_) {
      if (_authProvider.isAuthenticated) {
        _cartProvider.fetch();
        _wishlistProvider.fetch();
        _notificationsProvider.startPolling();
      }
    });
    // Catches PayDunya's return_url/cancel_url redirect (ocass://payments/...)
    // once the OS hands control back to this app - see paydunya.service.js's
    // mobile return_url and app_router.dart's /payments/return + /cancel
    // routes. uriLinkStream re-emits the link that launched the app cold as
    // well as any received while it's already running.
    _linkSubscription = _appLinks.uriLinkStream.listen(_handlePaymentDeepLink);
  }

  void _handlePaymentDeepLink(Uri uri) {
    if (uri.scheme != 'ocass' || uri.host != 'payments') return;
    final query = uri.hasQuery ? '?${uri.query}' : '';
    appRouter.go('/payments${uri.path}$query');
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
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
        ChangeNotifierProvider<LocationProvider>.value(value: _locationProvider),
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
