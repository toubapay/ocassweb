import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import AddressAutocompleteField from "./AddressAutocompleteField";
import useGoogleMaps from "../../hooks/useGoogleMaps";

const DEFAULT_CENTER = { lat: 14.6928, lng: -17.4467 }; // Dakar

/**
 * "Drag the map under a fixed pin" location picker - the same UX pattern
 * as most ride-hailing/delivery apps, and a genuinely different input mode
 * from AddressAutocompleteField's type-to-search (picking a spot with no
 * exact address, or one that's awkward to type/spell). The two are meant
 * to be offered side by side (see the pickup/dropoff fields in
 * pages/delivery/index.js), not as replacements for each other - this
 * dialog also embeds an AddressAutocompleteField itself, purely to jump
 * the map to a typed place before fine-tuning the pin.
 *
 * The pin is a plain absolutely-positioned icon over the map, not a real
 * google.maps.Marker - only the map underneath it ever moves, so the pin
 * always points at the exact map center. The resolved address updates via
 * reverse geocoding once panning settles (`idle`), not on every frame.
 */
export default function MapAddressPickerDialog({ open, onClose, onConfirm, initialCenter, title }) {
  const { t } = useTranslation();
  const mapNodeRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geocoderRef = useRef(null);
  const status = useGoogleMaps();
  const [address, setAddress] = useState("");
  const [center, setCenter] = useState(initialCenter || DEFAULT_CENTER);
  const [resolving, setResolving] = useState(false);
  const [searchText, setSearchText] = useState("");

  const initMap = useCallback(() => {
    if (mapInstanceRef.current || !mapNodeRef.current || status !== "ready") return;
    const google = window.google;
    const map = new google.maps.Map(mapNodeRef.current, {
      center: initialCenter || DEFAULT_CENTER,
      zoom: 16,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
    });
    mapInstanceRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();

    const reverseGeocode = () => {
      const c = map.getCenter();
      const next = { lat: c.lat(), lng: c.lng() };
      setCenter(next);
      setResolving(true);
      geocoderRef.current.geocode({ location: next }, (results, geoStatus) => {
        setResolving(false);
        if (geoStatus === "OK" && results?.[0]) {
          setAddress(results[0].formatted_address);
        }
      });
    };

    map.addListener("idle", reverseGeocode);
    reverseGeocode();

    // The Dialog's enter transition can still be resizing the paper when
    // the map is first created (its container briefly has a stale/zero
    // size), which makes Maps JS silently render blank tiles - nudge it
    // once the transition has settled to force a redraw against the
    // final layout.
    setTimeout(() => {
      google.maps.event.trigger(map, "resize");
      map.setCenter(initialCenter || DEFAULT_CENTER);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // A plain useRef misses the container's very first mount here: MUI's
  // Dialog/Modal mounts its content asynchronously as it transitions in,
  // one or more renders after `open` flips true, so a `[open, status]`
  // effect can fire before the ref is ever attached. A callback ref calls
  // back exactly when the node is actually attached (or re-attached, e.g.
  // reopening the dialog after it unmounted its content on close), which
  // is the one moment that's actually safe to initialize against.
  const setMapNode = useCallback(
    (node) => {
      mapNodeRef.current = node;
      if (node) initMap();
    },
    [initMap]
  );

  // Covers the other ordering: the container already attached before the
  // Maps script finished loading (status flips "loading" -> "ready" later).
  useEffect(() => {
    if (open) initMap();
  }, [open, initMap]);

  // Dialog unmounts its content on close (default MUI behavior), so the
  // map instance is destroyed with it - reset refs/state for next time it opens.
  useEffect(() => {
    if (!open) {
      mapInstanceRef.current = null;
      mapNodeRef.current = null;
      setAddress("");
      setSearchText("");
    }
  }, [open]);

  const useMyLocation = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      mapInstanceRef.current.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  const handleConfirm = () => {
    onConfirm({ address, lat: center.lat, lng: center.lng });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { height: "85vh" } }}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, borderBottom: "1px solid #EEEEEE" }}>
          <Box sx={{ flex: 1 }}>
            <AddressAutocompleteField
              label={title || t("delivery.mapPicker.searchPlaceholder")}
              size="small"
              fullWidth
              value={searchText}
              onTextChange={setSearchText}
              onPlaceSelected={({ address: picked, lat, lng }) => {
                setSearchText(picked);
                mapInstanceRef.current?.panTo({ lat, lng });
              }}
            />
          </Box>
          <IconButton onClick={onClose}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <Box sx={{ position: "relative", flex: 1 }}>
          <Box ref={setMapNode} sx={{ position: "absolute", inset: 0 }} />
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
            }}
          >
            <PlaceRoundedIcon sx={{ fontSize: 44, color: "#E5484D", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.35))" }} />
          </Box>
          <IconButton
            onClick={useMyLocation}
            sx={{ position: "absolute", right: 12, bottom: 12, bgcolor: "background.paper", boxShadow: 2 }}
          >
            <MyLocationRoundedIcon />
          </IconButton>
        </Box>

        <Box sx={{ p: 1.5, borderTop: "1px solid #EEEEEE" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, minHeight: 24 }}>
            {resolving ? (
              <CircularProgress size={16} />
            ) : (
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {address || t("delivery.mapPicker.movePinHint")}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            fullWidth
            disabled={!address || resolving}
            onClick={handleConfirm}
            sx={{ fontWeight: 800 }}
          >
            {t("delivery.mapPicker.confirmLocation")}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
