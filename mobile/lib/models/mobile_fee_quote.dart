double _parseDecimal(dynamic value) => double.parse(value.toString());

/// GET /mobile/fee-quote - lets the confirm sheet show the real total
/// (base amount + admin-configured fee + TVA) before the customer
/// confirms a purchase, without actually charging anything. Same fee
/// resolution createTopup/createBillPayment use server-side, so this
/// never shows a number different from what actually gets charged.
class MobileFeeQuote {
  final double subtotal;
  final double feeAmount;
  final double taxAmount;
  final double total;

  MobileFeeQuote({
    required this.subtotal,
    required this.feeAmount,
    required this.taxAmount,
    required this.total,
  });

  factory MobileFeeQuote.fromJson(Map<String, dynamic> json) => MobileFeeQuote(
        subtotal: _parseDecimal(json['subtotal']),
        feeAmount: _parseDecimal(json['feeAmount']),
        taxAmount: _parseDecimal(json['taxAmount']),
        total: _parseDecimal(json['total']),
      );
}
