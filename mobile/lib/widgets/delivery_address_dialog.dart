import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/geo.dart';
import '../core/places.dart';
import '../l10n/app_localizations.dart';
import '../providers/location_provider.dart';
import 'address_autocomplete_field.dart';

/// Opened from the home screen's AddressBar - mirrors
/// src/components/home/DeliveryAddressDialog.js: pick a real Google Places
/// suggestion (auto pick, geocoded), or use the device's actual GPS
/// position reverse-geocoded to a short label. Both paths persist via
/// LocationProvider.
class DeliveryAddressDialog extends StatefulWidget {
  const DeliveryAddressDialog({super.key});

  @override
  State<DeliveryAddressDialog> createState() => _DeliveryAddressDialogState();
}

class _DeliveryAddressDialogState extends State<DeliveryAddressDialog> {
  final _controller = TextEditingController();
  bool _locating = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _applyLocation(String address, double lat, double lng) {
    context.read<LocationProvider>().setLocation(address: address, lat: lat, lng: lng);
    Navigator.of(context).pop();
  }

  Future<void> _useMyLocation() async {
    setState(() {
      _error = null;
      _locating = true;
    });
    final position = await getCurrentLatLng();
    if (!mounted) return;
    if (position == null) {
      setState(() {
        _locating = false;
        _error = context.tr('common.locationError');
      });
      return;
    }
    final (lat, lng) = position;
    final address = await reverseGeocode(lat, lng) ?? '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}';
    if (!mounted) return;
    setState(() => _locating = false);
    _applyLocation(address, lat, lng);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(context.t('common.setDeliveryAddress')),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AddressAutocompleteField(
              controller: _controller,
              label: context.t('common.deliveryAddress'),
              onPlaceSelected: ({required address, required lat, required lng}) =>
                  _applyLocation(address, lat, lng),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _locating ? null : _useMyLocation,
              icon: const Icon(Icons.my_location_rounded),
              label: Text(_locating ? context.t('common.loading') : context.t('common.useMyLocation')),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: Text(context.t('common.cancel'))),
      ],
    );
  }
}
