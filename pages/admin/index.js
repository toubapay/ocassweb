import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import CloudRoundedIcon from "@mui/icons-material/CloudRounded";
import MiscellaneousServicesRoundedIcon from "@mui/icons-material/MiscellaneousServicesRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import AdminLayout from "../../src/components/admin/AdminLayout";
import useAuth from "../../src/hooks/useAuth";
import AdminStatsTab from "../../src/components/admin/AdminStatsTab";
import AdminUsersTab from "../../src/components/admin/AdminUsersTab";
import AdminModulesTab from "../../src/components/admin/AdminModulesTab";
import AdminServiceFeesTab from "../../src/components/admin/AdminServiceFeesTab";
import AdminVendorsTab from "../../src/components/admin/AdminVendorsTab";
import AdminCategoriesTab from "../../src/components/admin/AdminCategoriesTab";
import AdminDeliveryPackageTypesTab from "../../src/components/admin/AdminDeliveryPackageTypesTab";
import AdminRestaurantsTab from "../../src/components/admin/AdminRestaurantsTab";
import AdminZonesTab from "../../src/components/admin/AdminZonesTab";
import AdminProvidersTab from "../../src/components/admin/AdminProvidersTab";
import AdminServicesTab from "../../src/components/admin/AdminServicesTab";
import AdminInsuranceTab from "../../src/components/admin/AdminInsuranceTab";

// Single source of truth for the sidebar nav and the content area below -
// each tab's id doubles as its ?tab= query value, so a section is a real,
// bookmarkable/shareable URL instead of only reachable by clicking through.
const TABS = [
  { id: "dashboard", labelKey: "admin.tabs.dashboard", icon: DashboardRoundedIcon, Component: AdminStatsTab },
  { id: "users", labelKey: "admin.tabs.users", icon: PeopleRoundedIcon, Component: AdminUsersTab },
  { id: "modules", labelKey: "admin.tabs.modules", icon: TuneRoundedIcon, Component: AdminModulesTab },
  {
    id: "deliveryPackageTypes",
    labelKey: "admin.tabs.deliveryPackageTypes",
    icon: Inventory2RoundedIcon,
    Component: AdminDeliveryPackageTypesTab,
  },
  {
    id: "serviceFees",
    labelKey: "admin.tabs.serviceFees",
    icon: PercentRoundedIcon,
    Component: AdminServiceFeesTab,
  },
  { id: "vendors", labelKey: "admin.tabs.vendors", icon: StorefrontRoundedIcon, Component: AdminVendorsTab },
  { id: "categories", labelKey: "admin.tabs.categories", icon: CategoryRoundedIcon, Component: AdminCategoriesTab },
  {
    id: "restaurants",
    labelKey: "admin.tabs.restaurants",
    icon: RestaurantRoundedIcon,
    Component: AdminRestaurantsTab,
  },
  { id: "zones", labelKey: "admin.tabs.zones", icon: MapRoundedIcon, Component: AdminZonesTab },
  { id: "providers", labelKey: "admin.tabs.providers", icon: CloudRoundedIcon, Component: AdminProvidersTab },
  {
    id: "services",
    labelKey: "admin.tabs.services",
    icon: MiscellaneousServicesRoundedIcon,
    Component: AdminServicesTab,
  },
  { id: "insurance", labelKey: "admin.tabs.insurance", icon: ShieldRoundedIcon, Component: AdminInsuranceTab },
];

export default function AdminPanel() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "ADMIN";

  const activeTab = TABS.some((tabDef) => tabDef.id === router.query.tab) ? router.query.tab : TABS[0].id;
  const setActiveTab = (id) => router.push({ pathname: "/admin", query: { tab: id } }, undefined, { shallow: true });

  if (!isAuthenticated || !isAdmin) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          px: 3,
        }}
      >
        <AdminPanelSettingsRoundedIcon sx={{ fontSize: 48, color: "primary.main" }} />
        <Typography sx={{ textAlign: "center" }}>
          {isAuthenticated ? t("admin.notAuthorized") : t("common.logInToContinue")}
        </Typography>
        <Button variant="contained" onClick={() => router.push("/admin/login")}>
          {t("admin.login.title")}
        </Button>
      </Box>
    );
  }

  const ActiveComponent = TABS.find((tabDef) => tabDef.id === activeTab)?.Component || AdminStatsTab;

  return (
    <AdminLayout tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
      <ActiveComponent />
    </AdminLayout>
  );
}
