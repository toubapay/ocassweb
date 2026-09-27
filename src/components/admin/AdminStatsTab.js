import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import CommuteRoundedIcon from "@mui/icons-material/CommuteRounded";
import { fetchAdminStats } from "../../api/admin";
import { getRoleColor } from "./adminRoleColors";

const KPI_DEFS = [
  { key: "totalUsers", icon: PeopleRoundedIcon, color: "#3B82F6" },
  { key: "totalOrders", icon: ShoppingBagRoundedIcon, color: "#0FAE58" },
  { key: "pendingDeliveries", icon: LocalShippingRoundedIcon, color: "#F59E0B" },
  { key: "activeRides", icon: DirectionsCarRoundedIcon, color: "#8B5CF6" },
  { key: "totalStores", icon: StorefrontRoundedIcon, color: "#06B6D4" },
  { key: "totalRidePostings", icon: CommuteRoundedIcon, color: "#EC4899" },
];

const CARD_SX = {
  bgcolor: "background.paper",
  borderRadius: 3,
  border: "1px solid #ECEEF1",
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
};

function KpiCard({ label, value, icon: Icon, color, loading }) {
  return (
    <Box sx={{ ...CARD_SX, p: 2.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2.5,
          bgcolor: `${color}1A`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1.5,
        }}
      >
        <Icon sx={{ color, fontSize: 21 }} />
      </Box>
      <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600, mb: 0.5 }}>{label}</Typography>
      {loading ? (
        <Skeleton width={56} height={34} />
      ) : (
        <Typography sx={{ fontWeight: 800, fontSize: 26, lineHeight: 1.2 }}>{value ?? "—"}</Typography>
      )}
    </Box>
  );
}

function RoleDonut({ entries, total }) {
  let cursor = 0;
  const stops = entries.map(([role, count]) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    const start = cursor;
    cursor += pct;
    return `${getRoleColor(role)} ${start}% ${cursor}%`;
  });

  return (
    <Box
      sx={{
        width: 156,
        height: 156,
        borderRadius: "50%",
        background: stops.length ? `conic-gradient(${stops.join(", ")})` : "#EEEEEE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: 104,
          height: 104,
          borderRadius: "50%",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 24, lineHeight: 1.2 }}>{total}</Typography>
        <RoleDonutTotalLabel />
      </Box>
    </Box>
  );
}

function RoleDonutTotalLabel() {
  const { t } = useTranslation();
  return (
    <Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 600 }}>
      {t("admin.stats.total")}
    </Typography>
  );
}

export default function AdminStatsTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery("admin-stats", fetchAdminStats);

  const roleEntries = Object.entries(data?.usersByRole || {}).sort((a, b) => b[1] - a[1]);
  const maxRoleCount = Math.max(1, ...roleEntries.map(([, count]) => count));
  const roleTotal = roleEntries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <Box>
      <Typography sx={{ color: "text.secondary", fontSize: 14, mb: 2.5 }}>{t("admin.stats.subtitle")}</Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 2,
          mb: 3,
        }}
      >
        {KPI_DEFS.map((def) => (
          <KpiCard
            key={def.key}
            label={t(`admin.stats.${def.key}`)}
            value={data?.[def.key]}
            icon={def.icon}
            color={def.color}
            loading={isLoading}
          />
        ))}
      </Box>

      <Box sx={{ ...CARD_SX, p: { xs: 2.5, sm: 3 } }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 2.5 }}>{t("admin.stats.usersByRole")}</Typography>
        {isLoading ? (
          <Skeleton height={156} />
        ) : roleEntries.length === 0 ? (
          <Typography sx={{ color: "text.secondary" }}>—</Typography>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
            <RoleDonut entries={roleEntries} total={roleTotal} />
            <Box sx={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 1.5 }}>
              {roleEntries.map(([role, count]) => (
                <Box key={role} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      bgcolor: getRoleColor(role),
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, width: 150, flexShrink: 0 }} noWrap>
                    {role}
                  </Typography>
                  <Box sx={{ flexGrow: 1, height: 8, borderRadius: 4, bgcolor: "#F1F2F5", overflow: "hidden" }}>
                    <Box
                      sx={{
                        height: "100%",
                        width: `${(count / maxRoleCount) * 100}%`,
                        bgcolor: getRoleColor(role),
                        borderRadius: 4,
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, width: 28, textAlign: "right", flexShrink: 0 }}>
                    {count}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
