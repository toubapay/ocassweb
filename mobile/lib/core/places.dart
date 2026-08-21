import 'package:dio/dio.dart';

/// Compile-time Google Maps/Places API key, mirroring apiBaseUrl's
/// --dart-define pattern (lib/core/constants.dart). Used for the Places
/// Autocomplete/Details REST calls below, which power
/// AddressAutocompleteField (widgets/address_autocomplete_field.dart).
/// This is separate from the native key the GoogleMap widget itself needs
/// (LiveTrackingMap, widgets/live_tracking_map.dart) - the web JS SDK takes
/// one key for both, but native Flutter keeps them apart. See
/// mobile/README.md for the native setup step.
const String googleMapsApiKey = String.fromEnvironment('GOOGLE_MAPS_API_KEY', defaultValue: '');

class PlaceSuggestion {
  final String placeId;
  final String description;
  const PlaceSuggestion({required this.placeId, required this.description});
}

final Dio _placesDio = Dio(BaseOptions(baseUrl: 'https://maps.googleapis.com/maps/api/place'));

/// Senegal-restricted autocomplete, mirroring
/// AddressAutocompleteField.js's `componentRestrictions: { country: "sn" }`.
/// Returns [] on any failure - no key configured, network error, zero
/// results - so callers can treat "no suggestions" uniformly.
Future<List<PlaceSuggestion>> autocompletePlaces(String input) async {
  if (googleMapsApiKey.isEmpty || input.trim().length < 3) return [];
  try {
    final res = await _placesDio.get('/autocomplete/json', queryParameters: {
      'input': input,
      'key': googleMapsApiKey,
      'components': 'country:sn',
    });
    final predictions = (res.data['predictions'] as List?) ?? [];
    return predictions
        .map((p) => PlaceSuggestion(
              placeId: p['place_id'] as String,
              description: p['description'] as String,
            ))
        .toList();
  } catch (_) {
    return [];
  }
}

/// Resolves a place_id (from [autocompletePlaces]) to a formatted address
/// and coordinates.
Future<({String address, double lat, double lng})?> fetchPlaceDetails(String placeId) async {
  if (googleMapsApiKey.isEmpty) return null;
  try {
    final res = await _placesDio.get('/details/json', queryParameters: {
      'place_id': placeId,
      'key': googleMapsApiKey,
      'fields': 'formatted_address,geometry',
    });
    final result = res.data['result'];
    if (result == null) return null;
    final loc = result['geometry']['location'];
    return (
      address: result['formatted_address'] as String,
      lat: (loc['lat'] as num).toDouble(),
      lng: (loc['lng'] as num).toDouble(),
    );
  } catch (_) {
    return null;
  }
}
