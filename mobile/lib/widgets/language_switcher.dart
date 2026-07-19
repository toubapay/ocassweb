import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/locale_provider.dart';
import '../theme/app_theme.dart';

/// Mirrors src/components/settings/LanguageSwitcher.js - a French/English
/// toggle, currently placed on the profile screen only.
class LanguageSwitcher extends StatelessWidget {
  const LanguageSwitcher({super.key});

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LocaleProvider>().language;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.translate_rounded, size: 18, color: AppColors.textSecondary),
              const SizedBox(width: 8),
              Text(
                context.t('common.language'),
                style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _LanguageOption(
                  label: context.t('common.french'),
                  selected: language == 'fr',
                  onTap: () => context.read<LocaleProvider>().setLanguage('fr'),
                  roundLeft: true,
                ),
              ),
              Expanded(
                child: _LanguageOption(
                  label: context.t('common.english'),
                  selected: language == 'en',
                  onTap: () => context.read<LocaleProvider>().setLanguage('en'),
                  roundLeft: false,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LanguageOption extends StatelessWidget {
  const _LanguageOption({
    required this.label,
    required this.selected,
    required this.onTap,
    required this.roundLeft,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool roundLeft;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? AppColors.background : Colors.transparent,
          border: Border.all(color: AppColors.divider),
          borderRadius: BorderRadius.horizontal(
            left: roundLeft ? const Radius.circular(8) : Radius.zero,
            right: !roundLeft ? const Radius.circular(8) : Radius.zero,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: selected ? AppColors.textPrimary : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
