import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/live_updates.dart';
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

class _OcassAppState extends State<OcassApp> with WidgetsBindingObserver {
  final AuthProvider _authProvider = AuthProvider();
  final CartProvider _cartProvider = CartProvider();
  final WishlistProvider _wishlistProvider = WishlistProvider();
  final ModuleOrderProvider _moduleOrderProvider = ModuleOrderProvider();
  final LocaleProvider _localeProvider = LocaleProvider();
  final NotificationsProvider _notificationsProvider = NotificationsProvider();
  final AvailableJobsProvider _availableJobsProvider = AvailableJobsProvider();
  final LiveStatus _liveStatus = LiveStatus();
  late final LiveUpdates _live;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _live = LiveUpdates(
      onEvent: _onLiveEvent,
      onConnectionChange: (connected) {
        _liveStatus.set(connected);
        // The two pollers slow right down while the stream is up and go
        // back to their normal cadence the moment it isn't - the stream is
        // the fast path, the poll is what makes a dropped connection a
        // delay rather than silence.
        _notificationsProvider.setLive(connected);
        _availableJobsProvider.setLive(connected);
      },
      // Nothing was queued while this app was away (the bus has no replay),
      // so a fresh connection catches up once instead of waiting for the
      // next change to happen.
      onReconnected: () {
        _notificationsProvider.fetchUnreadCount();
        _availableJobsProvider.refresh();
      },
    );
    _moduleOrderProvider.load();
    _localeProvider.load();
    _availableJobsProvider.loadMutePreference();
    // The available-jobs poll follows the role, not just the session: a
    // user becomes a DELIVERY_AGENT/RIDER from the profile page mid-session
    // (PATCH /auth/role), and logging out has to stop the polling. start()
    // is idempotent for an unchanged role and stops itself for any other
    // one, so this listener can simply hand it whatever the role is now.
    // The live stream is bound to the session the same way: the server
    // decides at connect time which role channel a connection hears, so a
    // role change has to reopen it.
    _authProvider.addListener(_syncSession);
    _authProvider.bootstrap().then((_) {
      if (_authProvider.isAuthenticated) {
        _cartProvider.fetch();
        _wishlistProvider.fetch();
        _notificationsProvider.startPolling();
      }
      _syncSession();
    });
  }

  String? _liveRole;

  void _syncSession() {
    final role = _authProvider.user?.role;
    _availableJobsProvider.start(role);
    if (!_authProvider.isAuthenticated) {
      _liveRole = null;
      _live.stop();
      return;
    }
    if (_liveRole != role) {
      _liveRole = role;
      _live.stop();
      _live.start();
    }
  }

  /// The stream says what changed; the providers re-read it through the
  /// normal endpoints. Nothing here trusts the payload as data.
  void _onLiveEvent(LiveEvent event) {
    switch (event.name) {
      case 'notification':
        // The count drives the bell in the top banner. The list itself is
        // refetched too, so an open inbox screen grows a row rather than
        // showing a badge for something it isn't listing.
        _notificationsProvider.fetchUnreadCount();
        _notificationsProvider.fetchAll();
        break;
      case 'jobs':
        // A job appearing or being taken changes the home badge's count -
        // and refresh() is what rings its alert when the number rises.
        _availableJobsProvider.refresh();
        break;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // A paused app holding an open socket spends battery and radio on
    // events nobody will see; a resumed one wants the truth immediately.
    if (state == AppLifecycleState.resumed) {
      if (_authProvider.isAuthenticated) {
        _live.start();
        _notificationsProvider.fetchUnreadCount();
        _availableJobsProvider.refresh();
      }
    } else if (state == AppLifecycleState.paused || state == AppLifecycleState.detached) {
      _live.stop();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authProvider.removeListener(_syncSession);
    _live.dispose();
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
        ChangeNotifierProvider<LiveStatus>.value(value: _liveStatus),
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
