import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchMyVendorOrders } from "../../src/api/vendor";
import { formatCfa } from "../../src/utils/currency";

export default function VendorOrders() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const isVendor = isAuthenticated && user?.role === "VENDOR";

  const { data: orders, isLoading } = useQuery("vendor-orders", fetchMyVendorOrders, {
    enabled: isVendor,
  });

  if (!isAuthenticated || !isVendor) {
    return (
      <Box>
        <TopBar title={t("vendor.orders")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Button variant="contained" onClick={() => router.push(isAuthenticated ? "/profile" : "/auth/login")}>
            {isAuthenticated ? t("nav.profile") : t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("vendor.orders")} showCart={false} showSearch={false} />

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {isLoading && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("common.loading")}
          </Typography>
        )}
        {!isLoading && (orders || []).length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 4 }}>
            {t("vendor.noOrders")}
          </Typography>
        )}
        {(orders || []).map((order) => {
          const storeTotal = order.items.reduce(
            (sum, item) => sum + Number(item.price) * item.quantity,
            0
          );
          return (
            <Box key={order.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {t("vendor.orderNumber", { id: order.id.slice(0, 8) })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {order.user?.name || order.user?.phone} · {new Date(order.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Chip
                  label={t(`vendor.orderStatus.${order.status}`, { defaultValue: order.status })}
                  size="small"
                />
              </Box>
              <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                {order.items.map((item) => (
                  <Typography key={item.id} variant="caption" sx={{ color: "text.secondary" }}>
                    {item.quantity} × {item.product?.name} — {formatCfa(item.price)}
                  </Typography>
                ))}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, mt: 1, textAlign: "right" }}>
                {formatCfa(storeTotal)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
