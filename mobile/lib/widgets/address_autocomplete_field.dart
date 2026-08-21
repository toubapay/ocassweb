import 'dart:async';
import 'package:flutter/material.dart';
import '../core/places.dart';

/// Dart port of src/components/maps/AddressAutocompleteField.js: wraps a
/// plain TextField (owned by the caller via [controller], same as every
/// other text input in this app) and queries Places Autocomplete
/// (debounced) as the user types, showing suggestions in a dropdown list
/// below the field. Degrades to a plain text field with no dropdown when
/// GOOGLE_MAPS_API_KEY isn't configured - autocompletePlaces() already
/// returns [] in that case, same text-fallback philosophy as the web
/// version.
///
/// [onPlaceSelected] fires only when the user taps a real suggestion (a
/// geocoded place); [onManualEdit] fires on every other keystroke so the
/// caller can clear any previously-captured coordinates, mirroring the
/// web's onTextChange clearing addressCoords.
class AddressAutocompleteField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final void Function({required String address, required double lat, required double lng}) onPlaceSelected;
  final VoidCallback? onManualEdit;
  final String? helperText;

  const AddressAutocompleteField({
    super.key,
    required this.controller,
    required this.label,
    required this.onPlaceSelected,
    this.onManualEdit,
    this.helperText,
  });

  @override
  State<AddressAutocompleteField> createState() => _AddressAutocompleteFieldState();
}

class _AddressAutocompleteFieldState extends State<AddressAutocompleteField> {
  Timer? _debounce;
  List<PlaceSuggestion> _suggestions = [];
  bool _selecting = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChanged);
    _debounce?.cancel();
    super.dispose();
  }

  void _onChanged() {
    if (_selecting) return; // we just set controller.text ourselves below
    widget.onManualEdit?.call();
    _debounce?.cancel();
    final text = widget.controller.text;
    _debounce = Timer(const Duration(milliseconds: 400), () async {
      final results = await autocompletePlaces(text);
      if (mounted) setState(() => _suggestions = results);
    });
  }

  Future<void> _select(PlaceSuggestion s) async {
    setState(() => _suggestions = []);
    final details = await fetchPlaceDetails(s.placeId);
    if (details == null || !mounted) return;
    _selecting = true;
    widget.controller.text = details.address;
    _selecting = false;
    widget.onPlaceSelected(address: details.address, lat: details.lat, lng: details.lng);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: widget.controller,
          decoration: InputDecoration(labelText: widget.label, helperText: widget.helperText),
        ),
        if (_suggestions.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              border: Border.all(color: Theme.of(context).dividerColor),
              borderRadius: BorderRadius.circular(8),
            ),
            constraints: const BoxConstraints(maxHeight: 220),
            child: ListView.builder(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              itemCount: _suggestions.length,
              itemBuilder: (context, i) {
                final s = _suggestions[i];
                return ListTile(
                  dense: true,
                  leading: const Icon(Icons.place_outlined),
                  title: Text(s.description),
                  onTap: () => _select(s),
                );
              },
            ),
          ),
      ],
    );
  }
}
