import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists the user's chosen delivery/pickup location, mirroring
/// locationSlice.js + redux-persist in the web app (SharedPreferences is
/// the mobile analogue of the web's localStorage-backed persistence) -
/// same load()-then-notify pattern as ModuleOrderProvider. Null address
/// means "show the setDeliveryAddress placeholder" - there's no default
/// location until the user picks or auto-detects one, same as web.
class LocationProvider extends ChangeNotifier {
  static const _addressKey = 'ocass_location_address';
  static const _latKey = 'ocass_location_lat';
  static const _lngKey = 'ocass_location_lng';

  String? _address;
  double? _lat;
  double? _lng;

  String? get address => _address;
  double? get lat => _lat;
  double? get lng => _lng;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_addressKey);
    if (saved != null && saved.isNotEmpty) {
      _address = saved;
      _lat = prefs.getDouble(_latKey);
      _lng = prefs.getDouble(_lngKey);
      notifyListeners();
    }
  }

  Future<void> setLocation({required String address, double? lat, double? lng}) async {
    _address = address;
    _lat = lat;
    _lng = lng;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_addressKey, address);
    if (lat != null) await prefs.setDouble(_latKey, lat);
    if (lng != null) await prefs.setDouble(_lngKey, lng);
  }
}
