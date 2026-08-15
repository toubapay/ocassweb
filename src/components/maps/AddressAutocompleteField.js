import { useEffect, useRef } from "react";
import TextField from "@mui/material/TextField";
import useGoogleMaps from "../../hooks/useGoogleMaps";

// Dakar-ish viewport, used to bias (not restrict) autocomplete results
// toward Senegal so typing "Almadies" doesn't compete with a same-named
// place elsewhere in the world.
const SENEGAL_BOUNDS = { north: 16.7, south: 12.3, east: -11.3, west: -17.6 };

/**
 * A plain TextField that upgrades itself into a Google Places Autocomplete
 * field once the Maps script is ready - "auto pick" an address from real
 * suggestions instead of free-typing one the backend can never geocode
 * (see server/src/utils/geo.js's hasCoordinates comment). Falls back to an
 * ordinary text field when there's no Maps API key configured (same
 * text-fallback philosophy as AdminZonesTab's manual boundary entry) -
 * typing still works, it just never produces coordinates on its own.
 *
 * `onPlaceSelected({ address, lat, lng })` fires only when the user picks a
 * suggestion (a real geocoded place); `onTextChange(value)` fires on every
 * keystroke so the field stays controlled and free-typed addresses (with
 * no coordinates) are still submittable.
 */
export default function AddressAutocompleteField({
  label,
  value,
  onTextChange,
  onPlaceSelected,
  ...textFieldProps
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const status = useGoogleMaps();

  useEffect(() => {
    if (status !== "ready" || !inputRef.current || autocompleteRef.current) return;
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "sn" },
      fields: ["formatted_address", "name", "geometry"],
      bounds: SENEGAL_BOUNDS,
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;
      if (!location) return; // user hit Enter on free text with no match
      const address = place.formatted_address || place.name || "";
      onTextChange(address);
      onPlaceSelected({ address, lat: location.lat(), lng: location.lng() });
    });
    autocompleteRef.current = autocomplete;
  }, [status, onTextChange, onPlaceSelected]);

  return (
    <TextField
      {...textFieldProps}
      label={label}
      value={value}
      onChange={(e) => onTextChange(e.target.value)}
      inputRef={inputRef}
      autoComplete="off"
    />
  );
}
