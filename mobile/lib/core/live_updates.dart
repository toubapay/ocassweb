import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'constants.dart';
import 'secure_storage.dart';

/// One event off the live stream. `name` is the server's event vocabulary
/// ("notification", "jobs" - see realtime.bus.js); `data` is the decoded
/// payload, which says *what* changed and never carries the thing itself.
class LiveEvent {
  const LiveEvent(this.name, this.data);
  final String name;
  final Map<String, dynamic> data;
}

/// Holds a Server-Sent Events connection to `GET /api/realtime/stream` so
/// the app's badges and lists update as the backend changes, instead of on
/// their next poll.
///
/// The Flutter half of the web app's LiveUpdatesProvider.js. Same protocol,
/// same event names, same rule that the payload only ever says what
/// changed - listeners refetch through the normal authenticated endpoints.
///
/// Three things this has to get right, and none of them are the parsing:
///
/// * **Reconnect.** Unlike the browser's EventSource, dio does nothing for
///   us here: a mobile connection drops constantly (a tunnel, a lift, a
///   handover from wifi to 4G), so every end of the stream - clean or not -
///   schedules another attempt, with a backoff that resets once a
///   connection has been greeted. Without the backoff, a backend restart
///   turns every installed app into a retry loop against it.
/// * **Catching up.** The bus has no replay, so whatever happened while
///   this app was disconnected was not queued for it. `onReconnected` fires
///   on every successful (re)connect precisely so the caller can refetch
///   once rather than wait for the next change to arrive.
/// * **Not running in the background.** A paused app holding an open socket
///   costs battery and radio for events nobody will see; app.dart stops
///   this on pause and starts it again on resume, which also produces the
///   catch-up above at the moment the user is actually looking.
class LiveUpdates {
  LiveUpdates({required this.onEvent, this.onConnectionChange, this.onReconnected});

  /// Called for each event. Keep it cheap - it runs on the stream.
  final void Function(LiveEvent event) onEvent;

  /// Connected / disconnected transitions, for anything that wants to slow
  /// its own polling while the stream is up.
  final void Function(bool connected)? onConnectionChange;

  /// Every time a connection is established, including the first.
  final void Function()? onReconnected;

  static const _minRetry = Duration(seconds: 3);
  static const _maxRetry = Duration(seconds: 60);

  // No receiveTimeout: this request is *meant* to stay open forever, and
  // the shared ApiClient's 15s receive timeout would kill it on schedule.
  // The server's 25s heartbeat is what proves the connection is alive
  // instead (see realtime.controller.js).
  final Dio _dio = Dio(BaseOptions(
    baseUrl: apiBaseUrl,
    connectTimeout: const Duration(seconds: 15),
  ));

  StreamSubscription<String>? _subscription;
  Timer? _retryTimer;
  Duration _retry = _minRetry;
  bool _running = false;
  bool _connected = false;
  // Bumped by every start() and stop(). A suspended _connect() cannot
  // decide whether to carry on by reading _running: stop() followed
  // immediately by start() - which is exactly what a role change and a
  // pause/resume do - sets it back to true before the connect resumes, so
  // the old connect sees "running" and opens a second connection nothing
  // is tracking. Comparing the generation it started in is the only check
  // that tells "still mine" from "stopped and restarted".
  int _generation = 0;
  // Cancelling the Dart subscription does NOT abort a streamed dio
  // request - the socket stays open and the server goes on holding the
  // connection (and heartbeating into it) until TCP eventually notices.
  // Aborting needs the CancelToken the request was issued with, so stop()
  // cancels this. Measured before the fix: a clean start/stop left the
  // connection registered server-side, and every pause/resume or role
  // change added another one that could never be released.
  CancelToken? _cancelToken;

  bool get connected => _connected;

  void start() {
    if (_running) return;
    _running = true;
    _generation += 1;
    _connect(_generation);
  }

  void stop() {
    _running = false;
    _generation += 1;
    _retryTimer?.cancel();
    _retryTimer = null;
    _subscription?.cancel();
    _subscription = null;
    // Order matters only in that both must happen: the subscription stops
    // this process reading, the token closes the socket so the server
    // stops holding a connection nobody is listening to.
    _cancelToken?.cancel('live updates stopped');
    _cancelToken = null;
    _setConnected(false);
  }

  void _setConnected(bool value) {
    if (_connected == value) return;
    _connected = value;
    onConnectionChange?.call(value);
  }

  void _scheduleRetry() {
    if (!_running) return;
    _retryTimer?.cancel();
    final generation = _generation;
    _retryTimer = Timer(_retry, () => _connect(generation));
    _retry = Duration(
      milliseconds: (_retry.inMilliseconds * 2).clamp(
        _minRetry.inMilliseconds,
        _maxRetry.inMilliseconds,
      ),
    );
  }

