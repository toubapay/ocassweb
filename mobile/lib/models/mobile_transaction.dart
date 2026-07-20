import 'mobile_service.dart';

double _parseDecimal(dynamic value) => double.parse(value.toString());

class MobileTransaction {
  final String id;
  final String type;
  final String? phoneNumber;
  final String? accountNumber;
  final double amount;
  final String status;
  final String reference;
  final DateTime createdAt;
  final MobileService service;

  MobileTransaction({
    required this.id,
    required this.type,
    this.phoneNumber,
    this.accountNumber,
    required this.amount,
    required this.status,
    required this.reference,
    required this.createdAt,
    required this.service,
  });

  factory MobileTransaction.fromJson(Map<String, dynamic> json) => MobileTransaction(
        id: json['id'] as String,
        type: json['type'] as String,
        phoneNumber: json['phoneNumber'] as String?,
        accountNumber: json['accountNumber'] as String?,
        amount: _parseDecimal(json['amount']),
        status: json['status'] as String,
        reference: json['reference'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        service: MobileService.fromJson(json['service'] as Map<String, dynamic>),
      );
}
