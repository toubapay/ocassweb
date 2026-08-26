import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchRestaurantOrders, cancelRestaurantOrder } from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

const STATUS_COLOR = {
  PENDING: "warning",
  CONFIRMED: "info",
  PREPARING: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  CANCELLED: "error",
};

const CANCELLABLE_STATUSES = ["CONFIRMED", "PREPARING"];

export default function RestaurantOrders() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery("restaurant-orders", fetchRestaurantOrders, {
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation((id) => cancelRestaurantOrder(id), {
    onSuccess: () => {
      toast.success(t("restaurant.orders.cancelled"));
      queryClient.invalidateQueries("restaurant-orders");
      queryClient.invalidateQueries("wallet");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("restaurant.orders.couldNotCancel")),
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
          <Box
            key={order.id}
            onClick={() => router.push(`/restaurant/orders/${order.id}`)}
            sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 2, cursor: "pointer" }}
          >
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
              <Box>
                {(Number(order.feeAmount) > 0 || Number(order.taxAmount) > 0) && (
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    {t("ecommerce.orders.subtotal", { amount: formatCfa(order.subtotal) })}
                    {Number(order.feeAmount) > 0 &&
                      ` · ${t("admin.serviceFees.fee")} ${formatCfa(order.feeAmount)}`}
                    {Number(order.taxAmount) > 0 &&
                      ` · ${t("admin.serviceFees.tva")} ${formatCfa(order.taxAmount)}`}
                  </Typography>
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {t("restaurant.orders.total", { amount: formatCfa(order.total) })}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {/* Kept reachable for the life of the order, not just while
                    OUT_FOR_DELIVERY - a DELIVERED order still benefits from
                    seeing its route/agent info via the same tracking page. */}
                {order.deliveryRequestId && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/delivery/track/${order.deliveryRequestId}`);
                    }}
                    sx={{ fontWeight: 700, minWidth: 0, py: 0.25 }}
                  >
                    {t("restaurant.orders.track")}
                  </Button>
                )}
                {CANCELLABLE_STATUSES.includes(order.status) && (
                  <Button
                    size="small"
                    color="error"
                    disabled={cancelMutation.isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelMutation.mutate(order.id);
                    }}
                    sx={{ fontWeight: 700, minWidth: 0, p: 0 }}
                  >
                    {t("restaurant.orders.cancel")}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
