import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import TopBar from "../../../src/components/layout/TopBar";
import useAuth from "../../../src/hooks/useAuth";
import { fetchRestaurantOrder, cancelRestaurantOrder } from "../../../src/api/modules";
import { formatCfa } from "../../../src/utils/currency";

const STATUS_COLOR = {
  PENDING: "warning",
  CONFIRMED: "info",
  PREPARING: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  CANCELLED: "error",
};

const CANCELLABLE_STATUSES = ["CONFIRMED", "PREPARING"];

export default function RestaurantOrderDetail() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { id } = router.query;

  const { data: order, isLoading, isError } = useQuery(
    ["restaurant-order", id],
    () => fetchRestaurantOrder(id),
    { enabled: Boolean(id) && isAuthenticated }
  );

  const cancelMutation = useMutation(() => cancelRestaurantOrder(id), {
    onSuccess: () => {
      toast.success(t("restaurant.orders.cancelled"));
      queryClient.invalidateQueries(["restaurant-order", id]);
      queryClient.invalidateQueries("restaurant-orders");
      queryClient.invalidateQueries("wallet");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("restaurant.orders.couldNotCancel")),
  });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("restaurant.orders.detailTitle")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("restaurant.orders.loginToView")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (isError || (!isLoading && !order)) {
    return (
      <Box>
        <TopBar title={t("restaurant.orders.detailTitle")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("restaurant.orders.notFound")}</Typography>
        </Box>
      </Box>
    );
  }

  if (isLoading || !order) {
    return (
      <Box>
        <TopBar title={t("restaurant.orders.detailTitle")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("restaurant.orders.detailTitle")} showCart={false} showSearch={false} />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {order.restaurant.name}
          </Typography>
          <Chip
            label={t(`ecommerce.orders.status.${order.status}`, { defaultValue: order.status.replace(/_/g, " ") })}
            color={STATUS_COLOR[order.status] || "default"}
          />
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          {new Date(order.createdAt).toLocaleString()}
        </Typography>

        {/* Delivery tracking stays reachable for the life of the order,
            not just while OUT_FOR_DELIVERY - a DELIVERED order still
            benefits from seeing its route/agent info, same as the
            standalone /delivery/track/[id] page already handles every
            status gracefully (waiting-for-agent, in-transit, delivered). */}
        {order.deliveryRequestId && (
          <Button
            variant="contained"
            startIcon={<LocationOnRoundedIcon />}
            onClick={() => router.push(`/delivery/track/${order.deliveryRequestId}`)}
            sx={{ fontWeight: 700, mb: 2 }}
          >
            {t("restaurant.orders.track")}
          </Button>
        )}

        <Box sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            {t("ecommerce.orders.items")}
          </Typography>
          {order.items.map((item) => (
            <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {item.quantity} x {item.menuItem.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCfa(Number(item.price) * item.quantity)}
              </Typography>
            </Box>
          ))}
          {order.note && (
            <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", display: "block", mt: 1 }}>
              {t("restaurant.orders.note", { note: order.note })}
            </Typography>
          )}
        </Box>

        {order.deliveryAddress && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("common.deliveryAddress")}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {order.deliveryAddress}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("ecommerce.orders.subtotal", { amount: formatCfa(order.subtotal) })}
          </Typography>
          {Number(order.feeAmount) > 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("admin.serviceFees.fee")}: {formatCfa(order.feeAmount)}
            </Typography>
          )}
          {Number(order.taxAmount) > 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("admin.serviceFees.tva")}: {formatCfa(order.taxAmount)}
            </Typography>
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t("restaurant.orders.total", { amount: formatCfa(order.total) })}
          </Typography>
        </Box>

        {CANCELLABLE_STATUSES.includes(order.status) && (
          <Button
            variant="outlined"
            color="error"
            disabled={cancelMutation.isLoading}
            onClick={() => cancelMutation.mutate()}
            sx={{ fontWeight: 700 }}
          >
            {t("restaurant.orders.cancel")}
          </Button>
        )}
      </Box>
    </Box>
  );
}
