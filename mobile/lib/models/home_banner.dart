/// The single admin-editable promo card on the main Home Screen - see
/// AdminHomeBannerTab.js on web for management.
class HomeBanner {
  final String title;
  final String? subtitle;
  final String? imageUrl;
  final String? linkUrl;

  HomeBanner({required this.title, this.subtitle, this.imageUrl, this.linkUrl});

  factory HomeBanner.fromJson(Map<String, dynamic> json) => HomeBanner(
        title: json['title'] as String,
        subtitle: json['subtitle'] as String?,
        imageUrl: json['imageUrl'] as String?,
        linkUrl: json['linkUrl'] as String?,
      );
}
