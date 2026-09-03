import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/showcase_slide.dart';

/// Auto-advancing banner carousel for the Boutique home page, driven by
/// admin-managed slides (see AdminShowcaseTab.js / ProductShowcaseCarousel.js
/// on web). Renders nothing when there are no active slides.
class ProductShowcaseCarousel extends StatefulWidget {
  final List<ShowcaseSlide> slides;

  const ProductShowcaseCarousel({super.key, required this.slides});

  @override
  State<ProductShowcaseCarousel> createState() => _ProductShowcaseCarouselState();
}

class _ProductShowcaseCarouselState extends State<ProductShowcaseCarousel> {
  final _controller = PageController();
  Timer? _timer;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    if (widget.slides.length > 1) {
      _timer = Timer.periodic(const Duration(seconds: 4), (_) {
        if (!mounted) return;
        final next = (_page + 1) % widget.slides.length;
        _controller.animateToPage(next,
            duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.slides.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: SizedBox(
        height: 150,
        child: Stack(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: PageView.builder(
                controller: _controller,
                itemCount: widget.slides.length,
                onPageChanged: (i) => setState(() => _page = i),
                itemBuilder: (context, index) {
                  final slide = widget.slides[index];
                  return GestureDetector(
                    onTap: slide.linkUrl != null && slide.linkUrl!.isNotEmpty
                        ? () => context.push(slide.linkUrl!)
                        : null,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(
                          slide.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              Container(color: Colors.grey.shade300),
                        ),
                        Positioned(
                          left: 0,
                          right: 0,
                          bottom: 0,
                          child: Container(
                            padding: const EdgeInsets.fromLTRB(14, 24, 14, 12),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [Colors.black.withOpacity(0), Colors.black.withOpacity(0.65)],
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(slide.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                        color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                                if (slide.subtitle != null && slide.subtitle!.isNotEmpty)
                                  Text(slide.subtitle!,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(color: Colors.white70, fontSize: 12)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            if (widget.slides.length > 1)
              Positioned(
                bottom: 8,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < widget.slides.length; i++)
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        width: i == _page ? 16 : 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(i == _page ? 0.95 : 0.5),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
