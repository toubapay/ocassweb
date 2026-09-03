import 'dart:async';
import 'package:flutter/material.dart';

String _formatDuration(Duration d) {
  final clamped = d.isNegative ? Duration.zero : d;
  final h = clamped.inHours.toString().padLeft(2, '0');
  final m = (clamped.inMinutes % 60).toString().padLeft(2, '0');
  final s = (clamped.inSeconds % 60).toString().padLeft(2, '0');
  return '${h}h : ${m}m : ${s}s';
}

/// Counts down to `endsAt` (the end of today's occurrence of a FlashSale
/// campaign's recurring window - see FlashSale.endsAt / the web
/// FlashSaleCountdown component this mirrors).
class FlashSaleCountdown extends StatefulWidget {
  final DateTime endsAt;

  const FlashSaleCountdown({super.key, required this.endsAt});

  @override
  State<FlashSaleCountdown> createState() => _FlashSaleCountdownState();
}

class _FlashSaleCountdownState extends State<FlashSaleCountdown> {
  Timer? _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _remaining = widget.endsAt.difference(DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _remaining = widget.endsAt.difference(DateTime.now()));
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      _formatDuration(_remaining),
      style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 12.6),
    );
  }
}
