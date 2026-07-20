double _parseDecimal(dynamic value) => double.parse(value.toString());

class Wallet {
  final String id;
  final double balance;
  final String currency;

  Wallet({required this.id, required this.balance, required this.currency});

  factory Wallet.fromJson(Map<String, dynamic> json) => Wallet(
        id: json['id'] as String,
        balance: _parseDecimal(json['balance']),
        currency: json['currency'] as String,
      );
}

class WalletTransaction {
  final String id;
  final String type;
  final String direction;
  final double amount;
  final String? description;
  final DateTime createdAt;

  WalletTransaction({
    required this.id,
    required this.type,
    required this.direction,
    required this.amount,
    this.description,
    required this.createdAt,
  });

  bool get isCredit => direction == 'CREDIT';

  factory WalletTransaction.fromJson(Map<String, dynamic> json) => WalletTransaction(
        id: json['id'] as String,
        type: json['type'] as String,
        direction: json['direction'] as String,
        amount: _parseDecimal(json['amount']),
        description: json['description'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
