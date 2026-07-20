import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import '../providers/locale_provider.dart';
import 'strings_en.dart';
import 'strings_fr.dart';

/// Looks up [key] in the given [language]'s table, falling back to English
/// (then the raw key) if missing - mirrors i18next's fallbackLng behavior in
/// the web app. [params] does simple {{placeholder}} interpolation, same
/// syntax as the web's translation JSON.
String translate(String language, String key, [Map<String, String>? params]) {
  final table = language == 'en' ? enStrings : frStrings;
  var value = table[key] ?? enStrings[key] ?? key;
  if (params != null) {
    params.forEach((k, v) {
      value = value.replaceAll('{{$k}}', v);
    });
  }
  return value;
}

/// `context.t('some.key')` mirrors the web app's `t("some.key")` - reads
/// the current language from LocaleProvider (via context.watch, so the
/// widget rebuilds when the language changes) and resolves the string.
extension AppLocalizationsContext on BuildContext {
  String t(String key, [Map<String, String>? params]) {
    final language = watch<LocaleProvider>().language;
    return translate(language, key, params);
  }

  /// Same lookup as [t], but reads the current language without
  /// subscribing to changes (`context.read` instead of `context.watch`).
  /// Provider throws if `watch` is called outside of a build method, so
  /// use this variant for one-off strings built inside event handlers -
  /// e.g. a SnackBar message assembled in a button's `onPressed`/async
  /// callback, as opposed to a widget rebuilt on every `build()`.
  String tr(String key, [Map<String, String>? params]) {
    final language = read<LocaleProvider>().language;
    return translate(language, key, params);
  }

  /// For the handful of count-dependent strings (`key_one` / `key_other`
  /// pairs in the translation tables, matching i18next's plural key
  /// convention). `count` is automatically added to params.
  String tPlural(String baseKey, int count, [Map<String, String>? params]) {
    final suffix = count == 1 ? '_one' : '_other';
    final merged = {...?params, 'count': '$count'};
    return t('$baseKey$suffix', merged);
  }

  /// Mirrors the web app's `t(key, { defaultValue })` - for backend-sourced
  /// values (category names, order/ride/delivery statuses, wallet
  /// transaction types) where only a known subset has a translation and
  /// anything else should just show the raw backend value.
  String tOr(String key, String fallback, [Map<String, String>? params]) {
    final language = watch<LocaleProvider>().language;
    final table = language == 'en' ? enStrings : frStrings;
    if (!table.containsKey(key) && !enStrings.containsKey(key)) return fallback;
    return translate(language, key, params);
  }
}
