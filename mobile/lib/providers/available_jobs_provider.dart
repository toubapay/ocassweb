import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api_client.dart';

/// How many open jobs a delivery agent / rider could accept right now, and
/// an alert when that number goes up.
///
/// Polls every 15s while the user holds a gig-work role, matching the job
/// boards' own interval (delivery_agent_screen.dart,
/// ride_sharing_driver_screen.dart) and the web app's AvailableJobsBadge -
/// so an agent on the home screen and an agent on the board hear about a
/// new job at the same time.
///
/// Rules this shares with the web hook (src/hooks/useJobAlertSound.js):
///
/// * **Only a rise rings.** The first count after start() is not news, and
///   ringing on every poll that returns the same number would have the app
///   silenced within a minute.
/// * **A failed poll keeps the last count.** "No jobs" is a claim; a
///   dropped request on a mobile network is not evidence for it, and
///   blanking the badge would hide real work.
/// * **The alert is muteable and the choice persists.** A courier who is
///   riding gets to turn it off - a sound that cannot be turned off is
///   worse than no sound.
///
/// The alert is the platform's own notification sound plus a vibration,
/// via SystemSound/HapticFeedback in flutter/services - deliberately no
/// audio package. There is no bundled asset to ship or fail to load, and
/// adding a dependency to make a beep would mean a pub fetch before this
/// app builds at all. The trade-off is honest: SystemSound has no effect
/// on Flutter web (a no-op there), which is fine because the shipped web
/// surface of Ocass is the Next.js app, and that one synthesises its own
/// chime.
class AvailableJobsProvider extends ChangeNotifier {
  static const _pollInterval = Duration(seconds: 15);
  // While the live stream is connected a job posted anywhere reaches this
  // in milliseconds, so the poll is only a backstop against a missed event
  // (the bus is per-process with no replay - see realtime.bus.js).
  static const _livePollInterval = Duration(minutes: 2);
  static const _muteKey = 'ocass_job_alert_muted';

  int? _count;
  String? _role;
  bool _muted = false;
  bool _live = false;
  Timer? _timer;

  /// Null until the first successful poll - which is why the badge checks
  /// for a positive count rather than treating null as zero.
  int? get count => _count;
  bool get muted => _muted;

  /// The gig-work role being polled for, or null when there is none. User
  /// .role is a single value server-side (see schema.prisma), so this is
  /// one role at a time rather than a set.
  String? get role => _role;

  bool get hasJobs => (_count ?? 0) > 0;

  Future<void> loadMutePreference() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _muted = prefs.getBool(_muteKey) ?? false;
      notifyListeners();
    } catch (_) {
      // Preferences unavailable - stay audible rather than failing.
    }
  }

  Future<void> toggleMuted() async {
    _muted = !_muted;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_muteKey, _muted);
    } catch (_) {
      // Still muted for this session; it just won't be remembered.
    }
  }

  /// Called on login and whenever the role changes (see main.dart's
  /// wiring). A role with no job board stops the polling and clears the
  /// count, so the badge disappears the moment someone stops being an
  /// agent.
  void start(String? role) {
    if (role != 'DELIVERY_AGENT' && role != 'RIDER') {
      stop();
      return;
    }
    if (_role == role && _timer != null) return;
    _role = role;
    // A new role means a new board: forget the old count so the first
    // poll on the new one is treated as a first value, not a rise.
    _count = null;
    _timer?.cancel();
    refresh();
    _timer = Timer.periodic(_live ? _livePollInterval : _pollInterval, (_) => refresh());
  }

  /// Called by the live stream's connect/disconnect (app.dart) - re-arms
  /// the timer now rather than at the next tick, so losing the stream
  /// restores the 15s cadence at once.
  void setLive(bool live) {
    if (_live == live) return;
    _live = live;
    if (_timer != null) {
      _timer!.cancel();
      _timer = Timer.periodic(_live ? _livePollInterval : _pollInterval, (_) => refresh());
    }
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    _role = null;
    _count = null;
    notifyListeners();
  }

  Future<void> refresh() async {
    final role = _role;
    if (role == null) return;
    try {
      final next = role == 'DELIVERY_AGENT'
          ? await apiClient.fetchAvailableDeliveryJobCount()
          : await apiClient.fetchAvailableRideJobCount();
      final previous = _count;
      _count = next;
      notifyListeners();
      if (previous != null && next > previous && !_muted) {
        _alert();
      }
    } catch (_) {
      // Keep the previous count on screen - see the class comment.
    }
  }

  void _alert() {
    try {
      SystemSound.play(SystemSoundType.alert);
      // The vibration is the half that works in a pocket, which is where
      // a courier's phone actually is.
      HapticFeedback.mediumImpact();
    } catch (_) {
      // No sound or haptics on this device. The badge is the real signal.
    }
  }

  /// Logout - same contract as CartProvider.clear() / NotificationsProvider.
  void clear() => stop();

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
