import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TopBar from "../../../src/components/layout/TopBar";
import useAuth from "../../../src/hooks/useAuth";
import { fetchOrder } from "../../../src/api/ecommerce";
import { formatCfa } from "../../../src/utils/currency";

const STATUS_COLOR = {
  PENDING: "warning",
  CONFIRMED: "info",
  PREPARING: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  CANCELLED: "error",
};

export default function EcommerceOrderDetail() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { id } = router.query;

  const { data: order, isLoading, isError } = useQuery(
    ["ecommerce-order", id],
    () => fetchOrder(id),
    { enabled: Boolean(id) && isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("ecommerce.orders.detailTitle")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("ecommerce.orders.loginToView")}</Typography>
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
        <TopBar title={t("ecommerce.orders.detailTitle")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("ecommerce.orders.notFound")}</Typography>
        </Box>
      </Box>
    );
  }

  if (isLoading || !order) {
    return (
      <Box>
        <TopBar title={t("ecommerce.orders.detailTitle")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("ecommerce.orders.detailTitle")} showCart={false} showSearch={false} />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t("ecommerce.orders.orderNumber", { id: order.id.slice(0, 8) })}
          </Typography>
          <Chip
            label={t(`ecommerce.orders.status.${order.status}`, { defaultValue: order.status.replace(/_/g, " ") })}
            color={STATUS_COLOR[order.status] || "default"}
          />
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          {new Date(order.createdAt).toLocaleString()}
        </Typography>

        <Chip
          label={order.paid ? t("ecommerce.orders.paid") : t("ecommerce.orders.unpaid")}
          size="small"
          color={order.paid ? "success" : "warning"}
          variant="outlined"
          sx={{ mb: 2 }}
        />

        {order.deliveryAddress && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("common.deliveryAddress")}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {order.deliveryAddress.label ? `${order.deliveryAddress.label} - ` : ""}
              {order.deliveryAddress.line1}, {order.deliveryAddress.city}
            </Typography>
          </Box>
        )}

        <Box sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            {t("ecommerce.orders.items")}
          </Typography>
          {order.items.map((item) => (
            <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {item.quantity} x {item.product.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCfa(Number(item.price) * item.quantity)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
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
            {t("ecommerce.orders.total", { amount: formatCfa(order.total) })}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
