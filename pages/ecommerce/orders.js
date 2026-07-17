import { useRouter } from "next/router";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchOrders } from "../../src/api/ecommerce";
import { formatCfa } from "../../src/utils/currency";

const STATUS_COLOR = {
  PENDING: "warning",
  CONFIRMED: "info",
  PREPARING: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  CANCELLED: "error",
};

export default function Orders() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: orders, isLoading } = useQuery("orders", fetchOrders, { enabled: isAuthenticated });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title="Your orders" showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>Log in to see your orders.</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            Log in
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <TopBar title="Your orders" showCart={false} showSearch={false} />
      {isLoading && (
        <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
          Loading orders...
        </Typography>
      )}
      {!isLoading && (orders || []).length === 0 && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>No orders yet.</Typography>
          <Button variant="contained" onClick={() => router.push("/ecommerce")}>
            Start shopping
          </Button>
        </Box>
      )}
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {(orders || []).map((order) => (
          <Box key={order.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Order #{order.id.slice(0, 8)}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Chip
                  label={order.paid ? "Paid" : "Unpaid"}
                  size="small"
                  color={order.paid ? "success" : "warning"}
                  variant="outlined"
                />
                <Chip
                  label={order.status.replace(/_/g, " ")}
                  size="small"
                  color={STATUS_COLOR[order.status] || "default"}
                />
              </Box>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {new Date(order.createdAt).toLocaleString()}
            </Typography>
            <Box sx={{ mt: 1 }}>
              {order.items.map((item) => (
                <Typography key={item.id} variant="body2" sx={{ color: "text.secondary" }}>
                  {item.quantity} x {item.product.name}
                </Typography>
              ))}
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1 }}>
              Total: {formatCfa(order.total)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
