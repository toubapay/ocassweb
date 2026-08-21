import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Divider from "@mui/material/Divider";
import { fetchAdminModules, updateAdminModule } from "../../api/admin";

// Only modules with real fee math wired up server-side get an editor here
// (see estimatePrice in delivery.controller.js / rideshare.controller.js,
// suggestPrice in anando.service.js, and payoutVendorsForOrder /
// payoutOwnerForOrder in vendor.service.js / restaurant.service.js) -
// every other module only has the enable/disable toggle above, since a fee
// editor for a module with nothing reading it would just be decorative.
//
// `feeType`/`fixed`/`perKm` describe modules with a distance-based price
// the admin can switch between a flat fee and a per-km rate (delivery,
// rideshare, and - advisory only, since Anando's price is normally
// driver-set - anando). `bounds` adds a min/max clamp applied to whatever
// the formula (or the driver, for anando) comes up with. `other` is every
// module's plain always-visible fields (commission shares, etc).
const FEE_EDITORS = {
  delivery: {
    feeType: true,
    fixed: [{ key: "fixedFee", label: "Fixed fee (CFA)" }],
    perKm: [
      { key: "baseFare", label: "Base fare (CFA)" },
      { key: "ratePerKm", label: "Rate per km (CFA)" },
    ],
    bounds: true,
    other: [{ key: "agentSharePercent", label: "Agent share (%)" }],
  },
  rideshare: {
    feeType: true,
    fixed: [
      { key: "fixedFareByVehicle.MOTO", label: "Fixed fare - Moto (CFA)" },
      { key: "fixedFareByVehicle.ECONOMY", label: "Fixed fare - Economy (CFA)" },
      { key: "fixedFareByVehicle.COMFORT", label: "Fixed fare - Comfort (CFA)" },
    ],
    perKm: [
      { key: "baseFare", label: "Base fare (CFA)" },
      { key: "ratePerKmByVehicle.MOTO", label: "Rate/km - Moto (CFA)" },
      { key: "ratePerKmByVehicle.ECONOMY", label: "Rate/km - Economy (CFA)" },
      { key: "ratePerKmByVehicle.COMFORT", label: "Rate/km - Comfort (CFA)" },
    ],
    bounds: true,
    other: [{ key: "riderSharePercent", label: "Rider share (%)" }],
  },
  anando: {
    feeType: true,
    feeTypeHint: "Advisory only - Anando's price is normally set by the driver. This only feeds the posting form's \"Suggest price\" action and the min/max below.",
    fixed: [{ key: "fixedFee", label: "Suggested fixed fee (CFA)" }],
    perKm: [
      { key: "baseFare", label: "Base fare (CFA)" },
      { key: "ratePerKm", label: "Rate per km (CFA)" },
    ],
    bounds: true,
    boundsHint: "Enforced: a driver's entered price is clamped into this range.",
    other: [{ key: "driverSharePercent", label: "Driver share (%)" }],
  },
  vendor: { other: [{ key: "vendorSharePercent", label: "Vendor share (%)" }] },
  restaurant: { other: [{ key: "ownerSharePercent", label: "Restaurant owner share (%)" }] },
};

function getAtPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function setAtPath(obj, path, value) {
  const keys = path.split(".");
  const result = { ...obj };
  let cursor = result;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      cursor[k] = value;
    } else {
      cursor[k] = { ...(cursor[k] || {}) };
      cursor = cursor[k];
    }
  });
  return result;
}

function NumberField({ field, values, setValues }) {
  return (
    <TextField
      key={field.key}
      label={field.label}
      type="number"
      value={getAtPath(values, field.key) ?? ""}
      onChange={(e) =>
        setValues((v) => setAtPath(v, field.key, e.target.value === "" ? undefined : Number(e.target.value)))
      }
      fullWidth
    />
  );
}

function FeeDialog({ module: mod, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(mod.feeConfig || {});
  const editor = FEE_EDITORS[mod.key];
  const feeType = values.feeType ?? "PER_KM";

  const mutation = useMutation(() => updateAdminModule(mod.key, { feeConfig: values }), {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-modules");
      toast.success(t("admin.modules.feesSaved"));
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.modules.feesSaveFailed")),
  });

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("admin.modules.editFees", { module: mod.label })}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {editor.feeType && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Fee type
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={feeType}
              onChange={(e, v) => v && setValues((cur) => ({ ...cur, feeType: v }))}
              sx={{ mt: 0.5, mb: editor.feeTypeHint ? 0.5 : 0 }}
            >
              <ToggleButton value="FIXED">Fixed</ToggleButton>
              <ToggleButton value="PER_KM">Per km</ToggleButton>
            </ToggleButtonGroup>
            {editor.feeTypeHint && (
              <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                {editor.feeTypeHint}
              </Typography>
            )}
          </Box>
        )}

        {editor.feeType
          ? (feeType === "FIXED" ? editor.fixed : editor.perKm).map((field) => (
              <NumberField key={field.key} field={field} values={values} setValues={setValues} />
            ))
          : null}

        {editor.bounds && (
          <>
            <Divider />
            <Box sx={{ display: "flex", gap: 2 }}>
              <NumberField field={{ key: "minFee", label: "Minimum fee (CFA)" }} values={values} setValues={setValues} />
              <NumberField field={{ key: "maxFee", label: "Maximum fee (CFA)" }} values={values} setValues={setValues} />
            </Box>
            {editor.boundsHint && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {editor.boundsHint}
              </Typography>
            )}
          </>
        )}

        {editor.other?.length > 0 && (
          <>
            {(editor.feeType || editor.bounds) && <Divider />}
            {editor.other.map((field) => (
              <NumberField key={field.key} field={field} values={values} setValues={setValues} />
            ))}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="contained" disabled={mutation.isLoading} onClick={() => mutation.mutate()}>
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminModulesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [feeModule, setFeeModule] = useState(null);

  const { data: modules, isLoading } = useQuery("admin-modules", fetchAdminModules);

  const toggleMutation = useMutation(
    ({ key, enabled }) => updateAdminModule(key, { enabled }),
    {
      onSuccess: () => queryClient.invalidateQueries("admin-modules"),
      onError: (err) => toast.error(err.response?.data?.message || t("admin.modules.toggleFailed")),
    }
  );

  if (isLoading) {
    return <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>;
  }

  return (
    <Box>
      {(modules || []).map((mod) => (
        <Box
          key={mod.key}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 1.5,
            px: 2,
            mb: 1,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{mod.label}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {mod.key}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {FEE_EDITORS[mod.key] && (
              <Button size="small" variant="outlined" onClick={() => setFeeModule(mod)}>
                {t("admin.modules.fees")}
              </Button>
            )}
            <Switch
              checked={mod.enabled}
              disabled={toggleMutation.isLoading}
              onChange={(e) => toggleMutation.mutate({ key: mod.key, enabled: e.target.checked })}
            />
          </Box>
        </Box>
      ))}

      {feeModule && <FeeDialog module={feeModule} onClose={() => setFeeModule(null)} />}
    </Box>
  );
}
