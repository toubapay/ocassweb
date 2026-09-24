import 'dart:async';
import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/app_notification.dart';

/// Keeps the unread count (the bell in the top banner) current.
///
/// The live stream is the fast path: a notification filed anywhere in the
/// backend reaches this in milliseconds (see core/live_updates.dart, wired
/// up in app.dart). The poll below is the backstop for when that
/// connection is down - the bus is per-process and has no replay, so a
/// dropped stream has to mean a delay, never silence. While the stream is
/// connected the poll drops to three minutes; without it, it is the whole
/// mechanism and stays at 30s, mirroring the web app's
/// notifications-unread-count query.
class NotificationsProvider extends ChangeNotifier {
  static const _pollInterval = Duration(seconds: 30);
  static const _livePollInterval = Duration(minutes: 3);

  List<AppNotification> _items = [];
  int _unreadCount = 0;
  Timer? _pollTimer;
  bool _live = false;

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
    _pollTimer = Timer.periodic(_live ? _livePollInterval : _pollInterval, (_) => fetchUnreadCount());
  }

  /// Called by the live stream's connect/disconnect (app.dart). Re-arms the
  /// timer at the other cadence rather than waiting for the current one to
  /// fire, so losing the stream restores the 30s poll immediately instead
  /// of up to three minutes later.
  void setLive(bool live) {
    if (_live == live) return;
    _live = live;
    if (_pollTimer != null) startPolling();
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
