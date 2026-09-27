import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchMyVendorOrders, updateVendorOrderStatus } from "../../src/api/vendor";
import { formatCfa } from "../../src/utils/currency";

const STATUS_COLOR = {
  PENDING: "warning",
  CONFIRMED: "info",
  PREPARING: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  CANCELLED: "error",
};

export default function VendorOrders() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const isVendor = isAuthenticated && Boolean(user?.store);

  const { data: orders, isLoading } = useQuery("vendor-orders", fetchMyVendorOrders, {
    enabled: isVendor,
    refetchInterval: 15000,
  });

  const statusMutation = useMutation(({ id, status }) => updateVendorOrderStatus(id, status), {
    onSuccess: (_, { status }) => {
      toast.success(t(`vendor.manage.statusSet.${status}`));
      queryClient.invalidateQueries("vendor-orders");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("vendor.manage.couldNotUpdateStatus")),
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
                  label={t(`ecommerce.orders.status.${order.status}`, { defaultValue: order.status.replace(/_/g, " ") })}
                  size="small"
                  color={STATUS_COLOR[order.status] || "default"}
                />
              </Box>
              <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                {order.items.map((item) => (
                  <Typography key={item.id} variant="caption" sx={{ color: "text.secondary" }}>
                    {item.quantity} × {item.product?.name} — {formatCfa(item.price)}
                  </Typography>
                ))}
              </Box>

              {order.deliveryRequest && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                  {t("vendor.manage.deliveryStatus", {
                    status: t(`delivery.status.${order.deliveryRequest.status}`, { defaultValue: order.deliveryRequest.status }),
                  })}
                </Typography>
              )}

              {!order.isSingleVendor && (
                <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", display: "block", mt: 0.5 }}>
                  {t("vendor.manage.multiVendorNote")}
                </Typography>
              )}

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {formatCfa(storeTotal)}
                </Typography>
                {order.isSingleVendor && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {order.status === "CONFIRMED" && (
                      <>
                        <Button
                          size="small"
                          color="error"
                          disabled={statusMutation.isLoading}
                          onClick={() => statusMutation.mutate({ id: order.id, status: "CANCELLED" })}
                          sx={{ fontWeight: 700 }}
                        >
                          {t("vendor.manage.cancel")}
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={statusMutation.isLoading}
                          onClick={() => statusMutation.mutate({ id: order.id, status: "PREPARING" })}
                          sx={{ fontWeight: 700 }}
                        >
                          {t("vendor.manage.startPreparing")}
                        </Button>
                      </>
                    )}
                    {order.status === "PREPARING" && (
                      <>
                        <Button
                          size="small"
                          color="error"
                          disabled={statusMutation.isLoading}
                          onClick={() => statusMutation.mutate({ id: order.id, status: "CANCELLED" })}
                          sx={{ fontWeight: 700 }}
                        >
                          {t("vendor.manage.cancel")}
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={statusMutation.isLoading}
                          onClick={() => statusMutation.mutate({ id: order.id, status: "OUT_FOR_DELIVERY" })}
                          sx={{ fontWeight: 700 }}
                        >
                          {t("vendor.manage.readyForDelivery")}
                        </Button>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
