import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wraps token persistence, mirroring the ocass-token cookie in the web app
/// (src/api/client.js) - secure storage is the mobile-appropriate equivalent.
class TokenStorage {
  TokenStorage._();

  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'ocass_token';

  static Future<void> save(String token) => _storage.write(key: _tokenKey, value: token);

  static Future<String?> read() => _storage.read(key: _tokenKey);

  static Future<void> clear() => _storage.delete(key: _tokenKey);
}
