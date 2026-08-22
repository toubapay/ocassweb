import 'package:flutter/material.dart';

import '../core/format.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';

/// Dart port of src/components/delivery/DeliveryDistancePriceCard.js - same
/// two-column layout, used both as a live preview on the request form and
/// as a read-only row on the tracking/detail screen.
class DeliveryDistancePriceCard extends StatelessWidget {
  final double? distanceKm;
  final double? priceEstimate;

  const DeliveryDistancePriceCard({super.key, this.distanceKm, this.priceEstimate});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.divider),
        borderRadius: BorderRadius.circular(12),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.place_rounded, color: AppColors.red),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            distanceKm != null
                                ? context.t('delivery.distanceKm', {'km': distanceKm!.toStringAsFixed(2)})
                                : '—',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          Text(
                            context.t('delivery.distanceLabel'),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const VerticalDivider(width: 1),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(Icons.two_wheeler_rounded, color: Theme.of(context).colorScheme.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            formatCfa(priceEstimate),
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                          Text(
                            context.t('delivery.priceEstimateLabel'),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
