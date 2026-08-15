import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import {
  fetchAdminProviders,
  createAdminProvider,
  updateAdminProvider,
  deleteAdminProvider,
} from "../../api/admin";

const SMS_CONFIG_EXAMPLE = JSON.stringify(
  {
    method: "POST",
    url: "https://api.example.com/sms/send",
    headers: { Authorization: "Bearer sk_live_..." },
    bodyType: "json",
    body: { to: "{phone}", text: "{message}", sender: "OCASS" },
  },
  null,
  2
);

// A.A.S "Assurance Digitale" (Sénégal, branche AUTOMOBILE) - read directly
// by server/src/modules/insurance/aasClient.js, unlike SMS's freeform
// request-template config. garantieOptPT is a tariff choice (which
// personnes-transportées option to buy whenever a policy includes that
// guarantee), not a technical value - see aasGuarantees.js.
const AAS_CONFIG_EXAMPLE = JSON.stringify(
  {
    partner: "your-aas-partner-name",
    accessToken: "your-aas-access-token",
    username: "token",
    police: "",
    baseUrl: "https://manager.lasecu-assurances.sn",
    timeoutMs: 15000,
    garantieOptPT: "OPTION_1",
    monoIssuePath: "qrcode.request",
  },
  null,
  2
);

const CONFIG_EXAMPLES = {
  SMS: SMS_CONFIG_EXAMPLE,
  INSURANCE_AAS: AAS_CONFIG_EXAMPLE,
};

const CATEGORY_PRESETS = [
  "SMS",
  "PAYMENT",
  "MAPS",
  "EMAIL",
  "FIREBASE",
  "OPENAI",
  "GEMINI",
  "CLAUDE",
  "INSURANCE_AAS",
];

export default function AdminProvidersTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState("SMS");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(true);
  const [configJson, setConfigJson] = useState(SMS_CONFIG_EXAMPLE);
  const [jsonError, setJsonError] = useState(null);

  const { data: providers, isLoading } = useQuery("admin-providers", () => fetchAdminProviders());

  const createMutation = useMutation(createAdminProvider, {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-providers");
      toast.success(t("admin.providers.created"));
      setName("");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.providers.saveFailed")),
  });

  const toggleMutation = useMutation(
    ({ id, payload }) => updateAdminProvider(id, payload),
    { onSuccess: () => queryClient.invalidateQueries("admin-providers") }
  );

  const deleteMutation = useMutation(deleteAdminProvider, {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-providers");
      toast.success(t("admin.providers.deleted"));
    },
  });

  const handleCreate = () => {
    let config;
    try {
      config = JSON.parse(configJson);
      setJsonError(null);
    } catch (err) {
      setJsonError(err.message);
      return;
    }
    if (!name.trim()) {
      toast.error(t("admin.providers.nameRequired"));
      return;
    }
    createMutation.mutate({ category, name: name.trim(), isActive, isDefault, config });
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.providers.newProvider")}
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        {t("admin.providers.smsHint")}
      </Alert>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 1.5 }}>
        <Autocomplete
          freeSolo
          options={CATEGORY_PRESETS}
          value={category}
          onInputChange={(e, v) => {
            // Swap the example JSON when switching category, but only if
            // the field still holds a known example (not something the
            // admin already started editing).
            if (Object.values(CONFIG_EXAMPLES).includes(configJson) && CONFIG_EXAMPLES[v]) {
              setConfigJson(CONFIG_EXAMPLES[v]);
            }
            setCategory(v);
          }}
          size="small"
          sx={{ minWidth: 160 }}
          renderInput={(params) => <TextField {...params} label={t("admin.providers.category")} />}
        />
        <TextField
          size="small"
          label={t("admin.providers.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ProMobile"
          sx={{ minWidth: 200 }}
        />
        <FormControlLabel
          control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
          label={t("admin.providers.active")}
        />
        <FormControlLabel
          control={<Switch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />}
          label={t("admin.providers.default")}
        />
      </Box>

      <TextField
        multiline
        minRows={8}
        fullWidth
        value={configJson}
        onChange={(e) => setConfigJson(e.target.value)}
        error={!!jsonError}
        helperText={jsonError || t("admin.providers.configHelp")}
        sx={{ mb: 2, fontFamily: "monospace" }}
        InputProps={{ sx: { fontFamily: "monospace", fontSize: 13 } }}
      />

      <Button variant="contained" disabled={createMutation.isLoading} onClick={handleCreate} sx={{ mb: 3 }}>
        {t("admin.providers.save")}
      </Button>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.providers.existing")}
      </Typography>
      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (
        (providers || []).map((p) => (
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
                {p.name} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>({p.category})</Typography>
              </Typography>
              {p.isDefault && (
                <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
                  {t("admin.providers.defaultBadge")}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                checked={p.isActive}
                onChange={(e) => toggleMutation.mutate({ id: p.id, payload: { isActive: e.target.checked } })}
              />
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
