import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import AdminStatsTab from "../../src/components/admin/AdminStatsTab";
import AdminUsersTab from "../../src/components/admin/AdminUsersTab";
import AdminModulesTab from "../../src/components/admin/AdminModulesTab";
import AdminVendorsTab from "../../src/components/admin/AdminVendorsTab";
import AdminRestaurantsTab from "../../src/components/admin/AdminRestaurantsTab";
import AdminZonesTab from "../../src/components/admin/AdminZonesTab";
import AdminProvidersTab from "../../src/components/admin/AdminProvidersTab";
import AdminServicesTab from "../../src/components/admin/AdminServicesTab";

const TABS = ["dashboard", "users", "modules", "vendors", "restaurants", "zones", "providers", "services"];

export default function AdminPanel() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [tab, setTab] = useState(0);
  const isAdmin = isAuthenticated && user?.role === "ADMIN";

  if (!isAuthenticated || !isAdmin) {
    return (
      <Box>
        <TopBar title={t("admin.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>
            {isAuthenticated ? t("admin.notAuthorized") : t("common.logInToContinue")}
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push(isAuthenticated ? "/profile" : "/auth/login")}
          >
            {isAuthenticated ? t("nav.profile") : t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      <TopBar title={t("admin.title")} showCart={false} showSearch={false} />

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
      >
        <Tab label={t("admin.tabs.dashboard")} />
        <Tab label={t("admin.tabs.users")} />
        <Tab label={t("admin.tabs.modules")} />
        <Tab label={t("admin.tabs.vendors")} />
        <Tab label={t("admin.tabs.restaurants")} />
        <Tab label={t("admin.tabs.zones")} />
        <Tab label={t("admin.tabs.providers")} />
        <Tab label={t("admin.tabs.services")} />
      </Tabs>

      <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {TABS[tab] === "dashboard" && <AdminStatsTab />}
        {TABS[tab] === "users" && <AdminUsersTab />}
        {TABS[tab] === "modules" && <AdminModulesTab />}
        {TABS[tab] === "vendors" && <AdminVendorsTab />}
        {TABS[tab] === "restaurants" && <AdminRestaurantsTab />}
        {TABS[tab] === "zones" && <AdminZonesTab />}
        {TABS[tab] === "providers" && <AdminProvidersTab />}
        {TABS[tab] === "services" && <AdminServicesTab />}
      </Box>
    </Box>
  );
}
