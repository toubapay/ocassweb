import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/available_jobs_provider.dart';
import '../theme/app_theme.dart';

/// "There is work waiting", on the home screen where an agent already is -
/// the Flutter half of the web app's AvailableJobsBadge.js.
///
/// Renders a zero-height SizedBox unless the signed-in user holds a
/// gig-work role AND there is at least one job they could accept: a card
/// reading "0 available" on every customer's home screen is noise, and the
/// point of this one is to interrupt. It empties itself once the last open
/// job is taken by anyone, because the count is the server's answer about
/// what is still unassigned rather than a local tally.
class AvailableJobsBadge extends StatelessWidget {
  const AvailableJobsBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final jobs = context.watch<AvailableJobsProvider>();
    final count = jobs.count ?? 0;
    if (!jobs.hasJobs) return const SizedBox.shrink();

    final isDelivery = jobs.role == 'DELIVERY_AGENT';
    final title = context.tPlural(
      isDelivery ? 'home.jobsBadge.deliveryTitle' : 'home.jobsBadge.rideTitle',
      count,
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.greenSoft,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFCFEFDD)),
        ),
        child: Row(
          children: [
            // The number sits on the icon: this is the badge the count
            // belongs to, readable without the sentence beside it.
            Badge(
              label: Text(count > 99 ? '99+' : '$count'),
              backgroundColor: AppColors.red,
              child: Container(
                width: 46,
                height: 46,
                decoration: const BoxDecoration(color: AppColors.green, shape: BoxShape.circle),
                child: Icon(
                  isDelivery ? Icons.two_wheeler_rounded : Icons.directions_car_filled_rounded,
                  color: Colors.white,
                  size: 26,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
                  const SizedBox(height: 2),
                  Text(
                    context.t('home.jobsBadge.subtitle'),
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: () => context.read<AvailableJobsProvider>().toggleMuted(),
              tooltip: context.t(jobs.muted ? 'home.jobsBadge.unmute' : 'home.jobsBadge.mute'),
              icon: Icon(
                jobs.muted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                size: 20,
                color: AppColors.textSecondary,
              ),
            ),
            FilledButton(
              onPressed: () => context.push(isDelivery ? '/delivery/agent' : '/ride-sharing/driver'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                context.t('home.jobsBadge.view'),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
