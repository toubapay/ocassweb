import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ShortcutCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;
  final Color color;
  final Color bg;

  const ShortcutCard({
    super.key,
    required this.icon,
    required this.label,
    required this.route,
    this.color = const Color(0xFF0FAE58),
    this.bg = const Color(0xFFE7F7EE),
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push(route),
      child: SizedBox(
        width: 88,
        child: Column(
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(18)),
              child: Icon(icon, color: color, size: 34),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.6),
            ),
          ],
        ),
      ),
    );
  }
}
