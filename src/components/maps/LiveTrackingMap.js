import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import useGoogleMaps, { GOOGLE_MAPS_API_KEY } from "../../hooks/useGoogleMaps";

const PIN_COLORS = { pickup: "#0FAE58", dropoff: "#E5484D", agent: "#3B82F6" };

function pinIcon(color) {
  return {
    path: "M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 1.5,
    scale: 1.4,
    anchor: typeof window !== "undefined" && window.google ? new window.google.maps.Point(12, 22) : undefined,
  };
}

function agentIcon() {
  return {
    path: "M12 2a1 1 0 011 1v1.06A8.004 8.004 0 0119.94 11H21a1 1 0 010 2h-1.06A8.004 8.004 0 0113 19.94V21a1 1 0 01-2 0v-1.06A8.004 8.004 0 014.06 13H3a1 1 0 010-2h1.06A8.004 8.004 0 0111 4.06V3a1 1 0 011-1zm0 4a6 6 0 100 12 6 6 0 000-12zm0 3a3 3 0 110 6 3 3 0 010-6z",
    fillColor: PIN_COLORS.agent,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 1,
    scale: 1.1,
    anchor: typeof window !== "undefined" && window.google ? new window.google.maps.Point(12, 12) : undefined,
  };
}

/**
 * Live tracking map for one delivery job: static pickup/dropoff pins plus
 * a moving marker for the agent's last-reported GPS position (see
 * PATCH /delivery/jobs/:id/location). Bounds are fit once on first render
 * from whatever points exist yet, then left alone - re-fitting on every
 * poll would re-zoom/re-pan under the user's thumb as the agent moves.
 * The agent marker itself is updated in place via setPosition() as new
 * `agent` coordinates arrive.
 *
 * No route line / ETA: this app has no Directions API integration, and a
 * straight line or a guessed travel time would be fabricated rather than
 * real - see the distance shown alongside the map instead, which is a
 * true haversine calculation the same way delivery/rideshare pricing is.
 */
export default function LiveTrackingMap({ pickup, dropoff, agent, height = 280 }) {
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const status = useGoogleMaps();

  useEffect(() => {
    if (status !== "ready" || !mapRef.current || mapInstanceRef.current) return;
    const google = window.google;
    const map = new google.maps.Map(mapRef.current, {
      center: pickup || dropoff || { lat: 14.6928, lng: -17.4467 },
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    const bounds = new google.maps.LatLngBounds();
    if (pickup) {
      markersRef.current.pickup = new google.maps.Marker({
        position: pickup,
        map,
        icon: pinIcon(PIN_COLORS.pickup),
      });
      bounds.extend(pickup);
    }
    if (dropoff) {
      markersRef.current.dropoff = new google.maps.Marker({
        position: dropoff,
        map,
        icon: pinIcon(PIN_COLORS.dropoff),
      });
      bounds.extend(dropoff);
    }
    if (agent) {
      markersRef.current.agent = new google.maps.Marker({
        position: agent,
        map,
        icon: agentIcon(),
      });
      bounds.extend(agent);
    }
    if (!bounds.isEmpty()) {
      if (pickup && dropoff && (!agent || (pickup.lat === dropoff.lat && pickup.lng === dropoff.lng))) {
        map.setCenter(bounds.getCenter());
      }
      map.fitBounds(bounds, 48);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Move the agent marker in place on every new position, creating it on
  // first appearance (a job can go from "no agent yet" to "agent assigned"
  // while this component stays mounted).
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !agent) return;
    if (markersRef.current.agent) {
      markersRef.current.agent.setPosition(agent);
    } else {
      markersRef.current.agent = new window.google.maps.Marker({
        position: agent,
        map,
        icon: agentIcon(),
      });
    }
  }, [agent]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        {t("delivery.tracking.noMapKey")}
      </Alert>
    );
  }
  if (status === "error") {
    return <Alert severity="warning" sx={{ borderRadius: 2 }}>{t("delivery.tracking.mapError")}</Alert>;
  }
  if (status !== "ready") {
    return <Alert severity="info" sx={{ borderRadius: 2 }}>{t("delivery.tracking.mapLoading")}</Alert>;
  }
  return <Box ref={mapRef} sx={{ height, borderRadius: 2, overflow: "hidden" }} />;
}
