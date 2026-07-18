import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchRestaurantOrders } from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

const STATUS_COLOR = {
  PENDING: "warning",
  CONFIRMED: "info",
  PREPARING: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  CANCELLED: "error",
};

export default function RestaurantOrders() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data: orders, isLoading } = useQuery("restaurant-orders", fetchRestaurantOrders, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("restaurant.orders.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("restaurant.orders.loginToView")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <TopBar title={t("restaurant.orders.title")} showCart={false} showSearch={false} />
      {isLoading && (
        <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
          {t("restaurant.orders.loading")}
        </Typography>
      )}
      {!isLoading && (orders || []).length === 0 && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("restaurant.orders.empty")}</Typography>
          <Button variant="contained" onClick={() => router.push("/restaurant")}>
            {t("restaurant.orders.browseRestaurants")}
          </Button>
        </Box>
      )}
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {(orders || []).map((order) => (
          <Box key={order.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {order.restaurant.name}
              </Typography>
              <Chip
                label={t(`ecommerce.orders.status.${order.status}`, { defaultValue: order.status.replace(/_/g, " ") })}
                size="small"
                color={STATUS_COLOR[order.status] || "default"}
              />
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {new Date(order.createdAt).toLocaleString()}
            </Typography>
            <Box sx={{ mt: 1 }}>
              {order.items.map((item) => (
                <Typography key={item.id} variant="body2" sx={{ color: "text.secondary" }}>
                  {item.quantity} x {item.menuItem.name}
                </Typography>
              ))}
            </Box>
            {order.note && (
              <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                {t("restaurant.orders.note", { note: order.note })}
              </Typography>
            )}
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1 }}>
              {t("restaurant.orders.total", { amount: formatCfa(order.total) })}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
