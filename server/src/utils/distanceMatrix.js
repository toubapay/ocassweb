const { haversineDistanceKm } = require("./geo");

// Server-side key for the Distance Matrix API - deliberately a separate env
// var from the client-side NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (see
// src/hooks/useGoogleMaps.js), even though it's often the same underlying
// Google Cloud key: a server-side key is normally restricted by IP rather
// than HTTP referrer, and must never be baked into a client bundle.
const GOOGLE_MAPS_SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || "";

const DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json";
const REQUEST_TIMEOUT_MS = 4000;

/**
 * Real road-network distance in km via Google's Distance Matrix API, falling
 * back to Haversine (straight-line) distance for every failure mode - no
 * server key configured, network error, timeout, non-OK API/element status -
 * so a pricing request never fails or hangs because of this one HTTP call.
 */
async function roadDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  const fallback = () => haversineDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
  if (!GOOGLE_MAPS_SERVER_KEY) return fallback();

  const url = new URL(DISTANCE_MATRIX_URL);
  url.searchParams.set("origins", `${pickupLat},${pickupLng}`);
  url.searchParams.set("destinations", `${dropoffLat},${dropoffLng}`);
  url.searchParams.set("units", "metric");
  url.searchParams.set("key", GOOGLE_MAPS_SERVER_KEY);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return fallback();
    const data = await res.json();
    const element = data?.rows?.[0]?.elements?.[0];
    if (data.status !== "OK" || !element || element.status !== "OK") return fallback();
    return element.distance.value / 1000; // meters -> km
  } catch {
    return fallback();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { roadDistanceKm };
