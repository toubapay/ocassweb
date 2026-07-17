import 'package:flutter/material.dart';

/// Curved bottom edge for the home screen's colored header, matching the
/// SVG wave in the web app (src/components/home/HeaderWave.js) - same path
/// proportions, redrawn with a CustomPainter since Flutter has no SVG path
/// primitive in the core SDK.
class _HeaderWavePainter extends CustomPainter {
  final Color fill;
  _HeaderWavePainter({required this.fill});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = fill;
    final w = size.width;
    final h = size.height;

    final path = Path()
      ..moveTo(0, h * 0.4583)
      ..cubicTo(w * 0.2174, h * 1.2083, w * 0.7729, -h * 0.1667, w, h * 0.5)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _HeaderWavePainter oldDelegate) => oldDelegate.fill != fill;
}

class HeaderWave extends StatelessWidget {
  final Color fill;
  final double height;

  const HeaderWave({super.key, required this.fill, this.height = 40});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: height,
      child: CustomPaint(painter: _HeaderWavePainter(fill: fill)),
    );
  }
}
