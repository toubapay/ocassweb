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
 * there's no geocoding in this app (no maps/geocoding API key configured),
 * so a typed address alone never has coordinates unless the caller
 * supplied them directly (e.g. via the browser's Geolocation API).
 */
function hasCoordinates(...values) {
  return values.every((v) => typeof v === "number" && Number.isFinite(v));
}

module.exports = { haversineDistanceKm, hasCoordinates };
