import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/constants.dart';

/// Persists a user-customized module icon order, mirroring layoutSlice.js +
/// redux-persist in the web app (SharedPreferences is the mobile analogue
/// of the web's localStorage-backed persistence).
class ModuleOrderProvider extends ChangeNotifier {
  static const _prefsKey = 'ocass_module_order';

  List<String>? _order;

  List<AppModule> get modules => orderedModules(_order);

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getStringList(_prefsKey);
    if (saved != null && saved.isNotEmpty) {
      _order = saved;
      notifyListeners();
    }
  }

  /// Matches ReorderableGridView's onReorder contract: no index adjustment
  /// needed (unlike ReorderableListView).
  Future<void> reorder(int oldIndex, int newIndex) async {
    final current = modules.map((m) => m.id).toList();
    final id = current.removeAt(oldIndex);
    current.insert(newIndex, id);
    _order = current;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_prefsKey, current);
  }
}
