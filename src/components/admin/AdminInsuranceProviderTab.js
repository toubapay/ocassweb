import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import {
  fetchAdminProviders,
  createAdminProvider,
  updateAdminProvider,
  deleteAdminProvider,
} from "../../api/admin";

const CATEGORY = "INSURANCE_AAS";

// OPTION_1 (1200 FCFA) .. OPTION_5 (3000 FCFA) - which "personnes
// transportées" option a policy is charged whenever a tier includes that
// guarantee. See server/src/constants/aasGuarantees.js - this is a
// tariff decision, not a technical default, which is why it lives here
// as an explicit admin choice rather than a hardcoded value.
const GARANTIE_OPT_PT_CHOICES = [
  { value: "", label: "—" },
  { value: "OPTION_1", label: "OPTION_1 (1 200 FCFA)" },
  { value: "OPTION_2", label: "OPTION_2 (1 500 FCFA)" },
  { value: "OPTION_3", label: "OPTION_3 (2 000 FCFA)" },
  { value: "OPTION_4", label: "OPTION_4 (2 400 FCFA)" },
  { value: "OPTION_5", label: "OPTION_5 (3 000 FCFA)" },
];

const emptyForm = {
  id: null,
  name: "",
  isActive: true,
  isDefault: true,
  partner: "",
  accessToken: "",
  username: "token",
  police: "",
  baseUrl: "",
  timeoutMs: "15000",
  garantieOptPT: "",
};

// Structured admin UI for AAS's Provider row (category INSURANCE_AAS) -
// same underlying generic Provider model the SMS/PAYMENT/etc. presets
// use, but with dedicated fields instead of a raw JSON textarea, since
// aasClient.js reads a fixed, documented set of keys out of `config`
// (see resolveCredentials there) rather than a freeform request template.
export default function AdminInsuranceProviderTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: providers, isLoading } = useQuery(["admin-providers", CATEGORY], () =>
    fetchAdminProviders(CATEGORY)
  );

  const invalidate = () => queryClient.invalidateQueries(["admin-providers", CATEGORY]);

  const createMutation = useMutation(createAdminProvider, {
    onSuccess: () => {
      invalidate();
      toast.success(t("admin.insuranceProvider.saved"));
      setForm(emptyForm);
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.insuranceProvider.saveFailed")),
  });

  const updateMutation = useMutation(({ id, payload }) => updateAdminProvider(id, payload), {
    onSuccess: () => {
      invalidate();
      toast.success(t("admin.insuranceProvider.saved"));
      setForm(emptyForm);
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.insuranceProvider.saveFailed")),
  });

  const toggleMutation = useMutation(({ id, payload }) => updateAdminProvider(id, payload), {
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation(deleteAdminProvider, {
    onSuccess: () => {
      invalidate();
      toast.success(t("admin.insuranceProvider.deleted"));
      setForm((f) => (f.id ? emptyForm : f));
    },
  });

  const loadIntoForm = (provider) => {
    const config = provider.config || {};
    setForm({
      id: provider.id,
      name: provider.name,
      isActive: provider.isActive,
      isDefault: provider.isDefault,
      partner: config.partner || "",
      accessToken: config.accessToken || "",
      username: config.username || "token",
      police: config.police || "",
      baseUrl: config.baseUrl || "",
      timeoutMs: String(config.timeoutMs || "15000"),
      garantieOptPT: config.garantieOptPT || "",
    });
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.partner.trim() || !form.accessToken.trim() || !form.baseUrl.trim()) {
      toast.error(t("admin.insuranceProvider.requiredFields"));
      return;
    }
    const config = {
      partner: form.partner.trim(),
      accessToken: form.accessToken.trim(),
      username: form.username.trim() || "token",
      police: form.police.trim(),
      baseUrl: form.baseUrl.trim(),
      timeoutMs: Number(form.timeoutMs) || 15000,
      ...(form.garantieOptPT ? { garantieOptPT: form.garantieOptPT } : {}),
    };
    const payload = { category: CATEGORY, name: form.name.trim(), isActive: form.isActive, isDefault: form.isDefault, config };
    if (form.id) {
      updateMutation.mutate({ id: form.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {form.id ? t("admin.insuranceProvider.editTitle") : t("admin.insuranceProvider.newTitle")}
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        {t("admin.insuranceProvider.hint")}
      </Alert>

      <TextField
        label={t("admin.insuranceProvider.name")}
        fullWidth
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="AAS Production"
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
        <TextField
          label={t("admin.insuranceProvider.partner")}
          value={form.partner}
          onChange={(e) => setForm({ ...form, partner: e.target.value })}
          helperText={t("admin.insuranceProvider.partnerHelp")}
          sx={{ flex: 1 }}
        />
        <TextField
          label={t("admin.insuranceProvider.accessToken")}
          type="password"
          value={form.accessToken}
          onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
          sx={{ flex: 1 }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
        <TextField
          label={t("admin.insuranceProvider.username")}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          sx={{ flex: 1 }}
        />
        <TextField
          label={t("admin.insuranceProvider.police")}
          value={form.police}
          onChange={(e) => setForm({ ...form, police: e.target.value })}
          helperText={t("admin.insuranceProvider.policeHelp")}
          sx={{ flex: 1 }}
        />
      </Box>

      <TextField
        label={t("admin.insuranceProvider.baseUrl")}
        fullWidth
        value={form.baseUrl}
        onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
        placeholder="https://manager.lasecu-assurances.sn"
        helperText={t("admin.insuranceProvider.baseUrlHelp")}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
        <TextField
          label={t("admin.insuranceProvider.timeoutMs")}
          type="number"
          value={form.timeoutMs}
          onChange={(e) => setForm({ ...form, timeoutMs: e.target.value })}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label={t("admin.insuranceProvider.garantieOptPT")}
          value={form.garantieOptPT}
          onChange={(e) => setForm({ ...form, garantieOptPT: e.target.value })}
          helperText={t("admin.insuranceProvider.garantieOptPTHelp")}
          sx={{ flex: 1 }}
        >
          {GARANTIE_OPT_PT_CHOICES.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <FormControlLabel
          control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
          label={t("admin.providers.active")}
        />
        <FormControlLabel
          control={<Switch checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />}
          label={t("admin.providers.default")}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1, mb: 4 }}>
        <Button variant="contained" disabled={isSaving} onClick={handleSave} sx={{ fontWeight: 700 }}>
          {form.id ? t("admin.insuranceProvider.saveChanges") : t("admin.providers.save")}
        </Button>
        {form.id && (
          <Button onClick={() => setForm(emptyForm)} sx={{ fontWeight: 700 }}>
            {t("admin.insuranceProvider.cancelEdit")}
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.providers.existing")}
      </Typography>
      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : !providers?.length ? (
        <Typography sx={{ color: "text.secondary" }}>{t("admin.insuranceProvider.none")}</Typography>
      ) : (
        providers.map((p) => (
          <Box
            key={p.id}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 1,
              px: 2,
              mb: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700 }}>
                {p.name}{" "}
                <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                  ({p.config?.partner || t("admin.insuranceProvider.noPartner")})
                </Typography>
              </Typography>
              {p.isDefault && (
                <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700, display: "block" }}>
                  {t("admin.providers.defaultBadge")}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                checked={p.isActive}
                onChange={(e) => toggleMutation.mutate({ id: p.id, payload: { isActive: e.target.checked } })}
              />
              <IconButton size="small" onClick={() => loadIntoForm(p)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => deleteMutation.mutate(p.id)}>
                <DeleteRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}
