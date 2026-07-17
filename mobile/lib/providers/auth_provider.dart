import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../core/secure_storage.dart';
import '../models/user.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _initialized = false;

  User? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get initialized => _initialized;

  /// Restores a session from the stored token on app start, mirroring
  /// useAuth's bootstrap effect in the web app.
  Future<void> bootstrap() async {
    final token = await TokenStorage.read();
    if (token != null) {
      try {
        _user = await apiClient.fetchMe();
      } catch (_) {
        await TokenStorage.clear();
      }
    }
    _initialized = true;
    notifyListeners();
  }

  /// Returns the dev-mode OTP code if the backend echoed one (OTP_DEV_MODE),
  /// otherwise null.
  Future<String?> requestOtp(String phone) => apiClient.requestOtp(phone);

  Future<User> verifyOtp(String phone, String code, {String? name}) async {
    final (token, user) = await apiClient.verifyOtp(phone, code, name: name);
    await TokenStorage.save(token);
    _user = user;
    notifyListeners();
    return user;
  }

  Future<void> logout() async {
    await TokenStorage.clear();
    _user = null;
    notifyListeners();
  }
}
