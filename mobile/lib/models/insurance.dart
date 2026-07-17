double _parseDecimal(dynamic value) => double.parse(value.toString());

class InsurancePlan {
  final String id;
  final String name;
  final String category;
  final String provider;
  final double premiumMonthly;
  final double coverageAmount;
  final String? description;

  InsurancePlan({
    required this.id,
    required this.name,
    required this.category,
    required this.provider,
    required this.premiumMonthly,
    required this.coverageAmount,
    this.description,
  });

  factory InsurancePlan.fromJson(Map<String, dynamic> json) => InsurancePlan(
        id: json['id'] as String,
        name: json['name'] as String,
        category: json['category'] as String,
        provider: json['provider'] as String,
        premiumMonthly: _parseDecimal(json['premiumMonthly']),
        coverageAmount: _parseDecimal(json['coverageAmount']),
        description: json['description'] as String?,
      );
}

class InsurancePolicy {
  final String id;
  final String status;
  final InsurancePlan plan;

  InsurancePolicy({required this.id, required this.status, required this.plan});

  factory InsurancePolicy.fromJson(Map<String, dynamic> json) => InsurancePolicy(
        id: json['id'] as String,
        status: json['status'] as String,
        plan: InsurancePlan.fromJson(json['plan'] as Map<String, dynamic>),
      );
}
