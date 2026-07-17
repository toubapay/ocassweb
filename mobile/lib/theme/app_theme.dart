import 'package:flutter/material.dart';

/// Ocass brand colors, matched to the web app's theme (src/theme/index.js).
class AppColors {
  AppColors._();

  static const green = Color(0xFF0FAE58);
  static const greenDark = Color(0xFF0B8A45);
  static const greenSoft = Color(0xFFE7F7EE);
  static const amber = Color(0xFFFFB020);
  static const amberSoft = Color(0xFFFFF6E5);
  static const red = Color(0xFFE5484D);
  static const redSoft = Color(0xFFFDECEC);
  static const blue = Color(0xFF3B82F6);
  static const blueSoft = Color(0xFFEAF2FE);
  static const purple = Color(0xFF8B5CF6);
  static const purpleSoft = Color(0xFFF2EEFE);
  static const teal = Color(0xFF0D9488);
  static const tealSoft = Color(0xFFE6FBF8);
  static const orange = Color(0xFFF97316);
  static const orangeSoft = Color(0xFFFFF1E6);

  static const textPrimary = Color(0xFF1A1A1A);
  static const textSecondary = Color(0xFF6B7280);
  static const divider = Color(0xFFEEEEEE);
  static const background = Color(0xFFFAFAFA);
}

final ThemeData appTheme = ThemeData(
  useMaterial3: true,
  scaffoldBackgroundColor: AppColors.background,
  colorScheme: ColorScheme.fromSeed(
    seedColor: AppColors.green,
    primary: AppColors.green,
    secondary: AppColors.amber,
    error: AppColors.red,
    surface: Colors.white,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: Colors.white,
    foregroundColor: AppColors.textPrimary,
    elevation: 0,
    surfaceTintColor: Colors.transparent,
    scrolledUnderElevation: 0,
  ),
  textTheme: const TextTheme(
    titleLarge: TextStyle(fontWeight: FontWeight.w800),
    titleMedium: TextStyle(fontWeight: FontWeight.w800),
    titleSmall: TextStyle(fontWeight: FontWeight.w700),
    bodyMedium: TextStyle(color: AppColors.textPrimary),
    bodySmall: TextStyle(color: AppColors.textSecondary),
  ),
  cardTheme: CardThemeData(
    elevation: 0,
    color: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: const BorderSide(color: AppColors.divider),
    ),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.green,
      foregroundColor: Colors.white,
      elevation: 0,
      padding: const EdgeInsets.symmetric(vertical: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      textStyle: const TextStyle(fontWeight: FontWeight.w700),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: AppColors.green,
      side: const BorderSide(color: AppColors.green),
      padding: const EdgeInsets.symmetric(vertical: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      textStyle: const TextStyle(fontWeight: FontWeight.w800),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(foregroundColor: AppColors.green),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColors.divider),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColors.divider),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColors.green, width: 1.5),
    ),
  ),
  dividerTheme: const DividerThemeData(color: AppColors.divider),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: Colors.white,
    selectedItemColor: AppColors.green,
    unselectedItemColor: AppColors.textSecondary,
    type: BottomNavigationBarType.fixed,
    showUnselectedLabels: true,
  ),
);
