class User {
  final String id;
  final String phone;
  final String? name;
  final String? email;
  final String? avatarUrl;
  final String role;

  User({
    required this.id,
    required this.phone,
    this.name,
    this.email,
    this.avatarUrl,
    this.role = 'CUSTOMER',
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        phone: json['phone'] as String,
        name: json['name'] as String?,
        email: json['email'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        role: json['role'] as String? ?? 'CUSTOMER',
      );
}
