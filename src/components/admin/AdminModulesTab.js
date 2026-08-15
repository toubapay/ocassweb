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
import { fetchAdminModules, updateAdminModule } from "../../api/admin";

// Only modules with real fee math wired up server-side get an editor here
// (see estimatePrice in delivery.controller.js / rideshare.controller.js,
// and payoutVendorsForOrder / payoutOwnerForOrder in vendor.service.js /
// restaurant.service.js) - every other module only has the enable/disable
// toggle above, since a fee editor for a module with nothing reading it
// would just be decorative.
const FEE_EDITORS = {
  delivery: [
    { key: "baseFare", label: "Base fare (CFA)" },
    { key: "ratePerKm", label: "Rate per km (CFA)" },
    { key: "agentSharePercent", label: "Agent share (%)" },
  ],
  rideshare: [
    { key: "baseFare", label: "Base fare (CFA)" },
    { key: "riderSharePercent", label: "Rider share (%)" },
    { key: "ratePerKmByVehicle.MOTO", label: "Rate/km - Moto (CFA)" },
    { key: "ratePerKmByVehicle.ECONOMY", label: "Rate/km - Economy (CFA)" },
    { key: "ratePerKmByVehicle.COMFORT", label: "Rate/km - Comfort (CFA)" },
  ],
  vendor: [{ key: "vendorSharePercent", label: "Vendor share (%)" }],
  restaurant: [{ key: "ownerSharePercent", label: "Restaurant owner share (%)" }],
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

function FeeDialog({ module: mod, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(mod.feeConfig || {});

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
        {FEE_EDITORS[mod.key].map((field) => (
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
        ))}
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
