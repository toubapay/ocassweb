import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../l10n/app_localizations.dart';
import '../models/saved_address.dart';
import '../theme/app_theme.dart';
import 'address_autocomplete_field.dart';

/// "Deliver to" on checkout - picks one of the customer's saved addresses
/// or adds one. The Flutter half of DeliveryAddressPicker.js.
///
/// This is what makes an order deliverable at all. `Order.deliveryAddressId`
/// has always been nullable and nothing ever set it, so every order placed
/// from either client was refused by the vendor's "hand this to a courier"
/// step for want of a dropoff point.
///
/// The new-address line goes through Places autocomplete, so a picked
/// suggestion carries lat/lng and the courier fare is a real distance
/// rather than the no-coordinates fallback. Typing by hand still works and
/// is labelled as an estimate instead of being refused.
class AddressPicker extends StatefulWidget {
  const AddressPicker({super.key, required this.selectedId, required this.onChanged});

  final String? selectedId;
  final ValueChanged<String?> onChanged;

  @override
  State<AddressPicker> createState() => _AddressPickerState();
}

class _AddressPickerState extends State<AddressPicker> {
  List<SavedAddress> _addresses = [];
  bool _loading = true;
  bool _loadError = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    try {
      final addresses = await apiClient.fetchAddresses();
      if (!mounted) return;
      setState(() {
        _addresses = addresses;
        _loadError = false;
        _loading = false;
      });
      // Default selection, once: the address marked default, else the
      // first. Somebody with exactly one should not have to choose it.
      if (widget.selectedId == null && addresses.isNotEmpty) {
        final preferred = addresses.firstWhere((a) => a.isDefault, orElse: () => addresses.first);
        widget.onChanged(preferred.id);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadError = true;
        _loading = false;
      });
    }
  }

  Future<void> _openAddSheet() async {
    final labelController = TextEditingController();
    final lineController = TextEditingController();
    final cityController = TextEditingController(text: 'Dakar');
    // Named pickedLat/pickedLng because the callback below declares
    // parameters called lat and lng, which would shadow them.
    double? pickedLat;
    double? pickedLng;
    bool saving = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
        ),
        child: StatefulBuilder(
          builder: (sheetContext, setSheetState) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(sheetContext.t('account.address.add'),
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                const SizedBox(height: 16),
                TextField(
                  controller: labelController,
                  decoration: InputDecoration(
                    labelText: sheetContext.t('account.address.label'),
                    hintText: sheetContext.t('account.address.labelPlaceholder'),
                  ),
                ),
                const SizedBox(height: 12),
                AddressAutocompleteField(
                  controller: lineController,
                  label: sheetContext.t('account.address.line1'),
                  onPlaceSelected: ({required address, required lat, required lng}) {
                    setSheetState(() {
                      pickedLat = lat;
                      pickedLng = lng;
                    });
                  },
                  // Typing again drops the coordinates of a place picked
                  // earlier: they belonged to that place, not to this
                  // text, and a stale pair would send a courier elsewhere.
                  onManualEdit: () => setSheetState(() {
                    pickedLat = null;
                    pickedLng = null;
                  }),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: cityController,
                  decoration: InputDecoration(labelText: sheetContext.t('account.address.city')),
                ),
                if (pickedLat == null) ...[
                  const SizedBox(height: 8),
                  Text(sheetContext.t('account.address.noCoords'),
                      style: const TextStyle(fontSize: 11.5, color: AppColors.amber)),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: saving
                        ? null
                        : () async {
                            if (labelController.text.trim().isEmpty ||
                                lineController.text.trim().isEmpty ||
                                cityController.text.trim().isEmpty) {
                              return;
                            }
                            setSheetState(() => saving = true);
                            try {
                              final created = await apiClient.createAddress(
                                label: labelController.text.trim(),
                                line1: lineController.text.trim(),
                                city: cityController.text.trim(),
                                lat: pickedLat,
                                lng: pickedLng,
                              );
                              if (!sheetContext.mounted) return;
                              Navigator.of(sheetContext).pop();
                              if (!mounted) return;
                              setState(() => _addresses = [..._addresses, created]);
                              widget.onChanged(created.id);
                            } catch (_) {
                              setSheetState(() => saving = false);
                              if (!sheetContext.mounted) return;
                              ScaffoldMessenger.of(sheetContext).showSnackBar(SnackBar(
                                  content: Text(sheetContext.tr('account.address.couldNotSave'))));
                            }
                          },
                    child: Text(saving ? sheetContext.t('common.loading') : sheetContext.t('common.save')),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Text(context.t('common.loading'),
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_loadError)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(context.t('common.loadFailed'),
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ),
        for (final address in _addresses)
          GestureDetector(
            onTap: () => widget.onChanged(address.id),
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: widget.selectedId == address.id ? AppColors.greenSoft : null,
                border: Border.all(
                  color: widget.selectedId == address.id ? AppColors.green : AppColors.divider,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    widget.selectedId == address.id
                        ? Icons.radio_button_checked_rounded
                        : Icons.radio_button_unchecked_rounded,
                    size: 18,
                    color: widget.selectedId == address.id ? AppColors.green : AppColors.textSecondary,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(address.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text('${address.line1}, ${address.city}',
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                        if (!address.hasPoint)
                          Text(context.t('account.address.noCoords'),
                              style: const TextStyle(color: AppColors.amber, fontSize: 11.5)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        if (_addresses.isEmpty && !_loadError)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.divider),
            ),
            child: Column(
              children: [
                const Icon(Icons.home_rounded, color: AppColors.textSecondary),
                const SizedBox(height: 4),
                Text(context.t('account.address.noneYet'),
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
              ],
            ),
          ),
        TextButton.icon(
          onPressed: _openAddSheet,
          icon: const Icon(Icons.add_rounded, size: 18),
          label: Text(context.t('account.address.add'),
              style: const TextStyle(fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }
}
