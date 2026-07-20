import 'package:geolocator/geolocator.dart';

/// Returns the device's current (lat, lng), or null if location services
/// are off or permission was denied - mirrors the web app's
/// `navigator.geolocation.getCurrentPosition` usage (delivery/index.js,
/// ride-sharing/index.js): pickup-only, no geocoding/reverse-geocoding,
/// since there's no maps API key configured anywhere in this app.
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
