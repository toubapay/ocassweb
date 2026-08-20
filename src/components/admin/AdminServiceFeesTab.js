import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import { fetchAdminServiceFees, upsertAdminServiceFee } from "../../api/admin";

// One row per service, with its fee/TVA editable inline (no per-row
// dialog - there can be dozens of mobile services/forfaits, and a modal
// per edit would be a lot of clicks for what's usually a quick "turn this
// on and set two numbers" edit). Local state until Save is pressed, reset
// from the server value on every successful save via query invalidation.
function ServiceFeeRow({ service }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(service);

  const mutation = useMutation(() => upsertAdminServiceFee({ ...service, ...values }), {
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-service-fees", service.moduleKey]);
      toast.success(t("admin.serviceFees.saved"));
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.serviceFees.saveFailed")),
  });

  const dirty =
    values.feeEnabled !== service.feeEnabled ||
    values.feeType !== service.feeType ||
    values.feeValue !== service.feeValue ||
    values.taxEnabled !== service.taxEnabled ||
    values.taxRatePercent !== service.taxRatePercent;

  return (
    <Box
      sx={{
        py: 1.5,
        px: 2,
        mb: 1,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Typography sx={{ fontWeight: 700, mb: 1 }}>{service.label}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Switch
            size="small"
            checked={values.feeEnabled}
            onChange={(e) => setValues((v) => ({ ...v, feeEnabled: e.target.checked }))}
          />
          <Typography variant="caption">{t("admin.serviceFees.fee")}</Typography>
        </Box>
        <TextField
          select
          size="small"
          disabled={!values.feeEnabled}
          value={values.feeType}
          onChange={(e) => setValues((v) => ({ ...v, feeType: e.target.value }))}
          sx={{ width: 110 }}
        >
          <MenuItem value="PERCENT">{t("admin.serviceFees.percent")}</MenuItem>
          <MenuItem value="FLAT">{t("admin.serviceFees.flat")}</MenuItem>
        </TextField>
        <TextField
          size="small"
          type="number"
          disabled={!values.feeEnabled}
          label={values.feeType === "PERCENT" ? t("admin.serviceFees.percent") : t("admin.serviceFees.flatCfa")}
          value={values.feeValue}
          onChange={(e) => setValues((v) => ({ ...v, feeValue: Number(e.target.value) || 0 }))}
          sx={{ width: 110 }}
        />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Switch
            size="small"
            checked={values.taxEnabled}
            onChange={(e) => setValues((v) => ({ ...v, taxEnabled: e.target.checked }))}
          />
          <Typography variant="caption">{t("admin.serviceFees.tva")}</Typography>
        </Box>
        <TextField
          size="small"
          type="number"
          disabled={!values.taxEnabled}
          label={t("admin.serviceFees.percent")}
          value={values.taxRatePercent}
          onChange={(e) => setValues((v) => ({ ...v, taxRatePercent: Number(e.target.value) || 0 }))}
          sx={{ width: 110 }}
        />
        <Button
          size="small"
          variant="contained"
          disabled={!dirty || mutation.isLoading}
          onClick={() => mutation.mutate()}
          sx={{ ml: "auto" }}
        >
          {t("common.save")}
        </Button>
      </Box>
    </Box>
  );
}

function ServiceFeeSection({ moduleKey }) {
  const { t } = useTranslation();
  const { data: services, isLoading } = useQuery(["admin-service-fees", moduleKey], () =>
    fetchAdminServiceFees(moduleKey)
  );

  if (isLoading) {
    return <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>;
  }
  if (!services || services.length === 0) {
    return (
      <Typography sx={{ color: "text.secondary" }}>{t("admin.serviceFees.noServices")}</Typography>
    );
  }
  return (
    <Box>
      {services.map((service) => (
        <ServiceFeeRow key={`${service.serviceType}:${service.serviceId}`} service={service} />
      ))}
    </Box>
  );
}

const SECTIONS = ["mobile", "ecommerce", "restaurant"];

/**
 * Per-service commission/fee + TVA, admin-configurable on top of what's
 * already in the Modules tab (agent/rider/vendor/owner earner-share
 * splits) - see the ServiceFeeConfig model comment in schema.prisma for
 * why the two never conflict. Only mobile/ecommerce/restaurant are
 * offered here since those are the only flows that actually charge this
 * (mobile.controller.js, ecommerce/orders.controller.js, restaurant/
 * orders.controller.js) - same "no decorative editor" rule as
 * AdminModulesTab.js's FEE_EDITORS.
 */
export default function AdminServiceFeesTab() {
  const { t } = useTranslation();
  const [section, setSection] = useState("mobile");

  return (
    <Box>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={section}
        onChange={(e, v) => v && setSection(v)}
        sx={{ mb: 2 }}
      >
        {SECTIONS.map((key) => (
          <ToggleButton key={key} value={key}>
            {t(`admin.serviceFees.sections.${key}`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <ServiceFeeSection moduleKey={section} />
    </Box>
  );
}
