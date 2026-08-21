import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import AddressAutocompleteField from "../maps/AddressAutocompleteField";
import { setDeliveryLocation } from "../../redux/slices/locationSlice";

/**
 * Opened from the home screen's AddressBar - lets the user either pick a
 * real Google Places suggestion (auto pick, geocoded) or use the device's
 * actual GPS position, reverse-geocoded to a short label via
 * google.maps.Geocoder. Both paths dispatch the same setDeliveryLocation
 * action, persisted via redux-persist so it survives a reload.
 */
export default function DeliveryAddressDialog({ open, onClose }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const handlePlaceSelected = ({ address: picked, lat, lng }) => {
    dispatch(setDeliveryLocation({ address: picked, lat, lng }));
    setAddress("");
    onClose();
  };

  const applyDetectedPosition = (lat, lng) => {
    if (window.google?.maps) {
      new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
        setLocating(false);
        const label =
          status === "OK" && results?.[0]
            ? results[0].formatted_address
            : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        dispatch(setDeliveryLocation({ address: label, lat, lng }));
        onClose();
      });
      return;
    }
    setLocating(false);
    dispatch(setDeliveryLocation({ address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng }));
    onClose();
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError(t("common.locationError"));
      return;
    }
    setError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => applyDetectedPosition(pos.coords.latitude, pos.coords.longitude),
      () => {
        setLocating(false);
        setError(t("common.locationError"));
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("common.setDeliveryAddress")}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
          <AddressAutocompleteField
            label={t("common.deliveryAddress")}
            fullWidth
            value={address}
            onTextChange={setAddress}
            onPlaceSelected={handlePlaceSelected}
          />
          <Button
            variant="outlined"
            startIcon={<MyLocationRoundedIcon />}
            onClick={handleUseMyLocation}
            disabled={locating}
          >
            {locating ? t("common.loading") : t("common.useMyLocation")}
          </Button>
          {error && (
            <Typography variant="caption" sx={{ color: "error.main" }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
}
