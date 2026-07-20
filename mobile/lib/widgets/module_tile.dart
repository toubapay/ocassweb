import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/constants.dart';

/// Circular icon with an overlapping pill label, matching the web app's
/// redesigned ModuleTile (src/components/home/ModuleTile.js). Used inside a
/// ReorderableGridView on the home screen - grid reorder there is
/// long-press-activated by default, so a plain tap here reaches onTap
/// untouched (no click-suppression workaround needed, unlike the web build).
class ModuleTile extends StatelessWidget {
  final AppModule module;
  final double size;

  const ModuleTile({super.key, required this.module, this.size = 88});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => context.go(module.route),
      child: SizedBox(
        width: size,
        height: size + 18,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.topCenter,
          children: [
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.18),
              ),
              child: Center(
                child: Container(
                  width: size - 16,
                  height: size - 16,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(color: Color(0x1F000000), blurRadius: 10, offset: Offset(0, 4)),
                    ],
                  ),
                  child: Icon(module.icon, color: module.color, size: size * 0.36),
                ),
              ),
            ),
            Positioned(
              bottom: -10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: const [
                    BoxShadow(color: Color(0x26000000), blurRadius: 6, offset: Offset(0, 2)),
                  ],
                ),
                child: Text(
                  module.label,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5, color: Color(0xFF1A1A1A)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
