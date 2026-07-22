import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../models/app_notification.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notifications_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/notifications/index.js: relative-time list, mark-all-read,
/// tap-to-mark-read-and-navigate (Anando booking notifications deep-link
/// to /anando, same as the web app).
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.read<AuthProvider>().isAuthenticated) {
        context.read<NotificationsProvider>().fetchAll();
      }
    });
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return context.t('notifications.justNow');
    if (diff.inMinutes < 60) return context.t('notifications.minutesAgo', {'n': '${diff.inMinutes}'});
    if (diff.inHours < 24) return context.t('notifications.hoursAgo', {'n': '${diff.inHours}'});
    return context.t('notifications.daysAgo', {'n': '${diff.inDays}'});
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!isAuthenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('notifications.title'), showSearch: false, showCart: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.t('common.logInToContinue')),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => context.push('/auth/login'), child: Text(context.t('common.logIn'))),
            ],
          ),
        ),
      );
    }

    final notifications = context.watch<NotificationsProvider>().items;
    final hasUnread = notifications.any((n) => !n.read);

    return Scaffold(
      appBar: TopBar(title: context.t('notifications.title'), showSearch: false, showCart: false),
      body: RefreshIndicator(
        onRefresh: () => context.read<NotificationsProvider>().fetchAll(),
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 12),
          children: [
            if (hasUnread)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => context.read<NotificationsProvider>().markAllRead(),
                    child: Text(context.t('notifications.markAllRead'),
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ),
            if (notifications.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 60),
                child: Center(
                  child: Column(
                    children: [
                      const Icon(Icons.notifications_none_rounded,
                          size: 40, color: AppColors.textSecondary),
                      const SizedBox(height: 8),
                      Text(context.t('notifications.empty'),
                          style: const TextStyle(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
              ),
            ...notifications.map((n) => _NotificationRow(
                  notification: n,
                  timeAgo: _timeAgo(n.createdAt),
                  onTap: () async {
                    if (!n.read) await context.read<NotificationsProvider>().markRead(n.id);
                    if (!context.mounted) return;
                    if (n.data?['postingId'] != null) context.push('/anando');
                  },
                )),
          ],
        ),
      ),
    );
  }
}

class _NotificationRow extends StatelessWidget {
  final AppNotification notification;
  final String timeAgo;
  final VoidCallback onTap;

  const _NotificationRow({required this.notification, required this.timeAgo, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        color: notification.read ? null : AppColors.pinkSoft,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const CircleAvatar(
              radius: 20,
              backgroundColor: AppColors.pinkSoft,
              child: Icon(Icons.directions_car_filled_rounded, color: AppColors.pink, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(notification.title,
                      style: TextStyle(fontWeight: notification.read ? FontWeight.w600 : FontWeight.w800)),
                  if (notification.body != null) ...[
                    const SizedBox(height: 2),
                    Text(notification.body!,
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                  ],
                  const SizedBox(height: 4),
                  Text(timeAgo, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                ],
              ),
            ),
            if (!notification.read)
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 6),
                decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.pink),
              ),
          ],
        ),
      ),
    );
  }
}
