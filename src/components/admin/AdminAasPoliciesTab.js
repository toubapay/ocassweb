import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Link from "@mui/material/Link";
import { fetchAdminAutoInsurancePolicies } from "../../api/admin";

const STATUS_COLORS = {
  ACTIVE: "success",
  ISSUING: "info",
  FAILED: "error",
  CANCELLED: "default",
  PENDING: "warning",
};

const STATUS_FILTERS = ["ALL", "FAILED", "ACTIVE", "ISSUING", "PENDING", "CANCELLED"];

// Ops visibility into AAS auto-insurance fulfillment - "a failed
// issuance records why" (fulfillmentError/fulfillmentErrorCode) only
// helps support if someone can actually see it against what was sent.
export default function AdminAasPoliciesTab() {
  const { t } = useTranslation();
  const [status, setStatus] = useState("FAILED");

  const { data: policies, isLoading } = useQuery(["admin-aas-policies", status], () =>
    fetchAdminAutoInsurancePolicies(status === "ALL" ? undefined : status)
  );

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.aasPolicies.title")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        {t("admin.aasPolicies.subtitle")}
      </Typography>

      <ToggleButtonGroup
        value={status}
        exclusive
        onChange={(e, v) => v && setStatus(v)}
        size="small"
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        {STATUS_FILTERS.map((s) => (
          <ToggleButton key={s} value={s} sx={{ textTransform: "none" }}>
            {s === "ALL" ? t("admin.aasPolicies.all") : s}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : !policies?.length ? (
        <Typography sx={{ color: "text.secondary" }}>{t("admin.aasPolicies.empty")}</Typography>
      ) : (
        policies.map((p) => (
          <Box
            key={p.id}
            sx={{
              p: 2,
              mb: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
              <Chip label={p.status} color={STATUS_COLORS[p.status] || "default"} size="small" sx={{ fontWeight: 700 }} />
              <Typography sx={{ fontWeight: 700 }}>
                {p.genre} - {p.immatriculation}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {p.tier} · {p.user?.phone} {p.user?.name ? `(${p.user.name})` : ""}
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("admin.aasPolicies.reference")}: {p.referenceTrxPartner} · {t("admin.aasPolicies.attempts")}: {p.fulfillmentAttempts} ·{" "}
              {t("admin.aasPolicies.premium")}: {Number(p.premiumEstimate).toLocaleString()} XOF
            </Typography>

            {p.linkAttestation && (
              <Typography variant="body2">
                <Link href={p.linkAttestation} target="_blank" rel="noopener">
                  {t("admin.aasPolicies.viewAttestation")}
                </Link>
              </Typography>
            )}

            {p.fulfillmentError && (
              <Box sx={{ mt: 1, p: 1, bgcolor: "rgba(229, 72, 77, 0.08)", borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: "error.dark", fontWeight: 600 }}>
                  [{p.fulfillmentErrorCode}] {p.fulfillmentError}
                </Typography>
              </Box>
            )}
          </Box>
        ))
      )}
    </Box>
  );
}
