class Review {
  final String id;
  final int rating;
  final String? comment;
  final String? userName;

  Review({required this.id, required this.rating, this.comment, this.userName});

  factory Review.fromJson(Map<String, dynamic> json) => Review(
        id: json['id'] as String,
        rating: json['rating'] as int,
        comment: json['comment'] as String?,
        userName: (json['user'] as Map<String, dynamic>?)?['name'] as String?,
      );
}
