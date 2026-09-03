/// A single slide in the Boutique home page's rotating banner, as returned
/// by GET /ecommerce/showcase-slides - see server ShowcaseSlide model /
/// AdminShowcaseTab.js on web for how admins manage these.
class ShowcaseSlide {
  final String id;
  final String title;
  final String? subtitle;
  final String imageUrl;
  final String? linkUrl;

  ShowcaseSlide({
    required this.id,
    required this.title,
    this.subtitle,
    required this.imageUrl,
    this.linkUrl,
  });

  factory ShowcaseSlide.fromJson(Map<String, dynamic> json) => ShowcaseSlide(
        id: json['id'] as String,
        title: json['title'] as String,
        subtitle: json['subtitle'] as String?,
        imageUrl: json['imageUrl'] as String,
        linkUrl: json['linkUrl'] as String?,
      );
}
