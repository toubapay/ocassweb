import { useCallback, useState } from "react";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

const libraries = ["places"];

export default function GooglePlacesAutocomplete({
  label,
  value,
  onChange,
  onPlaceSelected,
  placeholder,
  sx,
  ...props
}) {
  const [autocomplete, setAutocomplete] = useState(null);
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_KEY,
    libraries,
  });

  const handleLoad = useCallback((autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  }, []);

  const handlePlaceChanged = useCallback(() => {
    if (!autocomplete) {
      return;
    }

    const place = autocomplete.getPlace();
    const address = place.formatted_address || place.name || "";
    const location = place.geometry?.location;

    if (onChange) {
      onChange({ target: { value: address } });
    }

    if (onPlaceSelected) {
      onPlaceSelected({
        address,
        coords: location
          ? { lat: location.lat(), lng: location.lng() }
          : null,
      });
    }
  }, [autocomplete, onChange, onPlaceSelected]);

  if (loadError) {
    return (
      <TextField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        sx={sx}
        error
        helperText="Google Maps failed to load"
        {...props}
      />
    );
  }

  if (!isLoaded) {
    return (
      <TextField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        sx={sx}
        InputProps={{
          endAdornment: <CircularProgress size={20} />,
        }}
        {...props}
      />
    );
  }

  return (
    <Autocomplete onLoad={handleLoad} onPlaceChanged={handlePlaceChanged}>
      <TextField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        sx={sx}
        {...props}
      />
    </Autocomplete>
  );
}
