import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../core/geo.dart';
import '../core/places.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import 'address_autocomplete_field.dart';

const _defaultCenter = LatLng(14.6928, -17.4467); // Dakar

/// Pushes [MapAddressPickerScreen] and returns the picked
/// (address, lat, lng), or null if the user backed out - the Dart mirror
/// of MapAddressPickerDialog.js. A plain Navigator push (not a named
/// go_router route) since this is an ad-hoc "pick a spot" flow invoked
/// from wherever an address field wants it, not a URL-addressable screen.
Future<({String address, double lat, double lng})?> showMapAddressPicker(
  BuildContext context, {
  (double, double)? initialCenter,
}) {
  return Navigator.of(context).push<({String address, double lat, double lng})>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => MapAddressPickerScreen(initialCenter: initialCenter),
    ),
  );
}

/// Dart port of MapAddressPickerDialog.js: "drag the map under a fixed
/// pin" location picker, offered alongside AddressAutocompleteField's
/// type-to-search (see delivery_screen.dart) rather than replacing it -
/// also embeds an AddressAutocompleteField itself, purely to jump the map
/// to a typed place before fine-tuning the pin. The resolved address
/// updates via reverse geocoding once panning settles (onCameraIdle), not
/// on every frame.
class MapAddressPickerScreen extends StatefulWidget {
  final (double, double)? initialCenter;
  const MapAddressPickerScreen({super.key, this.initialCenter});

  @override
  State<MapAddressPickerScreen> createState() => _MapAddressPickerScreenState();
}

class _MapAddressPickerScreenState extends State<MapAddressPickerScreen> {
  GoogleMapController? _controller;
  final _searchController = TextEditingController();
  LatLng _center = _defaultCenter;
  String? _address;
  bool _resolving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialCenter != null) {
      _center = LatLng(widget.initialCenter!.$1, widget.initialCenter!.$2);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _resolveAddress());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _resolveAddress() async {
    setState(() => _resolving = true);
    final address = await reverseGeocode(_center.latitude, _center.longitude);
    if (mounted) setState(() {
      _resolving = false;
      _address = address;
    });
  }

  Future<void> _useMyLocation() async {
    final coords = await getCurrentLatLng();
    if (coords == null || !mounted) return;
    final target = LatLng(coords.$1, coords.$2);
    await _controller?.animateCamera(CameraUpdate.newLatLng(target));
  }

  void _confirm() {
    final address = _address;
    if (address == null) return;
    Navigator.of(context).pop((address: address, lat: _center.latitude, lng: _center.longitude));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: AddressAutocompleteField(
          controller: _searchController,
          label: context.t('delivery.mapPicker.searchPlaceholder'),
          onPlaceSelected: ({required address, required lat, required lng}) {
            _controller?.animateCamera(CameraUpdate.newLatLng(LatLng(lat, lng)));
          },
        ),
      ),
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(target: _center, zoom: 16),
            onMapCreated: (controller) => _controller = controller,
            onCameraMove: (position) => _center = position.target,
            onCameraIdle: _resolveAddress,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
          ),
          const IgnorePointer(
            child: Center(
              child: Padding(
                padding: EdgeInsets.only(bottom: 40),
                child: Icon(Icons.place_rounded, size: 44, color: AppColors.red),
              ),
            ),
          ),
          Positioned(
            right: 12,
            bottom: 12,
            child: FloatingActionButton.small(
              onPressed: _useMyLocation,
              backgroundColor: Colors.white,
              child: const Icon(Icons.my_location_rounded, color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: 24,
                child: _resolving
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(
                        _address ?? context.t('delivery.mapPicker.movePinHint'),
                        style: const TextStyle(fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: (_address == null || _resolving) ? null : _confirm,
                  child: Text(context.t('delivery.mapPicker.confirmLocation')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
