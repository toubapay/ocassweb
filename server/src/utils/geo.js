const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in km between two lat/lng points (Haversine formula). */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * True when all four coordinates are present and usable for a real
 * distance calculation. Both pickup and dropoff need real coordinates -
 * this backend never geocodes an address itself, so a typed address only
 * has coordinates if the client supplied them directly: either via the
 * browser's Geolocation API (rideshare, and delivery's "use my location"),
 * or by picking a real suggestion from delivery's Google Places
 * Autocomplete field (see AddressAutocompleteField.js), which resolves to
 * a geocoded lat/lng client-side before the request ever reaches here.
 */
function hasCoordinates(...values) {
  return values.every((v) => typeof v === "number" && Number.isFinite(v));
}

module.exports = { haversineDistanceKm, hasCoordinates };
