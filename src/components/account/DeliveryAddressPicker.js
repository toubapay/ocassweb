import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Radio from "@mui/material/Radio";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AddressAutocompleteField from "../maps/AddressAutocompleteField";
import { fetchAddresses, createAddress } from "../../api/account";

/**
 * "Deliver to" - picks one of the customer's saved addresses, or adds one.
 *
 * This is what makes a delivery possible at all: an order with no
 * `deliveryAddressId` cannot be handed to the couriers, because
 * dispatchForDelivery has nowhere to send them. Checkout used to show the
 * customer's name and a note saying an address would be added later, and
 * every order placed was therefore undeliverable.
 *
 * The address goes through Places autocomplete, so a picked suggestion
 * carries lat/lng and the courier fare is a real distance rather than the
 * no-coordinates fallback. Typing a line by hand still works - the field
 * degrades to plain text without a Maps key, and the delivery module
 * already prices that case honestly.
 *
 * `onChange` reports the selected id upward; the parent sends it with the
 * order. The selection defaults to the customer's default address so
 * somebody with exactly one does not have to choose it every time.
 */
export default function DeliveryAddressPicker({ value, onChange }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ label: "", line1: "", city: "Dakar", lat: null, lng: null });

  const { data: addresses, isLoading } = useQuery("addresses", fetchAddresses);

  // Default selection, once: whichever address is marked default, else the
  // first. Re-running on every render would fight a customer who picked a
  // different one.
  useEffect(() => {
    if (value || !addresses?.length) return;
    const preferred = addresses.find((a) => a.isDefault) || addresses[0];
    onChange(preferred.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  const createMutation = useMutation(createAddress, {
    onSuccess: (address) => {
      queryClient.invalidateQueries("addresses");
      onChange(address.id);
      setDialogOpen(false);
      setForm({ label: "", line1: "", city: "Dakar", lat: null, lng: null });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || t("account.address.couldNotSave")),
  });

  const canSave = form.label.trim() && form.line1.trim() && form.city.trim();

  return (
    <Box sx={{ mb: 3 }}>
      {isLoading && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("common.loading")}
        </Typography>
      )}

      {(addresses || []).map((address) => (
        <Box
          key={address.id}
          onClick={() => onChange(address.id)}
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            border: "1px solid",
            borderColor: value === address.id ? "primary.main" : "#EEEEEE",
            bgcolor: value === address.id ? "#F3FBF6" : "transparent",
            borderRadius: 3,
            p: 1.5,
            mb: 1,
            cursor: "pointer",
          }}
        >
          <Radio checked={value === address.id} size="small" sx={{ p: 0, mt: 0.25 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {address.label}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {address.line1}, {address.city}
            </Typography>
            {/* Said plainly, because it decides whether the courier fare
                is a real distance or an estimate. */}
            {address.lat == null && (
              <Typography variant="caption" sx={{ color: "warning.main" }}>
                {t("account.address.noCoords")}
              </Typography>
            )}
          </Box>
        </Box>
      ))}

      {!isLoading && (addresses || []).length === 0 && (
        <Box sx={{ border: "1px dashed #DDD", borderRadius: 3, p: 2, mb: 1, textAlign: "center" }}>
          <HomeRoundedIcon sx={{ color: "text.secondary", fontSize: 26 }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("account.address.noneYet")}
          </Typography>
        </Box>
      )}

      <Button
        size="small"
        startIcon={<AddRoundedIcon />}
        onClick={() => setDialogOpen(true)}
        sx={{ fontWeight: 700 }}
      >
        {t("account.address.add")}
      </Button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{t("account.address.add")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label={t("account.address.label")}
            placeholder={t("account.address.labelPlaceholder")}
            fullWidth
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <AddressAutocompleteField
            label={t("account.address.line1")}
            value={form.line1}
            onTextChange={(line1) =>
              // Typing again drops the coordinates from a previously
              // picked suggestion: they belonged to that place, not this
              // text, and a stale pair would price a courier to the wrong
              // point.
              setForm({ ...form, line1, lat: null, lng: null })
            }
            onPlaceSelected={({ address, lat, lng }) =>
              setForm((prev) => ({ ...prev, line1: address, lat, lng }))
            }
          />
          <TextField
            label={t("account.address.city")}
            fullWidth
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            disabled={!canSave || createMutation.isLoading}
            onClick={() =>
              createMutation.mutate({
                label: form.label.trim(),
                line1: form.line1.trim(),
                city: form.city.trim(),
                ...(form.lat != null ? { lat: form.lat, lng: form.lng } : {}),
              })
            }
            sx={{ fontWeight: 700 }}
          >
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
