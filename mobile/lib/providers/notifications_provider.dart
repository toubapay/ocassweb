import 'dart:async';
import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/app_notification.dart';

/// Polls the unread count every 30s while authenticated, mirroring the
/// web app's `refetchInterval: 30000` on the notifications-unread-count
/// query (pages/index.js, TopBar.js).
class NotificationsProvider extends ChangeNotifier {
  List<AppNotification> _items = [];
  int _unreadCount = 0;
  Timer? _pollTimer;

  List<AppNotification> get items => _items;
  int get unreadCount => _unreadCount;

  Future<void> fetchUnreadCount() async {
    try {
      _unreadCount = await apiClient.fetchUnreadNotificationCount();
      notifyListeners();
    } catch (_) {
      // Silent - this is a background badge refresh, not a user action.
    }
  }

  Future<void> fetchAll() async {
    try {
      _items = await apiClient.fetchNotifications();
      notifyListeners();
    } catch (_) {
      // Leave prior state in place.
    }
  }

  Future<void> markRead(String id) async {
    await apiClient.markNotificationRead(id);
    await Future.wait([fetchAll(), fetchUnreadCount()]);
  }

  Future<void> markAllRead() async {
    await apiClient.markAllNotificationsRead();
    await Future.wait([fetchAll(), fetchUnreadCount()]);
  }

  void startPolling() {
    _pollTimer?.cancel();
    fetchUnreadCount();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) => fetchUnreadCount());
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  /// Called on logout - clears the locally cached view (same reasoning as
  /// CartProvider.clear()).
  void clear() {
    _items = [];
    _unreadCount = 0;
    stopPolling();
    notifyListeners();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }
}
