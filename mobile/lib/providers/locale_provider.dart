import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists the chosen language ('fr' or 'en'), mirroring i18nSlice.js +
/// redux-persist in the web app (SharedPreferences is the mobile analogue
/// of the web's localStorage-backed persistence). French is the default,
/// same as the web app.
class LocaleProvider extends ChangeNotifier {
  static const _prefsKey = 'ocass_language';

  String _language = 'fr';
  String get language => _language;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefsKey);
    if (saved == 'en' || saved == 'fr') {
      _language = saved!;
      notifyListeners();
    }
  }

  Future<void> setLanguage(String language) async {
    if (language != 'en' && language != 'fr') return;
    _language = language;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, language);
  }
}
