import 'dart:math' as math;
import 'package:geolocator/geolocator.dart';

/// Returns the device's current (lat, lng), or null if location services
/// are off or permission was denied - mirrors the web app's
/// `navigator.geolocation.getCurrentPosition` usage (delivery/index.js,
/// ride-sharing/index.js). Plain GPS only - address-to-coordinates
/// geocoding is handled separately by core/places.dart's Places
/// Autocomplete/Details calls.
Future<(double, double)?> getCurrentLatLng() async {
  final serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) return null;

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.denied ||
      permission == LocationPermission.deniedForever) {
    return null;
  }

  final position = await Geolocator.getCurrentPosition(
    locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
  );
  return (position.latitude, position.longitude);
}

const _earthRadiusKm = 6371.0;

double _toRad(double deg) => deg * math.pi / 180;

/// Great-circle distance in km between two lat/lng points (Haversine
/// formula) - Dart port of server/src/utils/geo.js's haversineDistanceKm,
/// used by the delivery tracking screen to show "X km from the dropoff".
double haversineDistanceKm(double lat1, double lng1, double lat2, double lng2) {
  final dLat = _toRad(lat2 - lat1);
  final dLng = _toRad(lng2 - lng1);
  final a = math.pow(math.sin(dLat / 2), 2) +
      math.cos(_toRad(lat1)) * math.cos(_toRad(lat2)) * math.pow(math.sin(dLng / 2), 2);
  final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  return _earthRadiusKm * c;
}
