import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { fetchAdminStats } from "../../api/admin";

function StatCard({ label, value }) {
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        minWidth: 160,
        flex: "1 1 160px",
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {value ?? "—"}
      </Typography>
    </Box>
  );
}

export default function AdminStatsTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery("admin-stats", fetchAdminStats);

  if (isLoading) {
    return <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <StatCard label={t("admin.stats.totalUsers")} value={data?.totalUsers} />
        <StatCard label={t("admin.stats.totalOrders")} value={data?.totalOrders} />
        <StatCard label={t("admin.stats.pendingDeliveries")} value={data?.pendingDeliveries} />
        <StatCard label={t("admin.stats.activeRides")} value={data?.activeRides} />
        <StatCard label={t("admin.stats.totalStores")} value={data?.totalStores} />
        <StatCard label={t("admin.stats.totalRidePostings")} value={data?.totalRidePostings} />
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.stats.usersByRole")}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {Object.entries(data?.usersByRole || {}).map(([role, count]) => (
          <StatCard key={role} label={role} value={count} />
        ))}
      </Box>
    </Box>
  );
}
