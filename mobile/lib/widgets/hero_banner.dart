import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';

class _HeroSlide {
  final String key;
  final String href;
  final List<Color> gradient;
  const _HeroSlide({required this.key, required this.href, required this.gradient});
}

const _slides = [
  _HeroSlide(key: 'sale', href: '/ecommerce', gradient: [Color(0xFF0FAE58), Color(0xFF0B8A45)]),
  _HeroSlide(key: 'vendor', href: '/vendor', gradient: [Color(0xFF3B82F6), Color(0xFF1D4ED8)]),
  _HeroSlide(key: 'restaurant', href: '/restaurant', gradient: [Color(0xFFF97316), Color(0xFFC2410C)]),
];

/// Auto-rotating promo carousel mirroring
/// src/components/ecommerce/HeroBanner.js - static promos for the app's
/// own modules (flash sale, vendor sign-up, restaurant discovery), not
/// backend-driven like ProductShowcaseCarousel/admin showcase slides.
class HeroBanner extends StatefulWidget {
  const HeroBanner({super.key});

  @override
  State<HeroBanner> createState() => _HeroBannerState();
}

class _HeroBannerState extends State<HeroBanner> {
  final _controller = PageController();
  Timer? _timer;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted) return;
      final next = (_page + 1) % _slides.length;
      _controller.animateToPage(next, duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: SizedBox(
        height: 132,
        child: Stack(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: PageView.builder(
                controller: _controller,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _page = i),
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return GestureDetector(
                    onTap: () => context.push(slide.href),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: slide.gradient,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(context.t('ecommerce.home.banners.${slide.key}.title'),
                              style: const TextStyle(
                                  color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17)),
                          const SizedBox(height: 4),
                          Text(context.t('ecommerce.home.banners.${slide.key}.subtitle'),
                              style: const TextStyle(color: Colors.white70, fontSize: 13)),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            Positioned(
              bottom: 8,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < _slides.length; i++)
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
