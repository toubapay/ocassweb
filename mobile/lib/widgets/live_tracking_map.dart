import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Dart port of src/components/maps/LiveTrackingMap.js: plots pickup/
/// dropoff/agent pins and fits the camera to them once on creation (and
/// again whenever the points actually change value - Dart 3 records give
/// (double,double) structural equality for free, so a plain != comparison
/// in didUpdateWidget is enough, no custom equals needed). No route/
/// Directions line, same as the web version, by design.
///
/// Unlike the web version, there's no API key parameter here - the
/// GoogleMap widget is gated entirely by native platform config
/// (AndroidManifest.xml meta-data / GMSServices.provideAPIKey - see
/// mobile/README.md), not anything passed from Dart.
class LiveTrackingMap extends StatefulWidget {
  final (double, double)? pickup;
  final (double, double)? dropoff;
  final (double, double)? agent;
  final double height;

  const LiveTrackingMap({
    super.key,
    this.pickup,
    this.dropoff,
    this.agent,
    this.height = 220,
  });

  @override
  State<LiveTrackingMap> createState() => _LiveTrackingMapState();
}

class _LiveTrackingMapState extends State<LiveTrackingMap> {
  GoogleMapController? _controller;

  Set<Marker> get _markers => {
        if (widget.pickup != null)
          Marker(
            markerId: const MarkerId('pickup'),
            position: LatLng(widget.pickup!.$1, widget.pickup!.$2),
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          ),
        if (widget.dropoff != null)
          Marker(
            markerId: const MarkerId('dropoff'),
            position: LatLng(widget.dropoff!.$1, widget.dropoff!.$2),
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          ),
        if (widget.agent != null)
          Marker(
            markerId: const MarkerId('agent'),
            position: LatLng(widget.agent!.$1, widget.agent!.$2),
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          ),
      };

  LatLngBounds? get _bounds {
    final points = [widget.pickup, widget.dropoff, widget.agent].whereType<(double, double)>().toList();
    if (points.isEmpty) return null;
    double minLat = points.first.$1, maxLat = points.first.$1;
    double minLng = points.first.$2, maxLng = points.first.$2;
    for (final p in points) {
      if (p.$1 < minLat) minLat = p.$1;
      if (p.$1 > maxLat) maxLat = p.$1;
      if (p.$2 < minLng) minLng = p.$2;
      if (p.$2 > maxLng) maxLng = p.$2;
    }
    return LatLngBounds(southwest: LatLng(minLat, minLng), northeast: LatLng(maxLat, maxLng));
  }

  void _fitBounds() {
    final bounds = _bounds;
    if (bounds == null || _controller == null) return;
    _controller!.animateCamera(CameraUpdate.newLatLngBounds(bounds, 48));
  }

  @override
  void didUpdateWidget(covariant LiveTrackingMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.pickup != widget.pickup ||
        oldWidget.dropoff != widget.dropoff ||
        oldWidget.agent != widget.agent) {
      _fitBounds();
    }
  }

  @override
  Widget build(BuildContext context) {
    final points = [widget.pickup, widget.dropoff, widget.agent].whereType<(double, double)>();
    final initial = points.isNotEmpty ? points.first : (14.6928, -17.4467); // Dakar
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: widget.height,
        child: GoogleMap(
          initialCameraPosition: CameraPosition(target: LatLng(initial.$1, initial.$2), zoom: 13),
          markers: _markers,
          onMapCreated: (controller) {
            _controller = controller;
            WidgetsBinding.instance.addPostFrameCallback((_) => _fitBounds());
          },
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
        ),
      ),
    );
  }
}
