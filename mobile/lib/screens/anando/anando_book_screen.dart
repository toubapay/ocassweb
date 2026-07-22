import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/ride_posting.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

const _paymentMethods = ['CASH', 'WALLET', 'PAYDUNYA'];

/// Mirrors the "book a seat" dialog in pages/anando/index.js: a seat
/// stepper capped at the posting's remaining availability, a payment
/// method chip row, and a running total. [posting] is passed via
/// go_router's `extra` since there's no GET /anando/postings/:id endpoint -
/// the caller already has the full posting from the available-postings list.
class AnandoBookScreen extends StatefulWidget {
  final RidePosting posting;
  const AnandoBookScreen({super.key, required this.posting});

  @override
  State<AnandoBookScreen> createState() => _AnandoBookScreenState();
}

class _AnandoBookScreenState extends State<AnandoBookScreen> {
  int _seats = 1;
  String _paymentMethod = 'CASH';
  bool _submitting = false;

  Future<void> _confirm() async {
    setState(() => _submitting = true);
    try {
      await apiClient.bookSeat(widget.posting.id, seatsBooked: _seats, paymentMethod: _paymentMethod);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('anando.booked'))));
      context.pop();
    } on DioException catch (e) {
      if (!mounted) return;
      final message = (e.response?.data as Map<String, dynamic>?)?['message'] as String?;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message ?? context.tr('anando.couldNotBook'))));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.posting;
    final maxSeats = p.seatsAvailable.clamp(1, 8);
    final total = (p.pricePerSeat ?? 0) * _seats;

    return Scaffold(
      appBar: TopBar(title: context.t('anando.bookTitle'), showSearch: false, showCart: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${p.originAddress} → ${p.destinationAddress}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(context.t('anando.driverLabel', {'name': p.driver?.name ?? p.driver?.phone ?? ''}),
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(context.t('anando.seatsToBook'),
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.remove_circle_outline_rounded),
                onPressed: () => setState(() => _seats = _seats > 1 ? _seats - 1 : 1),
              ),
              Text('$_seats', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              IconButton(
                icon: const Icon(Icons.add_circle_outline_rounded),
                onPressed: () => setState(() => _seats = _seats < maxSeats ? _seats + 1 : maxSeats),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(context.t('anando.paymentMethod'),
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: _paymentMethods.map((m) {
              final selected = _paymentMethod == m;
              return ChoiceChip(
                label: Text(context.t('anando.pay.$m')),
                selected: selected,
                selectedColor: AppColors.pink,
                labelStyle: TextStyle(
                    color: selected ? Colors.white : AppColors.textPrimary,
                    fontWeight: FontWeight.w700),
                onSelected: (_) => setState(() => _paymentMethod = m),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('anando.total'), style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(formatCfa(total), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.pink),
              onPressed: _submitting ? null : _confirm,
              child: Text(
                  _submitting ? context.t('common.loading') : context.t('anando.confirmBooking')),
            ),
          ),
        ],
      ),
    );
  }
}
