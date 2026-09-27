/// GET /payments/paydunya/status/:token - polled by PaymentReturnScreen
/// after the customer comes back from PayDunya's hosted checkout. Only
/// the fields that screen actually branches on, mirroring
/// pages/payments/return.js's usage of `result.status`/`result.purpose`.
class PaymentStatus {
  final String status;
  final String purpose;

  PaymentStatus({required this.status, required this.purpose});

  factory PaymentStatus.fromJson(Map<String, dynamic> json) => PaymentStatus(
        status: json['status'] as String,
        purpose: json['purpose'] as String,
      );
}
