import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Wraps every "normal" screen with the bottom tab bar, mirroring
/// src/components/layout/AppLayout.js + BottomNav.js in the web app. Full
/// screen flows (auth, product detail, cart, checkout) are declared outside
/// the ShellRoute in app_router.dart and skip this entirely.
class AppShell extends StatelessWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const _tabs = [
    (route: '/', icon: Icons.home_rounded, label: 'Home'),
    (route: '/ecommerce', icon: Icons.explore_rounded, label: 'Discover'),
    (route: '/ecommerce/orders', icon: Icons.receipt_long_rounded, label: 'Orders'),
    (route: '/profile', icon: Icons.person_rounded, label: 'Profile'),
  ];

  int _currentIndex(String location) {
    if (location == '/') return 0;
    if (location.contains('orders')) return 2;
    if (location == '/profile') return 3;
    if (location.startsWith('/ecommerce') ||
        location.startsWith('/restaurant') ||
        location.startsWith('/delivery') ||
        location.startsWith('/insurance') ||
        location.startsWith('/ride-sharing')) {
      return 1;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final index = _currentIndex(location);

    return Scaffold(
      body: SafeArea(bottom: false, child: child),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: index,
        onTap: (i) => context.go(_tabs[i].route),
        items: _tabs
            .map((t) => BottomNavigationBarItem(icon: Icon(t.icon), label: t.label))
            .toList(),
      ),
    );
  }
}