  Future<void> _connect(int generation) async {
    if (!_running || generation != _generation) return;
    final token = await TokenStorage.read();
    // Signed out: nothing to listen to, and no point retrying until
    // something calls start() again after a login.
    if (token == null) {
      _setConnected(false);
      return;
    }
    // stop() may have landed while that read was in flight. Every await
    // below gets the same check: without it the connect runs to completion
    // against a stopped client, assigns _subscription over whatever the
    // next start() put there, and leaves a connection nothing can cancel.
    if (!_running || generation != _generation) return;

    final cancelToken = CancelToken();
    _cancelToken = cancelToken;

    try {
      final response = await _dio.get<ResponseBody>(
        '/realtime/stream',
        cancelToken: cancelToken,
        options: Options(
          responseType: ResponseType.stream,
          headers: {'Authorization': 'Bearer $token', 'Accept': 'text/event-stream'},
          // A non-200 here is an answer, not a crash - handled below
          // rather than thrown.
          validateStatus: (_) => true,
        ),
      );

      // A 401 is a definitive answer: this token is no longer a session.
      // Retrying it once a minute forever would keep the app looking
      // signed in while every request fails, so it goes down the same path
      // an ordinary 401 takes (see the interceptor in api_client.dart) and
      // the stream stays down until a new login calls start() again.
      if (response.statusCode == 401) {
        stop();
        await TokenStorage.clear();
        ApiClient.onUnauthorized?.call();
        return;
      }

      if (response.statusCode != 200 || response.data == null) {
        _setConnected(false);
        _scheduleRetry();
        return;
      }

      // Stopped (or restarted) while the request was in flight: close
      // what we just opened instead of wiring it up.
      if (!_running || generation != _generation) {
        cancelToken.cancel('live updates stopped');
        return;
      }

      _setConnected(true);
      _retry = _minRetry;
      onReconnected?.call();

      // SSE frames are separated by a blank line and can arrive split
      // across chunks, so bytes are buffered until a frame is whole
      // rather than parsed per chunk. Decoding is a stream transform
      // rather than utf8.decode per chunk: a multi-byte character split
      // across a chunk boundary is mangled by the latter, and an address
      // in a French notification is one accent away from proving it.
      var buffer = '';
      _subscription?.cancel();
      // bind() rather than transform(): the body arrives as
      // Stream<Uint8List> and a Converter binds to any Stream<List<int>>.
      _subscription = const Utf8Decoder(allowMalformed: true)
          .bind(response.data!.stream)
          .listen(
        (chunk) {
          buffer += chunk;
          var cut = buffer.indexOf('\n\n');
          while (cut != -1) {
            _handleFrame(buffer.substring(0, cut));
            buffer = buffer.substring(cut + 2);
            cut = buffer.indexOf('\n\n');
          }
        },
        onDone: () {
          _setConnected(false);
          _scheduleRetry();
        },
        onError: (_) {
          _setConnected(false);
          _scheduleRetry();
        },
        cancelOnError: true,
      );
    } on DioException catch (err) {
      // A cancel is this class closing its own connection; anything else
      // is the network and deserves a retry.
      if (CancelToken.isCancel(err)) {
        _setConnected(false);
        return;
      }
      _setConnected(false);
      _scheduleRetry();
    } catch (_) {
      // Offline, DNS failure, TLS error - all the same answer.
      _setConnected(false);
      _scheduleRetry();
    }
  }

  void _handleFrame(String frame) {
    // ": ping" - the heartbeat. Its only job was to arrive.
    if (frame.startsWith(':')) return;

    String? name;
    final dataLines = <String>[];
    for (final line in frame.split('\n')) {
      if (line.startsWith('event:')) {
        name = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.add(line.substring(5).trim());
      }
      // "retry:" is the browser's to honour; this class has its own backoff.
    }
    if (name == null || name == 'ready') return;

    Map<String, dynamic> data = const {};
    if (dataLines.isNotEmpty) {
      try {
        final decoded = jsonDecode(dataLines.join('\n'));
        if (decoded is Map<String, dynamic>) data = decoded;
      } catch (_) {
        // Unparseable payload still means something changed, so the event
        // is delivered with no data rather than dropped.
      }
    }
    onEvent(LiveEvent(name, data));
  }

  void dispose() {
    stop();
    _dio.close(force: true);
  }
}

/// Exposes the connection state to widgets (a "live" indicator, or a
/// poll that wants to slow down) without them touching the stream itself.
class LiveStatus extends ChangeNotifier {
  bool _connected = false;
  bool get connected => _connected;

  void set(bool value) {
    if (_connected == value) return;
    _connected = value;
    notifyListeners();
  }
}
