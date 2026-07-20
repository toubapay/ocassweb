import 'package:intl/intl.dart';

final NumberFormat _cfaFormat = NumberFormat.decimalPattern('en_US');

/// Formats a numeric price as "CFA 1,655", matching src/utils/currency.js.
String formatCfa(num? value) {
  if (value == null) return '';
  return 'CFA ${_cfaFormat.format(value)}';
}
