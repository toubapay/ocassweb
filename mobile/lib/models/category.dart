class Category {
  final String id;
  final String name;
  final String slug;
  final String? icon;
  final String? parentId;
  final List<Category> children;

  Category({
    required this.id,
    required this.name,
    required this.slug,
    this.icon,
    this.parentId,
    this.children = const [],
  });

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as String,
        name: json['name'] as String,
        slug: json['slug'] as String,
        icon: json['icon'] as String?,
        parentId: json['parentId'] as String?,
        children: (json['children'] as List<dynamic>? ?? [])
            .map((c) => Category.fromJson(c as Map<String, dynamic>))
            .toList(),
      );
}
