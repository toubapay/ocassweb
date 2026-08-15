import { useEffect, useState } from "react";

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Superset of every library any feature in this app needs from the Google
// Maps JS API (admin zone drawing, delivery address autocomplete, delivery
// live tracking map). The script tag is a page-global singleton and the
// loader warns/misbehaves if you insert it twice with different
// `libraries` query params, so every caller shares this one script load
// instead of requesting its own subset.
const LIBRARIES = "places,drawing,geometry";

let loadState = typeof window !== "undefined" && window.google?.maps ? "ready" : "idle";
const listeners = new Set();

function setLoadState(next) {
  loadState = next;
  listeners.forEach((fn) => fn(next));
}

function ensureScriptLoading() {
  if (loadState !== "idle" || typeof window === "undefined" || !GOOGLE_MAPS_API_KEY) return;
  if (window.google?.maps) {
    setLoadState("ready");
    return;
  }
  const existing = document.getElementById("google-maps-script");
  if (existing) {
    setLoadState("loading");
    existing.addEventListener("load", () => setLoadState("ready"));
    existing.addEventListener("error", () => setLoadState("error"));
    return;
  }
  setLoadState("loading");
  const script = document.createElement("script");
  script.id = "google-maps-script";
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=${LIBRARIES}`;
  script.async = true;
  script.onload = () => setLoadState("ready");
  script.onerror = () => setLoadState("error");
  document.head.appendChild(script);
}

/**
 * Loads the Google Maps JS API on demand and reports "idle" | "loading" |
 * "ready" | "error". Left untested from this sandbox - no network path to
 * maps.googleapis.com here, and no real key to test against either way;
 * every caller has a text/manual fallback for when the key is missing or
 * the script fails to load (see AdminZonesTab.js's manual-JSON boundary
 * entry for the existing precedent).
 */
export default function useGoogleMaps() {
  const [state, setState] = useState(loadState);
  useEffect(() => {
    listeners.add(setState);
    ensureScriptLoading();
    return () => listeners.delete(setState);
  }, []);
  return state;
}
