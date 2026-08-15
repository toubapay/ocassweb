import { useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import AdminInsuranceProviderTab from "./AdminInsuranceProviderTab";
import AdminAasPoliciesTab from "./AdminAasPoliciesTab";

// Insurance management: configuring the AAS partner/API credentials and
// watching what it's actually done with them are two views of the same
// integration, so they live under one admin tab with an internal switch
// rather than competing for space in the top-level tab bar.
export default function AdminInsuranceTab() {
  const { t } = useTranslation();
  const [view, setView] = useState("provider");

  return (
    <Box>
      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={(e, v) => v && setView(v)}
        size="small"
        sx={{ mb: 3 }}
      >
        <ToggleButton value="provider" sx={{ textTransform: "none", fontWeight: 700 }}>
          {t("admin.insurance.providerView")}
        </ToggleButton>
        <ToggleButton value="policies" sx={{ textTransform: "none", fontWeight: 700 }}>
          {t("admin.insurance.policiesView")}
        </ToggleButton>
      </ToggleButtonGroup>

      {view === "provider" ? <AdminInsuranceProviderTab /> : <AdminAasPoliciesTab />}
    </Box>
  );
}
